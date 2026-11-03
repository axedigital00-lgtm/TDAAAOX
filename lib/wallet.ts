// Wallet AXSO — logique métier
// Flux : crédit (bonus, gains…) ; une vente reste en séquestre 48 h (comptée dans le solde, pas
//        encore retirable : WalletTransaction.disponibleLe) ;
//        retrait → débit du seul solde disponible → Axso fait le transfert à la main (voir initierRetrait)

import { prisma } from "./prisma";
import { versXAF } from "./devise-convert";
import { tauxDuJour } from "./taux-change";
import { Prisma } from "@prisma/client";
import { etatSequestre, finSequestre, minimumRetrait, arrondiDevise } from "./wallet-regles";
import { pousserAdmins } from "./push";
import { envoyerAlerteRetrait } from "./email";
import { notifierMarchand } from "./notifications-marchand";
import { normaliserTelephone } from "./devise-convert";

type Tx = Prisma.TransactionClient;

// ─── Types ────────────────────────────────────────────────────────────────────

export type TypeTransaction = "CREDIT" | "COMMISSION" | "RETRAIT" | "REMBOURSEMENT" | "FRAIS" | "BONUS";

export interface RetraitParams {
  tenantId: string;
  montant: number;
  devise: string;
  methode: "mobile_money" | "virement_bancaire";
  destinataire: string;
  operateur?: string;
  notes?: string;
}

// ─── Obtenir ou créer le wallet d'un marchand ─────────────────────────────────

export async function getOrCreateWallet(tenantId: string, devise = "XAF") {
  return prisma.wallet.upsert({
    where: { tenantId },
    create: { tenantId, devise },
    update: {},
  });
}

// ─── Portefeuille plateforme (revenu Axso) ────────────────────────────────────
// Aucune commission n'existait nulle part sous forme d'argent retirable — elle
// n'était qu'une ligne d'audit négative sur le wallet du marchand. On la fait
// atterrir ici : un tenant "système" interne qui réutilise l'infra wallet déjà
// durcie (débit atomique, remboursement automatique) plutôt qu'un système parallèle.

export const PLATFORM_TENANT_SLUG = "axso-platform-interne";

async function getOrCreatePlatformTenantId(tx: any): Promise<string> {
  const tenant = await tx.tenant.upsert({
    where: { slug: PLATFORM_TENANT_SLUG },
    create: {
      slug: PLATFORM_TENANT_SLUG,
      nomBoutique: "Axso Platform",
      categorie: "interne",
      pays: "CM",
      devise: "XAF",
      whatsapp: "",
      email: "platform@axso.internal",
      statut: "systeme",
      commissionRate: 0,
    },
    update: {},
  });
  return tenant.id;
}

export async function getPlatformTenantId(): Promise<string> {
  return getOrCreatePlatformTenantId(prisma);
}

// Le portefeuille plateforme est tenu en XAF : chaque montant d'une boutique
// (NGN, GHS, XOF…) y est converti, jamais additionné tel quel.
const enXAF = (montant: number, devise: string, description: string, taux: Record<string, number>) => devise === "XAF"
  ? { montant, devise, description }
  : { montant: versXAF(montant, devise, taux), devise: "XAF", description: `${description} (${montant} ${devise})` };

// ─── Récompenser un marchand ───────────────────────────────────────────────────
// Bonus versé par Axso depuis son propre wallet plateforme — débite réellement
// la plateforme (même débit atomique conditionnel que initierRetrait) pour ne
// jamais promettre plus d'argent que ce qu'Axso a réellement en caisse.
export async function crediterBonusWallet(tenantId: string, montant: number, devise: string, raison: string) {
  const taux = await tauxDuJour(); // hors transaction : aucun appel réseau pendant qu'elle est ouverte
  await prisma.$transaction(async (tx) => {
    const platformTenantId = await getOrCreatePlatformTenantId(tx);
    const debitXAF = enXAF(montant, devise, `Bonus marchand · ${raison}`, taux);
    const debit = await tx.wallet.updateMany({
      where: { tenantId: platformTenantId, solde: { gte: debitXAF.montant } },
      data: { solde: { decrement: debitXAF.montant }, totalRetire: { increment: debitXAF.montant } },
    });
    if (debit.count === 0) throw new Error("Solde plateforme insuffisant pour ce bonus");

    const platformWallet = await tx.wallet.findUnique({ where: { tenantId: platformTenantId } });
    await tx.walletTransaction.create({
      data: { walletId: platformWallet!.id, type: "RETRAIT", montant: -debitXAF.montant, devise: debitXAF.devise, description: debitXAF.description, statut: "completed" },
    });

    const wallet = await tx.wallet.upsert({
      where: { tenantId },
      create: { tenantId, devise, solde: montant, totalRecu: montant },
      update: { solde: { increment: montant }, totalRecu: { increment: montant } },
    });
    await tx.walletTransaction.create({
      data: { walletId: wallet.id, type: "BONUS", montant, devise, description: `Bonus Axso · ${raison}`, statut: "completed" },
    });
  });
}

// ─── Initier un retrait ───────────────────────────────────────────────────────
// Sécurité : le débit du solde et sa vérification sont une SEULE opération atomique
// (updateMany conditionnel) pour éliminer toute race condition entre deux retraits
// concurrents qui passeraient tous les deux un contrôle de solde fait séparément.
//
// Circuit MANUEL : chaque retrait reste « en_attente » ; Axso est prévenu (cloche + push du Command
// Center, e-mail à EMAIL_RETRAITS), fait le transfert lui-même, puis le marque payé ou refusé dans
// Admin › Finances.

// Lie la ligne RETRAIT du wallet à son retrait.
const refRetrait = (retraitId: string) => `AXSO-${retraitId}`;

// Numéro mobile camerounais au format international (+2376…), ou null.
export function telCameroun(saisie: string): string | null {
  const d = saisie.replace(/\D/g, "").replace(/^(00)?237/, "");
  return /^6\d{8}$/.test(d) ? `+237${d}` : null;
}

/** Opérateur d'un numéro camerounais (+2376…) d'après son préfixe : MTN 67 / 650-654, Orange 69 / 655-659.
 *  ponytail: préfixes sûrs seulement ; 68x et 62x (partagés ou récents) → null, versement à la main. */
export function operateurCameroun(tel: string | null): "mtn" | "orange" | null {
  const d = tel?.replace(/\D/g, "").replace(/^237/, "") ?? "";
  if (/^67/.test(d) || /^65[0-4]/.test(d)) return "mtn";
  if (/^69/.test(d) || /^65[5-9]/.test(d)) return "orange";
  return null;
}

// ─── Solde disponible (hors séquestre) ────────────────────────────────────────

const sommeEnSequestreTx = async (tx: Tx, walletId: string) =>
  (await tx.walletTransaction.aggregate({ where: { walletId, type: "CREDIT", disponibleLe: { gt: new Date() } }, _sum: { montant: true } }))._sum.montant ?? 0;

// Débit du seul solde DISPONIBLE (ventes en séquestre exclues), atomique : la ligne Wallet reste
// verrouillée (FOR UPDATE) du contrôle jusqu'à la fin de la transaction ; tout crédit, remboursement
// ou débit concurrent de ce wallet attend, puis voit le nouveau solde.
export async function debiterDisponibleTx(tx: Tx, tenantId: string, montant: number, retrait = false) {
  const [w] = await tx.$queryRaw<{ id: string; solde: number; devise: string }[]>`SELECT "id", "solde", "devise" FROM "Wallet" WHERE "tenantId" = ${tenantId} FOR UPDATE`;
  if (!w) throw new Error("Wallet introuvable");
  if (w.solde - (await sommeEnSequestreTx(tx, w.id)) < montant - 1e-6) throw new Error("Solde disponible insuffisant (les ventes des dernières 48 h sont encore en séquestre)");
  await tx.wallet.update({ where: { id: w.id }, data: { solde: { decrement: montant }, ...(retrait ? { totalRetire: { increment: montant } } : {}) } });
  return w;
}

export async function initierRetrait(params: RetraitParams) {
  const { tenantId, methode, operateur, notes } = params;
  const boutique = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { pays: true, statut: true, wallet: { select: { devise: true } } } });
  if (!boutique) throw new Error("Boutique introuvable");
  if (boutique.statut === "suspendu" || boutique.statut === "supprime") throw new Error("Boutique suspendue : les retraits sont bloqués. Contacte le support Axso.");
  // Mobile Money : numéro au format international, indicatif du pays de la boutique (6XX… au Cameroun → +2376XX…).
  let destinataire = params.destinataire.trim();
  if (methode === "mobile_money") {
    const tel = normaliserTelephone(destinataire, boutique.pays);
    if (!tel) throw new Error("Numéro Mobile Money invalide : vérifie-le, avec l'indicatif de ton pays s'il est à l'étranger.");
    destinataire = tel;
  }
  // Le retrait se fait dans la devise du wallet, pas dans celle passée par l'appelant.
  const devise = boutique.wallet?.devise ?? params.devise;
  const montant = arrondiDevise(Number(params.montant), devise);
  const minimum = minimumRetrait(devise, await tauxDuJour());
  if (!Number.isFinite(montant) || montant < minimum) throw new Error(`Montant minimum de retrait : ${minimum.toLocaleString("fr-FR")} ${devise}`);

  const { retrait } = await prisma.$transaction(async (tx) => {
    const wallet = await debiterDisponibleTx(tx, tenantId, montant, true);

    const r = await tx.retrait.create({
      data: { walletId: wallet.id, tenantId, montant, devise: wallet.devise, methode, destinataire, operateur, notes, statut: "en_attente" },
    });

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "RETRAIT",
        montant: -montant,
        devise: wallet.devise,
        description: `Retrait ${methode === "mobile_money" ? `Mobile Money (${operateur ?? ""})` : "Virement bancaire"} → ${destinataire}`,
        reference: refRetrait(r.id),
        statut: "en_cours",
      },
    });

    return { retrait: r };
  });

  // Jamais bloquant : le retrait est enregistré même si l'alerte échoue (il reste visible dans Finances).
  await signalerRetraitAValider(retrait.id).catch((e) => console.error("[wallet/retrait] alerte admin", retrait.id, e?.message));
  return retrait;
}

/** Destinataire des alertes « retrait à valider ». */
export const EMAIL_RETRAITS = "axedigital00@gmail.com";

/**
 * Prévient Axso qu'un retrait attend son transfert : push du Command Center + e-mail détaillé
 * (tout ce qu'il faut pour faire le transfert et vérifier le marchand).
 */
export async function signalerRetraitAValider(retraitId: string) {
  const r = await prisma.retrait.findUniqueOrThrow({ where: { id: retraitId } });
  const [tenant, wallet, dejaPayes] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: r.tenantId },
      select: { nomBoutique: true, slug: true, email: true, whatsapp: true, proprietaires: { where: { role: "owner" }, take: 1, select: { user: { select: { name: true, email: true } } } } },
    }),
    prisma.wallet.findUnique({ where: { id: r.walletId }, select: { solde: true } }),
    prisma.retrait.count({ where: { tenantId: r.tenantId, destinataire: r.destinataire, statut: "complete" } }),
  ]);
  const montant = `${r.montant.toLocaleString("fr-FR")} ${r.devise}`;
  const boutique = tenant?.nomBoutique ?? r.tenantId;
  await Promise.allSettled([
    pousserAdmins({ titre: "💸 Retrait à valider", message: `${boutique} · ${montant} → ${r.operateur ?? r.methode}`, lien: "/admin/finances", type: "retrait_a_valider" }),
    envoyerAlerteRetrait({
      a: EMAIL_RETRAITS,
      retraitId: r.id, reference: refRetrait(r.id), creeLe: r.createdAt,
      montant: r.montant, devise: r.devise, methode: r.methode, operateur: r.operateur, destinataire: r.destinataire,
      notes: r.notes,
      boutique, slug: tenant?.slug ?? "", proprietaire: tenant?.proprietaires[0]?.user ?? null,
      emailBoutique: tenant?.email ?? null, whatsappBoutique: tenant?.whatsapp ?? null,
      soldeApres: wallet?.solde ?? null, premierRetraitVersCeNumero: dejaPayes === 0,
    }).then((ok) => { if (!ok) throw new Error("e-mail non envoyé"); }),
  ]).then((res) => res.forEach((x) => x.status === "rejected" && console.error("[wallet/retrait] alerte", retraitId, x.reason?.message)));
}

// ─── Appliquer l'état d'un transfert à son retrait ────────────────────────────
// Point de passage unique de la clôture d'un retrait par l'admin.
// Un retrait déjà clos (complete / echoue) ne bouge plus.
const STATUTS_ECHEC = ["failed", "canceled", "cancelled", "reversed", "rejected", "expired"];

// Renvoie vrai seulement pour l'appel qui a clos le retrait (payé ou échoué) : lui seul prévient
// le marchand.
export async function appliquerStatutTransfert(retraitId: string, status?: string, reference?: string): Promise<boolean> {
  if (status && STATUTS_ECHEC.includes(status)) {
    const rembourse = await rembourserRetraitEchoue(retraitId);
    if (rembourse) await prevenirMarchandRetrait(retraitId, false);
    return rembourse;
  }

  const complet = status === "complete";
  const maj = await prisma.retrait.updateMany({
    where: { id: retraitId, statut: { in: ["en_attente", "traitement"] } },
    data: { statut: complet ? "complete" : "traitement", ...(reference ? { reference } : {}) },
  });
  if (!complet || maj.count === 0) return false;
  await prisma.walletTransaction.updateMany({
    where: { type: "RETRAIT", reference: refRetrait(retraitId), statut: "en_cours" },
    data: { statut: "completed" },
  });
  await prevenirMarchandRetrait(retraitId, true);
  return true;
}

async function prevenirMarchandRetrait(retraitId: string, paye: boolean) {
  const retrait = await prisma.retrait.findUniqueOrThrow({ where: { id: retraitId } });
  const montant = `${retrait.montant.toLocaleString("fr-FR")} ${retrait.devise}`;
  await notifierMarchand({
    tenantId: retrait.tenantId, type: paye ? "retrait_paye" : "retrait_refuse", lien: "/dashboard/wallet",
    titre: paye ? `Retrait de ${montant} envoyé` : `Retrait de ${montant} refusé`,
    message: paye ? `Axso a envoyé ${montant} à ${retrait.destinataire}.` : `Le retrait vers ${retrait.destinataire} n'a pas pu être fait : ${montant} ont été remis sur votre solde.`,
  }).catch((e) => console.error("[wallet/retrait] notification", retraitId, e?.message));
}

// Clôture d'un retrait par l'admin (y compris un ancien retrait resté « en cours »).
// Deux clôtures simultanées : une seule gagne (mise à jour conditionnelle), l'autre échoue.
export async function cloturerRetraitManuel(retraitId: string, paye: boolean) {
  const retrait = await prisma.retrait.findUnique({ where: { id: retraitId } });
  if (!retrait) throw new Error("Retrait introuvable");
  if (!(await appliquerStatutTransfert(retraitId, paye ? "complete" : "failed"))) throw new Error("Ce retrait est déjà traité");
}

// ─── Rembourser un retrait qui a échoué ───────────────────────────────────────
// Idempotent même sous concurrence (deux clôtures simultanées) : le
// passage à « echoue » est conditionnel et seul celui qui le gagne recrédite (vrai).
export async function rembourserRetraitEchoue(retraitId: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const maj = await tx.retrait.updateMany({
      where: { id: retraitId, statut: { in: ["en_attente", "traitement"] } },
      data: { statut: "echoue" },
    });
    if (maj.count === 0) return false;
    const retrait = await tx.retrait.findUniqueOrThrow({ where: { id: retraitId } });

    await tx.wallet.update({
      where: { id: retrait.walletId },
      data: { solde: { increment: retrait.montant }, totalRetire: { decrement: retrait.montant } },
    });

    await tx.walletTransaction.create({
      data: {
        walletId: retrait.walletId,
        type: "REMBOURSEMENT",
        montant: retrait.montant,
        devise: retrait.devise,
        description: `Remboursement — retrait échoué (${retrait.destinataire})`,
        reference: refRetrait(retraitId),
        statut: "completed",
      },
    });

    await tx.walletTransaction.updateMany({
      where: { type: "RETRAIT", reference: refRetrait(retraitId), statut: "en_cours" },
      data: { statut: "echoue" },
    });
    return true;
  });
}

// ─── Résumé wallet (pour le dashboard) ───────────────────────────────────────

const ventesEnSequestre = (walletId: string) =>
  prisma.walletTransaction.findMany({ where: { walletId, type: "CREDIT", disponibleLe: { gt: new Date() } }, select: { montant: true, disponibleLe: true } });

/** Solde, disponible et en séquestre d'une boutique (null sans wallet). */
export async function soldeDisponible(tenantId: string) {
  const w = await prisma.wallet.findUnique({ where: { tenantId }, select: { id: true, solde: true, devise: true } });
  return w ? { devise: w.devise, solde: w.solde, ...etatSequestre(w.solde, await ventesEnSequestre(w.id)) } : null;
}

export async function getWalletResume(tenantId: string) {
  const wallet = await prisma.wallet.findUnique({
    where: { tenantId },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 30,
      },
      retraits: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!wallet) return null;

  const [enCours, sequestre, taux] = await Promise.all([
    // Tous les retraits ouverts, pas seulement les 10 affichés.
    prisma.retrait.aggregate({ where: { walletId: wallet.id, statut: { in: ["en_attente", "traitement"] } }, _sum: { montant: true } }),
    ventesEnSequestre(wallet.id),
    tauxDuJour(),
  ]);
  return {
    ...wallet,
    ...etatSequestre(wallet.solde, sequestre), // disponible, enAttente (séquestre), liberations
    minimumRetrait: minimumRetrait(wallet.devise, taux),
    retraitsEnAttente: enCours._sum.montant ?? 0,
  };
}
