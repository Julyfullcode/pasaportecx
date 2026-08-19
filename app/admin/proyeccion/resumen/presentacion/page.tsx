import type { Viewport } from "next";
import ResumenEvento from "../page";

export const viewport: Viewport = {
  width: 1920,
  userScalable: true,
  themeColor: "#0B3B60",
};

export default function PresentacionResumenEvento() {
  return ResumenEvento({ searchParams: Promise.resolve({ lienzo: "1" }) });
}
