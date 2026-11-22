// Parrainage des abonnements : un marchand inscrit par un lien rapporte 20 % de chacun de ses
// paiements d'abonnement à son parrain. Seul un paiement confirmé crée une commission.
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { deviseAbonnement, PALIER_PRIX } from "@/lib/abonnement-paiement";
import { commissionAbonnement, codeValide, estAutoParrainage, etatCommissionParrainage, montantPlafonne, nomMasque, SEQUESTRE_PARRAINAGE_HEURES, TAUX_PARRAINAGE } from "@/lib/parrainage-regles";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const nouveauCode = () => Array.from(randomBytes(8), (o) => ALPHABET[o % ALPHABET.length]).join("");

export async function codeDuCompte(userId: string) {
  const existant = await prisma.codeParrain.findUnique({ where: { userId } });
  if (existant) return existant;
  for (let i = 0; i < 5; i++) {
    try { return await prisma.codeParrain.create({ data: { userId, code: nouveauCode() } }); }
    catch (e: any) {
      if (e?.code !== "P2002") throw e;
      const deja = await prisma.codeParrain.findUnique({ where: { userId } });
      if (deja) return deja;
    }
  }
  throw new Error("Code de parrainage indisponible");
}

/** Rattache une boutique qui vient d'être créée à son parrain. Ne bloque jamais l'inscription. */
export async function rattacherFilleul(tenantId: string, filleul: { email?: string | null; telephone?: string | null }, code: unknown) {
  try {
    if (!codeValide(code)) return null;
    const c = await prisma.codeParrain.findUnique({ where: { code }, select: { userId: true, user: { select: { email: true, tenantId: true } } } });
    if (!c || c.user.tenantId === tenantId) return null;
    // Le compte n'a pas de téléphone propre : on compare au WhatsApp de ses boutiques.
    const boutiques = await prisma.tenant.findMany({ where: { OR: [{ proprietaires: { some: { userId: c.userId } } }, ...(c.user.tenantId ? [{ id: c.user.tenantId }] : [])] }, select: { id: true, whatsapp: true, telephone: true } });
    if (boutiques.some((b) => b.id === tenantId)) return null;
    const telephones = boutiques.flatMap((b) => [b.whatsapp, b.telephone]);
    if (estAutoParrainage({ email: c.user.email }, filleul) || telephones.some((telephone) => estAutoParrainage({ telephone }, filleul))) return null;
    return await prisma.parrainage.create({ data: { parrainUserId: c.userId, filleulTenantId: tenantId } });
  } catch (e) {
    console.error("[parrainage] rattachement", (e as Error)?.message);
    return null;
  }
}

/** Point d'entrée unique d'un abonnement réellement payé. `reference` unique : un même paiement ne compte qu'une fois. */
export async function crediterParrainSurAbonnement(p: { tenantId: string; plan: string; jours: number; montant: number; reference: string }) {
  const lien = await prisma.parrainage.findUnique({ where: { filleulTenantId: p.tenantId } });
  if (!lien) return null;
  const prix = PALIER_PRIX[p.plan];
  if (!prix) return null;
  const base = montantPlafonne(p.montant, prix, p.jours), montant = commissionAbonnement(base);
  if (!montant) return null;
  const t = await prisma.tenant.findUnique({ where: { id: p.tenantId }, select: { devise: true } });
  try {
    return await prisma.commissionParrainage.create({
      data: {
        parrainageId: lien.id, parrainUserId: lien.parrainUserId, filleulTenantId: p.tenantId, reference: p.reference.slice(0, 120),
        montantAbonnement: base, taux: TAUX_PARRAINAGE, montant, devise: deviseAbonnement(t?.devise),
        disponibleLe: new Date(Date.now() + SEQUESTRE_PARRAINAGE_HEURES * 3600_000),
      },
    });
  } catch (e: any) {
    if (e?.code === "P2002") return null; // paiement déjà compté
    throw e;
  }
}

/** Paiement annulé ou remboursé : la commission non versée disparaît. */
export async function annulerCommissionParrainage(reference: string) {
  return prisma.commissionParrainage.updateMany({ where: { reference, statut: "pending", retraitId: null }, data: { statut: "annulee" } });
}

export async function commissionsParrainageDuCompte(userId: string) {
  const liste = await prisma.commissionParrainage.findMany({ where: { parrainUserId: userId }, orderBy: { createdAt: "desc" }, take: 500 });
  const boutiques = new Map((await prisma.tenant.findMany({ where: { id: { in: [...new Set(liste.map((c) => c.filleulTenantId))] } }, select: { id: true, nomBoutique: true, pays: true } })).map((b) => [b.id, b]));
  const maintenant = new Date();
  return liste.map((c) => {
    const b = boutiques.get(c.filleulTenantId);
    return { id: c.id, montant: c.montant, devise: c.devise, etat: etatCommissionParrainage(c, maintenant), createdAt: c.createdAt, boutique: `Parrainage · ${nomMasque(b?.nomBoutique)}`, tenantId: c.filleulTenantId, pays: b?.pays ?? null, numero: null, parrainage: true as const };
  });
}

export async function tableauParrain(userId: string) {
  const [code, liens, commissions] = await Promise.all([
    codeDuCompte(userId),
    prisma.parrainage.findMany({ where: { parrainUserId: userId }, orderBy: { createdAt: "desc" }, take: 200 }),
    commissionsParrainageDuCompte(userId),
  ]);
  const tenants = new Map((await prisma.tenant.findMany({ where: { id: { in: liens.map((l) => l.filleulTenantId) } }, select: { id: true, nomBoutique: true, planType: true, planExpiresAt: true } })).map((t) => [t.id, t]));
  const maintenant = new Date();
  const filleuls = liens.map((l) => {
    const t = tenants.get(l.filleulTenantId);
    const abonne = !!t && t.planType !== "palier0" && t.planType !== "gratuit" && !!t.planExpiresAt && t.planExpiresAt > maintenant;
    const gains = commissions.filter((c) => c.tenantId === l.filleulTenantId && c.etat !== "annulee").reduce((s, c) => s + c.montant, 0);
    return { id: l.id, nom: nomMasque(t?.nomBoutique), depuis: l.createdAt, abonne, gains };
  });
  return { code: code.code, clics: code.clics, filleuls, commissions };
}
