import { redirect } from "next/navigation";
import { adminActual } from "@/lib/auth";
import { MarcaHeader } from "@/components/ui/MarcaHeader";
import { FormLogin } from "@/components/admin/FormLogin";

export default async function AdminLogin() {
  if (await adminActual()) redirect("/admin");
  return (
    <main className="min-h-screen">
      <MarcaHeader tituloVerde="Control del" tituloClaro="encuentro" compacto>
        <p className="mt-3 text-white/80">Acceso exclusivo para la organización VPEUC.</p>
      </MarcaHeader>
      <div className="mx-auto -mt-6 w-[min(100%-2rem,440px)]"><FormLogin /></div>
    </main>
  );
}
