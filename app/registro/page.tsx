import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { participanteActual } from "@/lib/auth";
import { MarcaHeader } from "@/components/ui/MarcaHeader";
import { RegistroForm } from "@/components/participante/RegistroForm";
import { RecuperarSesion } from "@/components/participante/RecuperarSesion";

export const dynamic = "force-dynamic";

export default async function Registro() {
  if (await participanteActual()) redirect("/");
  const [empresas, grupos, configuracion] = await Promise.all([
    db.empresa.findMany({ where: { activa: true }, orderBy: { orden: "asc" } }),
    db.grupo.findMany({
      where: { activo: true },
      orderBy: { orden: "asc" },
      include: { _count: { select: { participantes: { where: { activo: true } } } } },
    }),
    db.configuracionEvento.findUniqueOrThrow({ where: { id: "evento" } }),
  ]);
  return (
    <main className="min-h-screen">
      <MarcaHeader tituloVerde="Vive la" tituloClaro="experiencia">
        <p className="mt-4 max-w-xl text-base text-white/85">Tu pasaporte para conectar, descubrir y sumar durante el encuentro del Grupo EPM.</p>
      </MarcaHeader>
      <section className="contenedor -mt-8 pb-10">
        <div className="mx-auto max-w-2xl">
          <RegistroForm
            empresas={empresas}
            grupos={grupos.map((g) => ({ ...g, integrantes: g._count.participantes }))}
            automatico={configuracion.asignacionAutomatica}
            nombreEvento={configuracion.nombreEvento}
          />
          <RecuperarSesion />
          <p className="mt-8 text-center text-xs text-slate-500">Vicepresidencia Experiencia Usuario-Cliente</p>
        </div>
      </section>
    </main>
  );
}
