import Link from "next/link";
import { ArrowLeft, WalletCards } from "lucide-react";
import { LogoBlanco } from "@/components/marca/Logo";

export default async function WalletPendiente({ searchParams }: { searchParams: Promise<{ plataforma?: string }> }) {
  const { plataforma } = await searchParams;
  const nombre = plataforma === "apple" ? "Apple Wallet" : "Google Wallet";
  return (
    <main className="marca-gradiente grid min-h-screen place-items-center p-5">
      <section className="w-full max-w-xl rounded-[2rem] bg-white p-7 text-center shadow-2xl md:p-10">
        <LogoBlanco className="mx-auto h-10 w-auto rounded-xl bg-[var(--epm-azul-profundo)] p-2" />
        <span className="mx-auto mt-7 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-sky-100 to-emerald-100 text-[var(--epm-azul)]"><WalletCards size={34} /></span>
        <h1 className="mt-5 text-3xl font-extrabold text-[var(--epm-azul-profundo)]">{nombre}</h1>
        <p className="mt-3 leading-relaxed text-slate-600">El acceso ya aparece en tu pasaporte. La emisión oficial del pase debe habilitarse con las credenciales del evento antes de poder guardarlo en esta Wallet.</p>
        <p className="mt-3 text-sm font-bold text-emerald-800">Tu registro y tu pasaporte continúan disponibles normalmente.</p>
        <Link href="/" className="boton-primario mt-7"><ArrowLeft size={18} /> Volver a la aplicación</Link>
      </section>
    </main>
  );
}
