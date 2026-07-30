import { Logo } from "@/components/marca/Logo";
import { TexturaArcos } from "@/components/marca/TexturaArcos";
import { SelectorVista } from "@/components/proyeccion/SelectorVista";

export function MarcoProyeccion({
  primera,
  segunda,
  children,
}: {
  primera: string;
  segunda: string;
  children: React.ReactNode;
}) {
  return (
    <main className="marca-gradiente relative h-screen overflow-hidden p-[clamp(16px,2vw,34px)] text-white">
      <TexturaArcos />
      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <header className="flex shrink-0 items-center gap-[clamp(14px,2vw,32px)]">
          <Logo className="h-[clamp(34px,4vw,62px)] w-auto shrink-0" />
          <div className="h-12 w-px bg-white/20" />
          <h1 className="min-w-0 flex-1 font-display text-[clamp(24px,3vw,48px)] font-extrabold leading-none">
            <span className="text-[var(--epm-verde)]">{primera} </span>
            <span className="text-white">{segunda}</span>
          </h1>
          <div className="flex shrink-0 items-center gap-2">
            <SelectorVista />
            <span className="hidden items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-[clamp(11px,1vw,15px)] font-extrabold sm:inline-flex"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--epm-verde)]" /> EN VIVO</span>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        <footer className="shrink-0 pt-2 text-[clamp(9px,.8vw,13px)] font-light text-white/55">Vicepresidencia Experiencia Usuario-Cliente</footer>
      </div>
    </main>
  );
}
