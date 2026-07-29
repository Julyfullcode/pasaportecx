import { Check, X } from "lucide-react";
import { db } from "@/lib/db";
import { revisarEvidencia } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminEvidencias() {
  const evidencias = await db.completitud.findMany({
    where: { estado: "PENDIENTE", desafio: { tipo: "EVIDENCIA_FOTO" } },
    orderBy: { completadoEn: "asc" },
    include: { participante: { include: { empresa: true, grupo: true } }, desafio: true },
  });
  return (
    <div className="p-4 md:p-7">
      <div><p className="font-extrabold text-[var(--epm-verde-medio)]">Revisión y puntaje</p><h1 className="text-3xl font-extrabold text-[var(--epm-azul-profundo)]">Evidencias pendientes</h1><p className="mt-2 text-sm text-slate-600">{evidencias.length} fotos esperan decisión.</p></div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {evidencias.map((evidencia) => (
          <article key={evidencia.id} className="tarjeta overflow-hidden">
            <img src={evidencia.urlEvidencia ?? ""} alt={`Evidencia de ${evidencia.participante.nombre}`} className="aspect-[4/3] w-full object-cover" />
            <div className="p-4"><h2 className="font-extrabold">{evidencia.desafio.titulo}</h2><p className="text-sm text-slate-600">{evidencia.participante.nombre} · {evidencia.participante.grupo.nombre}</p><p className="mt-1 text-xs text-slate-500">{evidencia.completadoEn.toLocaleString("es-CO")} · {evidencia.desafio.puntos} puntos</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <form action={revisarEvidencia}><input type="hidden" name="id" value={evidencia.id} /><input type="hidden" name="decision" value="rechazar" /><button className="boton-secundario w-full !border-red-300 !text-red-700"><X /> Rechazar</button></form>
                <form action={revisarEvidencia}><input type="hidden" name="id" value={evidencia.id} /><input type="hidden" name="decision" value="aprobar" /><button className="boton-primario w-full !bg-[var(--epm-verde-medio)]"><Check /> Aprobar</button></form>
              </div>
            </div>
          </article>
        ))}
      </div>
      {!evidencias.length && <div className="tarjeta mt-6 p-10 text-center"><Check className="mx-auto text-[var(--epm-verde-medio)]" size={36} /><h2 className="mt-3 text-xl font-extrabold">Todo al día</h2><p className="text-slate-600">No hay evidencias pendientes.</p></div>}
    </div>
  );
}
