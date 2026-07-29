import { requerirAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { Mixto } from "@/components/proyeccion/Mixto";

export const dynamic = "force-dynamic";

export default async function ProyeccionMixta() {
  await requerirAdmin();
  const configuracion = await db.configuracionEvento.findUniqueOrThrow({ where: { id: "evento" } });
  return <Mixto ciclo={configuracion.cicloMixto} />;
}
