import { Logo } from "@/components/marca/Logo";
import { TexturaArcos } from "@/components/marca/TexturaArcos";

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
    <main className="marca-gradiente relative min-h-screen overflow-hidden p-[clamp(24px,4vw,72px)] text-white">
      <TexturaArcos />
      <div className="relative z-10 flex min-h-[calc(100vh-8vw)] flex-col">
        <header className="flex items-start justify-between gap-8">
          <div>
            <Logo className="h-[clamp(44px,6vw,78px)] w-auto" />
            <h1 className="mt-5 font-display text-[clamp(38px,5vw,78px)] font-extrabold leading-[.95]">
              <span className="block text-[var(--epm-verde)]">{primera}</span>
              <span className="block text-white">{segunda}</span>
            </h1>
          </div>
          <span className="mt-2 inline-flex items-center gap-3 rounded-full bg-white/10 px-5 py-3 text-[clamp(14px,1.3vw,22px)] font-extrabold"><span className="h-3 w-3 animate-pulse rounded-full bg-[var(--epm-verde)]" /> EN VIVO</span>
        </header>
        <div className="flex-1">{children}</div>
        <footer className="mt-6 text-[clamp(12px,1.2vw,18px)] font-light text-white/70">Vicepresidencia Experiencia Usuario-Cliente</footer>
      </div>
    </main>
  );
}
