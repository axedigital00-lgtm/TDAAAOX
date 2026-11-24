// Règles des coins IA : prix, marge, coins inclus et tarifs des modèles. Fonctions pures.
export const COIN_FCFA = 200;
export const MARGE = 4;
/** Coût IA réel maximal qu'un coin peut couvrir en gardant la marge. */
export const COUT_MAX_PAR_COIN_FCFA = COIN_FCFA / MARGE;

export const COINS_BIENVENUE = 5;
export const COINS_MENSUELS: Record<string, number> = { palier0: 0, palier1: 15, palier2: 60 };

export const PACKS = [
  { id: "p10", coins: 10, prix: 2000 },
  { id: "p30", coins: 30, prix: 5400 },
  { id: "p100", coins: 100, prix: 16000 },
] as const;

/** Tarifs OpenAI en dollars par million de jetons (les images sont facturées en jetons de sortie). */
export const TARIFS: Record<string, { entree: number; sortie: number }> = {
  "gpt-5-mini": { entree: 0.25, sortie: 2 },
  "gpt-5-nano": { entree: 0.05, sortie: 0.4 },
  "gpt-4.1-mini": { entree: 0.4, sortie: 1.6 },
  "gpt-image-1-mini": { entree: 2.5, sortie: 8 },
};

export function coutUsd(modele: string, entree: number, sortie: number) {
  const t = TARIFS[modele];
  if (!t) return null;
  return (entree * t.entree + sortie * t.sortie) / 1_000_000;
}

/** Plus petit nombre de coins qui garde la marge sur le coût réel. */
export const coinsMinimum = (coutReelUsd: number, tauxXaf: number) => Math.max(1, Math.ceil((coutReelUsd * tauxXaf * MARGE) / COIN_FCFA));

export type ActionPremium = "visuel" | "visuel_hd" | "publicite";
/** Prix affichés avant l'action ; `coutMaxUsd` borne le coût réel attendu (vérifié par les tests). */
export const ACTIONS: Record<ActionPremium, { nom: string; coins: number; coutMaxUsd: number }> = {
  visuel: { nom: "Visuel premium", coins: 1, coutMaxUsd: 0.02 },
  visuel_hd: { nom: "Visuel premium HD", coins: 2, coutMaxUsd: 0.06 },
  publicite: { nom: "Publicité complète (texte et visuel)", coins: 3, coutMaxUsd: 0.07 },
};

export type Ecriture = { source: string; montant: number };
/** Les coins inclus sont dépensés en premier, puis les coins achetés. */
export function soldes(e: Ecriture[]) {
  const inclus = e.filter((x) => x.source === "inclus").reduce((s, x) => s + x.montant, 0);
  const achetes = e.filter((x) => x.source === "achete").reduce((s, x) => s + x.montant, 0);
  return { inclus, achetes, total: inclus + achetes };
}
export function repartirDebit(s: { inclus: number; achetes: number }, coins: number) {
  if (coins <= 0 || s.inclus + s.achetes < coins) return null;
  const inclus = Math.min(Math.max(s.inclus, 0), coins);
  return { inclus, achetes: coins - inclus };
}

export const moisDe = (d: Date) => d.toISOString().slice(0, 7);
