import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Supply-Link — Decentralized Supply Chain Tracker",
    short_name: "Supply-Link",
    description: "Transparent, tamper-proof product tracking powered by Stellar & Soroban.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f0f0f",
    theme_color: "#7c3aed",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
