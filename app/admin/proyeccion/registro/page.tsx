import QRCode from "qrcode";
import { ScanLine, Sparkles, UserRoundPlus } from "lucide-react";
import { requerirAdmin } from "@/lib/auth";
import { LogoBlanco } from "@/components/marca/Logo";
import { TexturaArcos } from "@/components/marca/TexturaArcos";

export const dynamic = "force-dynamic";

export default async function InvitacionRegistro() {
  await requerirAdmin();
  const baseAplicacion = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const urlRegistro = `${baseAplicacion}/registro`;
  const qr = await QRCode.toDataURL(urlRegistro, {
    width: 1200,
    margin: 2,
    color: { dark: "#0B3B60", light: "#FFFFFF" },
    errorCorrectionLevel: "H",
  });
  const destinoRegistro = new URL(urlRegistro);
  const direccionVisible = `${destinoRegistro.host}${destinoRegistro.pathname}`;

  return (
    <main className="marca-gradiente relative min-h-screen overflow-hidden p-[clamp(20px,3vw,52px)] text-white lg:h-screen">
      <TexturaArcos />
      <div className="relative z-10 flex min-h-[calc(100vh-clamp(40px,6vw,104px))] flex-col lg:h-full lg:min-h-0">
        <header className="flex shrink-0 items-center">
          <LogoBlanco className="h-[clamp(46px,5vw,76px)] w-auto" />
        </header>

        <section className="grid min-h-0 flex-1 items-center gap-[clamp(24px,3vw,52px)] py-[clamp(24px,4vh,46px)] lg:grid-cols-[minmax(0,1.25fr)_minmax(360px,.75fr)]">
          <div className="max-w-5xl">
            <p className="text-[clamp(14px,1.4vw,21px)] font-extrabold uppercase tracking-[.2em] text-[var(--epm-verde)]">Únete al encuentro</p>
            <h1 className="mt-4 font-display text-[clamp(44px,6.4vw,92px)] font-extrabold leading-[.96]">
              Vive la <span className="block text-[var(--epm-verde)]">experiencia</span>
            </h1>
            <p className="mt-6 max-w-4xl text-[clamp(17px,1.7vw,26px)] leading-relaxed text-white/85">
              Escanea el código QR y comienza tu recorrido para conectar, descubrir y sumar en el Encuentro de experiencia y comunicaciones.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 text-[clamp(13px,1.1vw,17px)] font-extrabold">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-3"><ScanLine size={21} /> Escanea</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-3"><UserRoundPlus size={21} /> Regístrate</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-3"><Sparkles size={21} /> Vive la experiencia</span>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[560px] rounded-[clamp(24px,3vw,42px)] bg-white p-[clamp(18px,2.2vw,30px)] text-center text-[var(--epm-azul-profundo)] shadow-2xl">
            <p className="font-display text-[clamp(24px,2.5vw,38px)] font-extrabold leading-tight">Escanea para registrarte</p>
            <p className="mt-2 text-[clamp(13px,1.1vw,17px)] text-slate-600">Abre la cámara de tu celular y apunta al código.</p>
            <a href={urlRegistro} aria-label="Abrir registro de Pasaporte" className="mx-auto mt-4 block w-fit rounded-3xl border border-slate-100 bg-white p-2 shadow-inner">
              <img src={qr} alt="Código QR para registrarse en Pasaporte" className="aspect-square w-[min(46vh,470px)] max-w-full" />
            </a>
            <p className="mt-3 text-[clamp(12px,1vw,16px)] font-bold text-slate-500">También puedes ingresar a</p>
            <p className="mt-1 break-all text-[clamp(15px,1.25vw,20px)] font-extrabold text-[var(--epm-azul)]">{direccionVisible}</p>
          </div>
        </section>

      </div>
    </main>
  );
}
