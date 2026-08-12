import QRCode from "qrcode";
import { ExternalLink, ScanLine } from "lucide-react";
import { requerirAdmin } from "@/lib/auth";
import { LogoBlanco } from "@/components/marca/Logo";
import { TexturaArcos } from "@/components/marca/TexturaArcos";

export const dynamic = "force-dynamic";

const URL_VALORACION = "https://valoracionex-epm.lovable.app";

export default async function ProyeccionValoracion() {
  await requerirAdmin();
  const qr = await QRCode.toDataURL(URL_VALORACION, {
    width: 1400,
    margin: 2,
    color: { dark: "#0B3B60", light: "#FFFFFF" },
    errorCorrectionLevel: "H",
  });

  return (
    <main className="marca-gradiente relative grid min-h-screen overflow-hidden p-[clamp(20px,3vw,52px)] text-white lg:h-screen">
      <TexturaArcos />
      <div className="relative z-10 flex min-h-0 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-6 border-b border-white/20 pb-[clamp(16px,2vh,28px)]">
          <LogoBlanco className="h-[clamp(46px,5vw,76px)] w-auto" />
          <span className="hidden rounded-full bg-white/15 px-5 py-3 font-extrabold md:inline-flex">Valoración de experiencia</span>
        </header>

        <section className="grid min-h-0 flex-1 items-center gap-[clamp(22px,4vw,70px)] py-[clamp(20px,3vh,42px)] lg:grid-cols-[minmax(0,1fr)_minmax(420px,.82fr)]">
          <div className="max-w-4xl">
            <p className="font-extrabold tracking-wide text-[clamp(15px,1.3vw,21px)] text-[var(--epm-verde)]">Tu opinión nos ayuda a mejorar</p>
            <h1 className="mt-4 font-display text-[clamp(42px,5.4vw,82px)] font-extrabold leading-[.96]">
              Valora tu <span className="block text-[var(--epm-verde)]">experiencia</span>
            </h1>
            <p className="mt-6 max-w-3xl text-[clamp(18px,1.8vw,28px)] leading-relaxed text-white/85">
              Escanea el código QR con tu celular y comparte tu valoración.
            </p>
            <div className="mt-8 inline-flex items-center gap-3 rounded-full bg-white/10 px-5 py-4 text-[clamp(14px,1.2vw,19px)] font-extrabold">
              <ScanLine size={26} /> Abre la cámara y apunta al código
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-[650px] flex-col items-center rounded-[clamp(26px,3vw,44px)] bg-white p-[clamp(16px,2vw,28px)] text-center text-[var(--epm-azul-profundo)] shadow-2xl">
            <a href={URL_VALORACION} target="_blank" rel="noopener noreferrer" aria-label="Abrir valoración de experiencia" className="block rounded-3xl bg-white p-2 shadow-inner">
              <img src={qr} alt="Código QR para abrir la valoración de experiencia" className="aspect-square w-[min(61vh,570px)] max-w-full object-contain" />
            </a>
            <a href={URL_VALORACION} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full px-4 font-extrabold text-[clamp(14px,1.15vw,18px)] text-[var(--epm-azul)]">
              valoracionex-epm.lovable.app <ExternalLink size={19} />
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}