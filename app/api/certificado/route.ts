import { GET as generarCertificado } from "@/app/api/diploma/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return generarCertificado();
}
