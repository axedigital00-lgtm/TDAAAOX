import type { Viewport } from "next";

// Téléphone (Android) : le clavier réduit la page au lieu de la recouvrir, le bouton Continuer reste atteignable.
export const viewport: Viewport = { interactiveWidget: "resizes-content" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
