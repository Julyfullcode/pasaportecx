import { requerirAdmin } from "@/lib/auth";
import { obtenerTarjetasCierre } from "@/lib/cosecha-proyeccion";
import { MarcoProyeccion } from "@/components/proyeccion/MarcoProyeccion";
import { RotadorCierre } from "@/components/proyeccion/RotadorCierre";

export const dynamic = "force-dynamic";

export default async function ProyeccionCierre() {
  await requerirAdmin();
  const tarjetas = await obtenerTarjetasCierre();
  return (
    <MarcoProyeccion primera="Nuestra cosecha" segunda="nos inspira">
      <RotadorCierre inicial={tarjetas} />
    </MarcoProyeccion>
  );
}
