// Création d'une commande payée à la livraison : un seul chemin pour la vitrine
// (app/api/commandes/whatsapp-creer) et les commandes provisoires du marchand
// (app/api/commandes/brouillons/[id]/convertir). Prix relus en base, stock strict
// (sortie dans la même transaction), promo à usage limité, sans commission (COD).
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { genererNumeroCommande, formatMontant } from "@/lib/utils";
import { lienBoutique } from "@/lib/origine-site";
import { notifierMarchand } from "@/lib/notifications-marchand";
import { envoyerConfirmationCommande, envoyerAlerteNouvelleCommande } from "@/lib/email";
import { filtreUsagePromo } from "@/lib/pricing";
import { RuptureStock, sortirStock } from "@/lib/stock";
import { debiterCarte, montantApplicable } from "@/lib/cartes-cadeaux";
import type { Attribution } from "@/lib/attribution";

export type LigneCod = { produitId: string; nom: string; prix: number; quantite: number; imageUrl: string | null; variante: string | null };
export type LigneDemandee = { produitId: string; variante?: string | null; quantite?: number };

const genToken = () => randomBytes(20).toString("hex");

/** Lignes au prix du marchand, relues en base (produits actifs et physiques de la boutique). */
export async function lignesCod(tenantId: string, demandees: LigneDemandee[]): Promise<{ ok: true; items: LigneCod[] } | { ok: false; error: string }> {
  const produits = await prisma.produit.findMany({
    where: { id: { in: demandees.map((i) => String(i.produitId)) }, tenantId, actif: true },
    select: { id: true, nom: true, type: true, prix: true, images: true, variantes: { where: { actif: true }, select: { nom: true, valeur: true, prix: true } } },
  });
  const items: LigneCod[] = [];
  for (const item of demandees) {
    const p = produits.find((x) => x.id === String(item.produitId));
    if (!p) return { ok: false, error: "Produit introuvable dans cette boutique" };
    if (p.type !== "physique") return { ok: false, error: "Ce produit se paie en ligne" };
    const variante = item.variante ? p.variantes.find((v) => `${v.nom}: ${v.valeur}` === item.variante) : null;
    if (item.variante && !variante) return { ok: false, error: `Variante « ${item.variante} » introuvable pour ${p.nom}` };
    items.push({
      // À la livraison : prix du marchand, sans commission.
      produitId: p.id, nom: p.nom, prix: variante?.prix ?? p.prix,
      quantite: Math.min(Math.max(Math.floor(Number(item.quantite) || 1), 1), 999),
      imageUrl: p.images[0] ?? null, variante: variante ? item.variante! : null,
    });
  }
  return { ok: true, items };
}

type Promo = { id: string; code: string } & Parameters<typeof filtreUsagePromo>[0];

/** Crée la commande, sort le stock et consomme la promo dans une transaction (une rupture annule tout). */
export async function enregistrerCommandeCod(p: {
  tenant: { id: string; slug: string; devise: string };
  clientId: string;
  client: { nom: string; telephone: string; email: string | null; pays: string | null };
  items: LigneCod[];
  sousTotal: number;
  reduction: number;
  promo: Promo | null;
  montantLivraison: number;
  methodePaiement: "whatsapp_cod" | "direct_cod";
  adresseLivraison: string;
  ville: string;
  codeAffiliation?: string | null;
  localisation?: { lat?: number | null; lng?: number | null; adresseExacte?: string | null } | null;
  adresseExacte?: string | null;
  noteClient?: string | null;
  /** Carte-cadeau saisie au paiement (déjà vérifiée) : débitée dans la transaction, à concurrence du solde. */
  carteCadeau?: { id: string; solde: number } | null;
  /** Dernier clic non direct de l'acheteur (cookie posé par proxy.ts). */
  attribution?: Attribution | null;
}) {
  const trackingToken = genToken();
  const livreurToken = genToken();
  const loc = p.localisation;
  const mapsLien = loc?.lat ? `https://www.google.com/maps?q=${loc.lat},${loc.lng}` : null;
  const du = p.sousTotal - p.reduction + p.montantLivraison;
  // La carte-cadeau règle une part de la commande : montantTotal reste ce que le livreur encaisse.
  const montantCarteCadeau = p.carteCadeau ? montantApplicable(p.carteCadeau.solde, du) : 0;
  const montantTotal = du - montantCarteCadeau;

  const commande = await prisma.$transaction(async (tx) => {
    const c = await tx.commande.create({
      data: {
        tenantId: p.tenant.id, numero: genererNumeroCommande(),
        clientId: p.clientId,
        clientNom: p.client.nom,
        clientEmail: p.client.email,
        clientTelephone: p.client.telephone,
        adresseLivraison: p.adresseLivraison,
        ville: p.ville,
        tauxCommission: null, // à la livraison : rien n'est prélevé
        pays: p.client.pays || "—",
        montantSousTotal: p.sousTotal,
        montantReduction: p.reduction,
        codePromoId: p.promo?.id ?? null,
        montantLivraison: p.montantLivraison,
        montantTotal,
        montantCarteCadeau,
        utmSource: p.attribution?.source ?? null,
        utmMedium: p.attribution?.medium ?? null,
        utmCampagne: p.attribution?.campagne ?? null,
        referent: p.attribution?.referent ?? null,
        devise: p.tenant.devise,
        statut: "en_attente",
        paiementStatut: "pending",
        methodePaiement: p.methodePaiement,
        codeAffiliation: p.codeAffiliation || null,
        trackingToken,
        livreurToken,
        latitudeClient: loc?.lat ?? null,
        longitudeClient: loc?.lng ?? null,
        adresseExacte: p.adresseExacte ?? null,
        mapsLienClient: mapsLien,
        noteClient: p.noteClient ?? null,
        lignes: { create: p.items },
      },
      include: { lignes: true },
    });
    await sortirStock(tx, { tenantId: p.tenant.id, commandeId: c.id, motif: `Commande #${c.numero}` });
    if (p.carteCadeau && montantCarteCadeau > 0) {
      await debiterCarte(tx, { carteId: p.carteCadeau.id, tenantId: p.tenant.id, commandeId: c.id, montant: montantCarteCadeau, numero: c.numero });
    }
    // Incrément conditionnel : deux commandes simultanées ne dépassent pas maxUtilisations.
    if (p.promo) {
      const { count } = await tx.codePromo.updateMany({ where: filtreUsagePromo(p.promo), data: { utilisations: { increment: 1 } } });
      if (!count) throw new RuptureStock("Ce code promo vient d'être épuisé — réessayez sans le code");
    }
    return c;
  });

  // Paniers abandonnés du même numéro : récupérés par cette commande.
  await prisma.panierAbandonne.updateMany({
    where: { tenantId: p.tenant.id, telephone: p.client.telephone, recupereLe: null },
    data: { recupereLe: new Date(), commandeId: commande.id },
  }).catch(() => {});

  return {
    commande, montantTotal, montantCarteCadeau, mapsLien, trackingToken,
    factureUrl: await lienBoutique(p.tenant.slug, `/facture/${trackingToken}`),
    trackingUrl: await lienBoutique(p.tenant.slug, `/tracking/${trackingToken}`),
  };
}

/** Notification du tableau de bord (toujours), e-mail d'alerte au marchand et confirmation au client. */
export async function notifierCommandeCod(p: {
  tenant: { id: string; nomBoutique: string; email: string | null; devise: string };
  commande: { id: string; numero: string };
  client: { nom: string; email: string | null };
  items: LigneCod[];
  montantTotal: number;
  type: "commande_whatsapp" | "nouvelle_commande";
  complement?: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://axsoafrica.com";
  const { tenant, commande, client, items, montantTotal } = p;
  await notifierMarchand({
    tenantId: tenant.id,
    type: p.type,
    titre: `Nouvelle commande #${commande.numero}`,
    message: `${client.nom} · ${items.length} article(s) · ${formatMontant(montantTotal, tenant.devise)}${p.complement ?? ""}`,
    lien: `/dashboard/commandes/${commande.id}`,
    commandeId: commande.id,
  });
  if (tenant.email) {
    await envoyerAlerteNouvelleCommande({
      email: tenant.email, numeroCommande: commande.numero, montantTotal, devise: tenant.devise,
      clientNom: client.nom, boutique: tenant.nomBoutique, lien: `${appUrl}/dashboard/commandes/${commande.id}`,
    }).catch(() => {});
  }
  if (client.email) {
    await envoyerConfirmationCommande({
      email: client.email, nom: client.nom, numeroCommande: commande.numero, montantTotal, devise: tenant.devise,
      produits: items.map((i) => ({ nom: i.nom, quantite: i.quantite, prix: i.prix })), boutique: tenant.nomBoutique,
    }).catch(() => {});
  }
}
