// Releasit COD AXSO : réglages d'une boutique et source d'une commande (UTM, identifiants de clic).
import { prisma } from "@/lib/prisma";

export type ReglagesExpress = { actif: boolean; boutonCollant: boolean; texteBouton: string; couleur: string; demanderEmail: boolean; limiteParJour: number };
export const REGLAGES_DEFAUT: ReglagesExpress = { actif: false, boutonCollant: true, texteBouton: "Commander maintenant", couleur: "#0A1A33", demanderEmail: false, limiteParJour: 3 };

export async function lireReglages(tenantId: string): Promise<ReglagesExpress> {
  const r = await prisma.reglagesCommandeExpress.findUnique({ where: { tenantId } }).catch(() => null);
  return r ? { actif: r.actif, boutonCollant: r.boutonCollant, texteBouton: r.texteBouton, couleur: r.couleur, demanderEmail: r.demanderEmail, limiteParJour: r.limiteParJour } : REGLAGES_DEFAUT;
}

/** Réglages envoyés par le marchand, nettoyés (texte borné, couleur hexadécimale seulement). */
export function nettoyerReglages(b: Record<string, unknown>): Partial<ReglagesExpress> {
  const o: Partial<ReglagesExpress> = {};
  if (typeof b.actif === "boolean") o.actif = b.actif;
  if (typeof b.boutonCollant === "boolean") o.boutonCollant = b.boutonCollant;
  if (typeof b.demanderEmail === "boolean") o.demanderEmail = b.demanderEmail;
  if (typeof b.texteBouton === "string" && b.texteBouton.trim()) o.texteBouton = b.texteBouton.trim().slice(0, 40);
  if (typeof b.couleur === "string" && /^#[0-9a-f]{6}$/i.test(b.couleur)) o.couleur = b.couleur;
  if (typeof b.limiteParJour === "number" && Number.isInteger(b.limiteParJour) && b.limiteParJour >= 0 && b.limiteParJour <= 50) o.limiteParJour = b.limiteParJour;
  return o;
}

const CLES_SOURCE = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "ttclid", "gclid", "page", "referent"] as const;
export type SourceCommande = Partial<Record<(typeof CLES_SOURCE)[number], string>>;

/** Source d'une commande telle qu'envoyée par le navigateur : clés connues seulement, valeurs bornées. */
export function lireSource(brut: unknown): SourceCommande {
  const o: SourceCommande = {};
  if (!brut || typeof brut !== "object") return o;
  for (const k of CLES_SOURCE) {
    const v = (brut as Record<string, unknown>)[k];
    if (typeof v === "string" && v.trim()) o[k] = v.trim().slice(0, k === "page" || k === "referent" ? 300 : 150);
  }
  return o;
}

/** Clé d'idempotence fournie par le widget : 16 à 64 caractères sûrs, sinon refusée. */
export const cleValide = (k: unknown): k is string => typeof k === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(k);
