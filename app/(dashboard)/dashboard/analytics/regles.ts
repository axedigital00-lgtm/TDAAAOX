// Analyses de données : calculs purs (testés dans tests/adm-analyses.test.ts). Aucune base, aucun chiffre inventé.
import type { Bornes } from "@/lib/tableau-de-bord";
import { tauxEchecCod } from "../clients/regles";

/** Bornes de la période précédente, au format attendu par courbe() (même découpage heure/jour). */
export const bornesPrecedentes = (b: Bornes): Bornes => ({ ...b.precedente, precedente: b.precedente, parHeure: b.parHeure });

/** Courbe de comparaison ramenée à la longueur de la période en cours (un mois de 31 j ↔ 30 j). */
export function aligner(comparaison: number[], n: number) {
  return Array.from({ length: n }, (_, i) => comparaison[i] ?? 0);
}

/** Ventilation des ventes payées : on n'affiche une ligne que si elle a un montant (taxes, réductions). */
export function ventilation(s: { sousTotal: number; reduction: number; livraison: number; taxes: number; total: number }) {
  return [
    { cle: "brutes", label: "Ventes brutes", valeur: s.sousTotal },
    ...(s.reduction > 0 ? [{ cle: "reductions", label: "Réductions", valeur: -s.reduction }] : []),
    ...(s.reduction > 0 ? [{ cle: "nettes", label: "Ventes nettes", valeur: s.sousTotal - s.reduction }] : []),
    ...(s.livraison > 0 ? [{ cle: "livraison", label: "Frais de livraison", valeur: s.livraison }] : []),
    ...(s.taxes > 0 ? [{ cle: "taxes", label: "Taxes", valeur: s.taxes }] : []),
    { cle: "total", label: "Ventes totales", valeur: s.total, strong: true },
  ];
}

/** Taux d'échec des livraisons à la livraison (COD) par ville, même règle que la fiche client.
 *  Villes sans livraison COD terminée : absentes (aucun taux honnête). */
export function echecsParVille(cmds: { ville: string; methodePaiement: string; statut: string; expedieeAt: Date | null }[], max = 5) {
  const parVille = new Map<string, typeof cmds>();
  for (const c of cmds) {
    const v = c.ville?.trim() || "—";
    parVille.set(v, [...(parVille.get(v) ?? []), c]);
  }
  return [...parVille].flatMap(([ville, l]) => {
    const taux = tauxEchecCod(l);
    return taux ? [{ ville, ...taux }] : [];
  }).sort((a, b) => b.pourcent - a.pourcent || b.total - a.total).slice(0, max);
}
