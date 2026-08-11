"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RecuperarSesion() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="mt-5 text-center">
      <button type="button" onClick={() => setAbierto(!abierto)} className="text-sm font-extrabold text-[var(--epm-azul)] underline">
        Ya tengo cuenta · recuperar sesión
      </button>
      {abierto && (
        <form
          className="mx-auto mt-3 flex max-w-md gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const codigo = new FormData(e.currentTarget).get("codigo");
            const respuesta = await fetch("/api/recuperar", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ codigo }),
            });
            const cuerpo = await respuesta.json();
            if (!respuesta.ok) return setError(cuerpo.error);
            router.push("/");
            router.refresh();
          }}
        >
          <input name="codigo" className="campo tracking-widest" maxLength={6} required placeholder="ABC123" aria-label="Código de recuperación" />
          <button className="boton-primario">Recuperar</button>
        </form>
      )}
      {error && <p className="mt-2 text-sm font-bold text-red-700">{error}</p>}
    </div>
  );
}
