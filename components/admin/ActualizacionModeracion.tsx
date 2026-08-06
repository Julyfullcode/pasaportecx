"use client";

import { useRouter } from "next/navigation";
import { usePollingVisible } from "@/lib/usePollingVisible";

export function ActualizacionModeracion() {
  const router = useRouter();
  usePollingVisible(() => router.refresh(), 2500);
  return null;
}
