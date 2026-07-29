import type { LucideIcon } from "lucide-react";

export function EstadoVacio({
  Icono,
  titulo,
  texto,
}: {
  Icono: LucideIcon;
  titulo: string;
  texto: string;
}) {
  return (
    <div className="tarjeta flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-[var(--epm-gris-fondo)] text-[var(--epm-azul)]">
        <Icono size={28} strokeWidth={2} />
      </span>
      <h2 className="text-xl font-extrabold text-[var(--epm-azul-profundo)]">{titulo}</h2>
      <p className="mt-2 max-w-md text-sm text-slate-600">{texto}</p>
    </div>
  );
}
