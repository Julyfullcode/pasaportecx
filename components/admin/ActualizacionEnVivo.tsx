"use client";

import { useRouter } from "next/navigation";
import { usePollingVisible } from "@/lib/usePollingVisible";

export function ActualizacionEnVivo() {
  const router = useRouter();
  usePollingVisible(() => router.refresh(), 10_000);
  return <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-500"><span className="h-2 w-2 animate-pulse rounded-full bg-[var(--epm-verde-medio)]" /> En vivo</span>;
}
