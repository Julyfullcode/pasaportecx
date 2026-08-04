"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Camera,
  DoorOpen,
  Image,
  LayoutDashboard,
  MonitorPlay,
  Settings,
  Target,
  Users,
} from "lucide-react";
import { salirAdmin } from "@/app/admin/actions";
import { Logo } from "@/components/marca/Logo";

const enlaces = [
  ["/admin", "Resumen", LayoutDashboard],
  ["/admin/desafios", "Desafíos", Target],
  ["/admin/participantes", "Participantes", Users],
  ["/admin/evidencias", "Evidencias", Camera],
  ["/admin/recuerdos", "Recuerdos", Image],
  ["/admin/configuracion", "Configuración", Settings],
  ["/admin/reportes", "Reportes", BarChart3],
] as const;

export function NavegacionAdmin({ pendientes }: { pendientes: number }) {
  const ruta = usePathname();
  return (
    <>
      <aside className="marca-gradiente fixed inset-y-0 left-0 z-40 hidden w-64 flex-col p-4 text-white lg:flex">
        <Logo className="h-10 w-auto" />
        <p className="mb-6 mt-4 border-b border-white/15 pb-4 text-sm font-bold text-white/70">Centro de control VPEUC</p>
        <nav className="flex-1 space-y-1" aria-label="Administración">
          {enlaces.map(([href, etiqueta, Icono]) => {
            const activo = href === "/admin" ? ruta === href : ruta.startsWith(href);
            return (
              <Link key={href} href={href} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 font-bold ${activo ? "bg-white text-[var(--epm-azul-profundo)]" : "text-white/80 hover:bg-white/10 hover:text-white"}`}>
                <Icono size={20} />
                <span>{etiqueta}</span>
                {href === "/admin/evidencias" && pendientes > 0 && <span className="ml-auto rounded-full bg-amber-400 px-2 py-0.5 text-xs text-slate-900">{pendientes}</span>}
              </Link>
            );
          })}
        </nav>
        <Link href="/admin/proyeccion/mixto" target="_blank" className="mb-2 flex items-center gap-2 rounded-xl bg-white/10 p-3 font-bold"><MonitorPlay /> Abrir proyección</Link>
        <form action={salirAdmin}><button className="flex w-full items-center gap-2 rounded-xl p-3 text-white/75"><DoorOpen /> Cerrar sesión</button></form>
      </aside>
      <nav className="fixed inset-x-0 bottom-0 z-50 flex overflow-x-auto border-t bg-white p-2 shadow-lg lg:hidden" aria-label="Administración móvil">
        {enlaces.slice(0, 7).map(([href, etiqueta, Icono]) => (
          <Link key={href} href={href} className={`relative flex min-w-[74px] flex-col items-center gap-0.5 rounded-lg py-1 text-[10px] font-extrabold ${ruta === href ? "text-[var(--epm-azul)]" : "text-slate-500"}`}>
            <Icono size={20} /> {etiqueta}
            {href === "/admin/evidencias" && pendientes > 0 && <span className="absolute right-2 top-0 rounded-full bg-amber-400 px-1 text-[9px] text-slate-900">{pendientes}</span>}
          </Link>
        ))}
      </nav>
    </>
  );
}
