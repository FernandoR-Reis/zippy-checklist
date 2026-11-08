import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zippy Check-list",
    short_name: "Zippy Check-list",
    description: "Checklists operacionais do Grupo Zippy.",
    start_url: "/hoje",
    display: "standalone",
    background_color: "#161F4C",
    theme_color: "#161F4C",
    icons: [
      {
        src: "/icon.png",
        sizes: "64x64",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
