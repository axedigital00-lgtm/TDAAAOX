// Accueil du Command Center : bornes des périodes (heure de Douala) et classement
// des boutiques par plan. Module pur (testé dans tests/command-center-accueil.test.ts).
import { JOUR, debutJour, debutSemaine, debutAnnee, type Fenetre } from "./contexte";

const DECALAGE = 3_600_000; // Africa/Douala = UTC+1, sans heure d'été

/** 1er du mois 00:00 (heure de Douala) du mois contenant t, décalé de `n` mois. */
export function debutMois(t: number, n = 0): number {
  const d = new Date(t + DECALAGE);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1) - DECALAGE;
}

export type PeriodeCA = "jour" | "semaine" | "mois" | "annee";

/**
 * Période calendaire en cours (début → maintenant) et la même durée écoulée au début
 * de la période précédente : aujourd'hui jusqu'à 14 h vs hier jusqu'à 14 h, etc.
 * La comparaison ne déborde jamais sur la période en cours (mois plus court).
 */
export function periodesCA(t: number): { id: PeriodeCA; cur: Fenetre; prev: Fenetre }[] {
  const bornes: [PeriodeCA, number, number][] = [
    ["jour", debutJour(t), debutJour(t) - JOUR],
    ["semaine", debutSemaine(t), debutSemaine(t) - 7 * JOUR],
    ["mois", debutMois(t), debutMois(t, -1)],
    ["annee", debutAnnee(t), debutAnnee(t, -1)],
  ];
  return bornes.map(([id, debut, debutPrec]) => ({
    id,
    cur: { debut, fin: t },
    prev: { debut: debutPrec, fin: Math.min(debut, debutPrec + (t - debut)) },
  }));
}

export type PeriodeInscription = "jour" | "7j" | "30j" | "tout";
export const PERIODES_INSCRIPTION: PeriodeInscription[] = ["jour", "7j", "30j", "tout"];

/** Début de la période d'inscription (null = depuis toujours). Mêmes conventions que les filtres du Command Center. */
export function debutInscription(p: PeriodeInscription, t: number): number | null {
  return p === "jour" ? debutJour(t) : p === "7j" ? t - 7 * JOUR : p === "30j" ? t - 30 * JOUR : null;
}

/**
 * État du plan d'une boutique : un plan est « payé » si son échéance n'est pas passée
 * (sinon la boutique est retombée en Essentiel) ; l'essai Illimité de 7 jours n'est
 * compté que s'il est en cours et qu'aucun plan payé ne le recouvre.
 * La promo de lancement est globale (toutes les boutiques) : elle n'entre pas ici.
 */
export type EtatPlan = "essentiel" | "pro" | "illimite" | "essai";
export const ETATS_PLAN: EtatPlan[] = ["essentiel", "pro", "illimite", "essai"];

export function etatPlan(b: { planType: string; planExpiresAt: Date | null; essaiFinLe: Date | null }, maintenant: Date): EtatPlan {
  if (b.planExpiresAt && b.planExpiresAt > maintenant) {
    if (b.planType === "palier2") return "illimite";
    if (b.planType === "palier1") return "pro";
  }
  return b.essaiFinLe && b.essaiFinLe > maintenant ? "essai" : "essentiel";
}

/** Répartition à partir des agrégats SQL (payés par planType, essais en cours, total) : Essentiel = le reste. */
export function repartitionPlans(total: number, payes: { planType: string; n: number }[], essais: number): Record<EtatPlan, number> {
  const n = (p: string) => payes.filter((x) => x.planType === p).reduce((s, x) => s + x.n, 0);
  const pro = n("palier1"), illimite = n("palier2");
  return { essentiel: Math.max(0, total - pro - illimite - essais), pro, illimite, essai: essais };
}
