import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { crearSesionParticipante } from "@/lib/auth";

export default async function RecuperarDesdeQr({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const participante = await db.participante.findUnique({
    where: { codigoRecuperacion: codigo.trim().toUpperCase() },
  });
  if (!participante || !participante.activo) {
    redirect("/registro?recuperacion=invalida");
  }
  await crearSesionParticipante(participante.id);
  redirect("/");
}
