// Cartes-cadeaux (refonte admin D28, MASTERPROMPT §8.8) : émises par le marchand, utilisées au
// paiement de la vitrine. Règles :
// - code de 16 caractères tirés par crypto dans un alphabet sans ambiguïté (pas de 0/O, 1/I/L) ;
// - le solde n'est débité que dans la transaction qui crée la commande, par une mise à jour
//   conditionnelle (solde suffisant) : deux commandes simultanées ne dépensent pas deux fois ;
// - annulation ou remboursement : l'utilisation est recréditée une seule fois (libererCommande).
// - la carte ne règle que des commandes payées à la livraison, qui ne portent aucune commission
//   Axso (tauxCommission null) : la part payée par carte n'entre donc jamais dans une commission.
import { randomInt } from "crypto";
import type { Prisma } from "@prisma/client";
import { RuptureStock } from "./stock";
import { rateLimit } from "./rate-limit";

type Tx = Prisma.TransactionClient;

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const LONGUEUR_CODE = 16;

/** Essais de code depuis la vitrine (vérification et commande) : 10 par 15 min, par IP et boutique. */
export const limiteCarteCadeau = rateLimit({ windowMs: 15 * 60_000, max: 10, keyPrefix: "carte-cadeau" });

export function genererCode(): string {
  let c = "";
  for (let i = 0; i < LONGUEUR_CODE; i++) c += ALPHABET[randomInt(ALPHABET.length)];
  return c;
}

/** Saisie libre (« abcd-efgh … ») → forme stockée (« ABCDEFGH… »). */
export function normaliserCode(saisie: string): string {
  return String(saisie ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** « ABCDEFGHJKMNPQRS » → « ABCD-EFGH-JKMN-PQRS » (affichage). */
export function formaterCode(code: string): string {
  return code.match(/.{1,4}/g)?.join("-") ?? code;
}

export type EtatCarte = "active" | "epuisee" | "expiree" | "desactivee";

export function etatCarte(c: { solde: number; expireLe: Date | null; desactiveeLe: Date | null }, maintenant = new Date()): EtatCarte {
  if (c.desactiveeLe) return "desactivee";
  if (c.expireLe && c.expireLe <= maintenant) return "expiree";
  if (c.solde <= 0) return "epuisee";
  return "active";
}

/** Badge §7.2 : Active = success, Épuisée/Désactivée = neutral, Expirée = warning. */
export const BADGE_CARTE: Record<EtatCarte, { libelle: string; tone: "success" | "neutral" | "warning" }> = {
  active: { libelle: "Active", tone: "success" },
  epuisee: { libelle: "Épuisée", tone: "neutral" },
  expiree: { libelle: "Expirée", tone: "warning" },
  desactivee: { libelle: "Désactivée", tone: "neutral" },
};

/** Part de la commande réglée par la carte : jamais plus que le solde ni que le montant dû. */
export function montantApplicable(solde: number, du: number): number {
  return Math.max(0, Math.min(solde, du));
}

/** Conflit au moment de payer : traité par les routes comme une rupture (409, message affiché). */
export class CarteRefusee extends RuptureStock {}

/**
 * Débite la carte dans la transaction de création de commande. Lève CarteRefusee si la carte
 * n'est plus utilisable ou si son solde a changé entre-temps (la commande est alors annulée).
 */
export async function debiterCarte(tx: Tx, p: { carteId: string; tenantId: string; commandeId: string; montant: number; numero: string }) {
  if (p.montant <= 0) return;
  const maintenant = new Date();
  const { count } = await tx.carteCadeau.updateMany({
    where: {
      id: p.carteId, tenantId: p.tenantId, desactiveeLe: null, solde: { gte: p.montant },
      OR: [{ expireLe: null }, { expireLe: { gt: maintenant } }],
    },
    data: { solde: { decrement: p.montant } },
  });
  if (!count) throw new CarteRefusee("Le solde de la carte-cadeau a changé : réessayez");
  await tx.carteCadeauMouvement.create({
    data: { carteId: p.carteId, commandeId: p.commandeId, montant: -p.montant, motif: `Commande #${p.numero}` },
  });
}

/** Recrédite les utilisations d'une commande annulée ou remboursée. Idempotent. */
export async function recrediterCommande(tx: Tx, p: { commandeId: string; motif: string }) {
  const utilisations = await tx.carteCadeauMouvement.findMany({ where: { commandeId: p.commandeId, montant: { lt: 0 }, rendueLe: null } });
  for (const u of utilisations) {
    const { count } = await tx.carteCadeauMouvement.updateMany({ where: { id: u.id, rendueLe: null }, data: { rendueLe: new Date() } });
    if (!count) continue;
    await tx.carteCadeau.update({ where: { id: u.carteId }, data: { solde: { increment: -u.montant } } });
    await tx.carteCadeauMouvement.create({ data: { carteId: u.carteId, commandeId: p.commandeId, montant: -u.montant, motif: p.motif } });
  }
}
