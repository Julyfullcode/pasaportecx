import type { Viewport } from "next";
import ResumenEvento from "../page";

export const viewport: Viewport = {
  width: 1920,
  initialScale: 0.25,
  userScalable: true,
  themeColor: "#0B3B60",
};

const AJUSTAR_ESCALA_INICIAL = `
(() => {
  const actualizar = () => {
    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;
    const horizontal = window.matchMedia('(orientation: landscape)').matches;
    const anchoPantalla = horizontal
      ? Math.max(window.screen.width, window.screen.height)
      : Math.min(window.screen.width, window.screen.height);
    const escala = Math.max(0.1, Math.min(1, anchoPantalla / 1920));
    meta.setAttribute('content', 'width=1920, initial-scale=' + escala + ', user-scalable=yes');
    const movil = Math.max(window.screen.width, window.screen.height) <= 1100;
    const raiz = document.documentElement;
    raiz.classList.toggle('presentacion-movil', movil);
    if (movil) {
      const valor = (pixeles) => (pixeles / escala) + 'px';
      raiz.style.setProperty('--inicio-ancho', valor(Math.max(520, anchoPantalla - 32)));
      raiz.style.setProperty('--inicio-padding', valor(12));
      raiz.style.setProperty('--inicio-logo', valor(30));
      raiz.style.setProperty('--inicio-etiqueta', valor(11));
      raiz.style.setProperty('--inicio-titulo', valor(42));
      raiz.style.setProperty('--inicio-descripcion', valor(15));
      raiz.style.setProperty('--inicio-boton-alto', valor(44));
      raiz.style.setProperty('--inicio-boton-texto', valor(14));
      raiz.style.setProperty('--inicio-boton-lateral', valor(20));
      raiz.style.setProperty('--inicio-ayuda', valor(9));
      raiz.style.setProperty('--inicio-espacio', valor(9));
    }
  };
  actualizar();
  window.addEventListener('orientationchange', () => window.setTimeout(actualizar, 180));
})();
`;

export default async function PresentacionResumenEvento() {
  return <>
    <script dangerouslySetInnerHTML={{ __html: AJUSTAR_ESCALA_INICIAL }} />
    {await ResumenEvento({ searchParams: Promise.resolve({ lienzo: "1" }) })}
  </>;
}
