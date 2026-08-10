import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

const PARTICIPANTE_COOKIE = "pasaporte_participante";
const ADMIN_COOKIE = "pasaporte_admin";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function crearSesionParticipante(participanteId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiraEn = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  await db.sesionParticipante.create({
    data: { tokenHash: hashToken(token), participanteId, expiraEn },
  });
  (await cookies()).set(PARTICIPANTE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiraEn,
    path: "/",
  });
}

export async function crearSesionAdmin(adminId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiraEn = new Date(Date.now() + 1000 * 60 * 60 * 12);
  await db.sesionAdmin.create({
    data: { tokenHash: hashToken(token), adminId, expiraEn },
  });
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    expires: expiraEn,
    path: "/",
  });
}

export async function participanteActual() {
  const token = (await cookies()).get(PARTICIPANTE_COOKIE)?.value;
  if (!token) return null;
  const sesion = await db.sesionParticipante.findFirst({
    where: { tokenHash: hashToken(token), expiraEn: { gt: new Date() } },
    include: { participante: { include: { empresa: true, equipo: true } } },
  });
  return sesion?.participante ?? null;
}

export async function adminActual() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const sesion = await db.sesionAdmin.findFirst({
    where: { tokenHash: hashToken(token), expiraEn: { gt: new Date() } },
    include: { admin: true },
  });
  return sesion?.admin ?? null;
}

export async function requerirParticipante(destino = "/") {
  const participante = await participanteActual();
  if (!participante) redirect(`/registro?destino=${encodeURIComponent(destino)}`);
  return participante;
}

export async function requerirAdmin() {
  const admin = await adminActual();
  if (!admin) redirect("/admin/login");
  return admin;
}

export async function cerrarSesion(tipo: "participante" | "admin") {
  const almacen = await cookies();
  const nombre = tipo === "admin" ? ADMIN_COOKIE : PARTICIPANTE_COOKIE;
  const token = almacen.get(nombre)?.value;
  if (token) {
    const modelo = tipo === "admin" ? db.sesionAdmin : db.sesionParticipante;
    await (modelo.deleteMany as (args: object) => Promise<unknown>)({
      where: { tokenHash: hashToken(token) },
    });
  }
  almacen.delete(nombre);
}
