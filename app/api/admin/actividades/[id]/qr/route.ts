import { requerirAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { qrPngUrl } from "@/lib/qr";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requerirAdmin();
  const { id } = await params;
  const actividad = await db.actividad.findUnique({ where: { id }, select: { titulo: true, codigoAcceso: true } });
  if (!actividad?.codigoAcceso) return Response.json({ error: "Actividad no encontrada." }, { status: 404 });
  const base = (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/$/, "");
  const png = await qrPngUrl(`${base}/a/${actividad.codigoAcceso}`);
  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="qr-${id}.png"`,
      "Cache-Control": "private, no-store",
    },
  });
}
