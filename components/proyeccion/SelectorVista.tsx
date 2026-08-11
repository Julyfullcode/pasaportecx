"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Images, Medal, Shuffle, Users, UsersRound } from "lucide-react";

const vistas = [
  { href: "/admin/proyeccion/asistentes", etiqueta: "Personas", Icono: Users },
  { href: "/admin/proyeccion/equipos", etiqueta: "Equipos", Icono: UsersRound },
  { href: "/admin/proyeccion/podio", etiqueta: "Podio individual", Icono: Medal },
  { href: "/admin/proyeccion/recuerdos", etiqueta: "Recuerdos", Icono: Images },
  { href: "/admin/proyeccion/mixto", etiqueta: "Vista automática", Icono: Shuffle },
];

export function SelectorVista() {
  const ruta = usePathname();
  return (
    <nav aria-label="Cambiar vista de proyección" className="flex items-center gap-1 rounded-full border border-white/15 bg-slate-950/20 p-1 backdrop-blur">
      {vistas.map(({ href, etiqueta, Icono }) => {
        const activa = ruta === href;
        return (
          <Link
            key={href}
            href={href}
            title={etiqueta}
            aria-label={etiqueta}
            className={`grid h-9 w-9 min-h-0 place-items-center rounded-full transition ${activa ? "bg-[var(--epm-verde)] text-[var(--epm-azul-profundo)]" : "text-white/75 hover:bg-white/15 hover:text-white"}`}
          >
            <Icono size={18} />
          </Link>
        );
      })}
    </nav>
  );
}
