import { prisma } from "@/lib/prisma";

// Règle VIP unique (DECISIONS D27) : liste et fiche clients, segments, e-mails, SMS, AXIA.
// VIP = au moins 5 commandes, ou une dépense au moins égale à 2 × la dépense moyenne des clients
// qui ont acheté. Relative : elle vaut dans toutes les devises (D16).
export const VIP_COMMANDES = 5;

/** Seuil de dépense VIP pour une dépense moyenne donnée (jamais 0 : un client sans achat n'est pas VIP). */
export function seuilDepenseVip(depenseMoyenne: number): number {
  return Math.max(1, depenseMoyenne * 2);
}

export function estVip(nbCommandes: number, totalDepense: number, depenseMoyenne: number): boolean {
  return nbCommandes >= VIP_COMMANDES || totalDepense >= seuilDepenseVip(depenseMoyenne);
}

/** Même règle en filtre Prisma, sur les compteurs du client (Client.totalCommandes, Client.totalDepense). */
export function whereVip(depenseMoyenne: number) {
  return { OR: [{ totalCommandes: { gte: VIP_COMMANDES } }, { totalDepense: { gte: seuilDepenseVip(depenseMoyenne) } }] };
}

/** Dépense moyenne des clients de la boutique qui ont déjà acheté. */
export async function depenseMoyenne(tenantId: string): Promise<number> {
  const { _avg } = await prisma.client.aggregate({ where: { tenantId, totalDepense: { gt: 0 } }, _avg: { totalDepense: true } });
  return _avg.totalDepense ?? 0;
}
