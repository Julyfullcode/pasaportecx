import { esConfiguracionEncuestaMixta } from "@/lib/encuesta-mixta";
import { esConfiguracionMatricula } from "@/lib/matricula";
import { esRespuestasCosecha, PREGUNTAS_COSECHA } from "@/lib/cosecha-config";

export type DetalleRespuestaEncuesta = {
  pregunta: string;
  descripcion: string;
  elemento: string;
  respuesta: string | number | boolean;
};

function objeto(valor: unknown): Record<string, unknown> | null {
  return valor && typeof valor === "object" && !Array.isArray(valor)
    ? valor as Record<string, unknown>
    : null;
}

function valorCelda(valor: unknown): string | number | boolean {
  if (typeof valor === "string" || typeof valor === "number" || typeof valor === "boolean") return valor;
  if (valor === null || valor === undefined) return "";
  if (Array.isArray(valor)) return valor.map(valorCelda).join("; ");
  return JSON.stringify(valor);
}

function aplanarRespuesta(valor: unknown, ruta = "Respuesta"): DetalleRespuestaEncuesta[] {
  const datos = objeto(valor);
  if (!datos) return [{ pregunta: ruta, descripcion: "", elemento: "", respuesta: valorCelda(valor) }];
  return Object.entries(datos).flatMap(([clave, contenido]) => {
    const anidado = objeto(contenido);
    return anidado
      ? aplanarRespuesta(contenido, ruta === "Respuesta" ? clave : `${ruta} · ${clave}`)
      : [{ pregunta: ruta === "Respuesta" ? clave : ruta, descripcion: "", elemento: ruta === "Respuesta" ? "" : clave, respuesta: valorCelda(contenido) }];
  });
}

export function detallarRespuestasEncuesta(configuracion: unknown, respuesta: unknown): DetalleRespuestaEncuesta[] {
  if (esConfiguracionEncuestaMixta(configuracion)) {
    const respuestas = objeto(objeto(respuesta)?.respuestas) ?? {};
    return configuracion.preguntas.flatMap((pregunta) => {
      if (pregunta.tipo !== "MATRIZ_0_10") {
        return [{
          pregunta: pregunta.titulo,
          descripcion: pregunta.descripcion,
          elemento: "",
          respuesta: valorCelda(respuestas[pregunta.id]),
        }];
      }
      const valores = objeto(respuestas[pregunta.id]) ?? {};
      return pregunta.elementos.map((elemento) => ({
        pregunta: pregunta.titulo,
        descripcion: pregunta.descripcion,
        elemento: elemento.texto,
        respuesta: valorCelda(valores[elemento.id]),
      }));
    });
  }

  if (esRespuestasCosecha(respuesta) || objeto(configuracion)?.formato === "cosecha") {
    const respuestas = objeto(respuesta) ?? {};
    return PREGUNTAS_COSECHA.map((pregunta) => ({
      pregunta: pregunta.titulo,
      descripcion: pregunta.ayuda,
      elemento: "",
      respuesta: valorCelda(respuestas[pregunta.id]),
    }));
  }

  if (esConfiguracionMatricula(configuracion)) {
    const opcionId = objeto(respuesta)?.opcionId;
    const opcion = configuracion.opciones.find((item) => item.id === opcionId);
    return [{
      pregunta: "Alternativa seleccionada",
      descripcion: "",
      elemento: opcion ? `Opción ${opcion.id.toUpperCase()}` : "",
      respuesta: opcion?.texto ?? valorCelda(opcionId),
    }];
  }

  const config = objeto(configuracion);
  const datos = objeto(respuesta);
  if (config && typeof config.pregunta === "string") {
    return [{
      pregunta: config.pregunta,
      descripcion: "",
      elemento: "",
      respuesta: valorCelda(datos?.valor ?? respuesta),
    }];
  }

  const detalles = aplanarRespuesta(respuesta);
  return detalles.length ? detalles : [{ pregunta: "Respuesta", descripcion: "", elemento: "", respuesta: "" }];
}