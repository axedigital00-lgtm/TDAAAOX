// Vente d'un produit numérique payée par pawaPay.
// 1. creerCommandeNumerique : prix relus en base, commande « en attente », paiement Mobile Money direct
//    (le client valide sur son téléphone ; seule la marque AXSO est visible : lib/paiements/depot-direct.ts).
// 2. appliquerDepotCommande : seul le statut relu chez pawaPay marque la commande payée ; alors le
//    marchand est crédité de 90 % (retirable après SEQUESTRE_NUMERIQUE_HEURES), Axso garde 10 %
//    (frais pawaPay compris), et l'accès au produit part tout seul (livrerCommandeDigitale).
import { randomBytes, randomUUID } from "crypto";
import type { PaiementPawapay } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PAIEMENT } from "@/lib/commandes";
import { genererNumeroCommande } from "@/lib/utils";
import { emailReel } from "@/lib/email";
import { reductionPromo, filtreUsagePromo, repartitionNumerique, TYPES_NUMERIQUES, COMMISSION_NUMERIQUE } from "@/lib/pricing";
import { livrerCommandeDigitale, refusVenteNumerique, lienAccesCommande } from "@/lib/livraison-numerique";
import { notifierMarchand } from "@/lib/notifications-marchand";
import { versXAF } from "@/lib/devise-convert";
import { tauxDuJour } from "@/lib/taux-change";
import { getPlatformTenantId } from "@/lib/wallet";
import { clientPawapay, type ClientPawapay, type EtatDepot } from "./pawapay";
import { preparerDepot, lancerDepot, ErreurMobileMoney } from "./depot-direct";

/** Une vente numérique devient retirable par le marchand 24 h après le paiement. */
export const SEQUESTRE_NUMERIQUE_HEURES = 24;
const ABANDON_MS = 15 * 60_000;

export class ErreurVente extends Error { constructor(message: string, public status = 400) { super(message); } }

/** Montant dans une autre devise (dépôt dans la monnaie du pays du client), arrondi à l'unité supérieure. */
export function convertir(montant: number, de: string, vers: string, taux: Record<string, number>): number {
  if (de === vers || (["XAF", "XOF"].includes(de) && ["XAF", "XOF"].includes(vers))) return Math.ceil(montant);
  const enXaf = de === "XAF" || de === "XOF" ? montant : versXAF(montant, de, taux);
  const t = vers === "XAF" || vers === "XOF" ? 1 : taux[vers];
  if (!t) throw new ErreurVente("Paiement indisponible dans cette monnaie", 422);
  return Math.ceil(enXaf * t);
}

export async function creerCommandeNumerique(p: {
  tenantId: string; produitId: string; quantite?: number; codePromo?: string | null; codeAffiliation?: string | null;
  client: { nom: string; email: string; telephone: string; pays?: string }; origine: string;
}, client: ClientPawapay | null = clientPawapay()) {
  try { return await creer(p, client); }
  catch (e) { throw e instanceof ErreurMobileMoney ? new ErreurVente(e.message, e.status) : e; }
}

async function creer(p: Parameters<typeof creerCommandeNumerique>[0], client: ClientPawapay | null) {
  if (!client) throw new ErreurVente("Le paiement en ligne n'est pas encore disponible", 503);
  const nom = p.client.nom?.trim(), email = p.client.email?.trim().toLowerCase(), telephone = p.client.telephone?.trim();
  if (!nom || !telephone) throw new ErreurVente("Indiquez votre nom et votre numéro");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ErreurVente("Indiquez un e-mail valide : votre accès y sera envoyé");

  const tenant = await prisma.tenant.findUnique({ where: { id: p.tenantId }, select: { id: true, slug: true, statut: true, devise: true, nomBoutique: true } });
  if (!tenant || tenant.statut !== "active") throw new ErreurVente("Boutique introuvable", 404);
  const produit = await prisma.produit.findFirst({ where: { id: p.produitId, tenantId: tenant.id, actif: true }, select: { id: true, nom: true, type: true, prix: true, images: true } });
  if (!produit || !TYPES_NUMERIQUES.has(produit.type)) throw new ErreurVente("Produit introuvable", 404);
  const refus = await refusVenteNumerique([produit.id]);
  if (refus) throw new ErreurVente(refus, 409);

  // Prix et remise relus en base : jamais ceux du navigateur.
  const quantite = 1;
  const sousTotal = produit.prix * quantite;
  const promo = p.codePromo ? await prisma.codePromo.findFirst({ where: { tenantId: tenant.id, code: String(p.codePromo).toUpperCase(), actif: true } }) : null;
  const reduction = reductionPromo(promo, sousTotal, [{ produitId: produit.id, prix: produit.prix, quantite }]);
  const total = sousTotal - reduction;
  if (total <= 0) throw new ErreurVente("Montant invalide");
  // Opérateur, pays et monnaie déduits du numéro ; montant converti si le client paie dans une autre monnaie.
  const depot = await preparerDepot(client, telephone);
  const montantDepot = convertir(total, tenant.devise, depot.devise, await tauxDuJour());
  if ((depot.min && montantDepot < depot.min) || (depot.max && montantDepot > depot.max)) throw new ErreurVente("Ce montant n'est pas accepté par votre opérateur Mobile Money.", 422);

  const clientRecord = await prisma.client.findFirst({ where: { tenantId: tenant.id, telephone } })
    ?? await prisma.client.create({ data: { tenantId: tenant.id, nom, email, telephone, pays: p.client.pays || null } });
  const depositId = randomUUID();
  const commande = await prisma.$transaction(async (tx) => {
    const c = await tx.commande.create({
      data: {
        tenantId: tenant.id, numero: genererNumeroCommande(), clientId: clientRecord.id,
        clientNom: nom, clientEmail: email || (emailReel(clientRecord.email) ? clientRecord.email : null), clientTelephone: telephone,
        adresseLivraison: "Produit numérique", ville: "—", pays: p.client.pays || depot.pays,
        tauxCommission: COMMISSION_NUMERIQUE,
        montantSousTotal: sousTotal, montantReduction: reduction, codePromoId: promo && reduction > 0 ? promo.id : null,
        montantLivraison: 0, montantTotal: total, devise: tenant.devise,
        statut: "en_attente", paiementStatut: PAIEMENT.ATTENTE, methodePaiement: "pawapay",
        codeAffiliation: p.codeAffiliation || null,
        trackingToken: randomBytes(20).toString("hex"), livreurToken: randomBytes(20).toString("hex"),
        lignes: { create: [{ produitId: produit.id, nom: produit.nom, prix: produit.prix, quantite, imageUrl: produit.images[0] ?? null, variante: null }] },
      },
    });
    if (promo && reduction > 0) {
      const { count } = await tx.codePromo.updateMany({ where: filtreUsagePromo(promo), data: { utilisations: { increment: 1 } } });
      if (!count) throw new ErreurVente("Ce code promo vient d'être épuisé — réessayez sans le code", 409);
    }
    await tx.paiementPawapay.create({ data: { id: depositId, type: "commande", tenantId: tenant.id, commandeId: c.id, montant: montantDepot, devise: depot.devise, pays: depot.pays } });
    return c;
  });

  try {
    const { application } = await lancerDepot(client, {
      depositId, telephone: depot.telephone, operateur: depot.operateur, montant: montantDepot, devise: depot.devise,
      message: `AXSO ${tenant.nomBoutique}`, retour: `${p.origine}/${tenant.slug}/paiement?id=${depositId}`, reference: commande.numero,
    });
    return { id: depositId, numero: commande.numero, operateur: depot.nomOperateur, application };
  } catch (e) {
    await prisma.paiementPawapay.update({ where: { id: depositId }, data: { statut: "echoue", motifEchec: e instanceof Error ? e.message.slice(0, 200) : "Paiement refusé" } });
    await prisma.commande.update({ where: { id: commande.id }, data: { paiementStatut: PAIEMENT.ECHOUE, statut: "annulee" } });
    if (e instanceof ErreurMobileMoney) throw e;
    console.error("[mobile-money] commande", depositId, e instanceof Error ? e.message : e);
    throw new ErreurVente("Paiement indisponible pour le moment, réessayez dans quelques instants", 502);
  }
}

/** Idempotent : un rappel rejoué ou deux vérifications simultanées ne créditent le marchand qu'une fois. */
export async function appliquerDepotCommande(p: PaiementPawapay, d: EtatDepot, maintenant = new Date()) {
  if (!p.commandeId || p.statut === "paye" || p.statut === "a_verifier") return;
  if (d.etat === "echoue" || (d.etat === "introuvable" && maintenant.getTime() - p.createdAt.getTime() >= ABANDON_MS)) {
    const { count } = await prisma.paiementPawapay.updateMany({ where: { id: p.id, statut: "cree" }, data: { statut: "echoue", motifEchec: d.motif ?? "Paiement abandonné" } });
    if (count) await prisma.commande.updateMany({ where: { id: p.commandeId, paiementStatut: PAIEMENT.ATTENTE }, data: { paiementStatut: PAIEMENT.ECHOUE, statut: "annulee" } });
    return;
  }
  if (d.etat !== "paye") return;
  if (Number(d.montant) !== p.montant || d.devise !== p.devise) {
    await prisma.paiementPawapay.updateMany({ where: { id: p.id, statut: { in: ["cree", "echoue"] } }, data: { statut: "a_verifier", motifEchec: `Reçu ${d.montant} ${d.devise}`, referenceOperateur: d.reference } });
    console.error("[pawapay] montant différent", p.id);
    return;
  }

  const commande = await prisma.commande.findUniqueOrThrow({ where: { id: p.commandeId }, select: { id: true, numero: true, tenantId: true, montantTotal: true, devise: true, clientNom: true } });
  const { vendeur, axso } = repartitionNumerique(commande.montantTotal, commande.devise);
  const taux = await tauxDuJour(); // hors transaction : aucun appel réseau pendant qu'elle est ouverte
  const plateforme = await getPlatformTenantId();
  const credite = await prisma.$transaction(async (tx) => {
    const { count } = await tx.paiementPawapay.updateMany({ where: { id: p.id, statut: { in: ["cree", "echoue"] } }, data: { statut: "paye", payeLe: maintenant, referenceOperateur: d.reference, motifEchec: null } });
    if (!count) return false;
    await tx.commande.update({ where: { id: commande.id }, data: { paiementStatut: PAIEMENT.PAYE, statut: "confirmee" } });
    // Part du marchand : comptée dans son solde tout de suite, retirable après le séquestre.
    const w = await tx.wallet.upsert({
      where: { tenantId: commande.tenantId },
      create: { tenantId: commande.tenantId, devise: commande.devise, solde: vendeur, totalRecu: vendeur, totalCommission: axso },
      update: { solde: { increment: vendeur }, totalRecu: { increment: vendeur }, totalCommission: { increment: axso } },
    });
    await tx.walletTransaction.create({ data: {
      walletId: w.id, type: "CREDIT", montant: vendeur, devise: w.devise, commandeId: commande.id, reference: `pawapay:${p.id}`,
      description: `Vente #${commande.numero} (${commande.montantTotal.toLocaleString("fr-FR")} ${commande.devise}, commission ${axso.toLocaleString("fr-FR")})`,
      disponibleLe: new Date(maintenant.getTime() + SEQUESTRE_NUMERIQUE_HEURES * 3600_000),
    } });
    // Commission Axso, en XAF dans le portefeuille plateforme (frais pawaPay payés dessus).
    const axsoXaf = commande.devise === "XAF" ? axso : versXAF(axso, commande.devise, taux);
    const wp = await tx.wallet.upsert({
      where: { tenantId: plateforme },
      create: { tenantId: plateforme, devise: "XAF", solde: axsoXaf, totalRecu: axsoXaf, totalCommission: axsoXaf },
      update: { solde: { increment: axsoXaf }, totalRecu: { increment: axsoXaf }, totalCommission: { increment: axsoXaf } },
    });
    await tx.walletTransaction.create({ data: { walletId: wp.id, type: "COMMISSION", montant: axsoXaf, devise: "XAF", commandeId: commande.id, reference: `pawapay:${p.id}`, description: `Commission vente #${commande.numero}` } });
    return true;
  });
  if (!credite) return;
  await livrerCommandeDigitale(commande.id).catch((e) => console.error("[pawapay] livraison", commande.id, e instanceof Error ? e.message : e));
  await notifierMarchand({
    tenantId: commande.tenantId, type: "vente_payee", lien: "/dashboard/wallet",
    titre: `Nouvelle vente : ${vendeur.toLocaleString("fr-FR")} ${commande.devise} pour vous`,
    message: `${commande.clientNom} a payé la commande #${commande.numero}. L'accès lui a été envoyé ; votre part sera retirable dans ${SEQUESTRE_NUMERIQUE_HEURES} h.`,
  });
}

/** État d'un paiement de commande pour la page de retour du client (identifiant UUID non devinable). */
export async function etatPaiementCommande(id: string, client: ClientPawapay | null = clientPawapay()) {
  let p = await prisma.paiementPawapay.findUnique({ where: { id } });
  if (!p || p.type !== "commande" || !p.commandeId) return null;
  let lienAutorisation: string | undefined;
  if (p.statut === "cree" && client) {
    const d = await client.depot(id).catch(() => null);
    if (d) {
      lienAutorisation = d.lienAutorisation;
      await appliquerDepotCommande(p, d).catch((e) => console.error("[mobile-money] retour", id, e instanceof Error ? e.message : e));
    }
    p = await prisma.paiementPawapay.findUniqueOrThrow({ where: { id } });
  }
  const c = await prisma.commande.findUnique({ where: { id: p.commandeId! }, select: { numero: true, clientEmail: true, tenant: { select: { slug: true, nomBoutique: true } } } });
  const lienAcces = p.statut === "paye" && c ? await lienAccesCommande(c.tenant.slug, p.commandeId!) : null;
  return { statut: p.statut, numero: c?.numero, email: c?.clientEmail, boutique: c?.tenant.nomBoutique, slug: c?.tenant.slug, lienAcces, lienAutorisation: p.statut === "cree" ? lienAutorisation ?? null : null };
}
