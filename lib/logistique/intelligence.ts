// Intelligence du réseau : prévision, simulation, route multi-arrêts et alertes. Règles pures et explicables.
import { distanceM, type Point } from "./suivi";

// ─── Prévision ────────────────────────────────────────────────────────
export const JOURS_MIN_PREVISION = 7;
export const JOURS_PREVISION_FIABLE = 56;
export type Prevision =
  | { disponible: false; motif: string; joursObserves: number }
  | { disponible: true; horizon: { jour: number; attendu: number; bas: number; haut: number }[]; erreurModele: number; erreurNaive: number; publiable: boolean; joursObserves: number; confiance: "faible" | "moyenne" };

const profil = (serie: number[], fin: number) => {
  const p: number[][] = Array.from({ length: 7 }, () => []);
  for (let i = 0; i < fin; i++) p[i % 7].push(serie[i]);
  return p.map((x) => (x.length ? x.reduce((a, b) => a + b, 0) / x.length : 0));
};

/** Référence saisonnière par jour de semaine, validée sur les 14 derniers jours contre une prévision naïve. */
export function prevoirDemande(serie: number[], jours = 7): Prevision {
  if (serie.length < JOURS_MIN_PREVISION) return { disponible: false, motif: `Il faut ${JOURS_MIN_PREVISION} jours d'historique`, joursObserves: serie.length };
  if (serie.length < JOURS_PREVISION_FIABLE) return previsionCourte(serie, jours);
  const fin = serie.length - 14, p = profil(serie, fin), moyenneTrain = serie.slice(0, fin).reduce((a, b) => a + b, 0) / fin || 1;
  let em = 0, en = 0;
  for (let i = fin; i < serie.length; i++) { em += Math.abs(serie[i] - p[i % 7]); en += Math.abs(serie[i] - serie[fin - 1]); }
  const erreurModele = em / 14, erreurNaive = en / 14;
  const recent = serie.slice(-14).reduce((a, b) => a + b, 0) / 14, tendance = Math.max(.5, Math.min(1.5, recent / moyenneTrain));
  const complet = profil(serie, serie.length), z = 1.28 * Math.max(erreurModele, 1);
  const horizon = Array.from({ length: jours }, (_, k) => { const attendu = complet[(serie.length + k) % 7] * tendance; return { jour: k + 1, attendu: Math.round(attendu * 10) / 10, bas: Math.max(0, Math.round((attendu - z) * 10) / 10), haut: Math.round((attendu + z) * 10) / 10 }; });
  return { disponible: true, horizon, erreurModele: Math.round(erreurModele * 100) / 100, erreurNaive: Math.round(erreurNaive * 100) / 100, publiable: erreurModele < erreurNaive, joursObserves: serie.length, confiance: "moyenne" };
}

/** Historique court : moyenne récente et plage large, toujours présentées comme une estimation de faible confiance. */
function previsionCourte(serie: number[], jours: number): Prevision {
  const moyenne = (l: number[]) => l.reduce((a, b) => a + b, 0) / (l.length || 1);
  const test = Math.max(2, Math.floor(serie.length / 4)), base = serie.slice(0, -test), reference = moyenne(base);
  const erreurModele = moyenne(serie.slice(-test).map((x) => Math.abs(x - reference))), erreurNaive = moyenne(serie.slice(-test).map((x) => Math.abs(x - base[base.length - 1])));
  const m = moyenne(serie), ecart = Math.sqrt(moyenne(serie.map((x) => (x - m) ** 2))), z = 1.64 * Math.max(ecart, 1);
  const parJour = serie.length >= 14 ? profil(serie, serie.length) : null;
  const horizon = Array.from({ length: jours }, (_, k) => { const attendu = parJour ? parJour[(serie.length + k) % 7] : m; return { jour: k + 1, attendu: Math.round(attendu * 10) / 10, bas: Math.max(0, Math.round((attendu - z) * 10) / 10), haut: Math.round((attendu + z) * 10) / 10 }; });
  return { disponible: true, horizon, erreurModele: Math.round(erreurModele * 100) / 100, erreurNaive: Math.round(erreurNaive * 100) / 100, publiable: true, joursObserves: serie.length, confiance: "faible" };
}

// ─── Simulation (aucune écriture, entrée copiée) ──────────────────────
export type EtatReseau = { demandeJour: number; capaciteJour: number; coutMoyen: number; delaiMoyenMin: number | null; fournisseurs: { id: string; capaciteJour: number }[] };
export type Scenario = { demandePct?: number; capacitePct?: number; coutPct?: number; fournisseurIndisponible?: string | null; nouveauxFournisseurs?: number; capaciteParNouveau?: number };

export function simuler(etat: Readonly<EtatReseau>, s: Scenario) {
  const demande = etat.demandeJour * (1 + (s.demandePct ?? 0) / 100);
  const retire = s.fournisseurIndisponible ? etat.fournisseurs.find((f) => f.id === s.fournisseurIndisponible)?.capaciteJour ?? 0 : 0;
  const capacite = Math.max(0, (etat.capaciteJour - retire) * (1 + (s.capacitePct ?? 0) / 100) + (s.nouveauxFournisseurs ?? 0) * (s.capaciteParNouveau ?? 10));
  const utilisation = capacite > 0 ? demande / capacite : demande > 0 ? Infinity : 0;
  const nonServie = Math.max(0, demande - capacite);
  const coutUnitaire = etat.coutMoyen * (1 + (s.coutPct ?? 0) / 100);
  const tension = Number.isFinite(utilisation) ? Math.max(0, utilisation - .8) : 1;
  const manque = Math.ceil(Math.max(0, demande / .8 - capacite));
  const recommandations: string[] = [];
  if (nonServie > 0) recommandations.push(`Ajouter une capacité de ${manque} livraisons par jour pour rester à 80 % d'utilisation.`);
  else if (utilisation > .8) recommandations.push("Répartir la demande : le réseau approche de sa limite.");
  else recommandations.push("La capacité couvre ce scénario.");
  return {
    simule: true as const, demande: Math.round(demande * 10) / 10, capacite: Math.round(capacite * 10) / 10, utilisation: Number.isFinite(utilisation) ? Math.round(utilisation * 100) : null,
    demandeNonServie: Math.round(nonServie * 10) / 10, coutJour: Math.round((demande - nonServie) * coutUnitaire),
    delaiEstimeMin: etat.delaiMoyenMin == null ? null : Math.round(etat.delaiMoyenMin * (1 + tension * 1.5)), capaciteManquante: manque, recommandations,
  };
}

// ─── Route multi-arrêts ───────────────────────────────────────────────
export type Arret = Point & { id: string; commandeId: string; type: "enlevement" | "livraison"; charge: number; finAu?: number | null; priorite?: number; incompatible?: string[] };
export type RouteOptimisee = { ordre: string[]; distanceM: number; respecteFenetres: boolean; ignores: string[]; explication: string };

const longueur = (depart: Point, r: Arret[]) => r.reduce((s, a, i) => s + distanceM(i ? r[i - 1] : depart, a), 0);

function faisable(depart: Point, r: Arret[], capacite: number, vitesseMs: number, debut: number, serviceS: number) {
  let t = debut, charge = 0, pos: Point = depart;
  const enleve = new Set<string>();
  for (const a of r) {
    t += (distanceM(pos, a) / vitesseMs + serviceS) * 1000; pos = a;
    if (a.type === "enlevement") { charge += a.charge; enleve.add(a.commandeId); }
    else { if (r.some((x) => x.commandeId === a.commandeId && x.type === "enlevement") && !enleve.has(a.commandeId)) return false; charge -= a.charge; }
    if (charge > capacite || (a.finAu != null && t > a.finAu)) return false;
  }
  return true;
}

/** Insertion gloutenne puis amélioration 2-opt : chaque enlèvement précède sa livraison, capacité et délais respectés. */
export function optimiserRoute(p: { depart: Point; arrets: Arret[]; capacite: number; vitesseMs: number; maintenant: number; serviceS?: number }): RouteOptimisee {
  const service = p.serviceS ?? 180;
  const ordreEntree = [...p.arrets].sort((a, b) => (b.priorite ?? 0) - (a.priorite ?? 0) || (a.finAu ?? Infinity) - (b.finAu ?? Infinity));
  const cmds = [...new Set(ordreEntree.map((a) => a.commandeId))];
  let route: Arret[] = [];
  const ignores: string[] = [];
  for (const cmd of cmds) {
    const lot = ordreEntree.filter((a) => a.commandeId === cmd).sort((a) => (a.type === "enlevement" ? -1 : 1));
    if (route.some((r) => lot.some((a) => a.incompatible?.includes(r.commandeId) || r.incompatible?.includes(a.commandeId)))) { ignores.push(cmd); continue; }
    let meilleur: Arret[] | null = null;
    const tester = (r: Arret[]) => { if (faisable(p.depart, r, p.capacite, p.vitesseMs, p.maintenant, service) && (!meilleur || longueur(p.depart, r) < longueur(p.depart, meilleur))) meilleur = r; };
    if (lot.length === 1) for (let i = 0; i <= route.length; i++) tester([...route.slice(0, i), lot[0], ...route.slice(i)]);
    else for (let i = 0; i <= route.length; i++) for (let j = i; j <= route.length; j++) tester([...route.slice(0, i), lot[0], ...route.slice(i, j), lot[1], ...route.slice(j)]);
    if (meilleur) route = meilleur; else ignores.push(cmd);
  }
  for (let ameliore = true, n = 0; ameliore && n < 20; n++) {
    ameliore = false;
    for (let i = 0; i < route.length - 1; i++) for (let j = i + 1; j < route.length; j++) {
      const c = [...route.slice(0, i), ...route.slice(i, j + 1).reverse(), ...route.slice(j + 1)];
      if (longueur(p.depart, c) + 1 < longueur(p.depart, route) && faisable(p.depart, c, p.capacite, p.vitesseMs, p.maintenant, service)) { route = c; ameliore = true; }
    }
  }
  const d = Math.round(longueur(p.depart, route));
  return { ordre: route.map((a) => a.id), distanceM: d, respecteFenetres: true, ignores, explication: `${route.length} arrêts, ${(d / 1000).toFixed(1)} km à vol d'oiseau${ignores.length ? `, ${ignores.length} commande(s) non regroupée(s) pour capacité, délai ou compatibilité` : ""}.` };
}

// ─── Alertes ──────────────────────────────────────────────────────────
export type EtatZone = { zone: string; demande7j: number; capaciteDispo: number; echecs30j: number; courses30j: number };
export type AlertePreparee = { cle: string; type: string; severite: "INFO" | "WARNING" | "HIGH_PRIORITY" | "CRITICAL"; explication: string; preuves: Record<string, unknown>; action: string; confiance: "faible" | "moyenne" | "elevee" };

export function alertesZones(z: EtatZone[], jour: string): AlertePreparee[] {
  const r: AlertePreparee[] = [];
  for (const x of z) {
    const parJour = x.demande7j / 7;
    if (x.demande7j >= 7 && parJour > x.capaciteDispo) r.push({ cle: `capacite:${x.zone}:${jour}`, type: "capacite", severite: parJour > 1.5 * x.capaciteDispo ? "HIGH_PRIORITY" : "WARNING", explication: `La capacité disponible peut devenir insuffisante à ${x.zone}.`, preuves: { demandeParJour: Math.round(parJour * 10) / 10, capaciteDisponible: x.capaciteDispo }, action: `Recruter ou activer ${Math.ceil(parJour - x.capaciteDispo)} capacité(s) de livraison à ${x.zone}.`, confiance: x.demande7j >= 30 ? "elevee" : "moyenne" });
    if (x.courses30j >= 20 && x.echecs30j / x.courses30j >= .2) r.push({ cle: `echecs:${x.zone}:${jour}`, type: "echecs", severite: "WARNING", explication: `Taux d'échec élevé à ${x.zone}.`, preuves: { echecs: x.echecs30j, courses: x.courses30j }, action: "Analyser les motifs d'échec de cette zone.", confiance: x.courses30j >= 50 ? "elevee" : "moyenne" });
  }
  return r;
}
