import { randomInt } from "node:crypto";
import { db } from "@/lib/db";
import { crearSesionParticipante } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { registroSchema } from "@/lib/validacion";
import { anunciarCambio } from "@/lib/eventos";

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function codigoRecuperacion() {
  return Array.from({ length: 6 }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
}

export async function POST(request: Request) {
  try {
    const formulario = await request.formData();
    const datos = registroSchema.parse(Object.fromEntries(formulario));
    const foto = formulario.get("foto");
    if (!(foto instanceof File) || !foto.type.startsWith("image/")) {
      return Response.json({ error: "Selecciona una foto válida" }, { status: 400 });
    }
    if (foto.size > 550_000) {
      return Response.json({ error: "La foto supera 500 KB. Intenta comprimirla de nuevo." }, { status: 400 });
    }
    const configuracion = await db.configuracionEvento.findUniqueOrThrow({ where: { id: "evento" } });
    let grupoId = datos.grupoId;
    if (configuracion.asignacionAutomatica) {
      const grupos = await db.grupo.findMany({
        where: { activo: true },
        include: { _count: { select: { participantes: { where: { activo: true } } } } },
        orderBy: { orden: "asc" },
      });
      grupoId = grupos.sort(
        (a, b) => a._count.participantes - b._count.participantes || a.orden - b.orden,
      )[0]?.id;
    }
    if (!grupoId) return Response.json({ error: "Selecciona un equipo" }, { status: 400 });
    const urlFoto = await storage.guardar(new Uint8Array(await foto.arrayBuffer()), "jpg", "perfiles");
    let codigo = codigoRecuperacion();
    while (await db.participante.findUnique({ where: { codigoRecuperacion: codigo } })) {
      codigo = codigoRecuperacion();
    }
    const participante = await db.participante.create({
      data: {
        nombre: datos.nombre,
        empresaId: datos.empresaId,
        grupoId,
        urlFoto,
        codigoRecuperacion: codigo,
      },
      include: { grupo: true },
    });
    await crearSesionParticipante(participante.id);
    anunciarCambio("participante");
    return Response.json({
      participante: {
        nombre: participante.nombre,
        codigoRecuperacion: participante.codigoRecuperacion,
        grupo: participante.grupo.nombre,
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "No pudimos completar el registro. Tus datos siguen en el formulario; vuelve a intentarlo." },
      { status: 500 },
    );
  }
}
