"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CameraOff, Keyboard, LoaderCircle, RefreshCw } from "lucide-react";

function extraerDestino(texto: string, codigoDesafio?: string) {
  try {
    const url = new URL(texto);
    const partes = url.pathname.split("/").filter(Boolean);
    const codigo = partes.at(-1) ?? "";
    const tipo = partes.at(-2);
    if (codigoDesafio) {
      const token = url.searchParams.get("llegada") ?? "";
      if (tipo === "d" && codigo === codigoDesafio && /^\d+\.[A-Za-z0-9_-]{43}$/.test(token)) {
        return `/d/${encodeURIComponent(codigo)}?llegada=${encodeURIComponent(token)}`;
      }
      return "";
    }
    if ((tipo === "d" || tipo === "a") && codigoValido(codigo)) return `/${tipo}/${encodeURIComponent(codigo)}`;
  } catch {}
  if (codigoDesafio) return "";
  const codigo = texto.trim();
  return codigoValido(codigo) ? `/d/${encodeURIComponent(codigo)}` : "";
}

function codigoValido(codigo: string) {
  return /^[a-z0-9][a-z0-9-]{1,79}$/i.test(codigo);
}

function mensajeErrorCamara(error: unknown) {
  const detalle = error instanceof Error
    ? `${error.name} ${error.message}`.toLowerCase()
    : String(error).toLowerCase();

  if (detalle.includes("notallowed") || detalle.includes("permission") || detalle.includes("denied")) {
    return "El navegador no tiene permiso para usar la cámara. Habilítalo para este sitio y vuelve a intentar.";
  }
  if (detalle.includes("notfound") || detalle.includes("devicesnotfound")) {
    return "No encontramos una cámara disponible en este dispositivo.";
  }
  if (detalle.includes("notreadable") || detalle.includes("trackstarterror") || detalle.includes("could not start")) {
    return "Otra aplicación está usando la cámara. Ciérrala y vuelve a intentar.";
  }
  if (detalle.includes("overconstrained") || detalle.includes("constraintnotsatisfied")) {
    return "La cámara disponible no es compatible con la configuración solicitada. Vuelve a intentar.";
  }
  if (detalle.includes("notsupported") || detalle.includes("media devices not supported") || detalle.includes("camera streaming not supported")) {
    return "Este navegador no permite abrir la cámara. Intenta con Chrome, Edge o Safari actualizado.";
  }
  return "No pudimos iniciar la cámara. Revisa el permiso y vuelve a intentar.";
}

export function LectorQr({
  codigoDesafio,
  ocultarIngresoManual = false,
}: {
  codigoDesafio?: string;
  ocultarIngresoManual?: boolean;
} = {}) {
  const router = useRouter();
  const procesandoLectura = useRef(false);
  const [error, setError] = useState("");
  const [iniciando, setIniciando] = useState(true);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let lector: { stop: () => Promise<void>; clear: () => void } | undefined;
    let activo = true;
    procesandoLectura.current = false;
    setIniciando(true);
    setError("");

    async function iniciar() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("NotSupportedError: getUserMedia no está disponible");
        }
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
        if (!activo) return;

        // La librería calcula el ancho del video con el ancho visible del
        // contenedor. Esperar un frame evita crear la cámara con ancho cero.
        await new Promise<void>((resolver) => requestAnimationFrame(() => resolver()));
        const contenedor = document.getElementById("lector-qr");
        if (!activo || !contenedor) return;
        if (contenedor.clientWidth === 0) {
          throw new Error("El contenedor de la cámara no tiene ancho visible");
        }

        const scanner = new Html5Qrcode(
          "lector-qr",
          { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false },
        );
        lector = scanner;
        await scanner.start(
          // html5-qrcode 2.3.8 admite el valor como texto; no admite `ideal`.
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (ancho, alto) => {
              const lado = Math.max(160, Math.min(260, Math.floor(Math.min(ancho, alto) * 0.72)));
              return { width: lado, height: lado };
            },
          },
          (texto) => {
            const destino = extraerDestino(texto, codigoDesafio);
            if (procesandoLectura.current || !destino) return;
            procesandoLectura.current = true;
            void scanner.stop().finally(() => router.push(destino));
          },
          () => {},
        );

        if (!activo) {
          try { await scanner.stop(); } catch {}
          try { scanner.clear(); } catch {}
          return;
        }
        setIniciando(false);
      } catch (fallo) {
        try { await lector?.stop(); } catch {}
        try { lector?.clear(); } catch {}
        if (activo) {
          setIniciando(false);
          setError(mensajeErrorCamara(fallo));
        }
      }
    }

    void iniciar();
    return () => {
      activo = false;
      void (async () => {
        try {
          await lector?.stop();
        } catch {
          // La navegación puede desmontar el lector mientras aún está iniciando.
        } finally {
          try { lector?.clear(); } catch {}
        }
      })();
    };
  }, [router, intento, codigoDesafio]);

  return (
    <div>
      <div className="tarjeta overflow-hidden p-3">
        <div className="relative min-h-[300px] overflow-hidden rounded-xl bg-slate-950">
          <div id="lector-qr" className="min-h-[300px] w-full [&_video]:max-w-full" />
          {iniciando && (
            <p className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-slate-50 font-bold text-slate-600">
              <LoaderCircle className="animate-spin" /> Iniciando cámara…
            </p>
          )}
          {!iniciando && error && <div className="absolute inset-0 bg-slate-100" aria-hidden="true" />}
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
        <p className="flex items-center gap-2 font-extrabold"><CameraOff size={19} /> ¿La cámara no funciona?</p>
        <p className="mt-1">En la configuración del navegador, permite el acceso a la cámara para este sitio y recarga.{codigoDesafio ? " Debes leer el QR dinámico que aparece en la pantalla del evento." : " También puedes usar el código impreso."}</p>
      </div>

      {error && (
        <div role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-red-700">
          <p className="font-bold">{error}</p>
          <button
            type="button"
            className="boton-secundario mt-3 !min-h-10 !border-red-200 !text-red-700"
            onClick={() => setIntento((valor) => valor + 1)}
          >
            <RefreshCw size={18} /> Intentar de nuevo
          </button>
        </div>
      )}

      {!ocultarIngresoManual && <form
        className="tarjeta mt-4 p-4"
        onSubmit={(evento) => {
          evento.preventDefault();
          const codigo = String(new FormData(evento.currentTarget).get("codigo") ?? "").trim();
          if (!codigoValido(codigo)) {
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
      </form>}
    </div>
  );
}
