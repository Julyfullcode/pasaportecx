"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CameraOff, Keyboard, LoaderCircle } from "lucide-react";

function extraerCodigo(texto: string) {
  try {
    const url = new URL(texto);
    const partes = url.pathname.split("/").filter(Boolean);
    if (partes.at(-2) === "d") return partes.at(-1) ?? "";
  } catch {}
  return texto.trim();
}

export function LectorQr() {
  const router = useRouter();
  const montado = useRef(true);
  const [error, setError] = useState("");
  const [iniciando, setIniciando] = useState(true);

  useEffect(() => {
    montado.current = true;
    let lector: { stop: () => Promise<void>; clear: () => void } | undefined;
    import("html5-qrcode")
      .then(async ({ Html5Qrcode, Html5QrcodeSupportedFormats }) => {
        if (!montado.current) return;
        const scanner = new Html5Qrcode(
          "lector-qr",
          { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false },
        );
        lector = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (texto) => {
            const codigo = extraerCodigo(texto);
            void scanner.stop().finally(() => router.push(`/d/${encodeURIComponent(codigo)}`));
          },
          () => {},
        );
        setIniciando(false);
      })
      .catch(() => {
        setIniciando(false);
        setError("No pudimos iniciar la cámara.");
      });
    return () => {
      montado.current = false;
      void (async () => {
        try {
          await lector?.stop();
        } catch {
          // Navegar manualmente puede desmontar antes de que la cámara termine de iniciar.
        } finally {
          try {
            lector?.clear();
          } catch {}
        }
      })();
    };
  }, [router]);

  return (
    <div>
      <div className="tarjeta overflow-hidden p-3">
        {iniciando && <p className="flex items-center justify-center gap-2 py-16 font-bold text-slate-600"><LoaderCircle className="animate-spin" /> Iniciando cámara…</p>}
        <div id="lector-qr" className={iniciando ? "hidden" : ""} />
      </div>
      <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
        <p className="flex items-center gap-2 font-extrabold"><CameraOff size={19} /> ¿La cámara no funciona?</p>
        <p className="mt-1">En la configuración del navegador, permite el acceso a la cámara para este sitio y recarga. También puedes usar el código impreso.</p>
      </div>
      {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 font-bold text-red-700">{error}</p>}
      <form
        className="tarjeta mt-4 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          const codigo = String(new FormData(e.currentTarget).get("codigo") ?? "").trim();
          if (!/^[a-z0-9][a-z0-9-]{1,79}$/i.test(codigo)) {
            setError("El código ingresado no tiene un formato válido. Revísalo e intenta nuevamente.");
            return;
          }
          setError("");
          router.push(`/d/${encodeURIComponent(codigo)}`);
        }}
      >
        <label className="etiqueta flex items-center gap-2" htmlFor="codigo"><Keyboard size={19} /> Ingresar código manualmente</label>
        <div className="flex gap-2">
          <input className="campo" id="codigo" name="codigo" required minLength={2} maxLength={80} autoComplete="off" placeholder="Código del desafío" />
          <button className="boton-primario">Abrir</button>
        </div>
      </form>
    </div>
  );
}
