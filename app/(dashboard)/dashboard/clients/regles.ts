// Clients : règles pures (liste, fiche, segments), testées dans tests/adm-clients.test.ts.
// URL de la liste : ?q= &tri=colonne:ordre &page=
import { estVip } from "@/lib/segments-clients";

export const PAR_PAGE = 50;
export const TRIS_CLIENTS = ["depense", "nom", "inscrit"] as const;
export type TriClients = { colonne: (typeof TRIS_CLIENTS)[number]; ordre: "asc" | "desc" };

type Params = Record<string, string | string[] | undefined>;
const un = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

export function lireFiltresClients(sp: Params) {
  const [col, ordre] = (un(sp.tri) ?? "").split(":");
  return {
    q: un(sp.q)?.slice(0, 100),
    tri: {
      colonne: (TRIS_CLIENTS as readonly string[]).includes(col) ? (col as TriClients["colonne"]) : "depense",
      ordre: ordre === "asc" ? "asc" : "desc",
    } as TriClients,
    page: Math.max(1, parseInt(un(sp.page) ?? "1", 10) || 1),
  };
}

/** Segment d'affichage (badge de la liste et de la fiche) : même seuil VIP que les e-mails marketing. */
export function segmentClient(nbCommandes: number, total: number, devise: string) {
  if (estVip(nbCommandes, total, devise)) return { label: "VIP", tone: "info" as const };
  if (nbCommandes >= 2) return { label: "Régulier", tone: "success" as const };
  return { label: "Nouveau", tone: "neutral" as const };
}

const COD = ["whatsapp_cod", "direct_cod"];

/** Livraisons à la livraison (COD) qui ont échoué : parmi les commandes COD parties en livraison et
 *  arrivées au bout (livrée, annulée, livraison échouée), part de celles qui n'ont pas été livrées.
 *  null quand aucune livraison COD n'est terminée : aucun taux honnête (D4). */
export function tauxEchecCod(commandes: { methodePaiement: string; statut: string; expedieeAt: Date | null }[]) {
  const terminees = commandes.filter((c) => COD.includes(c.methodePaiement) && c.expedieeAt && ["livree", "annulee", "tentative_echouee"].includes(c.statut));
  if (!terminees.length) return null;
  const echecs = terminees.filter((c) => c.statut !== "livree").length;
  return { echecs, total: terminees.length, pourcent: Math.round((echecs / terminees.length) * 100) };
}

/** Segments fixes des campagnes (mêmes règles que app/api/email/route.ts, sans la condition « e-mail valide »).
 *  VIP : au moins deux fois la dépense moyenne de la boutique. Inactifs : client depuis plus de 30 jours,
 *  aucune commande ces 30 derniers jours. Nouveaux : une commande au plus. */
export const SEGMENTS = ["tous", "vip", "nouveaux", "inactifs"] as const;
export type Segment = (typeof SEGMENTS)[number];
const JOUR = 86_400_000;

export function whereSegment(tenantId: string, segment: Segment, depenseMoyenne: number, maintenant = Date.now()) {
  const where: Record<string, unknown> = { tenantId };
  if (segment === "vip") where.totalDepense = { gte: Math.max(1, depenseMoyenne * 2) };
  if (segment === "nouveaux") where.totalCommandes = { lte: 1 };
  if (segment === "inactifs") {
    const il30 = new Date(maintenant - 30 * JOUR);
    Object.assign(where, { createdAt: { lte: il30 }, commandes: { none: { createdAt: { gte: il30 } } } });
  }
  return where;
}

export const pourcent = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
