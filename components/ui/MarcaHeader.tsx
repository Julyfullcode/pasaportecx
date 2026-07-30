import { Logo } from "@/components/marca/Logo";
import { TexturaArcos } from "@/components/marca/TexturaArcos";
import { CurvaMarca } from "@/components/marca/CurvaMarca";

export function MarcaHeader({
  tituloVerde,
  tituloClaro,
  children,
  compacto = false,
  lateral = false,
}: {
  tituloVerde: string;
  tituloClaro: string;
  children?: React.ReactNode;
  compacto?: boolean;
  lateral?: boolean;
}) {
  return (
    <header className={`marca-gradiente relative overflow-hidden text-white ${compacto ? "pb-12 pt-4" : "pb-24 pt-6"}`}>
      <TexturaArcos />
      <div className="contenedor relative z-10">
        <Logo className={compacto ? "h-8 w-auto" : "h-11 w-auto"} />
        <div className={`${compacto ? "mt-4" : "mt-7"} ${lateral ? "flex max-w-none items-center justify-between gap-3" : "max-w-3xl"}`}>
          <h1 className={`${compacto ? "text-3xl" : "text-4xl md:text-6xl"} ${lateral ? "min-w-0 flex-1" : ""} font-extrabold leading-[.98]`}>
            <span className="block text-[var(--epm-verde)]">{tituloVerde}</span>
            <span className={`block text-white ${lateral ? "truncate" : ""}`}>{tituloClaro}</span>
          </h1>
          {lateral ? <div className="min-w-0 shrink-0">{children}</div> : children}
        </div>
      </div>
      <CurvaMarca />
    </header>
  );
}
