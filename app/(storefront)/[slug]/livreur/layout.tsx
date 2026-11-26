// Page privée de la boutique (panier, paiement, compte client…) : jamais référencée par les moteurs.
import type { Metadata } from "next";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
