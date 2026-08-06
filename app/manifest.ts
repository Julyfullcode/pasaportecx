import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pasaporte · Grupo EPM",
    short_name: "Pasaporte",
    description: "Desafíos, puntos y recuerdos del encuentro.",
    start_url: "/",
    display: "standalone",
    background_color: "#F4F7F9",
    theme_color: "#0B3B60",
    lang: "es",
    icons: [
      { src: "/marca/icono.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/marca/icono-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
