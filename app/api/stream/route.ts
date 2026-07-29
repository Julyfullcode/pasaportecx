import { eventos } from "@/lib/eventos";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  let limpieza = () => {};
  const stream = new ReadableStream({
    start(controlador) {
      const enviar = (datos: object) => {
        controlador.enqueue(encoder.encode(`data: ${JSON.stringify(datos)}\n\n`));
      };
      enviar({ tipo: "conectado", fecha: new Date().toISOString() });
      const cambio = (evento: object) => enviar(evento);
      eventos.on("cambio", cambio);
      const latido = setInterval(
        () => controlador.enqueue(encoder.encode(": latido\n\n")),
        20_000,
      );
      limpieza = () => {
        clearInterval(latido);
        eventos.off("cambio", cambio);
        try {
          controlador.close();
        } catch {}
      };
      request.signal.addEventListener("abort", limpieza);
    },
    cancel() {
      limpieza();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
