"use client";
// Onglets de l'application Commande Express, communs à toutes ses pages.
import { usePathname } from "next/navigation";
import { Tabs } from "@/components/dashboard/design-system";
import { useT } from "@/components/I18nProvider";

export const PAGES_COMMANDE_EXPRESS = [
  { id: "apercu", label: "Vue d'ensemble", href: "/dashboard/commande-express" },
  { id: "confirmation", label: "Confirmation", href: "/dashboard/commande-express/confirmation" },
  { id: "anti-fraude", label: "Anti-fraude", href: "/dashboard/commande-express/anti-fraude" },
];

export function OngletsCommandeExpress() {
  const t = useT();
  const chemin = usePathname();
  return <Tabs tabs={PAGES_COMMANDE_EXPRESS.map((p) => ({ ...p, label: t(p.label), selected: chemin === p.href }))} />;
}
