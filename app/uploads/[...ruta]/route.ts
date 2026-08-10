import { storage } from "@/lib/storage";

export const dynamic = "force-dynamic";

const tipos: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  svg: "image/svg+xml",
  pdf: "application/pdf",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ruta: string[] }> },
) {
  try {
    const { ruta } = await params;
    const url = `/uploads/${ruta.join("/")}`;
    const datos = await storage.leer(url);
    const extension = ruta.at(-1)?.split(".").at(-1)?.toLowerCase() ?? "";
    return new Response(datos, {
      headers: {
        "Content-Type": tipos[extension] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
        "CDN-Cache-Control": "public, max-age=31536000, immutable",
        "Vercel-CDN-Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json({ error: "Archivo no encontrado" }, { status: 404 });
  }
}
