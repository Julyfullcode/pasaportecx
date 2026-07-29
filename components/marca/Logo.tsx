import Image from "next/image";

export function Logo({ className = "h-12 w-auto" }: { className?: string }) {
  return (
    <Image
      src="/marca/logo-grupo-epm.svg"
      width={280}
      height={78}
      priority
      alt="Grupo EPM"
      className={className}
    />
  );
}
