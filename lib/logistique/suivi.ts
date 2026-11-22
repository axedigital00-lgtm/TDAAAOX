// Intelligence de suivi : fraîcheur du signal, ETA en plage, géorepérage et anomalies. Sans donnée, pas de valeur.
export type Point = { lat: number; lng: number };
export type PointDate = Point & { t: number; precisionM?: number | null };

export function distanceM(a: Point, b: Point) {
  const R = 6_371_000, rad = Math.PI / 180, dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type Fraicheur = "direct" | "recent" | "perime" | "inconnu";
export const fraicheur = (t: number | null | undefined, maintenant: number): Fraicheur => {
  if (t == null) return "inconnu";
  const age = maintenant - t;
  return age <= 30_000 ? "direct" : age <= 180_000 ? "recent" : "perime";
};

export type Eta = { debut: number; fin: number; dureeMin: number; confiance: "faible" | "moyenne" | "elevee"; distanceM: number | null; source: "routage" | "historique"; calculeLe: number };

/** Plage d'arrivée : d'autant plus large que la source et le signal sont incertains. Null sans base fiable. */
export function estimerArrivee(p: { maintenant: number; dureeRoutageS?: number | null; distanceRestanteM?: number | null; vitesseHistoriqueMs?: number | null; echantillonHistorique?: number; signal: Fraicheur }): Eta | null {
  if (p.signal === "inconnu" || p.signal === "perime") return null;
  let duree: number, source: Eta["source"], marge: number;
  if (p.dureeRoutageS != null && p.dureeRoutageS >= 0) { duree = p.dureeRoutageS; source = "routage"; marge = 0.15; }
  else if (p.distanceRestanteM != null && p.vitesseHistoriqueMs && (p.echantillonHistorique ?? 0) >= 20) { duree = p.distanceRestanteM / p.vitesseHistoriqueMs; source = "historique"; marge = 0.35; }
  else return null;
  if (p.signal === "recent") marge += 0.1;
  const m = Math.max(180, duree * marge), arrondi = (t: number) => Math.round(t / 300_000) * 300_000;
  const centre = p.maintenant + duree * 1000;
  let debut = arrondi(centre - m * 1000), fin = arrondi(centre + m * 1000);
  if (fin <= debut) fin = debut + 300_000;
  if (debut < p.maintenant) debut = p.maintenant;
  return { debut, fin, dureeMin: Math.round(duree / 60), confiance: marge <= 0.15 ? "elevee" : marge <= 0.3 ? "moyenne" : "faible", distanceM: p.distanceRestanteM ?? null, source, calculeLe: p.maintenant };
}

export type Geozone = { centre: Point; rayonM: number; hysteresisM: number; presenceMs: number; precisionMaxM: number };
export type EtatGeozone = { dedans: boolean; entreeLe: number | null; confirme: boolean };
export const ETAT_INITIAL: EtatGeozone = { dedans: false, entreeLe: null, confirme: false };

/** Entrée confirmée après un temps de présence ; hystérésis à la sortie ; un seul événement par passage. */
export function evaluerGeozone(z: Geozone, e: EtatGeozone, p: PointDate): { etat: EtatGeozone; evenement: "arrivee" | "sortie" | null } {
  if (p.precisionM != null && p.precisionM > z.precisionMaxM) return { etat: e, evenement: null };
  const d = distanceM(z.centre, p);
  if (!e.dedans) return d <= z.rayonM ? { etat: { dedans: true, entreeLe: p.t, confirme: false }, evenement: null } : { etat: e, evenement: null };
  if (d > z.rayonM + z.hysteresisM) return { etat: ETAT_INITIAL, evenement: e.confirme ? "sortie" : null };
  if (!e.confirme && p.t - e.entreeLe! >= z.presenceMs) return { etat: { ...e, confirme: true }, evenement: "arrivee" };
  return { etat: e, evenement: null };
}

export type Severite = "INFO" | "WARNING" | "HIGH_PRIORITY" | "CRITICAL";
export type Anomalie = { type: "saut_impossible" | "arret_prolonge" | "signal_perdu" | "retard"; severite: Severite; detail: string };

export function detecterAnomalies(p: { points: PointDate[]; maintenant: number; vitesseMaxMs?: number; arretMaxMs?: number; signalMaxMs?: number; finPrevue?: number | null }): Anomalie[] {
  const r: Anomalie[] = [], v = p.vitesseMaxMs ?? 45, arret = p.arretMaxMs ?? 20 * 60_000, signal = p.signalMaxMs ?? 5 * 60_000;
  const s = [...p.points].sort((a, b) => a.t - b.t);
  for (let i = 1; i < s.length; i++) {
    const dt = (s[i].t - s[i - 1].t) / 1000;
    const marge = (s[i].precisionM ?? 0) + (s[i - 1].precisionM ?? 0);
    if (dt > 0 && (distanceM(s[i - 1], s[i]) - marge) / dt > v) { r.push({ type: "saut_impossible", severite: "HIGH_PRIORITY", detail: "Déplacement impossible entre deux positions" }); break; }
  }
  const der = s.at(-1);
  if (der && p.maintenant - der.t > signal) r.push({ type: "signal_perdu", severite: "WARNING", detail: `Dernière position reçue il y a ${Math.round((p.maintenant - der.t) / 60_000)} min` });
  if (der) {
    let debut = der.t;
    for (let i = s.length - 2; i >= 0 && distanceM(der, s[i]) < 40; i--) debut = s[i].t;
    if (der.t - debut >= arret) r.push({ type: "arret_prolonge", severite: "WARNING", detail: `À l'arrêt depuis ${Math.round((der.t - debut) / 60_000)} min` });
  }
  if (p.finPrevue != null && p.maintenant > p.finPrevue) {
    const m = Math.round((p.maintenant - p.finPrevue) / 60_000);
    r.push({ type: "retard", severite: m >= 60 ? "CRITICAL" : m >= 20 ? "HIGH_PRIORITY" : "INFO", detail: `${m} min de retard sur la fin estimée` });
  }
  return r;
}
