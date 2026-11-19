// Liste des commandes : paramètres d'URL → filtre Prisma (règles pures, testées dans tests/adm-commandes.test.ts).
// URL : ?vue=<statuts séparés par des virgules> &paiement= &methode= &q= &tri=colonne:ordre &page=
// L'ancien ?statut= (liens du tableau de bord, e-mails, Axia) est redirigé vers ?vue= par la page.
import { STATUTS_A_TRAITER, STATUTS_COMMANDE, STATUTS_PAIEMENT } from "./statuts";

export const PAR_PAGE = 50;

/** Vues = filtres de statut (la 1re est la vue par défaut, sans paramètre). */
export const VUES = [
  { id: "toutes", label: "Toutes" },
  { id: STATUTS_A_TRAITER.join(","), label: "À traiter" },
  { id: "en_attente", label: "En attente" },
  { id: "confirmee", label: "Confirmées" },
  { id: "en_preparation", label: "En préparation" },
  { id: "expediee", label: "En livraison" },
  { id: "tentative_echouee", label: "Livraison échouée" },
  { id: "livree", label: "Livrées" },
  { id: "annulee", label: "Annulées" },
];

/** Moyens de paiement réels (D3) regroupés pour le filtre. */
export const METHODES_FILTRE: Record<string, { label: string; valeurs: string[] }> = {
  livraison: { label: "À la livraison", valeurs: ["whatsapp_cod", "direct_cod"] },
  en_ligne: { label: "En ligne", valeurs: ["notchpay", "en_attente"] },
  caisse: { label: "En caisse", valeurs: [] }, // ventes POS : filtrées par canal
};

export const TRIS = ["date", "total", "client"] as const;

export type FiltresCommandes = {
  statuts: string[];
  paiement?: string;
  methode?: string;
  q?: string;
  tri: { colonne: (typeof TRIS)[number]; ordre: "asc" | "desc" };
  page: number;
};

type Params = Record<string, string | string[] | undefined>;
const un = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

export function lireFiltres(sp: Params): FiltresCommandes {
  const vue = un(sp.vue);
  const statuts = vue && vue !== "toutes" ? vue.split(",").filter((s) => s in STATUTS_COMMANDE) : [];
  const paiement = un(sp.paiement);
  const methode = un(sp.methode);
  const [col, ordre] = (un(sp.tri) ?? "").split(":");
  return {
    statuts,
    paiement: paiement && paiement in STATUTS_PAIEMENT ? paiement : undefined,
    methode: methode && methode in METHODES_FILTRE ? methode : undefined,
    q: un(sp.q)?.slice(0, 100),
    tri: {
      colonne: (TRIS as readonly string[]).includes(col) ? (col as FiltresCommandes["tri"]["colonne"]) : "date",
      ordre: ordre === "asc" ? "asc" : "desc",
    },
    page: Math.max(1, parseInt(un(sp.page) ?? "1", 10) || 1),
  };
}

export function whereCommandes(tenantId: string, f: FiltresCommandes) {
  const et: Record<string, unknown>[] = [];
  if (f.statuts.length) et.push({ statut: { in: f.statuts } });
  if (f.paiement) et.push({ paiementStatut: f.paiement });
  if (f.methode === "caisse") et.push({ canal: "pos" });
  else if (f.methode) et.push({ methodePaiement: { in: METHODES_FILTRE[f.methode].valeurs } });
  if (f.q) {
    const contient = { contains: f.q, mode: "insensitive" as const };
    et.push({ OR: [{ numero: contient }, { clientNom: contient }, { clientTelephone: contient }, { clientEmail: contient }] });
  }
  return { tenantId, ...(et.length ? { AND: et } : {}) };
}

export function orderByCommandes(tri: FiltresCommandes["tri"]) {
  const champ = { date: "createdAt", total: "montantTotal", client: "clientNom" }[tri.colonne];
  return [{ [champ]: tri.ordre }, { id: "desc" as const }];
}

/** Variation en % (null si la période précédente est vide : pas de comparaison honnête possible). */
export function variation(actuel: number, precedent: number) {
  return precedent > 0 ? Math.round(((actuel - precedent) / precedent) * 100) : null;
}
