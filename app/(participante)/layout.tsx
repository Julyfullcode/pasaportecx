import { Navegacion } from "@/components/participante/Navegacion";

export default function ParticipanteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="min-h-screen pb-28">{children}</main>
      <Navegacion />
    </>
  );
}
