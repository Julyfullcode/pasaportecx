"use client";

import { useActionState } from "react";
import { LoaderCircle, LockKeyhole } from "lucide-react";
import { iniciarSesionAdmin, type EstadoLogin } from "@/app/admin/actions";

const inicial: EstadoLogin = {};

export function FormLogin() {
  const [estado, accion, pendiente] = useActionState(iniciarSesionAdmin, inicial);
  return (
    <form action={accion} className="tarjeta space-y-4 p-6">
      <div><label className="etiqueta" htmlFor="usuario">Usuario</label><input className="campo" id="usuario" name="usuario" autoComplete="username" required /></div>
      <div><label className="etiqueta" htmlFor="password">Contraseña</label><input className="campo" id="password" name="password" type="password" autoComplete="current-password" required /></div>
      {estado.error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{estado.error}</p>}
      <button disabled={pendiente} className="boton-primario w-full">{pendiente ? <LoaderCircle className="animate-spin" /> : <LockKeyhole />} {pendiente ? "Validando…" : "Ingresar"}</button>
    </form>
  );
}
