"use client";

import { useEffect, useState } from "react";

type Recuerdo = { id: string; urlFoto: string; descripcion: string | null; participante: { nombre: string } };

export function MuroRecuerdosProyeccion({ inicial }: { inicial: Recuerdo[] }) {
  const [recuerdos, setRecuerdos] = useState(inicial);
  useEffect(() => {
    let intervalo: ReturnType<typeof setInterval> | undefined;
    const actualizar = async () => { const r = await fetch("/api/proyeccion/datos", { cache: "no-store" }); if (r.ok) setRecuerdos((await r.json()).recuerdos); };
    const fuente = new EventSource("/api/stream"); fuente.onmessage = actualizar; fuente.onerror = () => { fuente.close(); intervalo = setInterval(actualizar, 5_000); };
    return () => { fuente.close(); if (intervalo) clearInterval(intervalo); };
  }, []);
  return (
    <div className="mt-[clamp(24px,4vh,55px)] grid grid-cols-4 gap-[clamp(10px,1.5vw,24px)]">
      {recuerdos.slice(0, 12).map((recuerdo, indice) => (
        <figure key={recuerdo.id} className={`entrada-suave relative overflow-hidden rounded-[1.5rem] bg-white/10 shadow-2xl ${indice === 0 ? "col-span-2 row-span-2" : ""}`}>
          <img src={recuerdo.urlFoto} alt={recuerdo.descripcion || `Recuerdo de ${recuerdo.participante.nombre}`} className="h-full min-h-[16vh] w-full object-cover" />
          <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 to-transparent p-4 pt-12 text-[clamp(11px,1.2vw,18px)] font-bold">{recuerdo.descripcion || `Por ${recuerdo.participante.nombre}`}</figcaption>
        </figure>
      ))}
    </div>
  );
}
