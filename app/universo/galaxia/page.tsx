import QRCode from "qrcode";
import { headers } from "next/headers";
import { GalaxiaColectiva } from "@/components/universo/GalaxiaColectiva";

export const dynamic = "force-dynamic";

export default async function Galaxia({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const { demo } = await searchParams;
  const encabezados = await headers();
  const host = encabezados.get("x-forwarded-host")?.split(",")[0]?.trim() || encabezados.get("host") || "localhost:3000";
  const protocolo = encabezados.get("x-forwarded-proto")?.split(",")[0]?.trim() || (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  const urlIngreso = new URL("/universo/test", `${protocolo}://${host}`).toString();
  const qrIngreso = await QRCode.toDataURL(urlIngreso, {
    width: 900,
    margin: 2,
    color: { dark: "#071A38", light: "#FFFFFF" },
    errorCorrectionLevel: "H",
  });

  return <GalaxiaColectiva demo={demo === "1" || demo === "true"} qrIngreso={qrIngreso} urlIngreso={urlIngreso} />;
}
