import type { LucideIcon } from "lucide-react";

export function EncabezadoConfiguracion({
  icono: Icono,
  etiqueta,
  titulo,
  descripcion,
}: {
  icono: LucideIcon;
  etiqueta: string;
  titulo: string;
  descripcion: string;
}) {
  return (
    <summary className="marca-gradiente flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-white md:p-6">
      <span className="flex min-w-0 items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--epm-verde)] text-[var(--epm-azul-profundo)]"><Icono size={23} /></span>
        <span className="min-w-0">
          <small className="block font-extrabold text-[var(--epm-verde)]">{etiqueta}</small>
          <strong className="block text-xl leading-tight md:text-2xl">{titulo}</strong>
          <span className="mt-1 block max-w-4xl text-sm font-medium text-white/80">{descripcion}</span>
        </span>
      </span>
      <span className="shrink-0 text-2xl transition group-open:rotate-45" aria-hidden="true">+</span>
    </summary>
  );
}
