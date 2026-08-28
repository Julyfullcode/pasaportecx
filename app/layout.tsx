import type { Metadata, Viewport } from "next";
import { Nunito_Sans, Poppins, Quicksand } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["600", "700", "800"],
  display: "swap",
});

const nunito = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-nunito",
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

const quicksand = Quicksand({
  subsets: ["latin"],
  variable: "--font-quicksand",
  weight: ["400", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Pasaporte", template: "%s · Pasaporte" },
  description: "Experiencia gamificada del encuentro Grupo EPM",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/marca/icono.svg", apple: "/marca/icono.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  themeColor: "#0B3B60",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${poppins.variable} ${nunito.variable} ${quicksand.variable} font-sans`}>{children}</body>
    </html>
  );
}
