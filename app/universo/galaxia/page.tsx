import { GalaxiaColectiva } from "@/components/universo/GalaxiaColectiva";

export const dynamic = "force-dynamic";

export default async function Galaxia({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const { demo } = await searchParams;
  return <GalaxiaColectiva demo={demo === "1" || demo === "true"} />;
}
