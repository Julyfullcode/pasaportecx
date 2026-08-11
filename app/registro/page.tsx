import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { participanteActual } from "@/lib/auth";
import { MarcaHeader } from "@/components/ui/MarcaHeader";
import { RegistroForm } from "@/components/participante/RegistroForm";
import { RecuperarSesion } from "@/components/participante/RecuperarSesion";

export const dynamic = "force-dynamic";

export default async function Registro() {
  if (await participanteActual()) redirect("/");
  const empresas = await db.empresa.findMany({ where: { activa: true }, orderBy: { orden: "asc" } });
  return (
    <main className="pagina-registro min-h-screen">
      <div className="ocultar-tras-registro">
        <MarcaHeader tituloVerde="Encuentro de" tituloClaro="experiencia y comunicaciones">
          <p className="mt-4 max-w-xl text-base text-white/85"><strong>¡Todo comienza aquí!</strong> Regístrate y prepárate para conectar, descubrir y sumar.</p>
        </MarcaHeader>
      </div>
      <section className="contenedor relative z-10 mt-6 pb-10 md:mt-8">
        <div className="mx-auto max-w-2xl">
          <RegistroForm empresas={empresas} />
          <div className="ocultar-tras-registro"><RecuperarSesion /></div>
          <p className="ocultar-tras-registro mt-8 text-center text-xs text-slate-500">Vicepresidencia Experiencia Usuario-Cliente</p>
        </div>
      </section>
    </main>
  );
}
