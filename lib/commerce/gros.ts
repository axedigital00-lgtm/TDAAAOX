// Vente aux grossistes : prix dégressifs par quantité et règles de quantité (minimum, maximum,
// multiple). Règles pures, appliquées côté serveur au checkout (le navigateur n'affiche qu'une estimation).
import { z } from "zod";

export const venteGrosSchema = z.object({
  paliers: z.array(z.object({ min: z.number().int().min(2).max(100000), prix: z.number().positive() })).max(10).default([]),
  min: z.number().int().min(1).max(100000).optional(),
  max: z.number().int().min(1).max(100000).optional(),
  multiple: z.number().int().min(1).max(10000).optional(),
}).superRefine((v, ctx) => {
  if (v.min && v.max && v.min > v.max) ctx.addIssue({ code: "custom", message: "Le minimum dépasse le maximum" });
  const seuils = v.paliers.map((p) => p.min);
  if (new Set(seuils).size !== seuils.length) ctx.addIssue({ code: "custom", message: "Deux paliers ont la même quantité" });
});
export type VenteGros = z.infer<typeof venteGrosSchema>;

/** Lit la configuration stockée (JSON libre en base) ; null si absente ou invalide. */
export function lireVenteGros(brut: unknown): VenteGros | null {
  if (!brut) return null;
  const r = venteGrosSchema.safeParse(brut);
  return r.success ? r.data : null;
}

/** Prix unitaire pour une quantité : le palier le plus haut atteint, jamais au-dessus du prix de base. */
export function prixPourQuantite(prixBase: number, regles: VenteGros | null, quantite: number): number {
  if (!regles?.paliers.length) return prixBase;
  const atteint = [...regles.paliers].sort((a, b) => b.min - a.min).find((p) => quantite >= p.min);
  return atteint ? Math.min(atteint.prix, prixBase) : prixBase;
}

/** Message d'erreur si la quantité ne respecte pas les règles, sinon null. */
export function erreurQuantite(regles: VenteGros | null, quantite: number, nom: string): string | null {
  if (!regles) return null;
  if (regles.min && quantite < regles.min) return `${nom} : minimum ${regles.min} unités par commande`;
  if (regles.max && quantite > regles.max) return `${nom} : maximum ${regles.max} unités par commande`;
  if (regles.multiple && regles.multiple > 1 && quantite % regles.multiple !== 0) return `${nom} : se commande par multiples de ${regles.multiple}`;
  return null;
}

/** Paliers triés pour l'affichage (« À partir de 10 : 4 500 FCFA »), avec la remise en %. */
export function grilleAffichage(prixBase: number, regles: VenteGros | null) {
  return (regles?.paliers ?? [])
    .filter((p) => p.prix < prixBase)
    .sort((a, b) => a.min - b.min)
    .map((p) => ({ min: p.min, prix: p.prix, remisePct: Math.round((1 - p.prix / prixBase) * 100) }));
}
