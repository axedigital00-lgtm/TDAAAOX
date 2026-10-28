// Règles de l'affiliation sans base de données (testables : tests/affiliation-regles.test.ts).
// Modèle place de marché (Selar, Chariow) : un compte affilié, une commission prélevée sur la
// vente payée en ligne, versée par Axso quand la vente est définitivement acquise.
import { AVEC_CENTIMES } from "./changement-devise";
import { TYPES_NUMERIQUES } from "./pricing";
import { SEQUESTRE_HEURES } from "./wallet-regles";

/** Commission minimum imposée par Axso, en fraction du prix du vendeur. */
export const TAUX_MIN_PHYSIQUE = 0.1;
export const TAUX_MIN_NUMERIQUE = 0.2;

export const estNumerique = (type?: string | null) => !!type && TYPES_NUMERIQUES.has(type);
export const tauxMinimum = (type?: string | null) => (estNumerique(type) ? TAUX_MIN_NUMERIQUE : TAUX_MIN_PHYSIQUE);

/**
 * Taux d'un produit : celui du produit, sinon le taux par défaut de la boutique (en points, ex. 15),
 * jamais sous le minimum Axso de son type.
 */
export function tauxProduit(produit: { type?: string | null; tauxCommissionAff?: number | null }, tauxBoutiquePoints?: number | null): number {
  const choisi = produit.tauxCommissionAff ?? (tauxBoutiquePoints != null ? tauxBoutiquePoints / 100 : 0);
  return Math.min(0.9, Math.max(tauxMinimum(produit.type), choisi));
}

const arrondi = (montant: number, devise: string) => {
  const pas = AVEC_CENTIMES.has(devise) ? 100 : 1;
  return Math.round(montant * pas) / pas;
};

/**
 * Commission d'une commande payée en ligne. Calculée sur le prix du vendeur (majoration Axso retirée,
 * livraison exclue) ; une remise réduit la base dans la même proportion que la part du vendeur
 * (même règle que partVendeur, lib/pricing.ts). Seuls les produits ouverts aux affiliés comptent.
 */
export function commissionCommande(p: {
  lignes: { prix: number; quantite: number; produit: { affiliationActive: boolean; type?: string | null; tauxCommissionAff?: number | null } | null }[];
  montantTotal: number;
  montantLivraison: number;
  tauxCommission: number; // majoration Axso payée par le client
  tauxBoutiquePoints?: number | null;
  devise: string;
}): number {
  const client = p.lignes.reduce((s, l) => s + l.prix * l.quantite, 0);
  if (client <= 0) return 0;
  const ratio = Math.min(1, Math.max(0, p.montantTotal - p.montantLivraison) / client);
  const brute = p.lignes.reduce((s, l) => {
    if (!l.produit?.affiliationActive) return s;
    return s + (l.prix / (1 + p.tauxCommission)) * l.quantite * tauxProduit(l.produit, p.tauxBoutiquePoints);
  }, 0);
  return arrondi(brute * ratio, p.devise);
}

export type EtatCommission = "en_attente" | "disponible" | "versee" | "annulee";

/**
 * Une commission devient disponible quand la vente est acquise : commande livrée (immédiat pour le
 * numérique) depuis plus que le séquestre des marchands (48 h).
 */
export function etatCommission(
  c: { statut: string; retraitId?: string | null },
  commande: { statut: string; livreeAt: Date | null } | null | undefined,
  maintenant = new Date(),
): EtatCommission {
  if (c.statut === "rejetee") return "annulee";
  if (c.statut === "payee" || c.retraitId) return "versee";
  if (!commande || commande.statut !== "livree" || !commande.livreeAt) return "en_attente";
  return maintenant.getTime() - commande.livreeAt.getTime() >= SEQUESTRE_HEURES * 3600_000 ? "disponible" : "en_attente";
}

/** Un affilié ne touche rien sur ses propres achats. */
export function estAutoReferencement(
  affilie: { email: string; telephone: string | null },
  commande: { clientEmail: string | null; clientTelephone: string },
): boolean {
  if (affilie.email && commande.clientEmail && affilie.email.trim().toLowerCase() === commande.clientEmail.trim().toLowerCase()) return true;
  const a = affilie.telephone?.replace(/\D/g, "").slice(-9);
  const c = commande.clientTelephone?.replace(/\D/g, "").slice(-9);
  return !!a && !!c && a.length >= 8 && a === c;
}
