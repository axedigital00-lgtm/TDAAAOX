// Formats de l'admin (MASTERPROMPT §14, §16) : dates relatives, nombres fr-FR,
// deltas. Fuseau de référence : Africa/Douala.

const FUSEAU = "Africa/Douala";
const NBSP_FINE = " ";

const jourCle = (d: Date) => d.toLocaleDateString("fr-CA", { timeZone: FUSEAU }); // AAAA-MM-JJ
const heure = (d: Date) => d.toLocaleTimeString("fr-FR", { timeZone: FUSEAU, hour: "2-digit", minute: "2-digit" });

/** « Aujourd’hui à 14:48 », « Hier à 13:40 », « lundi à 07:17 », « le 12 nov. à 09:15 », « le 12 nov. 2025 ». */
export function dateRelativeAdmin(date: Date | string, maintenant = new Date()): string {
  const d = new Date(date);
  const jours = Math.round((Date.parse(jourCle(maintenant)) - Date.parse(jourCle(d))) / 86_400_000);
  if (jours === 0) return `Aujourd’hui à ${heure(d)}`;
  if (jours === 1) return `Hier à ${heure(d)}`;
  if (jours > 1 && jours < 7) return `${d.toLocaleDateString("fr-FR", { timeZone: FUSEAU, weekday: "long" })} à ${heure(d)}`;
  const memeAnnee = d.toLocaleDateString("fr-FR", { timeZone: FUSEAU, year: "numeric" }) === maintenant.toLocaleDateString("fr-FR", { timeZone: FUSEAU, year: "numeric" });
  if (memeAnnee) return `le ${d.toLocaleDateString("fr-FR", { timeZone: FUSEAU, day: "numeric", month: "short" })} à ${heure(d)}`;
  return `le ${d.toLocaleDateString("fr-FR", { timeZone: FUSEAU, day: "numeric", month: "short", year: "numeric" })}`;
}

/** Nombre fr-FR avec espace fine insécable : « 1 209 ». */
export function nombre(n: number, decimales = 0): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales }).replace(/\s/g, NBSP_FINE);
}

/** Pourcentage fr-FR : « 45,35 % ». */
export function pourcentage(n: number, decimales = 0): string {
  return `${nombre(n, decimales)} %`;
}

/** Variation relative entre deux périodes (null si non calculable). */
export function variation(actuel: number, precedent: number): number | null {
  if (!precedent) return actuel ? null : 0;
  return (actuel - precedent) / precedent;
}

/** Début de journée (fuseau Douala, UTC+1 sans heure d'été). */
export function debutJour(d = new Date(), decalageJours = 0): Date {
  const [a, m, j] = jourCle(d).split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, j + decalageJours, -1));
}

export type Periode = "aujourd_hui" | "hier" | "7j" | "30j" | "90j";
export const PERIODES: { id: Periode; label: string }[] = [
  { id: "aujourd_hui", label: "Aujourd’hui" },
  { id: "hier", label: "Hier" },
  { id: "7j", label: "7 jours" },
  { id: "30j", label: "30 jours" },
  { id: "90j", label: "90 jours" },
];

/** Bornes de la période et de la période précédente de même durée, et nombre de points de série. */
export function bornesPeriode(p: Periode, maintenant = new Date()) {
  const jours = { aujourd_hui: 1, hier: 1, "7j": 7, "30j": 30, "90j": 90 }[p];
  const fin = p === "hier" ? debutJour(maintenant) : p === "aujourd_hui" ? maintenant : maintenant;
  const debut = p === "aujourd_hui" ? debutJour(maintenant) : p === "hier" ? debutJour(maintenant, -1) : debutJour(maintenant, -(jours - 1));
  const duree = (p === "aujourd_hui" ? fin.getTime() - debut.getTime() : jours * 86_400_000);
  return {
    debut, fin,
    precedent: { debut: new Date(debut.getTime() - (p === "aujourd_hui" ? 86_400_000 : duree)), fin: new Date(fin.getTime() - (p === "aujourd_hui" ? 86_400_000 : duree)) },
    /** Pas de la série : 1 h sur un jour, 1 jour sinon. */
    pas: jours === 1 ? 3_600_000 : 86_400_000,
    points: jours === 1 ? 24 : jours,
  };
}

/** Répartit des dates (et valeurs) dans une série régulière à partir de `debut`. */
export function serie(evenements: { date: Date; valeur?: number }[], debut: Date, pas: number, points: number): number[] {
  const s = new Array(points).fill(0);
  for (const e of evenements) {
    const i = Math.floor((e.date.getTime() - debut.getTime()) / pas);
    if (i >= 0 && i < points) s[i] += e.valeur ?? 1;
  }
  return s;
}
