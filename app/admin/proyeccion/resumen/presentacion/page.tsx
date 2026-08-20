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
