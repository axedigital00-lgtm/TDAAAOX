// Score de confiance et de performance. Le légal et l'opérationnel restent séparés ; les taux sont
// lissés (bayésien), pondérés dans le temps, et un petit échantillon n'obtient jamais de niveau.
import type { Badge, IndicateursScore, NiveauAxso, ResultatCourse } from "./types";

export type PoidsScore = { legal: number; volume: number; reussite: number; ponctualite: number; satisfaction: number; incidents: number; prix: number };
export const POIDS_DEFAUT: PoidsScore = { legal: 25, volume: 20, reussite: 15, ponctualite: 15, satisfaction: 10, incidents: 10, prix: 5 };

export const REGLAGES_SCORE = {
  demiVieJours: 90,
  echantillonMin: 20,
  avisMin: 10,
  aPriori: { reussite: 0.8, ponctualite: 0.75, note: 3.8, incident: 0.05, force: 10, forceNote: 5 },
  volumeReference: 50,
  plafondFiabiliteBasse: 64,
  seuilFiabiliteBasse: 60,
  niveaux: { elite: 90, premium: 80, verifie: 65 },
};

export const niveauDuScore = (s: number, n = REGLAGES_SCORE.niveaux): NiveauAxso => (s >= n.elite ? "elite" : s >= n.premium ? "premium" : s >= n.verifie ? "verifie" : "standard");

export const tauxLisse = (succes: number, total: number, aPriori: number, force: number) => (succes + aPriori * force) / (total + force);

const poidsTemps = (date: number, maintenant: number) => Math.pow(0.5, Math.max(0, maintenant - date) / (REGLAGES_SCORE.demiVieJours * 86_400_000));

/** Une annulation ou un échec n'est imputé au fournisseur que si sa responsabilité est établie. */
export const compteePourFournisseur = (r: ResultatCourse) => !r.exclue && (r.issue === "livree" || (r.issue === "echec" && r.responsable === "fournisseur"));

const confiance = (n: number): IndicateursScore["confiance"] => (n < REGLAGES_SCORE.echantillonMin ? (n < 5 ? "insuffisante" : "faible") : n < 100 ? "moyenne" : "elevee");

export function calculerScore(p: {
  resultats: ResultatCourse[];
  maintenant: number;
  legal: { verifie: boolean; assurance?: boolean; identite?: boolean };
  competitivitePrix?: number | null;
  rapide?: boolean;
  poids?: PoidsScore;
}): IndicateursScore {
  const P = p.poids ?? POIDS_DEFAUT, A = REGLAGES_SCORE.aPriori;
  const total = Object.values(P).reduce((s, x) => s + x, 0) || 1;
  const comptees = p.resultats.filter(compteePourFournisseur);
  let n = 0, ok = 0, nHoraire = 0, aTemps = 0, nNote = 0, somNote = 0, inc = 0;
  for (const r of comptees) {
    const w = poidsTemps(r.date, p.maintenant);
    n += w; if (r.issue === "livree") ok += w;
    if (r.aTemps != null) { nHoraire += w; if (r.aTemps) aTemps += w; }
    if (r.note != null && r.note >= 1 && r.note <= 5) { nNote += w; somNote += r.note * w; }
    if (r.incident) inc += w;
  }
  const reussite = tauxLisse(ok, n, A.reussite, A.force);
  const ponctualite = tauxLisse(aTemps, nHoraire, A.ponctualite, A.force);
  const note = (somNote + A.note * A.forceNote) / (nNote + A.forceNote);
  const tauxIncident = tauxLisse(inc, n, A.incident, A.force);
  const volume = 1 - Math.exp(-comptees.filter((r) => r.issue === "livree").length / REGLAGES_SCORE.volumeReference);
  const incidents = Math.max(0, 1 - tauxIncident * 5);
  const prix = Math.max(0, Math.min(1, p.competitivitePrix ?? 0.5));
  const satisfaction = (note - 1) / 4;

  const legal = (p.legal.verifie ? 80 : 0) + (p.legal.assurance ? 10 : 0) + (p.legal.identite ? 10 : 0);
  const fiabilite = Math.round((reussite * 0.6 + ponctualite * 0.4) * 100);
  const poidsOp = P.volume + P.reussite + P.ponctualite + P.incidents || 1;
  const operationnel = Math.round(((volume * P.volume + reussite * P.reussite + ponctualite * P.ponctualite + incidents * P.incidents) / poidsOp) * 100);
  let global = ((legal / 100) * P.legal + volume * P.volume + reussite * P.reussite + ponctualite * P.ponctualite + satisfaction * P.satisfaction + incidents * P.incidents + prix * P.prix) / total * 100;
  // Être en règle ne compense jamais de graves défauts de livraison.
  if (comptees.length >= REGLAGES_SCORE.echantillonMin && fiabilite < REGLAGES_SCORE.seuilFiabiliteBasse) global = Math.min(global, REGLAGES_SCORE.plafondFiabiliteBasse);
  global = Math.round(global);

  const probation = comptees.length < REGLAGES_SCORE.echantillonMin;
  const notes = comptees.filter((r) => r.note != null).length;
  const brutOk = comptees.filter((r) => r.issue === "livree").length;
  const horaires = comptees.filter((r) => r.aTemps != null);
  const badges: Badge[] = [];
  if (p.legal.verifie) badges.push("legal");
  if (p.legal.assurance) badges.push("assurance");
  if (p.legal.identite) badges.push("identite");
  if (!probation && global >= REGLAGES_SCORE.niveaux.premium) badges.push("haute_performance");
  if (comptees.length >= 30 && reussite >= 0.95) badges.push("fiabilite");
  if (!probation && p.rapide && horaires.length >= REGLAGES_SCORE.echantillonMin) badges.push("rapide");
  if (notes >= REGLAGES_SCORE.avisMin && note >= 4.5) badges.push("satisfaction");

  return {
    legal, operationnel, fiabilite, satisfaction: notes ? Math.round(satisfaction * 100) : null, global,
    niveau: probation ? null : niveauDuScore(global), confiance: confiance(comptees.length), probation, volume: comptees.length,
    tauxReussite: comptees.length ? brutOk / comptees.length : null,
    tauxATemps: horaires.length ? horaires.filter((r) => r.aTemps).length / horaires.length : null,
    badges,
  };
}
