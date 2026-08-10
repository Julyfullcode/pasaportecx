import Link from "next/link";
import { CheckCircle2, Clock3, LockKeyhole } from "lucide-react";
import { requerirParticipante } from "@/lib/auth";
import { db } from "@/lib/db";
import { esDesafioCosecha, esRespuestasCosecha } from "@/lib/cosecha-config";
import { etiquetaDiaDesafio } from "@/lib/dia-desafio";
import { estadoTemporalDesafio } from "@/lib/duracion-desafio";

export const dynamic = "force-dynamic";

export default async function Desafios({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string }>;
}) {
  const participante = await requerirParticipante("/desafios");
  const { dia = "1" } = await searchParams;
  const categoriaSeleccionada = dia === "2" ? "2" : dia === "permanentes" || dia === "0" ? "permanentes" : "1";
  const diaSeleccionado = categoriaSeleccionada === "permanentes" ? 0 : Number(categoriaSeleccionada);
  const desafiosBase = await db.desafio.findMany({
    where: {
      estado: "PUBLICADO",
      dia: diaSeleccionado,
      OR: [
        { esSecreto: false },
        { completitudes: { some: { participanteId: participante.id } } },
      ],
    },
    orderBy: [{ orden: "asc" }, { creadoEn: "asc" }],
    include: {
      completitudes: { where: { participanteId: participante.id }, take: 1 },
    },
  });
  const estaCompletado = (desafio: (typeof desafiosBase)[number]) => {
    const completitud = desafio.completitudes[0];
    const esCosecha = esDesafioCosecha(desafio.codigoQr, desafio.configuracion);
    return Boolean(completitud && (!esCosecha || esRespuestasCosecha(completitud.respuesta)));
  };
  const ahora = new Date();
  const desafios = desafiosBase.filter((desafio) => (
    estaCompletado(desafio) || estadoTemporalDesafio(desafio, ahora) === "DISPONIBLE"
  ));
  const completados = desafios.filter(estaCompletado);
  const pendientes = desafios.filter((desafio) => !estaCompletado(desafio));
  return (
    <div className="contenedor py-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="font-extrabold text-[var(--epm-verde-medio)]">Tu recorrido</p>
          <h1 className="text-3xl font-extrabold text-[var(--epm-azul-profundo)]">Desafíos</h1>
        </div>
        <span className="rounded-full bg-white px-3 py-2 text-sm font-extrabold shadow-soft">{completados.length} completados</span>
      </div>
      <div className="mt-5 grid grid-cols-3 rounded-full bg-white p-1 shadow-soft">
        {[
          { valor: "1", etiqueta: "Día 1" },
          { valor: "2", etiqueta: "Día 2" },
          { valor: "permanentes", etiqueta: "Permanentes" },
        ].map(({ valor, etiqueta }) => (
          <Link key={valor} href={`/desafios?dia=${valor}`} className={`grid min-h-11 place-items-center rounded-full px-2 text-center text-sm font-extrabold sm:text-base ${categoriaSeleccionada === valor ? "bg-[var(--epm-azul)] text-white" : "text-slate-500"}`}>
            {etiqueta}
          </Link>
        ))}
      </div>
      <Seccion titulo="Pendientes" desafios={pendientes} completado={false} esStaff={participante.esStaff} />
      <Seccion titulo="Completados" desafios={completados} completado esStaff={participante.esStaff} />
      {!desafios.length && (
        <div className="tarjeta mt-6 p-8 text-center">
          <LockKeyhole className="mx-auto text-[var(--epm-azul)]" />
          <h2 className="mt-3 text-xl font-extrabold">No hay desafíos visibles</h2>
          <p className="mt-2 text-sm text-slate-600">Algunos retos secretos solo se revelan cuando encuentras y escaneas su QR.</p>
        </div>
      )}
    </div>
  );
}

type TarjetaDesafio = Awaited<ReturnType<typeof db.desafio.findMany>>[number] & {
  completitudes: { puntosOtorgados: number; estado: string; respuesta: unknown }[];
};

function Seccion({ titulo, desafios, completado, esStaff }: { titulo: string; desafios: TarjetaDesafio[]; completado: boolean; esStaff: boolean }) {
  if (!desafios.length) return null;
  return (
    <section className="mt-7">
      <h2 className="mb-3 text-lg font-extrabold text-[var(--epm-azul-profundo)]">{titulo}</h2>
      <div className="space-y-3">
        {desafios.map((desafio) => (
          <Link href={`/d/${desafio.codigoQr}`} key={desafio.id} className="tarjeta flex min-h-28 overflow-hidden">
            <span className="w-2 shrink-0 bg-[var(--epm-azul)]" />
            <div className="flex flex-1 items-start gap-3 p-4">
              {completado ? <CheckCircle2 className="mt-1 shrink-0 text-[var(--epm-verde-medio)]" /> : <Clock3 className="mt-1 shrink-0 text-[var(--epm-azul)]" />}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-extrabold text-[var(--epm-azul-profundo)]">{desafio.titulo}</h3>
                  <span className="whitespace-nowrap rounded-full bg-sky-50 px-2 py-1 text-xs font-extrabold text-[var(--epm-azul)]">
                    {esStaff ? "Staff" : <>{completado ? `+${desafio.completitudes[0].puntosOtorgados}` : desafio.puntos} pts</>}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{desafio.descripcion}</p>
                <p className="mt-2 text-xs font-bold text-slate-500">{etiquetaDiaDesafio(desafio.dia)}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
