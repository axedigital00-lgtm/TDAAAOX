// Requêtes partagées par le Tableau de bord (accueil), l'Accueil (demarrer) et Analyses de données : mêmes chiffres partout.
import { prisma } from "@/lib/prisma";
import type { Bornes, Intervalle } from "@/lib/tableau-de-bord";
import { PAIEMENT } from "@/lib/commandes";
import { normaliserTelephone } from "@/lib/devise-convert";
import type { ClientRecent, GroupeEnCours } from "@/components/dashboard/tableau-de-bord/Sections";

const dans = (i: Intervalle) => ({ gte: i.debut, lt: i.fin });
const ligneCmd = { createdAt: true, montantTotal: true, paiementStatut: true, canal: true } as const;

/** Commandes non annulées et visites de la période et de la précédente (indicateurs, courbes). */
export async function chargerPeriode(tenantId: string, b: Bornes) {
  const nonAnnulee = { tenantId, statut: { not: "annulee" } };
  const [cmds, cmdsPrec, vues, vuesPrec] = await Promise.all([
    // ponytail: lignes de commande chargées pour la période ; passer en agrégats SQL si une boutique dépasse ~50 000 commandes/mois.
    prisma.commande.findMany({ where: { ...nonAnnulee, createdAt: dans(b) }, select: ligneCmd }),
    prisma.commande.findMany({ where: { ...nonAnnulee, createdAt: dans(b.precedente) }, select: ligneCmd }),
    prisma.analytics.aggregate({ where: { tenantId, type: "page_view", date: dans(b) }, _sum: { valeur: true } }),
    prisma.analytics.aggregate({ where: { tenantId, type: "page_view", date: dans(b.precedente) }, _sum: { valeur: true } }),
  ]);
  return { cmds, cmdsPrec, visites: vues._sum.valeur ?? 0, visitesPrec: vuesPrec._sum.valeur ?? 0 };
}

/** À traiter : mêmes filtres que les listes ciblées par les liens. */
export async function compterATraiter(tenantId: string) {
  const [aConfirmer, aExpedier, retours, ruptures, stockFaible, messages] = await Promise.all([
    prisma.commande.count({ where: { tenantId, statut: "en_attente" } }),
    prisma.commande.count({ where: { tenantId, statut: { in: ["confirmee", "en_preparation"] } } }),
    prisma.retourRMA.count({ where: { tenantId, statut: { in: ["ouvert", "en_cours"] } } }),
    prisma.produit.count({ where: { tenantId, actif: true, type: "physique", stock: 0 } }),
    prisma.produit.count({ where: { tenantId, actif: true, type: "physique", stock: { gt: 0, lte: 5 } } }),
    prisma.messageRecu.count({ where: { tenantId, source: "whatsapp", direction: "entrant", lu: false } }),
  ]);
  return { aConfirmer, aExpedier, retours, ruptures, stockFaible, messages };
}

// ── Blocs du Tableau de bord (B7), aussi affichés dans Analyses de données (D7) ──

export const STATUTS_EN_COURS = ["confirmee", "en_preparation", "expediee"] as const;

/** Ventes en cours : confirmées non livrées ; « payée » = paiementStatut completed (une commande
 *  payée à la livraison ne l'est qu'une fois livrée : affichée « À encaisser »). */
export async function chargerVentesEnCours(tenantId: string): Promise<GroupeEnCours[]> {
  const [groupes, listes] = await Promise.all([
    prisma.commande.groupBy({ by: ["statut"], where: { tenantId, statut: { in: [...STATUTS_EN_COURS] } }, _count: { _all: true }, _sum: { montantTotal: true } }),
    Promise.all(STATUTS_EN_COURS.map((statut) => prisma.commande.findMany({
      where: { tenantId, statut }, orderBy: { createdAt: "desc" }, take: 5,
      select: { id: true, numero: true, clientNom: true, montantTotal: true, paiementStatut: true },
    }))),
  ]);
  return STATUTS_EN_COURS.map((statut, i) => {
    const g = groupes.find((x) => x.statut === statut);
    return {
      statut, nb: g?._count._all ?? 0, total: g?._sum.montantTotal ?? 0,
      commandes: listes[i].map((c) => ({ id: c.id, numero: c.numero, clientNom: c.clientNom, montantTotal: c.montantTotal, payee: c.paiementStatut === PAIEMENT.PAYE })),
    };
  });
}

/** Top 5 produits (commandes payées de la période, par revenu) et top 5 villes (commandes non annulées). */
export async function chargerTopProduitsVilles(tenantId: string, b: Intervalle) {
  const [lignes, villes] = await Promise.all([
    prisma.ligneCommande.findMany({
      where: { commande: { tenantId, paiementStatut: PAIEMENT.PAYE, statut: { not: "annulee" }, createdAt: dans(b) } },
      select: { produitId: true, nom: true, prix: true, quantite: true, imageUrl: true },
    }),
    prisma.commande.groupBy({ by: ["ville"], where: { tenantId, statut: { not: "annulee" }, createdAt: dans(b) }, _count: { id: true }, orderBy: { _count: { id: "desc" } }, take: 5 }),
  ]);
  const parProduit = new Map<string, { nom: string; qte: number; revenu: number; img: string | null }>();
  for (const l of lignes) {
    const p = parProduit.get(l.produitId) ?? { nom: l.nom, qte: 0, revenu: 0, img: l.imageUrl ?? null };
    p.qte += l.quantite; p.revenu += l.prix * l.quantite;
    parProduit.set(l.produitId, p);
  }
  return {
    produits: [...parProduit.values()].sort((a, b) => b.revenu - a.revenu).slice(0, 5),
    villes: villes.map((v) => ({ ville: v.ville, nb: v._count.id })),
  };
}

/** 20 derniers clients = dernière commande la plus récente. */
export async function chargerDerniersClients(tenantId: string, pays?: string | null): Promise<ClientRecent[]> {
  const recents = await prisma.commande.groupBy({ by: ["clientId"], where: { tenantId, clientId: { not: null } }, _max: { createdAt: true }, orderBy: { _max: { createdAt: "desc" } }, take: 20 });
  if (!recents.length) return [];
  const fiches = await prisma.client.findMany({
    where: { tenantId, id: { in: recents.map((c) => c.clientId!) } },
    select: { id: true, nom: true, ville: true, telephone: true, totalCommandes: true, totalDepense: true },
  });
  return recents.flatMap((r) => {
    const c = fiches.find((f) => f.id === r.clientId);
    if (!c) return [];
    const tel = normaliserTelephone(c.telephone, pays);
    return [{ id: c.id, nom: c.nom, ville: c.ville, totalCommandes: c.totalCommandes, totalDepense: c.totalDepense, derniere: r._max.createdAt!, whatsapp: tel ? tel.replace(/\D/g, "") : null }];
  });
}
