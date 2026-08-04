import Image from "next/image";

export function Logo({ className = "h-12 w-auto" }: { className?: string }) {
  return (
    <Image
      src="/marca/logo-grupo-epm-blanco.png"
      width={1702}
      height={386}
      priority
      alt="Grupo EPM"
      className={className}
    />
  );
}

export function LogoBlanco({ className = "h-10 w-auto" }: { className?: string }) {
  return (
    <Image
      src="/marca/logo-grupo-epm-blanco.png"
      width={1702}
      height={386}
      priority
      alt="Grupo EPM"
      className={className}
    />
  );
}
