// Statuts réels d'Axso → Badge (mapping §7.2, D3 et D22). Libellés français, à traduire par t() à l'affichage.
import { statutCommande, statutPaiement } from "@/app/(dashboard)/dashboard/commandes/statuts";
import type { BadgeProgress, BadgeTone } from "./Badge";

export type StatutBadge = { label: string; tone: BadgeTone; progress: BadgeProgress };

const PROGRES_COMMANDE: Record<string, [BadgeTone, BadgeProgress]> = {
  en_attente: ["attention", "incomplete"],
  confirmee: ["attention", "partial"],
  en_preparation: ["warning", "partial"],
  expediee: ["info", "partial"],
  tentative_echouee: ["critical", "none"],
  livree: ["success", "complete"],
  annulee: ["neutral", "none"],
};

const PROGRES_PAIEMENT: Record<string, [BadgeTone, BadgeProgress]> = {
  completed: ["success", "complete"],
  pending: ["attention", "partial"],
  failed: ["critical", "none"],
  refunded: ["neutral", "complete"],
  refunding: ["warning", "partial"],
};

const COD = new Set(["whatsapp_cod", "direct_cod"]);

/** Statut de traitement (statut unique de commande Axso). */
export function badgeCommande(statut: string): StatutBadge {
  const [tone, progress] = PROGRES_COMMANDE[statut] ?? ["neutral", "none"];
  return { label: statutCommande(statut).label, tone, progress };
}

/** Statut du paiement. Une commande à la livraison encore non payée s'affiche « Paiement à la livraison ». */
export function badgePaiement(statut: string, methode?: string): StatutBadge {
  if (statut === "pending" && methode && COD.has(methode)) return { label: "Paiement à la livraison", tone: "attention", progress: "partial" };
  const [tone, progress] = PROGRES_PAIEMENT[statut] ?? ["neutral", "none"];
  return { label: statutPaiement(statut).label, tone, progress };
}
