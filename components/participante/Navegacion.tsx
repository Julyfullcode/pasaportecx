"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, Home, ImagePlus, ListChecks, MessagesSquare, Trophy } from "lucide-react";

const enlaces = [
  { href: "/", etiqueta: "Inicio", Icono: Home },
  { href: "/desafios", etiqueta: "Desafíos", Icono: ListChecks },
  { href: "/escanear", etiqueta: "Escanear", Icono: Camera, principal: true },
  { href: "/actividades", etiqueta: "Actividades", Icono: MessagesSquare },
  { href: "/recuerdos", etiqueta: "Recuerdos", Icono: ImagePlus },
  { href: "/ranking", etiqueta: "Ranking", Icono: Trophy },
];

export function Navegacion() {
  const ruta = usePathname();
  return (
    <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(11,59,96,.08)] backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-end justify-around">
        {enlaces.map(({ href, etiqueta, Icono, principal }) => {
          const activo = ruta === href || (href !== "/" && ruta.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              aria-current={activo ? "page" : undefined}
              className={`relative flex min-h-12 min-w-[52px] flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-extrabold sm:min-w-14 sm:text-[11px] ${
                principal
                  ? "-mt-8 h-16 w-16 rounded-full bg-[var(--epm-azul)] text-white shadow-lg"
                  : activo
                    ? "text-[var(--epm-azul)]"
                    : "text-slate-500"
              }`}
            >
              <Icono size={principal ? 27 : 22} strokeWidth={2} />
              <span>{etiqueta}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
