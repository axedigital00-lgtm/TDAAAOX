// Requêtes partagées par le Tableau de bord (accueil) et l'Accueil (demarrer) : mêmes chiffres partout.
import { prisma } from "@/lib/prisma";
import type { Bornes, Intervalle } from "@/lib/tableau-de-bord";

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
