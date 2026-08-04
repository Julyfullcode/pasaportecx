import { requerirAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { MarcoProyeccion } from "@/components/proyeccion/MarcoProyeccion";
import { RotadorAsistentes } from "@/components/proyeccion/RotadorAsistentes";

export const dynamic = "force-dynamic";

export default async function ProyeccionAsistentes() {
  await requerirAdmin();
  const [configuracion, personas] = await Promise.all([
    db.configuracionEvento.findUniqueOrThrow({ where: { id: "evento" } }),
    db.participante.findMany({
      where: { activo: true },
      orderBy: { creadoEn: "desc" },
      select: {
        id: true,
        nombre: true,
        urlFoto: true,
        empresa: { select: { nombre: true, urlLogo: true } },
      },
    }),
  ]);
  return <MarcoProyeccion primera="Somos parte de" segunda="una gran experiencia"><RotadorAsistentes inicial={personas} modo={configuracion.modoAsistentes} intervalo={configuracion.intervaloAsistentesSegundos} /></MarcoProyeccion>;
}
