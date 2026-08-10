"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { crearSesionAdmin, cerrarSesion, requerirAdmin } from "@/lib/auth";
import { crearCodigoQr } from "@/lib/qr";
import { desafioSchema } from "@/lib/validacion";
import { recalcularPuntosParticipante } from "@/lib/puntos";
import { anunciarCambio } from "@/lib/eventos";
import { storage } from "@/lib/storage";
import type { Prisma } from "@prisma/client";
import { extensionImagen } from "@/lib/archivos";
import { normalizarImagen } from "@/lib/imagenes-servidor";
import { obtenerReporteAlmacenamiento } from "@/lib/almacenamiento";
import { consumirLimite } from "@/lib/limite-solicitudes";
import {
  CODIGO_DESAFIO_CIERRE,
  FORMATO_COSECHA,
  PREGUNTAS_COSECHA,
  TITULO_DESAFIO_CIERRE,
} from "@/lib/cosecha-config";
import { crearConfiguracionPuntualidad } from "@/lib/puntualidad";
import {
  actualizarPremioFotoMasReaccionada,
  claveRecuerdoEvidencia,
  PREFIJO_EVIDENCIA_RECUERDO,
} from "@/lib/premio-recuerdos";
import {
  DURACION_MAXIMA_MINUTOS,
  fechaHoraColombiaComoFecha,
} from "@/lib/duracion-desafio";
import { clasificarCorreos } from "@/lib/correos-autorizados";
import { comentarioEvidencia } from "@/lib/evidencias";
import {
  configuracionEncuestaMixtaDesdeJson,
  EncuestaMixtaInvalidaError,
} from "@/lib/encuesta-mixta";
import { FORMATO_MATRICULA, esConfiguracionMatricula, type ConfiguracionMatricula } from "@/lib/matricula";

export type EstadoLogin = { error?: string };
export type EstadoGuardarDesafio = {
  tipo: "inicial" | "error" | "exito";
  mensaje: string;
};
export type EstadoCorreosAutorizados = {
  tipo: "inicial" | "error" | "exito";
  mensaje: string;
};
export type EstadoPdfAgenda = {
  tipo: "inicial" | "error" | "exito";
  mensaje: string;
};

export async function iniciarSesionAdmin(
  _estado: EstadoLogin,
  formulario: FormData,
): Promise<EstadoLogin> {
  const usuario = String(formulario.get("usuario") ?? "").trim();
  const password = String(formulario.get("password") ?? "");
  const limite = await consumirLimite({ accion: "login-admin", limite: 20, ventanaSegundos: 600 });
  if (!limite.permitido) {
    return { error: "Demasiados intentos. Intenta nuevamente en unos minutos." };
  }
  const admin = await db.admin.findUnique({ where: { usuario } });
  const ahora = new Date();
  if (admin?.bloqueadoHasta && admin.bloqueadoHasta > ahora) {
    return { error: "Demasiados intentos. Intenta nuevamente en unos minutos." };
  }
  if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
    if (admin) {
      const ventanaIntentos = 15 * 60 * 1000;
      const conservaIntentos = admin.ultimoIntentoFallido
        && ahora.getTime() - admin.ultimoIntentoFallido.getTime() < ventanaIntentos;
      const intentos = (conservaIntentos ? admin.intentosFallidos : 0) + 1;
      await db.admin.update({
        where: { id: admin.id },
        data: {
          intentosFallidos: intentos >= 5 ? 0 : intentos,
          ultimoIntentoFallido: ahora,
          bloqueadoHasta: intentos >= 5 ? new Date(ahora.getTime() + ventanaIntentos) : null,
        },
      });
    }
    return { error: "Usuario o contraseña incorrectos." };
  }
  await db.admin.update({
    where: { id: admin.id },
    data: { intentosFallidos: 0, ultimoIntentoFallido: null, bloqueadoHasta: null },
  });
  await crearSesionAdmin(admin.id);
  redirect("/admin");
}

export async function salirAdmin() {
  await cerrarSesion("admin");
  redirect("/admin/login");
}

function configuracionDesdeFormulario(tipo: string, formulario: FormData) {
  if (tipo === "PUNTUALIDAD") {
    return crearConfiguracionPuntualidad(
      String(formulario.get("fechaHoraObjetivo") ?? ""),
      Number(String(formulario.get("toleranciaMinutos") ?? "NaN")),
    );
  }
  if (tipo === "OPCION_MULTIPLE") {
    const lineas = String(formulario.get("opciones") ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
    return {
      opciones: lineas.map((texto, indice) => ({
        id: String.fromCharCode(97 + indice),
        texto: texto.replace(/^\*/, "").trim(),
        correcta: texto.startsWith("*"),
      })),
      multiple: formulario.get("multiple") === "on",
      puntajeParcial: formulario.get("puntajeParcial") === "on",
    };
  }
  if (tipo === "RESPUESTA_ABIERTA") {
    return { respuestasAceptadas: String(formulario.get("respuestasAceptadas") ?? "").split(",").map((r) => r.trim()).filter(Boolean) };
  }
  if (tipo === "EVIDENCIA_FOTO") {
    return {
      instruccion: String(formulario.get("instruccion") ?? ""),
      publicarEnRecuerdos: formulario.get("publicarEnRecuerdos") === "on",
    };
  }
  if (tipo === "ENCUESTA_MIXTA") {
    return configuracionEncuestaMixtaDesdeJson(String(formulario.get("preguntasMixtas") ?? ""));
  }
  if (tipo === "ENCUESTA") {
    const formato = String(formulario.get("formato") ?? "texto");
    if (formato === FORMATO_COSECHA) return { formato, preguntas: PREGUNTAS_COSECHA };
    return { pregunta: String(formulario.get("pregunta") ?? ""), formato };
  }
  return {};
}

export async function guardarDesafio(
  _estado: EstadoGuardarDesafio,
  formulario: FormData,
): Promise<EstadoGuardarDesafio> {
  await requerirAdmin();
  try {
    await guardarDesafioEnBase(formulario);
    return {
      tipo: "exito",
      mensaje: formulario.get("id") ? "Los cambios quedaron guardados." : "El desafío quedó creado correctamente.",
    };
  } catch (error) {
    console.error("[admin/desafios] No fue posible guardar el desafío", error);
    const mensaje = error instanceof EncuestaMixtaInvalidaError
      ? error.message
      : error instanceof Error && (
      error.message === "Configura una duración válida en minutos."
      || error.message === "Configura una fecha y hora de cierre válidas."
      || error.message === "Cada opción de matrícula debe incluir una imagen válida."
      || error.message === "Completa el texto y la imagen de las dos opciones de matrícula."
    )
      ? error.message
      : "No pudimos guardar el desafío. Tus demás datos siguen intactos; revisa los campos e intenta nuevamente.";
    return { tipo: "error", mensaje };
  }
}

async function guardarDesafioEnBase(formulario: FormData) {
  const datos = desafioSchema.parse(Object.fromEntries(formulario));
  const id = String(formulario.get("id") ?? "");
  const existente = id
    ? await db.desafio.findUnique({ where: { id }, select: { codigoQr: true, estado: true, publicadoEn: true, configuracion: true } })
    : null;
  const esCierre = existente?.codigoQr === CODIGO_DESAFIO_CIERRE;
  const estado = String(formulario.get("estado") ?? "BORRADOR") as "BORRADOR" | "PUBLICADO" | "CERRADO";
  const esPuntualidad = datos.tipo === "PUNTUALIDAD";
  const tipoPersistido = datos.tipo === "PUNTUALIDAD"
    ? "CHECK_IN" as const
    : datos.tipo === "ENCUESTA_MIXTA" || datos.tipo === "MATRICULA" ? "ENCUESTA" as const : datos.tipo;
  let configuracionMatricula: ConfiguracionMatricula | null = null;
  const imagenesAnterioresReemplazadas: string[] = [];
  if (datos.tipo === "MATRICULA") {
    const anterior = esConfiguracionMatricula(existente?.configuracion) ? existente.configuracion : null;
    const opciones = [] as ConfiguracionMatricula["opciones"][number][];
    for (const idOpcion of ["a", "b"] as const) {
      const sufijo = idOpcion.toUpperCase();
      const texto = String(formulario.get(`matriculaTexto${sufijo}`) ?? "").trim().slice(0, 140);
      const actual = anterior?.opciones.find((opcion) => opcion.id === idOpcion)?.urlImagen
        ?? String(formulario.get(`matriculaImagenActual${sufijo}`) ?? "");
      const archivo = formulario.get(`matriculaImagen${sufijo}`);
      let urlImagen = actual;
      if (archivo instanceof File && archivo.size > 0) {
        if (!extensionImagen(archivo.type)) throw new Error("Cada opción de matrícula debe incluir una imagen válida.");
        const imagen = await normalizarImagen(new Uint8Array(await archivo.arrayBuffer()), { dimensionMaxima: 1000, calidad: 82 });
        urlImagen = await storage.guardar(imagen.datos, imagen.extension, "matriculas");
        if (actual && actual !== urlImagen) imagenesAnterioresReemplazadas.push(actual);
      }
      if (!texto || !urlImagen) throw new Error("Completa el texto y la imagen de las dos opciones de matrícula.");
      opciones.push({ id: idOpcion, texto, urlImagen });
    }
    configuracionMatricula = { formato: FORMATO_MATRICULA, opciones: opciones as ConfiguracionMatricula["opciones"] };
  }
  const modoDuracion = esPuntualidad ? "PUNTUALIDAD" : String(formulario.get("modoDuracion") ?? "MINUTOS");
  const minutosIngresados = Number(formulario.get("duracionMinutos"));
  const duracionMinutos = modoDuracion === "MINUTOS"
    && Number.isInteger(minutosIngresados)
    && minutosIngresados >= 1
    && minutosIngresados <= DURACION_MAXIMA_MINUTOS
    ? minutosIngresados
    : null;
  if (modoDuracion === "MINUTOS" && duracionMinutos === null) {
    throw new Error("Configura una duración válida en minutos.");
  }
  const disponibleHasta = modoDuracion === "FECHA_HORA"
    ? fechaHoraColombiaComoFecha(String(formulario.get("fechaHoraCierre") ?? ""))
    : null;
  const iniciaPublicacion = estado === "PUBLICADO"
    && (existente?.estado !== "PUBLICADO" || !existente.publicadoEn);
  const comun = {
    ...datos,
    tipo: esCierre ? "ENCUESTA" as const : tipoPersistido,
    componenteId: null,
    esSecreto: formulario.get("esSecreto") === "on",
    estado,
    limiteCompletitudes: formulario.get("limiteCompletitudes") ? Number(formulario.get("limiteCompletitudes")) : null,
    disponibleDesde: null,
    disponibleHasta,
    duracionMinutos,
    publicadoEn: estado === "PUBLICADO"
      ? iniciaPublicacion ? new Date() : existente?.publicadoEn ?? new Date()
      : null,
    configuracion: esCierre
      ? { formato: FORMATO_COSECHA, preguntas: PREGUNTAS_COSECHA }
      : configuracionMatricula ?? configuracionDesdeFormulario(datos.tipo, formulario),
  };
  const controlaCambios = Boolean(id && formulario.has("camposModificados"));
  const modificados = new Set(
    String(formulario.get("camposModificados") ?? "")
      .split(",")
      .map((campo) => campo.trim())
      .filter(Boolean),
  );
  const camposActualizables = new Set<string>();
  const incluir = (...campos: string[]) => campos.forEach((campo) => camposActualizables.add(campo));
  if (modificados.has("titulo")) incluir("titulo");
  if (modificados.has("descripcion")) incluir("descripcion");
  if (modificados.has("puntos")) incluir("puntos");
  if (modificados.has("dia") || modificados.has("componenteId")) incluir("dia", "componenteId", "ubicacion");
  if (modificados.has("tipo")) incluir("tipo", "configuracion", "duracionMinutos", "disponibleHasta");
  if ([
    "opciones", "multiple", "puntajeParcial", "respuestasAceptadas", "instruccion",
    "publicarEnRecuerdos", "pregunta", "formato", "fechaHoraObjetivo", "toleranciaMinutos",
    "preguntasMixtasEditor", "preguntasMixtas",
    "matriculaTextoA", "matriculaTextoB", "matriculaImagenA", "matriculaImagenB",
  ].some((campo) => modificados.has(campo))) incluir("configuracion");
  if (["modoDuracion", "duracionMinutos", "fechaHoraCierre"].some((campo) => modificados.has(campo))) {
    incluir("duracionMinutos", "disponibleHasta");
  }
  if (esPuntualidad) incluir("duracionMinutos", "disponibleHasta");
  if (modificados.has("estado")) incluir("estado", "publicadoEn");
  if (modificados.has("limiteCompletitudes")) incluir("limiteCompletitudes");
  if (modificados.has("esSecreto")) incluir("esSecreto");
  const cambiosSolicitados = Object.fromEntries(
    Object.entries(comun).filter(([campo]) => camposActualizables.has(campo)),
  ) as Prisma.DesafioUncheckedUpdateInput;
  await db.$transaction(async (tx) => {
    const siguienteOrden = id
      ? null
      : ((await tx.desafio.aggregate({ _max: { orden: true } }))._max.orden ?? 0) + 1;
    const guardado = id
      ? await tx.desafio.update({ where: { id }, data: controlaCambios ? cambiosSolicitados : comun })
      : await tx.desafio.create({ data: { ...comun, codigoQr: crearCodigoQr(datos.titulo), orden: siguienteOrden ?? 1 } });
    const publicarEnRecuerdos = guardado.tipo === "EVIDENCIA_FOTO"
      && Boolean((guardado.configuracion as { publicarEnRecuerdos?: boolean }).publicarEnRecuerdos);
    const completitudes = await tx.completitud.findMany({
      where: { desafioId: guardado.id },
      select: { id: true, participanteId: true, urlEvidencia: true, estado: true, completadoEn: true, respuesta: true },
    });
    if (publicarEnRecuerdos) {
      for (const completitud of completitudes) {
        if (completitud.estado !== "APROBADO" || !completitud.urlEvidencia) continue;
        await tx.recuerdo.upsert({
          where: { claveIdempotencia: claveRecuerdoEvidencia(completitud.id) },
          update: {
            participanteId: completitud.participanteId,
            urlFoto: completitud.urlEvidencia,
            urlMiniatura: completitud.urlEvidencia,
            descripcion: comentarioEvidencia(completitud.respuesta) || guardado.titulo,
            visible: true,
            pendiente: false,
            reportado: false,
          },
          create: {
            participanteId: completitud.participanteId,
            urlFoto: completitud.urlEvidencia,
            urlMiniatura: completitud.urlEvidencia,
            descripcion: comentarioEvidencia(completitud.respuesta) || guardado.titulo,
            visible: true,
            pendiente: false,
            creadoEn: completitud.completadoEn,
            claveIdempotencia: claveRecuerdoEvidencia(completitud.id),
          },
        });
      }
    } else if (completitudes.length > 0) {
      await tx.recuerdo.updateMany({
        where: { claveIdempotencia: { in: completitudes.map((item) => claveRecuerdoEvidencia(item.id)) } },
        data: { visible: false },
      });
    }
    await actualizarPremioFotoMasReaccionada(tx);
  });
  await Promise.allSettled(imagenesAnterioresReemplazadas.map((url) => storage.eliminar(url)));
  anunciarCambio("desafio");
  revalidatePath("/admin/desafios");
  revalidatePath("/desafios");
}

export async function crearDesafioCierre() {
  await requerirAdmin();
  const existente = await db.desafio.findUnique({ where: { codigoQr: CODIGO_DESAFIO_CIERRE } });
  if (existente) {
    await db.desafio.update({
      where: { id: existente.id },
      data: {
        tipo: "ENCUESTA",
        configuracion: { formato: FORMATO_COSECHA, preguntas: PREGUNTAS_COSECHA },
      },
    });
  } else {
    await db.desafio.create({
      data: {
        codigoQr: CODIGO_DESAFIO_CIERRE,
        titulo: TITULO_DESAFIO_CIERRE,
        descripcion: "Recoge lo vivido en el encuentro: un aprendizaje, un agradecimiento y una acción para impulsar al regresar.",
        tipo: "ENCUESTA",
        puntos: 150,
        dia: 2,
        componenteId: null,
        ubicacion: "",
        estado: "BORRADOR",
        esSecreto: false,
        duracionMinutos: 60,
        configuracion: { formato: FORMATO_COSECHA, preguntas: PREGUNTAS_COSECHA },
      },
    });
  }
  revalidatePath("/admin/desafios");
}

export async function cambiarEstadoDesafio(formulario: FormData) {
  await requerirAdmin();
  const id = String(formulario.get("id"));
  const estado = String(formulario.get("estado")) as "BORRADOR" | "PUBLICADO" | "CERRADO";
  await db.desafio.update({
    where: { id },
    data: { estado, publicadoEn: estado === "PUBLICADO" ? new Date() : null },
  });
  anunciarCambio("desafio");
  revalidatePath("/admin/desafios");
}

export async function moverDesafio(formulario: FormData) {
  await requerirAdmin();
  const id = String(formulario.get("id") ?? "");
  const direccion = String(formulario.get("direccion") ?? "");
  if (!id || (direccion !== "SUBIR" && direccion !== "BAJAR")) return;
  const actual = await db.desafio.findUnique({ where: { id }, select: { id: true } });
  if (!actual) return;
  const desafios = await db.desafio.findMany({
    orderBy: [{ orden: "asc" }, { dia: "asc" }, { creadoEn: "desc" }],
    select: { id: true },
  });
  const posicion = desafios.findIndex((desafio) => desafio.id === id);
  const destino = direccion === "SUBIR" ? posicion - 1 : posicion + 1;
  if (posicion < 0 || destino < 0 || destino >= desafios.length) return;
  const reordenados = [...desafios];
  [reordenados[posicion], reordenados[destino]] = [reordenados[destino], reordenados[posicion]];
  await db.$transaction(
    reordenados.map((desafio, indice) => db.desafio.update({ where: { id: desafio.id }, data: { orden: indice + 1 } })),
  );
  revalidatePath("/admin/desafios");
  revalidatePath("/desafios");
}

export async function duplicarDesafio(formulario: FormData) {
  await requerirAdmin();
  const original = await db.desafio.findUniqueOrThrow({ where: { id: String(formulario.get("id")) } });
  const { id: _id, creadoEn: _creadoEn, orden: _orden, ...datos } = original;
  void _id;
  void _creadoEn;
  void _orden;
  const ultimo = await db.desafio.aggregate({ _max: { orden: true } });
  await db.desafio.create({
    data: {
      ...datos,
      configuracion: original.configuracion as Prisma.InputJsonValue,
      titulo: `${original.titulo} (copia)`,
      codigoQr: crearCodigoQr(original.titulo),
      estado: "BORRADOR",
      publicadoEn: null,
      orden: (ultimo._max.orden ?? 0) + 1,
    },
  });
  revalidatePath("/admin/desafios");
}

export async function eliminarDesafio(formulario: FormData) {
  await requerirAdmin();
  const id = String(formulario.get("id"));
  const completitudes = await db.completitud.count({ where: { desafioId: id } });
  if (completitudes > 0) {
    await db.desafio.update({ where: { id }, data: { estado: "CERRADO" } });
  } else {
    await db.desafio.delete({ where: { id } });
  }
  anunciarCambio("desafio");
  revalidatePath("/admin/desafios");
}

export async function reiniciarDesafio(formulario: FormData) {
  await requerirAdmin();
  const id = String(formulario.get("id") ?? "");
  if (!id) return;
  const resultado = await db.$transaction(async (tx) => {
    const desafio = await tx.desafio.findUnique({ where: { id }, select: { id: true } });
    if (!desafio) return { respuestas: 0, archivos: [] as string[] };
    const completitudes = await tx.completitud.findMany({
      where: { desafioId: id },
      select: { id: true, participanteId: true, urlEvidencia: true },
    });
    const clavesRecuerdos = completitudes.map((item) => claveRecuerdoEvidencia(item.id));
    const recuerdos = clavesRecuerdos.length
      ? await tx.recuerdo.findMany({
        where: { claveIdempotencia: { in: clavesRecuerdos } },
        select: { participanteId: true, urlFoto: true, urlMiniatura: true },
      })
      : [];
    if (clavesRecuerdos.length) {
      await tx.recuerdo.deleteMany({ where: { claveIdempotencia: { in: clavesRecuerdos } } });
    }
    await tx.completitud.deleteMany({ where: { desafioId: id } });
    await actualizarPremioFotoMasReaccionada(tx);
    const participantes = new Set([
      ...completitudes.map((item) => item.participanteId),
      ...recuerdos.map((item) => item.participanteId),
    ]);
    for (const participanteId of participantes) {
      await recalcularPuntosParticipante(tx, participanteId);
    }
    return {
      respuestas: completitudes.length,
      archivos: [
        ...completitudes.flatMap((item) => item.urlEvidencia ? [item.urlEvidencia] : []),
        ...recuerdos.flatMap((item) => [item.urlFoto, item.urlMiniatura]),
      ],
    };
  });
  await Promise.allSettled([...new Set(resultado.archivos)].map((url) => storage.eliminar(url)));
  anunciarCambio("desafio");
  anunciarCambio("puntos");
  anunciarCambio("recuerdo");
  revalidatePath("/admin/desafios");
  revalidatePath("/admin/participantes");
  revalidatePath("/desafios");
  revalidatePath("/ranking");
  revalidatePath("/recuerdos");
  revalidatePath("/admin/proyeccion/podio");
}

export async function ajustarPuntos(formulario: FormData) {
  const admin = await requerirAdmin();
  const participanteId = String(formulario.get("participanteId"));
  const puntos = Number(formulario.get("puntos"));
  const motivo = String(formulario.get("motivo") ?? "").trim();
  if (!motivo || !Number.isInteger(puntos) || puntos === 0) return;
  const participante = await db.participante.findUnique({
    where: { id: participanteId },
    select: { esStaff: true },
  });
  if (!participante || participante.esStaff) return;
  await db.$transaction(async (tx) => {
    await tx.ajustePuntos.create({ data: { participanteId, puntos, motivo, adminId: admin.id } });
    await recalcularPuntosParticipante(tx, participanteId);
  });
  anunciarCambio("puntos");
  revalidatePath("/admin/participantes");
}

export async function alternarParticipante(formulario: FormData) {
  await requerirAdmin();
  const id = String(formulario.get("participanteId"));
  const actual = await db.participante.findUniqueOrThrow({ where: { id } });
  await db.participante.update({ where: { id }, data: { activo: !actual.activo } });
  anunciarCambio("participante");
  revalidatePath("/admin/participantes");
}

export async function alternarStaff(formulario: FormData) {
  await requerirAdmin();
  const id = String(formulario.get("participanteId"));
  await db.$transaction(async (tx) => {
    const actual = await tx.participante.findUniqueOrThrow({
      where: { id },
      select: { esStaff: true },
    });
    await tx.participante.update({
      where: { id },
      data: { esStaff: !actual.esStaff },
    });
    await recalcularPuntosParticipante(tx, id);
    await actualizarPremioFotoMasReaccionada(tx);
  });
  anunciarCambio("participante");
  anunciarCambio("puntos");
  anunciarCambio("recuerdo");
  revalidatePath("/admin/participantes");
  revalidatePath(`/admin/participantes/${id}`);
  revalidatePath("/");
  revalidatePath("/ranking");
  revalidatePath("/admin");
  revalidatePath("/admin/proyeccion/podio");
}

export async function asignarEquipo(formulario: FormData) {
  await requerirAdmin();
  const participanteId = String(formulario.get("participanteId") ?? "");
  const correoAutorizadoId = String(formulario.get("correoAutorizadoId") ?? "");
  const equipoIdSolicitado = String(formulario.get("equipoId") ?? "");
  const equipoId = equipoIdSolicitado || null;
  if (!participanteId && !correoAutorizadoId) return;
  if (equipoId) {
    const equipo = await db.equipo.findUnique({ where: { id: equipoId }, select: { id: true } });
    if (!equipo) return;
  }
  await db.$transaction(async (tx) => {
    if (participanteId) {
      const participante = await tx.participante.findUnique({
        where: { id: participanteId },
        select: { correoAutorizado: { select: { id: true } } },
      });
      if (!participante) return;
      await tx.participante.update({ where: { id: participanteId }, data: { equipoId } });
      if (participante.correoAutorizado) {
        await tx.correoAutorizado.update({
          where: { id: participante.correoAutorizado.id },
          data: { equipoId },
        });
      }
      return;
    }
    const autorizacion = await tx.correoAutorizado.findUnique({
      where: { id: correoAutorizadoId },
      select: { participanteId: true },
    });
    if (!autorizacion) return;
    await tx.correoAutorizado.update({ where: { id: correoAutorizadoId }, data: { equipoId } });
    if (autorizacion.participanteId) {
      await tx.participante.update({
        where: { id: autorizacion.participanteId },
        data: { equipoId },
      });
    }
  });
  anunciarCambio("participante");
  revalidatePath("/admin/participantes");
  if (participanteId) revalidatePath(`/admin/participantes/${participanteId}`);
}

export async function eliminarParticipante(formulario: FormData) {
  await requerirAdmin();
  const id = String(formulario.get("participanteId"));
  const persona = await db.participante.findUniqueOrThrow({
    where: { id },
    include: { recuerdos: true, completitudes: { select: { urlEvidencia: true } } },
  });
  await db.$transaction(async (tx) => {
    await tx.sesionParticipante.deleteMany({ where: { participanteId: id } });
    await tx.correoAutorizado.updateMany({
      where: { participanteId: id },
      data: { participanteId: null },
    });
    await tx.participante.delete({ where: { id } });
    await actualizarPremioFotoMasReaccionada(tx);
  });
  await Promise.allSettled([
    storage.eliminar(persona.urlFoto),
    ...persona.recuerdos.flatMap((recuerdo) => [
      storage.eliminar(recuerdo.urlFoto),
      storage.eliminar(recuerdo.urlMiniatura),
    ]),
    ...persona.completitudes
      .filter((completitud) => completitud.urlEvidencia)
      .map((completitud) => storage.eliminar(completitud.urlEvidencia!)),
  ]);
  anunciarCambio("participante");
  revalidatePath("/admin/participantes");
  revalidatePath("/", "layout");
}

export async function agregarCorreosAutorizados(
  _estado: EstadoCorreosAutorizados,
  formulario: FormData,
): Promise<EstadoCorreosAutorizados> {
  await requerirAdmin();
  const { validos, invalidos } = clasificarCorreos(String(formulario.get("correos") ?? ""));
  if (invalidos.length > 0) {
    return {
      tipo: "error",
      mensaje: `Revisa estos correos: ${invalidos.slice(0, 5).join(", ")}${invalidos.length > 5 ? "…" : ""}`,
    };
  }
  if (validos.length === 0) {
    return { tipo: "error", mensaje: "Ingresa al menos un correo electrónico válido." };
  }
  try {
    const equipoIdSolicitado = String(formulario.get("equipoId") ?? "");
    const equipoId = equipoIdSolicitado || null;
    if (equipoId) {
      const equipo = await db.equipo.findUnique({ where: { id: equipoId }, select: { id: true } });
      if (!equipo) return { tipo: "error", mensaje: "El equipo seleccionado ya no está disponible." };
    }
    const existentes = await db.correoAutorizado.findMany({
      where: { correo: { in: validos } },
      select: { correo: true },
    });
    const yaAutorizados = new Set(existentes.map(({ correo }) => correo));
    const nuevos = validos.filter((correo) => !yaAutorizados.has(correo));
    if (nuevos.length > 0) {
      await db.correoAutorizado.createMany({ data: nuevos.map((correo) => ({ correo, equipoId })) });
    }
    revalidatePath("/admin/participantes");
    return {
      tipo: "exito",
      mensaje: nuevos.length === 0
        ? "Todos los correos ingresados ya estaban autorizados."
        : `${nuevos.length} correo${nuevos.length === 1 ? " quedó autorizado" : "s quedaron autorizados"}.`,
    };
  } catch (error) {
    console.error("[admin/participantes] No fue posible autorizar correos", error);
    return { tipo: "error", mensaje: "No pudimos guardar los correos. Intenta nuevamente." };
  }
}

export async function eliminarCorreoAutorizado(formulario: FormData) {
  await requerirAdmin();
  const id = String(formulario.get("id") ?? "");
  if (!id) return;
  try {
    await db.correoAutorizado.deleteMany({ where: { id, participanteId: null } });
    revalidatePath("/admin/participantes");
  } catch (error) {
    console.error("[admin/participantes] No fue posible retirar el correo", error);
  }
}

export async function revisarEvidencia(formulario: FormData) {
  await requerirAdmin();
  const id = String(formulario.get("id"));
  const decision = String(formulario.get("decision"));
  const urlParaEliminar = await db.$transaction(async (tx) => {
    const completitud = await tx.completitud.findUniqueOrThrow({
      where: { id },
      include: { desafio: true, participante: { select: { esStaff: true } } },
    });
    const aprobar = decision === "aprobar";
    const publicarEnRecuerdos = aprobar
      && Boolean((completitud.desafio.configuracion as { publicarEnRecuerdos?: boolean }).publicarEnRecuerdos);
    const configuracion = await tx.configuracionEvento.findUniqueOrThrow({
      where: { id: "evento" },
      select: { eliminarEvidenciasRechazadas: true },
    });
    const eliminarFoto = !aprobar && configuracion.eliminarEvidenciasRechazadas;
    await tx.completitud.update({
      where: { id },
      data: {
        estado: aprobar ? "APROBADO" : "RECHAZADO",
        puntosOtorgados: aprobar && !completitud.participante.esStaff ? completitud.desafio.puntos : 0,
        urlEvidencia: eliminarFoto ? null : completitud.urlEvidencia,
      },
    });
    if (publicarEnRecuerdos && completitud.urlEvidencia) {
      await tx.recuerdo.upsert({
        where: { claveIdempotencia: claveRecuerdoEvidencia(completitud.id) },
        update: {
          participanteId: completitud.participanteId,
          urlFoto: completitud.urlEvidencia,
          urlMiniatura: completitud.urlEvidencia,
          descripcion: comentarioEvidencia(completitud.respuesta) || completitud.desafio.titulo,
          visible: true,
          pendiente: false,
          reportado: false,
        },
        create: {
          participanteId: completitud.participanteId,
          urlFoto: completitud.urlEvidencia,
          urlMiniatura: completitud.urlEvidencia,
          descripcion: comentarioEvidencia(completitud.respuesta) || completitud.desafio.titulo,
          visible: true,
          pendiente: false,
          creadoEn: completitud.completadoEn,
          claveIdempotencia: claveRecuerdoEvidencia(completitud.id),
        },
      });
    } else {
      await tx.recuerdo.updateMany({
        where: { claveIdempotencia: claveRecuerdoEvidencia(completitud.id) },
        data: { visible: false },
      });
    }
    await recalcularPuntosParticipante(tx, completitud.participanteId);
    await actualizarPremioFotoMasReaccionada(tx);
    return eliminarFoto ? completitud.urlEvidencia : null;
  });
  if (urlParaEliminar) await storage.eliminar(urlParaEliminar).catch(() => undefined);
  anunciarCambio("puntos");
  anunciarCambio("recuerdo");
  revalidatePath("/admin/evidencias");
}

export async function moderarRecuerdo(formulario: FormData) {
  const admin = await requerirAdmin();
  const id = String(formulario.get("id"));
  const accion = String(formulario.get("accion"));
  const recuerdo = await db.recuerdo.findUniqueOrThrow({
    where: { id },
    include: { participante: { select: { esStaff: true } } },
  });
  if (accion === "eliminar") {
    await db.$transaction(async (tx) => {
      await tx.recuerdo.delete({ where: { id } });
      await tx.ajustePuntos.deleteMany({
        where: { participanteId: recuerdo.participanteId, motivo: `Recuerdo #${id}` },
      });
      await recalcularPuntosParticipante(tx, recuerdo.participanteId);
      await actualizarPremioFotoMasReaccionada(tx);
    });
    if (!recuerdo.claveIdempotencia?.startsWith(PREFIJO_EVIDENCIA_RECUERDO)) {
      await Promise.all([storage.eliminar(recuerdo.urlFoto), storage.eliminar(recuerdo.urlMiniatura)]);
    }
  } else if (accion === "mostrar") {
    await db.$transaction(async (tx) => {
      await tx.recuerdo.update({
        where: { id },
        data: { visible: true, pendiente: false, reportado: false },
      });
      if (recuerdo.pendiente) {
        const configuracion = await tx.configuracionEvento.findUniqueOrThrow({ where: { id: "evento" } });
        const conPuntos = await tx.ajustePuntos.count({
          where: { participanteId: recuerdo.participanteId, motivo: { startsWith: "Recuerdo #" } },
        });
        if (!recuerdo.participante.esStaff && configuracion.puntosPorRecuerdo > 0 && conPuntos < configuracion.maxRecuerdosConPuntos) {
          await tx.ajustePuntos.create({
            data: {
              participanteId: recuerdo.participanteId,
              puntos: configuracion.puntosPorRecuerdo,
              motivo: `Recuerdo #${id}`,
              adminId: admin.id,
            },
          });
          await recalcularPuntosParticipante(tx, recuerdo.participanteId);
        }
      }
      await actualizarPremioFotoMasReaccionada(tx);
    });
  } else {
    await db.$transaction(async (tx) => {
      await tx.recuerdo.update({ where: { id }, data: { visible: false } });
      await actualizarPremioFotoMasReaccionada(tx);
    });
  }
  anunciarCambio("recuerdo");
  anunciarCambio("puntos");
  revalidatePath("/admin/recuerdos");
}

export async function guardarConfiguracion(formulario: FormData) {
  await requerirAdmin();
  const eliminarEvidenciasRechazadas = formulario.get("eliminarEvidenciasRechazadas") === "on";
  await db.$transaction(async (tx) => {
    await tx.configuracionEvento.update({
      where: { id: "evento" },
      data: {
      nombreEvento: String(formulario.get("nombreEvento")),
      descripcionAgenda: String(formulario.get("descripcionAgenda") ?? "").trim().slice(0, 800),
      organizadoresAgenda: String(formulario.get("organizadoresAgenda") ?? "").trim().slice(0, 300),
      diplomaHabilitado: formulario.get("diplomaHabilitado") === "on",
      tamanoPodioIndividual: Number(formulario.get("tamanoPodioIndividual")),
      puntosPorRegistro: Math.max(0, Math.min(10_000, Number(formulario.get("puntosPorRegistro")) || 0)),
      modoAsistentes: String(formulario.get("modoAsistentes")) as "MOSAICO" | "CARRUSEL" | "DESTACADO",
      intervaloAsistentesSegundos: Number(formulario.get("intervaloAsistentesSegundos")),
      cicloMixto: String(formulario.get("cicloMixto")),
      rotacionAutomaticaProyeccion: formulario.get("rotacionAutomaticaProyeccion") === "on",
      puntosPorRecuerdo: Number(formulario.get("puntosPorRecuerdo")),
      maxRecuerdosConPuntos: Number(formulario.get("maxRecuerdosConPuntos")),
      maxRecuerdosPorParticipante: Math.max(1, Math.min(50, Number(formulario.get("maxRecuerdosPorParticipante")) || 10)),
      eliminarEvidenciasRechazadas,
        recuerdosRequierenAprobacion: formulario.get("recuerdosRequierenAprobacion") === "on",
        puntosFotoMasReaccionada: Math.max(0, Math.min(100_000, Number(formulario.get("puntosFotoMasReaccionada")) || 0)),
      },
    });
    await actualizarPremioFotoMasReaccionada(tx);
  });
  if (eliminarEvidenciasRechazadas) {
    const rechazadas = await db.completitud.findMany({
      where: { estado: "RECHAZADO", urlEvidencia: { not: null } },
      select: { id: true, urlEvidencia: true },
    });
    if (rechazadas.length > 0) {
      await db.completitud.updateMany({
        where: { id: { in: rechazadas.map((item) => item.id) } },
        data: { urlEvidencia: null },
      });
      await Promise.allSettled(rechazadas.map((item) => storage.eliminar(item.urlEvidencia!)));
    }
  }
  anunciarCambio("configuracion");
  anunciarCambio("puntos");
  revalidatePath("/admin/configuracion");
  revalidatePath("/");
  revalidatePath("/diploma");
}

export async function limpiarArchivosHuerfanos(formulario: FormData) {
  await requerirAdmin();
  if (String(formulario.get("confirmacion") ?? "").trim() !== "ELIMINAR HUERFANOS") return;
  const reporte = await obtenerReporteAlmacenamiento();
  if (!reporte.disponible || reporte.huerfanos.length === 0) return;
  await Promise.allSettled(
    reporte.huerfanos.map((ruta) => storage.eliminar(`/uploads/${ruta}`)),
  );
  revalidatePath("/admin/configuracion");
}

export async function guardarPdfAgenda(
  _estado: EstadoPdfAgenda,
  formulario: FormData,
): Promise<EstadoPdfAgenda> {
  await requerirAdmin();
  const archivo = formulario.get("agendaPdf");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { tipo: "error", mensaje: "Selecciona un archivo PDF." };
  }
  if (archivo.size > 4 * 1024 * 1024) {
    return { tipo: "error", mensaje: "El PDF no puede superar 4 MB." };
  }
  const datos = new Uint8Array(await archivo.arrayBuffer());
  if (new TextDecoder().decode(datos.slice(0, 5)) !== "%PDF-") {
    return { tipo: "error", mensaje: "El archivo seleccionado no es un PDF válido." };
  }

  let urlNueva: string | null = null;
  try {
    urlNueva = await storage.guardar(datos, "pdf", "agenda");
    await db.configuracionEvento.update({
      where: { id: "evento" },
      data: { urlAgendaPdf: urlNueva },
    });
  } catch (error) {
    console.error("No se pudo guardar el PDF personalizado de la agenda", error);
    return { tipo: "error", mensaje: "No pudimos guardar el PDF. Vuelve a intentarlo." };
  }
  anunciarCambio("agenda");
  revalidatePath("/admin/configuracion");
  revalidatePath("/api/agenda");
  return { tipo: "exito", mensaje: "PDF de la agenda guardado y disponible para los participantes." };
}

export async function quitarPdfAgenda(formulario: FormData) {
  await requerirAdmin();
  if (String(formulario.get("confirmacion") ?? "") !== "QUITAR") return;
  await db.configuracionEvento.update({
    where: { id: "evento" },
    data: { urlAgendaPdf: null },
  });
  anunciarCambio("agenda");
  revalidatePath("/admin/configuracion");
  revalidatePath("/api/agenda");
}

export async function guardarDiaAgenda(formulario: FormData) {
  await requerirAdmin();
  const id = String(formulario.get("id") ?? "");
  const nombre = String(formulario.get("nombre") ?? "").trim().slice(0, 100);
  const fechaIngresada = String(formulario.get("fecha") ?? "");
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(fechaIngresada) ? fechaIngresada : null;
  const ordenIngresado = Number(formulario.get("orden") ?? 1);
  const orden = Number.isFinite(ordenIngresado) ? Math.max(1, Math.trunc(ordenIngresado)) : 1;
  if (!nombre) return;
  if (id) await db.diaAgenda.update({ where: { id }, data: { nombre, fecha, orden } });
  else await db.diaAgenda.create({ data: { nombre, fecha, orden } });
  anunciarCambio("agenda");
  revalidatePath("/admin/configuracion");
}

export async function eliminarDiaAgenda(formulario: FormData) {
  await requerirAdmin();
  const id = String(formulario.get("id") ?? "");
  if (!id) return;
  const dia = await db.diaAgenda.findUnique({
    where: { id },
    select: {
      fotos: { select: { urlFoto: true } },
      momentos: { select: { urlFotoExpositor: true } },
    },
  });
  await db.diaAgenda.deleteMany({ where: { id } });
  await Promise.allSettled(
    [
      ...(dia?.momentos ?? [])
        .filter((momento) => momento.urlFotoExpositor)
        .map((momento) => storage.eliminar(momento.urlFotoExpositor!)),
      ...(dia?.fotos ?? []).map((foto) => storage.eliminar(foto.urlFoto)),
    ],
  );
  anunciarCambio("agenda");
  revalidatePath("/admin/configuracion");
}

export async function agregarFotosDiaAgenda(formulario: FormData) {
  await requerirAdmin();
  const diaId = String(formulario.get("diaId") ?? "");
  if (!diaId) return;
  const archivos = formulario.getAll("fotosDia")
    .filter((archivo): archivo is File => archivo instanceof File && archivo.size > 0);
  if (!archivos.length || archivos.some((archivo) => !extensionImagen(archivo.type) || archivo.size > 600_000)) return;
  const existentes = await db.fotoDiaAgenda.count({ where: { diaId } });
  const seleccionadas = archivos.slice(0, Math.min(2, Math.max(0, 6 - existentes)));
  if (!seleccionadas.length) return;
  const guardadas: string[] = [];
  try {
    for (const archivo of seleccionadas) {
      const imagen = await normalizarImagen(new Uint8Array(await archivo.arrayBuffer()), {
        dimensionMaxima: 1600,
        calidad: 82,
      });
      guardadas.push(await storage.guardar(
        imagen.datos,
        imagen.extension,
        "agenda-dias",
      ));
    }
    await db.$transaction(guardadas.map((urlFoto, indice) => db.fotoDiaAgenda.create({
      data: { diaId, urlFoto, orden: existentes + indice + 1 },
    })));
  } catch (error) {
    await Promise.allSettled(guardadas.map((url) => storage.eliminar(url)));
    throw error;
  }
  anunciarCambio("agenda");
  revalidatePath("/admin/configuracion");
}

export async function eliminarFotoDiaAgenda(formulario: FormData) {
  await requerirAdmin();
  const id = String(formulario.get("id") ?? "");
  if (!id) return;
  const foto = await db.fotoDiaAgenda.findUnique({ where: { id } });
  await db.fotoDiaAgenda.deleteMany({ where: { id } });
  if (foto) await storage.eliminar(foto.urlFoto).catch(() => undefined);
  anunciarCambio("agenda");
  revalidatePath("/admin/configuracion");
}

export async function guardarMomentoAgenda(formulario: FormData) {
  await requerirAdmin();
  const id = String(formulario.get("id") ?? "");
  const diaId = String(formulario.get("diaId") ?? "");
  const horaInicio = String(formulario.get("horaInicio") ?? "");
  const horaFin = String(formulario.get("horaFin") ?? "");
  const nombre = String(formulario.get("nombre") ?? "").trim().slice(0, 120);
  const descripcion = String(formulario.get("descripcion") ?? "").trim().slice(0, 800);
  const horaValida = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!diaId || !horaValida.test(horaInicio) || !horaValida.test(horaFin) || !nombre) return;
  const foto = formulario.get("fotoExpositor");
  const tieneFotoNueva = foto instanceof File && foto.size > 0;
  if (tieneFotoNueva && (!extensionImagen(foto.type) || foto.size > 250_000)) return;

  const existente = id
    ? await db.momentoAgenda.findUniqueOrThrow({ where: { id }, select: { urlFotoExpositor: true } })
    : null;
  const anterior = existente?.urlFotoExpositor ?? null;
  let nuevaUrl: string | null = null;
  try {
    if (tieneFotoNueva) {
      const imagen = await normalizarImagen(new Uint8Array(await foto.arrayBuffer()), {
        dimensionMaxima: 800,
        calidad: 82,
      });
      nuevaUrl = await storage.guardar(
        imagen.datos,
        imagen.extension,
        "expositores",
      );
    }
    const quitarFoto = formulario.get("quitarFotoExpositor") === "on";
    const urlFotoExpositor = nuevaUrl ?? (quitarFoto ? null : anterior);
    const destacado = formulario.get("destacado") === "on";
    const datos = { diaId, horaInicio, horaFin, nombre, descripcion, destacado, urlFotoExpositor };
    if (id) await db.momentoAgenda.update({ where: { id }, data: datos });
    else await db.momentoAgenda.create({ data: datos });
    if (anterior && anterior !== urlFotoExpositor) {
      await storage.eliminar(anterior).catch(() => undefined);
    }
  } catch (error) {
    if (nuevaUrl) await storage.eliminar(nuevaUrl).catch(() => undefined);
    throw error;
  }
  anunciarCambio("agenda");
  revalidatePath("/admin/configuracion");
}

export async function eliminarMomentoAgenda(formulario: FormData) {
  await requerirAdmin();
  const id = String(formulario.get("id") ?? "");
  if (!id) return;
  const momento = await db.momentoAgenda.findUnique({ where: { id }, select: { urlFotoExpositor: true } });
  await db.momentoAgenda.deleteMany({ where: { id } });
  if (momento?.urlFotoExpositor) {
    await storage.eliminar(momento.urlFotoExpositor).catch(() => undefined);
  }
  anunciarCambio("agenda");
  revalidatePath("/admin/configuracion");
}

export async function guardarCatalogo(formulario: FormData) {
  await requerirAdmin();
  const tipo = String(formulario.get("tipo"));
  const id = String(formulario.get("id") ?? "");
  const nombre = String(formulario.get("nombre") ?? "").trim();
  const orden = Number(formulario.get("orden") ?? 1);
  if (!nombre) return;
  if (tipo === "empresa") {
    if (id) await db.empresa.update({ where: { id }, data: { nombre, orden } });
    else await db.empresa.create({ data: { nombre, orden } });
  } else if (tipo === "componente") {
    const colorHex = String(formulario.get("colorHex") ?? "#0079C2");
    if (id) await db.componente.update({ where: { id }, data: { nombre, orden, colorHex } });
    else await db.componente.create({ data: { nombre, orden, colorHex } });
  } else if (tipo === "ubicacion") {
    if (id) await db.ubicacion.update({ where: { id }, data: { nombre, orden } });
    else await db.ubicacion.create({ data: { nombre, orden } });
  } else if (tipo === "equipo") {
    if (id) await db.equipo.update({ where: { id }, data: { nombre, orden } });
    else await db.equipo.create({ data: { nombre, orden } });
  }
  anunciarCambio("catalogo");
  revalidatePath("/admin/configuracion");
  revalidatePath("/admin/participantes");
}

export async function actualizarLogoEmpresa(formulario: FormData) {
  await requerirAdmin();
  const id = String(formulario.get("id") ?? "");
  const empresa = await db.empresa.findUniqueOrThrow({ where: { id } });
  if (formulario.get("accion") === "quitar") {
    await db.empresa.update({ where: { id }, data: { urlLogo: null } });
    if (empresa.urlLogo) await storage.eliminar(empresa.urlLogo).catch(() => undefined);
  } else {
    const logo = formulario.get("logo");
    if (!(logo instanceof File) || !extensionImagen(logo.type) || logo.size > 120_000) return;
    const imagen = await normalizarImagen(new Uint8Array(await logo.arrayBuffer()), {
      dimensionMaxima: 320,
      calidad: 78,
    });
    const urlLogo = await storage.guardar(
      imagen.datos,
      imagen.extension,
      "empresas",
    );
    await db.empresa.update({ where: { id }, data: { urlLogo } });
    if (empresa.urlLogo) await storage.eliminar(empresa.urlLogo).catch(() => undefined);
  }
  anunciarCambio("empresa");
  revalidatePath("/admin/configuracion");
  revalidatePath("/admin/proyeccion/asistentes");
  revalidatePath("/admin/proyeccion/podio");
}

export async function alternarCatalogo(formulario: FormData) {
  await requerirAdmin();
  const tipo = String(formulario.get("tipo"));
  const id = String(formulario.get("id"));
  if (tipo === "empresa") {
    const actual = await db.empresa.findUniqueOrThrow({ where: { id } });
    await db.empresa.update({ where: { id }, data: { activa: !actual.activa } });
  } else if (tipo === "componente") {
    const actual = await db.componente.findUniqueOrThrow({ where: { id } });
    await db.componente.update({ where: { id }, data: { activo: !actual.activo } });
  } else if (tipo === "ubicacion") {
    const actual = await db.ubicacion.findUniqueOrThrow({ where: { id } });
    await db.ubicacion.update({ where: { id }, data: { activa: !actual.activa } });
  } else if (tipo === "equipo") {
    const actual = await db.equipo.findUniqueOrThrow({ where: { id } });
    await db.equipo.update({ where: { id }, data: { activo: !actual.activo } });
  }
  anunciarCambio("catalogo");
  revalidatePath("/admin/configuracion");
  revalidatePath("/admin/participantes");
}

export type EstadoPreparacionPublico = {
  tipo: "inicial" | "error" | "exito";
  mensaje: string;
  eliminados?: {
    participantes: number;
    sesiones: number;
    completitudes: number;
    ajustes: number;
    recuerdos: number;
    reacciones: number;
    archivos: number;
    archivosConError: number;
  };
};

export async function prepararAplicacionPublico(
  _estado: EstadoPreparacionPublico,
  formulario: FormData,
): Promise<EstadoPreparacionPublico> {
  await requerirAdmin();
  const frase = "PREPARAR PARA PUBLICO REAL";
  if (
    String(formulario.get("confirmacionUno") ?? "").trim() !== frase
    || String(formulario.get("confirmacionDos") ?? "").trim() !== frase
  ) {
    return { tipo: "error", mensaje: "Las dos confirmaciones deben coincidir con la frase indicada." };
  }

  const [participantes, recuerdos, evidencias] = await Promise.all([
    db.participante.findMany({ select: { urlFoto: true } }),
    db.recuerdo.findMany({ select: { urlFoto: true, urlMiniatura: true } }),
    db.completitud.findMany({ where: { urlEvidencia: { not: null } }, select: { urlEvidencia: true } }),
  ]);
  const archivos = [...new Set([
    ...participantes.map(({ urlFoto }) => urlFoto),
    ...recuerdos.flatMap(({ urlFoto, urlMiniatura }) => [urlFoto, urlMiniatura]),
    ...evidencias.map(({ urlEvidencia }) => urlEvidencia!),
  ].filter((url) => url.startsWith("/uploads/")))];

  const eliminados = await db.$transaction(async (tx) => {
    await tx.limiteSolicitud.deleteMany();
    const reacciones = await tx.reaccionRecuerdo.deleteMany();
    const recuerdosEliminados = await tx.recuerdo.deleteMany();
    const completitudes = await tx.completitud.deleteMany();
    const ajustes = await tx.ajustePuntos.deleteMany();
    const sesiones = await tx.sesionParticipante.deleteMany();
    const participantesEliminados = await tx.participante.deleteMany();
    return {
      participantes: participantesEliminados.count,
      sesiones: sesiones.count,
      completitudes: completitudes.count,
      ajustes: ajustes.count,
      recuerdos: recuerdosEliminados.count,
      reacciones: reacciones.count,
    };
  });

  let archivosEliminados = 0;
  let archivosConError = 0;
  for (let indice = 0; indice < archivos.length; indice += 10) {
    const lote = await Promise.allSettled(
      archivos.slice(indice, indice + 10).map((url) => storage.eliminar(url)),
    );
    archivosEliminados += lote.filter(({ status }) => status === "fulfilled").length;
    archivosConError += lote.filter(({ status }) => status === "rejected").length;
  }

  anunciarCambio("purga");
  revalidatePath("/", "layout");
  return {
    tipo: "exito",
    mensaje: archivosConError
      ? `Los datos de prueba fueron eliminados. ${archivosConError} archivo(s) no pudieron borrarse del almacenamiento; puedes usar la limpieza de archivos huérfanos.`
      : "La aplicación quedó lista para registrar al público real.",
    eliminados: {
      ...eliminados,
      archivos: archivosEliminados,
      archivosConError,
    },
  };
}
