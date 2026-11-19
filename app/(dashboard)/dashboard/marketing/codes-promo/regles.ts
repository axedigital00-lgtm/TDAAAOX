// Réductions (masterprompt §8.14) : statut calculé sur les données réelles du code promo.
// Pas de date de début en base : la vue « Programmées » n'existe donc pas (D4).
import type { BadgeTone } from "@/components/ui/adm";

export type CodeReduction = {
  id: string;
  code: string;
  type: string;
  valeur: number;
  actif: boolean;
  utilisations: number;
  maxUtilisations: number | null;
  dateExpiration: string | null;
  minCommande?: number | null;
  produitIds?: string[];
};

export type StatutReduction = "actif" | "expire" | "inactif";

export function statutReduction(c: CodeReduction, maintenant = Date.now()): StatutReduction {
  if (!c.actif) return "inactif";
  if (c.dateExpiration && new Date(c.dateExpiration).getTime() < maintenant) return "expire";
  if (c.maxUtilisations != null && c.utilisations >= c.maxUtilisations) return "expire";
  return "actif";
}

export const BADGE_STATUT: Record<StatutReduction, { label: string; tone: BadgeTone }> = {
  actif: { label: "Actif", tone: "success" },
  expire: { label: "Expiré", tone: "neutral" },
  inactif: { label: "Inactif", tone: "neutral" },
};

export const VUES = ["toutes", "actives", "expirees"] as const;
const VUE_STATUT: Record<string, StatutReduction | undefined> = { actives: "actif", expirees: "expire" };

/** Vue (`?vue=`) puis recherche (`?q=`, sur le code) ; vue inconnue = toutes. */
export function filtrerReductions(codes: CodeReduction[], vue: string | null, q: string | null, maintenant = Date.now()) {
  const statut = vue ? VUE_STATUT[vue] : undefined;
  const motif = (q ?? "").trim().toUpperCase();
  return codes.filter((c) => (!statut || statutReduction(c, maintenant) === statut) && (!motif || c.code.toUpperCase().includes(motif)));
}
