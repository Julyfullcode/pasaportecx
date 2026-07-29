export function CurvaMarca({ invertida = false }: { invertida?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1440 120"
      preserveAspectRatio="none"
      className={`absolute inset-x-0 ${invertida ? "top-0 rotate-180" : "bottom-0"} h-16 w-full md:h-24`}
    >
      <path d="M0 65C230 150 470 5 720 57s430 82 720 5v58H0Z" fill="var(--epm-gris-fondo)" />
    </svg>
  );
}
