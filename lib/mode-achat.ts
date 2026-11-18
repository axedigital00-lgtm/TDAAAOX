// Mode d'achat de la vitrine (Tenant.parametresCommande.modeAchat), réglé dans le Constructeur :
//  - "panier" (défaut, absent = panier) : ajout au panier, panier latéral, page panier, puis commande ;
//  - "direct" : pas de panier du tout, chaque fiche garde « Commander » (formulaire de commande).
// Le panier ne concerne que les produits physiques : le reste (numérique, dropshipping) se
// commande toujours depuis sa fiche, et une boutique digitale n'a jamais de panier.
// Partie pure : utilisable serveur et navigateur.

export type ModeAchat = "panier" | "direct";

export function modeAchat(parametresCommande: unknown): ModeAchat {
  const pc = parametresCommande && typeof parametresCommande === "object" ? (parametresCommande as Record<string, unknown>) : {};
  return pc.modeAchat === "direct" ? "direct" : "panier";
}

/** Panier proposé aux clients : mode panier et boutique physique. */
export const panierActif = (parametresCommande: unknown, digital: boolean) => !digital && modeAchat(parametresCommande) === "panier";

// ─── Panier transmis à la page de commande ───────────────────────────────────
// Le panier vit dans le navigateur ; la page de commande le reçoit dans l'adresse
// (?panier=…) et recalcule prix et produits depuis la base, comme le refait la
// création de la commande. Mêmes plafonds que /api/commandes/whatsapp-creer : 50 lignes, 999 par ligne.
export interface LignePanier { produitId: string; quantite: number; variante?: string }

export const MAX_LIGNES_PANIER = 50;

export function encoderPanier(lignes: LignePanier[]): string {
  return JSON.stringify(lignes.slice(0, MAX_LIGNES_PANIER).map((l) => (l.variante ? [l.produitId, l.quantite, l.variante] : [l.produitId, l.quantite])));
}

export function decoderPanier(brut: string | undefined | null): LignePanier[] {
  if (!brut) return [];
  let data: unknown;
  try { data = JSON.parse(brut); } catch { return []; }
  if (!Array.isArray(data)) return [];
  const lignes: LignePanier[] = [];
  for (const l of data.slice(0, MAX_LIGNES_PANIER)) {
    if (!Array.isArray(l) || typeof l[0] !== "string" || !/^[\w-]{1,64}$/.test(l[0])) continue;
    const quantite = Math.min(Math.max(Math.floor(Number(l[1]) || 1), 1), 999);
    const variante = typeof l[2] === "string" && l[2].length <= 200 ? l[2] : undefined;
    lignes.push(variante ? { produitId: l[0], quantite, variante } : { produitId: l[0], quantite });
  }
  return lignes;
}

/** Ajoute (ou cumule) une ligne : même produit + même variante = même ligne, quantité plafonnée au stock connu. */
export function ajouterLigne<T extends LignePanier>(lignes: T[], ajout: T, stockMax?: number | null): T[] {
  const plafond = (q: number) => Math.min(q, stockMax ?? 999, 999);
  const i = lignes.findIndex((l) => l.produitId === ajout.produitId && (l.variante ?? "") === (ajout.variante ?? ""));
  if (i < 0) return lignes.length >= MAX_LIGNES_PANIER ? lignes : [...lignes, { ...ajout, quantite: plafond(ajout.quantite) }];
  return lignes.map((l, j) => (j === i ? { ...l, quantite: plafond(l.quantite + ajout.quantite) } : l));
}
