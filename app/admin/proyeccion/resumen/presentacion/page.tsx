import type { Viewport } from "next";
import ResumenEvento from "../page";
import { AjustarPresentacionMovil } from "@/components/proyeccion/AjustarPresentacionMovil";

export const viewport: Viewport = {
  width: 1920,
  initialScale: 0.25,
  userScalable: true,
  themeColor: "#0B3B60",
};

export default async function PresentacionResumenEvento() {
  return <>
    <AjustarPresentacionMovil />
    {await ResumenEvento({ searchParams: Promise.resolve({ lienzo: "1" }) })}
  </>;
}
