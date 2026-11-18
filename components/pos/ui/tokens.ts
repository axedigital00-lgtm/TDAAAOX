// Jetons visuels du kit de la caisse — mêmes codes que le tableau de bord
// (jaune AXSO #F5A623 sur noir #111111, cartes blanches arrondies) pour que les
// écrans POS ne réinventent ni couleur ni espacement.
export const POLICE = { fontFamily: "'Poppins','Century Gothic',system-ui,sans-serif" } as const;

export const COULEURS = {
  accent: "#F5A623", accentFonce: "#D4911A", accentPale: "#FFF7ED",
  encre: "#111111", texte: "#666666", discret: "#AAAAAA",
  bordure: "#E8E8E8", fond: "#F5F5F5", surface: "#FFFFFF",
} as const;

/**
 * Tons sémantiques : fond pâle, texte lisible (contraste AA), bordure assortie.
 * Branchés sur les jetons du design system (app/globals.css) : positif = succes,
 * danger = erreur — mêmes couleurs que les badges et alertes du tableau de bord.
 */
export const TONS = {
  neutre: { background: "var(--ax-carte-2)", color: "var(--ax-doux)", border: "1px solid var(--ax-bordure)" },
  accent: { background: "var(--ax-primaire-fond)", color: "var(--ax-attention)", border: "1px solid var(--ax-attention-bordure)" },
  positif: { background: "var(--ax-succes-fond)", color: "var(--ax-succes)", border: "1px solid var(--ax-succes-bordure)" },
  attention: { background: "var(--ax-attention-fond)", color: "var(--ax-attention)", border: "1px solid var(--ax-attention-bordure)" },
  danger: { background: "var(--ax-erreur-fond)", color: "var(--ax-erreur)", border: "1px solid var(--ax-erreur-bordure)" },
  info: { background: "var(--ax-info-fond)", color: "var(--ax-info)", border: "1px solid var(--ax-info-bordure)" },
} as const;
export type Ton = keyof typeof TONS;

/** Anneau de focus clavier, identique sur tout élément interactif du kit. */
export const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111111]";
