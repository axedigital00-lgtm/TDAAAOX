// Fonctions pures des graphiques (§7.8) : échelles, graduations, formats. Testées dans tests/adm-graphiques.test.ts.
import { formatMontant } from "@/lib/utils";

export type FormatValeur = "compact" | "montant" | "nombre" | "pourcent";

const COMPACT = new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 });
const NOMBRE = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

/** « 14 k », « 6,5 M » : axes et valeurs centrales. */
export const formatCompact = (v: number) => COMPACT.format(v);

export function formatValeur(v: number, format: FormatValeur = "nombre", devise = "XAF"): string {
  if (format === "compact") return formatCompact(v);
  if (format === "montant") return formatMontant(v, devise);
  if (format === "pourcent") return `${NOMBRE.format(v)} %`;
  return NOMBRE.format(v);
}

/** Pas « rond » (1, 2, 2,5, 5 × 10^k) supérieur ou égal à x. */
export function pasRond(x: number): number {
  if (!(x > 0)) return 1;
  const p = 10 ** Math.floor(Math.log10(x));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= x) return m * p;
  return 10 * p;
}

/** Trois lignes de grille : 0, max/2, max — max arrondi avec 5 % de marge au-dessus de la plus haute valeur. */
export function graduations(valeurs: number[]): number[] {
  const haut = Math.max(0, ...valeurs.filter(Number.isFinite));
  const pas = pasRond((haut * 1.05) / 2);
  return [0, pas, pas * 2];
}

/** Indices des 4 ou 5 libellés de l'axe X (tous si la série est courte). */
export function indicesLibelles(n: number, max = 5): number[] {
  if (n <= max) return Array.from({ length: n }, (_, i) => i);
  return Array.from({ length: max }, (_, i) => Math.round((i * (n - 1)) / (max - 1)));
}

/** Tracé SVG d'une série dans une boîte (x0..x1, y0 en haut, y1 en bas) pour une échelle 0..max. */
export function trace(serie: number[], boite: { x0: number; x1: number; y0: number; y1: number }, max: number): string {
  const { x0, x1, y0, y1 } = boite;
  const n = serie.length;
  return serie
    .map((v, i) => {
      const x = n === 1 ? x0 : x0 + (i / (n - 1)) * (x1 - x0);
      const y = y1 - (Math.max(0, v) / (max || 1)) * (y1 - y0);
      return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

/** Variation en % de b vers a ; null si la comparaison est nulle ou absente. */
export function variation(a: number, b: number | undefined): number | null {
  if (b === undefined || !(b > 0)) return null;
  return ((a - b) / b) * 100;
}

/** Segments d'un anneau sur un cercle de circonférence ≈ 100 (r = 15,9) : dasharray et départ en haut. */
export function arcs(valeurs: number[]): { part: number; dasharray: string; dashoffset: number }[] {
  const total = valeurs.reduce((s, v) => s + Math.max(0, v), 0);
  let cumul = 0;
  return valeurs.map((v) => {
    const part = total ? (Math.max(0, v) / total) * 100 : 0;
    const seg = { part, dasharray: `${part.toFixed(2)} ${(100 - part).toFixed(2)}`, dashoffset: 25 - cumul };
    cumul += part;
    return seg;
  });
}

/** Couleurs par défaut des séries catégorielles (jetons .adm). */
export const COULEURS = ["var(--chart-cyan)", "var(--chart-primary)", "var(--chart-violet)", "var(--chart-compare)"];
