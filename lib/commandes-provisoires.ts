// Règles pures des commandes provisoires, paniers abandonnés et actions groupées (D28).
// Client-safe : aucun import de Prisma.
import { TRANSITIONS_VALIDES } from "@/lib/commandes";
import { formatMontant } from "@/lib/utils";

export type LigneBrouillon = { produitId: string; variante: string | null; quantite: number };

/** Totaux affichés et convertis : remise bornée au sous-total, livraison jamais négative. */
export function totauxBrouillon(lignes: { prix: number; quantite: number }[], remise: number, livraison: number) {
  const sousTotal = lignes.reduce((s, l) => s + l.prix * l.quantite, 0);
  const r = Math.min(Math.max(Number(remise) || 0, 0), sousTotal);
  const l = Math.max(Number(livraison) || 0, 0);
  return { sousTotal, remise: r, livraison: l, total: sousTotal - r + l };
}

export type EtatBrouillon = "ouvert" | "facture_envoyee" | "convertie";
export function etatBrouillon(b: { commandeId: string | null; factureEnvoyeeLe: Date | string | null }): EtatBrouillon {
  if (b.commandeId) return "convertie";
  return b.factureEnvoyeeLe ? "facture_envoyee" : "ouvert";
}
export const BADGES_BROUILLON = {
  ouvert: { label: "Ouverte", tone: "attention", progress: "incomplete" },
  facture_envoyee: { label: "Facture envoyée", tone: "info", progress: "partial" },
  convertie: { label: "Terminée", tone: "success", progress: "complete" },
} as const;

/** Badges du §7.2 : Non récupéré / Relance envoyée / Récupéré. */
export type EtatPanier = "non_recupere" | "relance" | "recupere";
export function etatPanier(p: { recupereLe: Date | string | null; relanceLe: Date | string | null }): EtatPanier {
  if (p.recupereLe) return "recupere";
  return p.relanceLe ? "relance" : "non_recupere";
}
export const BADGES_PANIER = {
  non_recupere: { label: "Non récupéré", tone: "warning" },
  relance: { label: "Relance envoyée", tone: "info" },
  recupere: { label: "Récupéré", tone: "success" },
} as const;

/** Un panier est « abandonné » s'il n'a pas bougé depuis 30 min (l'acheteur peut encore être au paiement). */
export const DELAI_ABANDON_MS = 30 * 60_000;

/** Statuts proposés en action groupée : sans saisie propre (annulation, livraison et échec restent unitaires). */
export const STATUTS_GROUPES = ["confirmee", "en_preparation"] as const;
export type StatutGroupe = (typeof STATUTS_GROUPES)[number];

/** Sépare les commandes qui peuvent passer au statut cible de celles qui ne le peuvent pas. */
export function repartirTransition(commandes: { id: string; statut: string }[], cible: string) {
  const possibles: string[] = [];
  const ignorees: string[] = [];
  for (const c of commandes) ((TRANSITIONS_VALIDES[c.statut] ?? []).includes(cible) ? possibles : ignorees).push(c.id);
  return { possibles, ignorees };
}

/** Récapitulatif envoyé au client par WhatsApp (lien wa.me, sans API payante). */
export function messageBrouillon(p: {
  boutique: string; client: string; devise: string;
  lignes: { nom: string; variante: string | null; prix: number; quantite: number }[];
  remise: number; livraison: number; total: number; note?: string | null;
}) {
  return [
    `🧾 *Récapitulatif de commande — ${p.boutique}*`,
    ``,
    `Bonjour ${p.client},`,
    `Voici le détail de votre commande :`,
    ``,
    ...p.lignes.map((l) => `• ${l.nom}${l.variante ? ` (${l.variante})` : ""} × ${l.quantite} — ${formatMontant(l.prix * l.quantite, p.devise)}`),
    ``,
    p.remise > 0 ? `🏷️ Remise : −${formatMontant(p.remise, p.devise)}` : null,
    p.livraison > 0 ? `🚚 Livraison : ${formatMontant(p.livraison, p.devise)}` : null,
    `💰 *Total : ${formatMontant(p.total, p.devise)}*`,
    `💳 Paiement à la livraison`,
    p.note ? `📝 ${p.note}` : null,
    ``,
    `Répondez « OK » pour confirmer votre commande. Merci !`,
  ].filter((x) => x !== null).join("\n");
}

/** Message de relance d'un panier abandonné. */
export function messageRelancePanier(p: { boutique: string; nom: string | null; lignes: { nom: string; quantite: number }[]; lien: string }) {
  return [
    `Bonjour${p.nom ? ` ${p.nom}` : ""} 👋`,
    `Vous avez laissé ces articles dans votre panier chez *${p.boutique}* :`,
    ...p.lignes.map((l) => `• ${l.nom} × ${l.quantite}`),
    ``,
    `Votre commande vous attend ici : ${p.lien}`,
    `Une question ? Répondez simplement à ce message.`,
  ].join("\n");
}

export const lienWhatsapp = (telephone: string, texte: string) => {
  const n = telephone.replace(/\D/g, "");
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(texte)}` : null;
};
