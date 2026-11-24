// Registre des coins : attributions idempotentes, débit sous verrou, remboursement en cas d'échec.
import { prisma } from "@/lib/prisma";
import { planActif } from "@/lib/abonnement";
import { COINS_BIENVENUE, COINS_MENSUELS, moisDe, repartirDebit, soldes } from "./coins-regles";

export class ErreurCoins extends Error { constructor(message: string, public status = 400) { super(message); } }

/** Ignore une écriture déjà enregistrée (référence unique). */
async function ecrire(data: { tenantId: string; type: string; source: string; montant: number; reference: string; action?: string; motif?: string; creePar?: string }) {
  try { await prisma.ecritureCoins.create({ data }); return true; }
  catch (e: any) { if (e?.code === "P2002") return false; throw e; }
}

/** Bienvenue une seule fois, puis coins du forfait payé chaque mois ; les inclus du mois passé expirent. */
export async function assurerAttributions(tenantId: string, maintenant = new Date()) {
  const mois = moisDe(maintenant);
  await ecrire({ tenantId, type: "bienvenue", source: "inclus", montant: COINS_BIENVENUE, reference: `bienvenue:${tenantId}` });
  const { planPaye } = await planActif(tenantId);
  const inclus = COINS_MENSUELS[planPaye] ?? 0;
  if (!inclus) return;
  if (await prisma.ecritureCoins.count({ where: { reference: `mois:${tenantId}:${mois}` } })) return;
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`coins:${tenantId}`}))`;
    if (await tx.ecritureCoins.count({ where: { reference: `mois:${tenantId}:${mois}` } })) return;
    const reste = soldes(await tx.ecritureCoins.findMany({ where: { tenantId, source: "inclus" }, select: { source: true, montant: true } })).inclus;
    // Les coins inclus d'un mois précédent expirent ; ceux de bienvenue restent jusqu'à épuisement.
    const precedent = await tx.ecritureCoins.findFirst({ where: { tenantId, type: "mensuel" }, orderBy: { createdAt: "desc" }, select: { montant: true } });
    const expire = Math.min(reste, precedent?.montant ?? 0);
    if (expire > 0) await tx.ecritureCoins.create({ data: { tenantId, type: "expiration", source: "inclus", montant: -expire, reference: `expiration:${tenantId}:${mois}` } });
    await tx.ecritureCoins.create({ data: { tenantId, type: "mensuel", source: "inclus", montant: inclus, reference: `mois:${tenantId}:${mois}` } });
  });
}

export async function soldeCoins(tenantId: string) {
  await assurerAttributions(tenantId);
  return soldes(await prisma.ecritureCoins.findMany({ where: { tenantId }, select: { source: true, montant: true } }));
}

/** Débit atomique avant l'appel à l'IA. */
export async function debiterCoins(tenantId: string, coins: number, action: string, operation: string) {
  await assurerAttributions(tenantId);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`coins:${tenantId}`}))`;
    const s = soldes(await tx.ecritureCoins.findMany({ where: { tenantId }, select: { source: true, montant: true } }));
    const r = repartirDebit(s, coins);
    if (!r) throw new ErreurCoins(`Il te faut ${coins} coin${coins > 1 ? "s" : ""} pour cette action. Solde : ${s.total}.`, 402);
    if (r.inclus) await tx.ecritureCoins.create({ data: { tenantId, type: "consommation", source: "inclus", montant: -r.inclus, action, reference: `action:${operation}:inclus` } });
    if (r.achetes) await tx.ecritureCoins.create({ data: { tenantId, type: "consommation", source: "achete", montant: -r.achetes, action, reference: `action:${operation}:achete` } });
    return r;
  });
}

/** Rend exactement ce qui a été débité pour cette opération. */
export async function rembourserCoins(tenantId: string, operation: string) {
  const debits = await prisma.ecritureCoins.findMany({ where: { tenantId, reference: { in: [`action:${operation}:inclus`, `action:${operation}:achete`] } } });
  for (const d of debits) await ecrire({ tenantId, type: "remboursement", source: d.source, montant: -d.montant, action: d.action ?? undefined, reference: `rembourse:${operation}:${d.source}` });
}

/** Geste commercial ou correction : toujours motivé et attribué à un admin. */
export async function ajusterCoins(adminId: string, tenantId: string, montant: number, motif: string) {
  if (!Number.isInteger(montant) || !montant || Math.abs(montant) > 10_000) throw new ErreurCoins("Montant invalide");
  if (motif.trim().length < 3) throw new ErreurCoins("Motif requis");
  if (!(await prisma.tenant.count({ where: { id: tenantId } }))) throw new ErreurCoins("Boutique introuvable", 404);
  await ecrire({ tenantId, type: "ajustement", source: "inclus", montant, motif: motif.trim().slice(0, 200), creePar: adminId, reference: `ajustement:${crypto.randomUUID()}` });
}
