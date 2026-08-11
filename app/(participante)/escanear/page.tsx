import { requerirParticipante } from "@/lib/auth";
import { LectorQr } from "@/components/participante/LectorQr";

export default async function Escanear() {
  await requerirParticipante("/escanear");
  return (
    <div className="contenedor py-6">
      <p className="font-extrabold text-[var(--epm-verde-medio)]">Encuentra el desafío</p>
      <h1 className="text-3xl font-extrabold text-[var(--epm-azul-profundo)]">Escanear QR</h1>
      <p className="mb-5 mt-2 text-sm text-slate-600">Apunta la cámara al código. La lectura ocurre dentro de tu navegador.</p>
      <LectorQr />
    </div>
  );
}
