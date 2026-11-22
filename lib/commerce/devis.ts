// Devis et commandes brouillons : un seul chemin vers une Commande, pour le marchand comme pour
// l'acceptation par le client. Le stock ne sort qu'à la conversion ; les prix du devis sont figés.
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { quotaCommandesAtteint } from "@/lib/abonnement";
import { PAIEMENT } from "@/lib/commandes";
import { publier } from "@/lib/controle-ia/evenements";
import { compterVentes, RuptureStock, sortirStock } from "@/lib/stock";
import { genererNumeroCommande } from "@/lib/utils";
import { lireVenteGros, prixPourQuantite } from "./gros";
import {
  devisExpire, echeancePaiement, marchandPeutConvertir, METHODE_A_TERME, methodeDePaiement, prixEntreprise, sousPlafond,
  type ConditionPaiement, type LigneDevis,
} from "./regles";

export const jeton = () => randomBytes(24).toString("hex");
export const numeroDevis = () => `DV-${Date.now().toString(36).toUpperCase()}${randomBytes(2).toString("hex").toUpperCase()}`;

export class ErreurDevis extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

/** Produits physiques vendables, une entrée par variante, au prix de base (ou du compte entreprise). */
export async function catalogueVendable(tenantId: string, remisePct = 0) {
  const produits = await prisma.produit.findMany({
    where: { tenantId, actif: true, type: "physique" },
    orderBy: { nom: "asc" }, take: 500,
    select: { id: true, nom: true, prix: true, stock: true, images: true, sku: true, venteGros: true, variantes: { where: { actif: true }, select: { nom: true, valeur: true, prix: true } } },
  });
  return produits.flatMap((p) => {
    const base = { produitId: p.id, nom: p.nom, sku: p.sku, stock: p.stock, imageUrl: p.images[0] ?? null, gros: lireVenteGros(p.venteGros) };
    if (!p.variantes.length) return [{ ...base, variante: null as string | null, prix: prixEntreprise(p.prix, remisePct), prixBase: p.prix }];
    return p.variantes.map((v) => ({ ...base, variante: `${v.nom}: ${v.valeur}`, prix: prixEntreprise(v.prix ?? p.prix, remisePct), prixBase: v.prix ?? p.prix }));
  });
}

/** Lignes d'une commande rapide : prix recalculés ici (palier de gros, puis remise du compte). */
export function lignesPro(catalogue: Awaited<ReturnType<typeof catalogueVendable>>, demande: { produitId: string; variante?: string | null; quantite: number }[], remisePct: number): LigneDevis[] {
  return demande.map((d) => {
    const c = catalogue.find((x) => x.produitId === d.produitId && (x.variante ?? null) === (d.variante ?? null));
    if (!c) throw new ErreurDevis("Un produit n'est plus disponible : rechargez la page", 409);
    return { produitId: c.produitId, nom: c.nom, variante: c.variante, imageUrl: c.imageUrl, quantite: d.quantite, prix: prixEntreprise(prixPourQuantite(c.prixBase, c.gros, d.quantite), remisePct) };
  });
}

/** Encours à terme d'une entreprise : commandes non payées et non annulées. */
const encours = async (tx: Pick<typeof prisma, "commande">, tenantId: string, entrepriseId: string) =>
  (await tx.commande.aggregate({
    where: { tenantId, compteEntrepriseId: entrepriseId, methodePaiement: METHODE_A_TERME, paiementStatut: PAIEMENT.ATTENTE, statut: { not: "annulee" } },
    _sum: { montantTotal: true },
  }))._sum.montantTotal ?? 0;

/** Transforme un devis en commande : réservation atomique du devis, stock et plafond dans la même transaction. */
export async function convertirDevis(devisId: string, tenantId: string, opts: { statutsPermis?: string[] } = {}) {
  const d = await prisma.devis.findFirst({ where: { id: devisId, tenantId } });
  if (!d) throw new ErreurDevis("Devis introuvable", 404);
  const permis = opts.statutsPermis ?? ["brouillon", "envoye", "soumis"];
  if (!permis.includes(d.statut) || !marchandPeutConvertir(d.statut)) throw new ErreurDevis("Ce devis ne peut plus devenir une commande", 409);
  if (opts.statutsPermis && devisExpire(d, new Date())) throw new ErreurDevis("Ce devis a expiré", 410);
  if (await quotaCommandesAtteint(tenantId)) throw new ErreurDevis("Quota de commandes atteint ce mois-ci", 403);

  const entreprise = d.entrepriseId ? await prisma.compteEntreprise.findFirst({ where: { id: d.entrepriseId, tenantId } }) : null;
  const conditions = d.conditions as ConditionPaiement;
  const lignes = d.lignes as unknown as LigneDevis[];
  const maintenant = new Date();

  try {
    const commande = await prisma.$transaction(async (tx) => {
      const { count } = await tx.devis.updateMany({ where: { id: d.id, statut: d.statut, commandeId: null }, data: { statut: "accepte" } });
      if (!count) throw new ErreurDevis("Ce devis vient d'être traité", 409);

      if (entreprise && conditions !== "comptant" && entreprise.plafond != null) {
        // Verrou par entreprise : deux conversions simultanées ne dépassent pas le plafond à elles deux.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${entreprise.id}))`;
        if (!sousPlafond(entreprise.plafond, await encours(tx as any, tenantId, entreprise.id), d.total)) throw new ErreurDevis("Plafond de crédit de l'entreprise dépassé", 409);
      }

      const conditionsClient = [{ telephone: d.clientTelephone }, ...(d.clientEmail ? [{ email: d.clientEmail }] : [])];
      const client = (await tx.client.findFirst({ where: { tenantId, OR: conditionsClient } }))
        ?? await tx.client.create({ data: { tenantId, nom: d.clientNom, email: d.clientEmail, telephone: d.clientTelephone, ville: d.ville, pays: d.pays } });

      const sousTotal = lignes.reduce((s, l) => s + l.prix * l.quantite, 0);
      const c = await tx.commande.create({
        data: {
          tenantId, numero: genererNumeroCommande(), clientId: client.id, clientNom: d.clientNom, clientEmail: d.clientEmail, clientTelephone: d.clientTelephone,
          adresseLivraison: d.adresse || "À préciser", ville: d.ville || "—", pays: d.pays || "—",
          montantSousTotal: sousTotal, montantReduction: d.remise, montantLivraison: d.livraison, montantTotal: d.total, devise: d.devise,
          tauxCommission: null, statut: "en_attente", paiementStatut: PAIEMENT.ATTENTE, methodePaiement: methodeDePaiement(conditions),
          noteClient: d.note, trackingToken: jeton(), livreurToken: jeton(),
          bonCommande: d.bonCommande, conditionsPaiement: conditions, echeancePaiement: echeancePaiement(conditions, maintenant), compteEntrepriseId: d.entrepriseId,
          lignes: { create: lignes.map((l) => ({ produitId: l.produitId, nom: l.nom, prix: l.prix, quantite: l.quantite, imageUrl: l.imageUrl ?? null, variante: l.variante ?? null })) },
        },
      });
      await sortirStock(tx, { tenantId, commandeId: c.id, motif: `Commande #${c.numero} (devis ${d.numero})` });
      await tx.devis.update({ where: { id: d.id }, data: { commandeId: c.id } });
      return c;
    });
    publier(tenantId, "order.created", { commandeId: commande.id, numero: commande.numero, montant: commande.montantTotal, devise: commande.devise, methode: commande.methodePaiement });
    return commande;
  } catch (e) {
    if (e instanceof RuptureStock) throw new ErreurDevis(e.message, 409);
    throw e;
  }
}

/** Facture à terme réglée : la vente entre dans le CA, une seule fois. */
export async function encaisserATerme(commandeId: string, tenantId: string) {
  const c = await prisma.commande.findFirst({ where: { id: commandeId, tenantId } });
  if (!c || c.methodePaiement !== METHODE_A_TERME) throw new ErreurDevis("Commande à terme introuvable", 404);
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.commande.updateMany({ where: { id: c.id, paiementStatut: PAIEMENT.ATTENTE, statut: { not: "annulee" } }, data: { paiementStatut: PAIEMENT.PAYE } });
    if (!count) throw new ErreurDevis("Cette commande est déjà réglée ou annulée", 409);
    await compterVentes(tx, c.id, 1);
  });
  publier(tenantId, "order.paid", { commandeId: c.id, numero: c.numero, montant: c.montantTotal, devise: c.devise, methode: c.methodePaiement });
}
