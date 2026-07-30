import Image from "next/image";

export function Logo({ className = "h-12 w-auto" }: { className?: string }) {
  return (
    <Image
      src="/marca/logo-grupo-epm-oficial.png"
      width={1702}
      height={386}
      priority
      alt="Grupo EPM"
      className={className}
    />
  );
}
