// Moyens de paiement selon le pays : ce que la boutique accepte (Tenant.parametresPaiement).
// Toute commande se paie à la livraison (directe ou via WhatsApp). Utilisable côté serveur et navigateur.

// ─── Réglages du marchand (Paramètres → Moyens de paiement) ────────────────
export type ReglagesPaiement = {
  livraison: boolean;          // paiement à la livraison (commande directe)
  whatsapp: boolean;           // commande via WhatsApp (payée à la livraison)
  livraisonHorsPays: boolean;  // paiement à la livraison pour un client d'un autre pays
};

export function lireReglagesPaiement(brut: unknown): ReglagesPaiement {
  const p = (brut && typeof brut === "object" ? brut : {}) as Record<string, unknown>;
  const oui = (v: unknown, defaut: boolean) => (typeof v === "boolean" ? v : defaut);
  const r = {
    livraison: oui(p.livraison, true),
    whatsapp: oui(p.whatsapp, true),
    livraisonHorsPays: oui(p.livraisonHorsPays, false),
  };
  // Jamais aucun moyen : la boutique ne pourrait plus rien vendre.
  if (!r.livraison && !r.whatsapp) r.livraison = true;
  return r;
}

/** Moyens proposés à un client pour des produits physiques. */
export function moyensPhysique(r: ReglagesPaiement, p: { paysClient?: string | null; paysBoutique?: string | null }) {
  const memePays = !p.paysClient || !p.paysBoutique || p.paysClient.toUpperCase() === p.paysBoutique.toUpperCase();
  const cod = memePays || r.livraisonHorsPays;
  return { livraison: cod && r.livraison, whatsapp: cod && r.whatsapp };
}
