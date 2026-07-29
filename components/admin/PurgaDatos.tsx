"use client";

import { useState } from "react";
import { purgarDatos } from "@/app/admin/actions";

const FRASE = "ELIMINAR DATOS PERSONALES";

export function PurgaDatos() {
  const [primera, setPrimera] = useState("");
  const [segunda, setSegunda] = useState("");
  const valido = primera === FRASE && segunda === FRASE;
  return (
    <form action={purgarDatos} className="mt-4 space-y-3">
      <p className="text-sm text-red-800">Escribe <strong>{FRASE}</strong> dos veces. Esta acción elimina fotos y recuerdos, anonimiza nombres y desactiva los perfiles.</p>
      <input className="campo" value={primera} onChange={(e) => setPrimera(e.target.value)} placeholder="Primera confirmación" />
      <input className="campo" name="confirmacion" value={segunda} onChange={(e) => setSegunda(e.target.value)} placeholder="Segunda confirmación" />
      <button disabled={!valido} className="min-h-12 w-full rounded-full bg-red-700 px-4 font-extrabold text-white disabled:opacity-40">Purgar datos personales</button>
    </form>
  );
}
