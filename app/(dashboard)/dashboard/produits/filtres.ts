// Liste des produits : paramètres d'URL → filtre Prisma (règles pures, testées dans tests/adm-produits.test.ts).
// URL : ?vue= &type= &q= &tri=colonne:ordre &page=. L'ancien ?filtre= (tableau de bord, Axia) est redirigé vers ?vue= par la page.
import { TYPES_NUMERIQUES } from "@/lib/pricing";
import type { StatutBadge } from "@/components/ui/adm/statuts";

export const PAR_PAGE = 50;
/** Même seuil que « À traiter » du tableau de bord : stock faible = 1 à 5 (physique seulement). */
export const SEUIL_STOCK_FAIBLE = 5;

const NUMERIQUES = [...TYPES_NUMERIQUES];

/** Vues (la 1re est la vue par défaut, sans paramètre). Les clés reprennent les anciens ?filtre=. */
export const VUES: { id: string; label: string; where: Record<string, unknown> }[] = [
  { id: "tous", label: "Tous", where: {} },
  { id: "actif", label: "Actifs", where: { actif: true } },
  { id: "inactif", label: "Brouillons", where: { actif: false, archiveLe: null } },
  { id: "archives", label: "Archivés", where: { archiveLe: { not: null } } },
  { id: "numeriques", label: "Numériques", where: { type: { in: NUMERIQUES } } },
  { id: "faible", label: "Stock faible", where: { actif: true, type: "physique", stock: { gt: 0, lte: SEUIL_STOCK_FAIBLE } } },
  { id: "epuise", label: "En rupture", where: { actif: true, type: "physique", stock: 0 } },
];

/** Filtre « Type » : physique, numérique, dropshipping (valeurs réelles de Produit.type). */
export const TYPES_FILTRE: Record<string, { label: string; where: Record<string, unknown> }> = {
  physique: { label: "Physique", where: { type: "physique" } },
  numerique: { label: "Numérique", where: { type: { in: NUMERIQUES } } },
  dropshipping: { label: "Dropshipping", where: { type: "dropshipping" } },
};

export const TRIS = ["date", "nom", "prix", "stock", "ventes"] as const;

export type FiltresProduits = {
  vue: string;
  type?: string;
  q?: string;
  tri: { colonne: (typeof TRIS)[number]; ordre: "asc" | "desc" };
  page: number;
};

type Params = Record<string, string | string[] | undefined>;
const un = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

export function lireFiltres(sp: Params): FiltresProduits {
  const vue = un(sp.vue);
  const type = un(sp.type);
  const [col, ordre] = (un(sp.tri) ?? "").split(":");
  return {
    vue: VUES.some((v) => v.id === vue) ? vue! : "tous",
    type: type && type in TYPES_FILTRE ? type : undefined,
    q: un(sp.q)?.slice(0, 100),
    tri: {
      colonne: (TRIS as readonly string[]).includes(col) ? (col as FiltresProduits["tri"]["colonne"]) : "date",
      ordre: ordre === "asc" ? "asc" : "desc",
    },
    page: Math.max(1, parseInt(un(sp.page) ?? "1", 10) || 1),
  };
}

export function whereProduits(tenantId: string, f: FiltresProduits) {
  const et: Record<string, unknown>[] = [];
  const vue = VUES.find((v) => v.id === f.vue)!;
  if (Object.keys(vue.where).length) et.push(vue.where);
  if (f.type) et.push(TYPES_FILTRE[f.type].where);
  if (f.q) {
    const contient = { contains: f.q, mode: "insensitive" as const };
    et.push({ OR: [{ nom: contient }, { sku: contient }, { categorie: contient }] });
  }
  return { tenantId, ...(et.length ? { AND: et } : {}) };
}

export function orderByProduits(tri: FiltresProduits["tri"]) {
  const champ = { date: "createdAt", nom: "nom", prix: "prix", stock: "stock", ventes: "ventes" }[tri.colonne];
  return [{ [champ]: tri.ordre }, { id: "desc" as const }];
}

/** Statut du produit (masterprompt §7.2) : Actif success · Brouillon info · Archivé neutral ; exemple d'AXIA à part. */
export function badgeProduit(p: { actif: boolean; exempleAxia: boolean; archiveLe?: Date | null }): StatutBadge {
  if (p.actif) return { label: "Actif", tone: "success", progress: "none" };
  if (p.archiveLe) return { label: "Archivé", tone: "neutral", progress: "none" };
  if (p.exempleAxia) return { label: "Exemple", tone: "info", progress: "none" };
  return { label: "Brouillon", tone: "info", progress: "none" };
}

/** Stock : seuls les produits physiques en ont un. */
export function badgeStock(p: { type: string; stock: number; exempleAxia: boolean }): StatutBadge | null {
  if (p.type !== "physique" || p.exempleAxia) return null;
  if (p.stock === 0) return { label: "Rupture", tone: "critical", progress: "none" };
  if (p.stock <= SEUIL_STOCK_FAIBLE) return { label: "Stock faible", tone: "attention", progress: "none" };
  return null;
}
