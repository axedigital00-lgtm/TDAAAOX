import { auth } from "@/lib/auth";
import { exigerModule } from "@/lib/permissions-server";

// Les sous-pages de Produits passent par la sidebar (Produits › …) et le menu
// d'actions de l'en-tête : plus de sous-barre latérale propre à la section.
export default async function ProduitsLayout({ children }: { children: React.ReactNode }) {
  await exigerModule(await auth(), "produits");
  return children;
}
