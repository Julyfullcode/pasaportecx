import { Logo } from "@/components/marca/Logo";
import { TexturaArcos } from "@/components/marca/TexturaArcos";
import { CurvaMarca } from "@/components/marca/CurvaMarca";

export function MarcaHeader({
  tituloVerde,
  tituloClaro,
  children,
  compacto = false,
}: {
  tituloVerde: string;
  tituloClaro: string;
  children?: React.ReactNode;
  compacto?: boolean;
}) {
  return (
    <header className={`marca-gradiente relative overflow-hidden text-white ${compacto ? "pb-16 pt-5" : "pb-24 pt-6"}`}>
      <TexturaArcos />
      <div className="contenedor relative z-10">
        <Logo className="h-11 w-auto" />
        <div className="mt-7 max-w-3xl">
          <h1 className={`${compacto ? "text-3xl" : "text-4xl md:text-6xl"} font-extrabold leading-[.98]`}>
            <span className="block text-[var(--epm-verde)]">{tituloVerde}</span>
            <span className="block text-white">{tituloClaro}</span>
          </h1>
          {children}
        </div>
      </div>
      <CurvaMarca />
    </header>
  );
}
