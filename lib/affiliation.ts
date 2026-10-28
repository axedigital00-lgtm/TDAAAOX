// Affiliation Axso — modèle place de marché (Selar, Chariow, Gumroad).
// • Un affilié = un compte Axso (User). Un partenariat par boutique (Affilie), avec son code de lien.
// • Seules les ventes PAYÉES EN LIGNE rapportent : la commission est prélevée sur la part du marchand
//   au moment du crédit de son wallet (lib/wallet.ts), Axso la garde puis la verse à l'affilié.
// • Disponible 48 h après la livraison (lib/affiliation-regles.ts), retirée par l'affilié, transfert
//   fait à la main par Axso dans NotchPay puis clos dans Admin › Affiliés (comme les retraits marchands).
import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";
import { canalNotchPay, crediterWallet, EMAIL_RETRAITS, operateurCameroun } from "./wallet";
import { pousserAdmins } from "./push";
import { normaliserTelephone } from "./devise-convert";
import { TYPES_NUMERIQUES } from "./pricing";
import { livrerCommandeDigitale } from "./livraison-numerique";
import { envoyerAlerteRetrait, envoyerEmailTexte } from "./email";
import { minimumRetrait, arrondiDevise } from "./wallet-regles";
import { tauxDuJour } from "./taux-change";
import { adresseSite, SITE_AXSO } from "./utils";
import { commissionCommande, estAutoReferencement, etatCommission, tauxProduit, type EtatCommission } from "./affiliation-regles";

/** Crée le programme d'affiliation de la boutique s'il n'existe pas (réglages par défaut). */
export async function assurerProgrammeAffiliation(tenantId: string) {
  await prisma.programmeAffiliation.upsert({ where: { tenantId }, create: { tenantId, nom: "Programme d'affiliation" }, update: {} });
}

// Types livrés numériquement (jetons, accès, clés) après paiement.
export const TYPES_LIVRAISON_DIGITALE = TYPES_NUMERIQUES;

// ─── Codes ──────────────────────────────────────────────────────────────────

export function genererCodeParrainage(nom: string): string {
  const base = nom.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6) || "AFF";
  const year = new Date().getFullYear().toString().slice(-2);
  const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${base}${year}${suffix}`;
}

export async function genererCodeParrainageUnique(nom: string): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = genererCodeParrainage(nom);
    if (!(await prisma.affilie.findUnique({ where: { codeParrainage: code } }))) return code;
  }
  return `${genererCodeParrainage(nom)}${Date.now().toString(36).toUpperCase().slice(-3)}`;
}

/** Lien de partage d'un partenariat : vers la boutique, ou une fiche produit précise. */
export function lienAffiliation(code: string, produitId?: string | null) {
  return `${adresseSite()}/api/track/${code}${produitId ? `?p=${produitId}` : ""}`;
}

// ─── Compte et partenariats ─────────────────────────────────────────────────

/** Rattache au compte les partenariats créés avant les comptes affiliés (même e-mail). */
export async function lierAffiliationsAuCompte(userId: string, email: string) {
  await prisma.affilie.updateMany({ where: { userId: null, email: { equals: email.trim(), mode: "insensitive" } }, data: { userId } });
}

const estProprietaire = async (userId: string, tenantId: string) =>
  !!(await prisma.proprietaireBoutique.findFirst({ where: { userId, tenantId }, select: { id: true } }))
  || !!(await prisma.user.findFirst({ where: { id: userId, tenantId }, select: { id: true } }));

/**
 * Partenariat du compte avec une boutique, créé à la première demande de lien.
 * Actif tout de suite si la boutique valide automatiquement, sinon « en_attente ».
 */
export async function assurerPartenariat(userId: string, tenantId: string) {
  const existant = await prisma.affilie.findFirst({ where: { userId, tenantId } });
  if (existant) return existant;
  const [user, programme] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
    prisma.programmeAffiliation.findUnique({ where: { tenantId } }),
  ]);
  if (!user?.email) throw new Error("Compte introuvable");
  if (!programme?.actif) throw new Error("Cette boutique n'accepte plus d'affiliés");
  if (await estProprietaire(userId, tenantId)) throw new Error("Vous ne pouvez pas être affilié de votre propre boutique");
  // Ancienne candidature avec le même e-mail : rattachée plutôt que dupliquée.
  const ancien = await prisma.affilie.findFirst({ where: { tenantId, email: { equals: user.email, mode: "insensitive" } } });
  if (ancien) return prisma.affilie.update({ where: { id: ancien.id }, data: { userId } });
  const nom = user.name || user.email.split("@")[0];
  return prisma.affilie.create({
    data: {
      tenantId, userId, nom, email: user.email, programmeId: programme.id,
      codeParrainage: await genererCodeParrainageUnique(nom),
      statut: programme.autoApprobation ? "actif" : "en_attente",
    },
  });
}

// ─── Vente attribuée ────────────────────────────────────────────────────────

/**
 * Commission d'une commande PAYÉE EN LIGNE portant un code d'affiliation. Appelée par
 * finaliserPaiementCommande AVANT le crédit du marchand, qui reçoit sa part moins ce montant.
 * Idempotente (une commission par commande, index unique) : renvoie le montant déjà enregistré.
 */
export async function enregistrerConversionAffiliation(p: {
  commande: { id: string; tenantId: string; clientEmail: string | null; clientTelephone: string; montantTotal: number; montantLivraison: number; devise: string; codeAffiliation: string | null };
  lignes: { produitId: string; prix: number; quantite: number }[];
  tauxCommission: number;
}): Promise<number> {
  const { commande } = p;
  if (!commande.codeAffiliation) return 0;
  const deja = await prisma.commissionAffilie.findUnique({ where: { commandeId: commande.id } });
  if (deja) return deja.statut === "rejetee" ? 0 : deja.montantCommission;

  const affilie = await prisma.affilie.findFirst({ where: { tenantId: commande.tenantId, codeParrainage: commande.codeAffiliation, statut: "actif" } });
  if (!affilie) return 0;
  const programme = await prisma.programmeAffiliation.findUnique({ where: { tenantId: commande.tenantId } });
  if (!programme?.actif || estAutoReferencement(affilie, commande)) return 0;
  if (affilie.userId && (await estProprietaire(affilie.userId, commande.tenantId))) return 0;

  const produits = await prisma.produit.findMany({ where: { id: { in: p.lignes.map((l) => l.produitId) } }, select: { id: true, affiliationActive: true, tauxCommissionAff: true, type: true } });
  const parId = new Map(produits.map((x) => [x.id, x]));
  const montant = commissionCommande({
    lignes: p.lignes.map((l) => ({ prix: l.prix, quantite: l.quantite, produit: parId.get(l.produitId) ?? null })),
    montantTotal: commande.montantTotal, montantLivraison: commande.montantLivraison,
    tauxCommission: p.tauxCommission, tauxBoutiquePoints: programme.valeurCommission, devise: commande.devise,
  });
  if (montant <= 0) return 0;

  try {
    await prisma.$transaction([
      prisma.commissionAffilie.create({
        data: { tenantId: commande.tenantId, affilieId: affilie.id, commandeId: commande.id, montantCommission: montant, valeurCommande: commande.montantTotal, devise: commande.devise, statut: "pending" },
      }),
      prisma.affilie.update({ where: { id: affilie.id }, data: { conversions: { increment: 1 }, commissionTotal: { increment: montant }, commissionPending: { increment: montant } } }),
    ]);
  } catch (e) {
    // Finalisation rejouée en même temps : l'autre appel a enregistré la commission.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const autre = await prisma.commissionAffilie.findUnique({ where: { commandeId: commande.id } });
      return autre?.montantCommission ?? 0;
    }
    throw e;
  }
  return montant;
}

// ─── Gains de l'affilié ─────────────────────────────────────────────────────

export interface CommissionDuCompte {
  id: string; montant: number; devise: string; etat: EtatCommission; createdAt: Date;
  boutique: string; tenantId: string; pays: string | null; numero: string | null;
}

/** Toutes les commissions d'un compte affilié, avec leur état (en attente, disponible, versée, annulée). */
export async function commissionsDuCompte(userId: string): Promise<CommissionDuCompte[]> {
  const affs = await prisma.affilie.findMany({ where: { userId }, select: { id: true, tenantId: true, tenant: { select: { nomBoutique: true, devise: true, pays: true } } } });
  if (!affs.length) return [];
  const parAffilie = new Map(affs.map((a) => [a.id, a]));
  const comms = await prisma.commissionAffilie.findMany({ where: { affilieId: { in: affs.map((a) => a.id) } }, orderBy: { createdAt: "desc" } });
  const ids = comms.map((c) => c.commandeId).filter((x): x is string => !!x);
  const commandes = new Map((await prisma.commande.findMany({ where: { id: { in: ids } }, select: { id: true, numero: true, statut: true, livreeAt: true } })).map((c) => [c.id, c]));
  const maintenant = new Date();
  return comms.map((c) => {
    const a = parAffilie.get(c.affilieId)!;
    const cmd = c.commandeId ? commandes.get(c.commandeId) : null;
    return {
      id: c.id, montant: c.montantCommission, devise: c.devise ?? a.tenant.devise, etat: etatCommission(c, cmd, maintenant),
      createdAt: c.createdAt, boutique: a.tenant.nomBoutique, tenantId: a.tenantId, pays: a.tenant.pays, numero: cmd?.numero ?? null,
    };
  });
}

export type Soldes = Record<string, { enAttente: number; disponible: number; verse: number }>;

export function soldesParDevise(commissions: CommissionDuCompte[]): Soldes {
  const s: Soldes = {};
  for (const c of commissions) {
    if (c.etat === "annulee") continue;
    const d = (s[c.devise] ??= { enAttente: 0, disponible: 0, verse: 0 });
    const cle = c.etat === "en_attente" ? "enAttente" : c.etat === "disponible" ? "disponible" : "verse";
    d[cle] = Math.round((d[cle] + c.montant) * 100) / 100;
  }
  return s;
}

// ─── Retrait de l'affilié ───────────────────────────────────────────────────

/** Retire tout le disponible d'une devise vers un numéro Mobile Money. Transfert fait à la main par Axso. */
export async function demanderRetraitAffilie(p: { userId: string; devise: string; telephone: string }) {
  const dispo = (await commissionsDuCompte(p.userId)).filter((c) => c.devise === p.devise && c.etat === "disponible");
  const montant = arrondiDevise(dispo.reduce((s, c) => s + c.montant, 0), p.devise);
  const minimum = minimumRetrait(p.devise, await tauxDuJour());
  if (montant < minimum) throw new Error(`Minimum de retrait : ${minimum.toLocaleString("fr-FR")} ${p.devise} disponibles`);
  const tel = normaliserTelephone(p.telephone, dispo[0]?.pays);
  if (!tel) throw new Error("Numéro Mobile Money invalide : vérifie-le, avec l'indicatif de ton pays.");
  const ids = dispo.map((c) => c.id);

  const retrait = await prisma.$transaction(async (tx) => {
    const r = await tx.retraitAffilie.create({ data: { userId: p.userId, montant, devise: p.devise, destinataire: tel, operateur: operateurCameroun(tel) } });
    // Conditionnel : deux demandes simultanées ne retirent pas deux fois les mêmes commissions.
    const pris = await tx.commissionAffilie.updateMany({ where: { id: { in: ids }, statut: "pending", retraitId: null }, data: { retraitId: r.id, statut: "payee" } });
    if (pris.count !== ids.length) throw new Error("Un retrait est déjà en cours — recharge la page");
    return r;
  });
  await signalerRetraitAffilie(retrait.id).catch((e) => console.error("[affiliation] alerte retrait", retrait.id, e?.message));
  return retrait;
}

/** Prévient Axso qu'un retrait d'affilié attend son transfert (push du Command Center + e-mail). */
async function signalerRetraitAffilie(retraitId: string) {
  const r = await prisma.retraitAffilie.findUniqueOrThrow({ where: { id: retraitId }, include: { user: { select: { name: true, email: true } } } });
  const dejaPayes = await prisma.retraitAffilie.count({ where: { userId: r.userId, destinataire: r.destinataire, statut: "complete" } });
  const montant = `${r.montant.toLocaleString("fr-FR")} ${r.devise}`;
  const nom = r.user.name ?? r.user.email ?? "affilié";
  await Promise.allSettled([
    pousserAdmins({ titre: "🤝 Retrait d'affilié à valider", message: `${montant} → ${nom}`, lien: "/admin/affilies", type: "retrait_a_valider" }),
    envoyerAlerteRetrait({
      a: EMAIL_RETRAITS, lienAdmin: `${SITE_AXSO}/admin/affilies`,
      retraitId: r.id, reference: `AXSO-AFF-${r.id}`, creeLe: r.createdAt,
      montant: r.montant, devise: r.devise, methode: "mobile_money", operateur: r.operateur?.toUpperCase() ?? null, destinataire: r.destinataire,
      canal: canalNotchPay({ methode: "mobile_money", operateur: r.operateur, devise: r.devise, destinataire: r.destinataire }), notes: null,
      boutique: "Affiliation Axso", slug: "", proprietaire: null, emailBoutique: null, whatsappBoutique: null,
      soldeApres: null, premierRetraitVersCeNumero: dejaPayes === 0,
      affilie: { nom, email: r.user.email ?? "" },
    }),
  ]);
}

/** Clôture par Axso : payé (affilié prévenu) ou refusé (commissions de nouveau disponibles). */
export async function cloturerRetraitAffilie(retraitId: string, paye: boolean) {
  const { count } = await prisma.retraitAffilie.updateMany({ where: { id: retraitId, statut: "en_attente" }, data: { statut: paye ? "complete" : "echoue" } });
  if (!count) throw new Error("Ce retrait est déjà traité");
  const r = await prisma.retraitAffilie.findUniqueOrThrow({ where: { id: retraitId }, include: { user: { select: { name: true, email: true } } } });
  if (!paye) {
    await prisma.commissionAffilie.updateMany({ where: { retraitId }, data: { retraitId: null, statut: "pending" } });
  }
  if (r.user.email) {
    const montant = `${r.montant.toLocaleString("fr-FR")} ${r.devise}`;
    await envoyerEmailTexte({
      a: r.user.email, repondreA: EMAIL_RETRAITS, boutique: "Axso",
      sujet: paye ? `Vos commissions de ${montant} ont été envoyées` : `Votre retrait de ${montant} n'a pas pu être fait`,
      texte: paye
        ? `Bonjour ${r.user.name ?? ""},\n\nAxso vous a versé ${montant} de commissions d'affiliation sur le ${r.destinataire}.\n\nMerci pour vos recommandations !`
        : `Bonjour ${r.user.name ?? ""},\n\nLe versement de ${montant} sur le ${r.destinataire} n'a pas pu être fait. Vos commissions sont de nouveau disponibles : vérifiez votre numéro dans votre espace affilié et refaites la demande.`,
    }).catch(() => false);
  }
}

// ─── Paiement d'une commande numérique ──────────────────────────────────────
// Livraison (jetons, accès, clés, e-mail — idempotente et journalisée) AVANT le crédit : le client a
// payé, ses accès ne dépendent jamais du portefeuille du marchand. Puis crédit du marchand.
export async function traiterPaiementDigital(params: {
  commande: { id: string; tenantId: string; clientEmail: string; clientNom: string; montantTotal: number; devise: string };
  lignes: Array<{ produitId: string; produit?: { fichierUrl?: string | null; type?: string } | null; prix?: number; quantite?: number }>;
  reference: string;
  tauxCommission: number;
  fraisPasserelle?: number;
  commissionAffilie?: number;
}) {
  const { commande, reference, tauxCommission, fraisPasserelle } = params;
  await livrerCommandeDigitale(commande.id);
  await crediterWallet({
    tenantId: commande.tenantId,
    montantBrut: commande.montantTotal,
    tauxCommission,
    devise: commande.devise,
    description: `Vente digitale #${commande.id.slice(-6).toUpperCase()}`,
    lignes: params.lignes.every((l) => l.prix != null && l.quantite != null) ? params.lignes.map((l) => ({ prix: l.prix!, quantite: l.quantite! })) : undefined,
    commandeId: commande.id,
    reference,
    fraisPasserelle,
    commissionAffilie: params.commissionAffilie,
  });
}

// ─── Catalogue (page publique /affiliation et espace affilié) ──────────────

export interface ProduitCatalogue {
  produitId: string; nom: string; image: string | null; prix: number; devise: string; type: string;
  categorie: string | null; ventes: number; taux: number; gain: number;
  tenantId: string; boutique: string; slug: string; logoUrl: string | null; certifie: boolean;
  validationManuelle: boolean; partenariat: "actif" | "en_attente" | "suspendu" | null;
}

/** Produits ouverts aux affiliés des boutiques actives dont l'affiliation est activée. */
export async function catalogueAffiliation(f: { q?: string; cat?: string; tri?: string; userId?: string | null; take?: number } = {}) {
  const programmes = await prisma.programmeAffiliation.findMany({
    where: { actif: true, tenant: { statut: "active" } },
    select: { tenantId: true, valeurCommission: true, autoApprobation: true, tenant: { select: { nomBoutique: true, slug: true, logoUrl: true, certifie: true, devise: true } } },
  });
  const parTenant = new Map(programmes.map((p) => [p.tenantId, p]));
  const q = f.q?.trim();
  const [produits, partenariats] = await Promise.all([
    prisma.produit.findMany({
      where: {
        tenantId: { in: [...parTenant.keys()] }, actif: true, affiliationActive: true,
        ...(q ? { OR: [{ nom: { contains: q, mode: "insensitive" as const } }, { tenant: { nomBoutique: { contains: q, mode: "insensitive" as const } } }] } : {}),
        ...(f.cat ? { categorie: f.cat } : {}),
      },
      select: { id: true, nom: true, images: true, prix: true, type: true, categorie: true, ventes: true, tauxCommissionAff: true, tenantId: true },
      orderBy: { ventes: "desc" },
      take: 400,
    }),
    f.userId ? prisma.affilie.findMany({ where: { userId: f.userId }, select: { tenantId: true, statut: true } }) : Promise.resolve([]),
  ]);
  const statutPart = new Map(partenariats.map((p) => [p.tenantId, p.statut as ProduitCatalogue["partenariat"]]));
  let liste: ProduitCatalogue[] = produits.map((p) => {
    const prog = parTenant.get(p.tenantId)!;
    const taux = tauxProduit(p, prog.valeurCommission);
    return {
      produitId: p.id, nom: p.nom, image: p.images?.[0] ?? null, prix: p.prix, devise: prog.tenant.devise, type: p.type,
      categorie: p.categorie, ventes: p.ventes, taux, gain: arrondiDevise(p.prix * taux, prog.tenant.devise),
      tenantId: p.tenantId, boutique: prog.tenant.nomBoutique, slug: prog.tenant.slug, logoUrl: prog.tenant.logoUrl, certifie: prog.tenant.certifie,
      validationManuelle: !prog.autoApprobation, partenariat: statutPart.get(p.tenantId) ?? null,
    };
  });
  const categories = [...new Set(liste.map((l) => l.categorie).filter((c): c is string => !!c))].sort();
  if (f.tri !== "populaire") liste = liste.sort((a, b) => b.taux - a.taux || b.ventes - a.ventes);
  return {
    produits: liste.slice(0, f.take ?? 120), total: liste.length, categories,
    boutiques: parTenant.size, tauxMax: liste.reduce((m, l) => Math.max(m, l.taux), 0),
  };
}
