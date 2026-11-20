// Jetons visuels du kit de la caisse — mêmes valeurs que le design system de
// l'admin (components/dashboard/design-system/tokens) : Inter, bouton principal
// noir, badges sémantiques. Le jaune AXSO n'est jamais une couleur d'action.
export const POLICE = { fontFamily: "'Inter Variable',Inter,-apple-system,'Segoe UI',Roboto,sans-serif" } as const;

export const COULEURS = {
  accent: "#1a1a1a", accentFonce: "#2b2b2b", accentPale: "#f1f1f1",
  encre: "#1a1a1a", texte: "#616161", discret: "#8a8a8a",
  bordure: "#e3e3e3", fond: "#f1f1f1", surface: "#FFFFFF",
} as const;

/** Tons sémantiques (badges de l'admin) : fond pâle, texte lisible (contraste AA). */
export const TONS = {
  neutre: { background: "#e3e3e3", color: "#303030", border: "1px solid transparent" },
  accent: { background: "#e3e3e3", color: "#1a1a1a", border: "1px solid transparent" },
  positif: { background: "#cdfee1", color: "#0c5132", border: "1px solid transparent" },
  attention: { background: "#ffeb78", color: "#4f4700", border: "1px solid transparent" },
  danger: { background: "#fedad9", color: "#8e0b21", border: "1px solid transparent" },
  info: { background: "#e0f0ff", color: "#00527c", border: "1px solid transparent" },
} as const;
export type Ton = keyof typeof TONS;

/** Anneau de focus clavier, identique sur tout élément interactif du kit. */
export const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111111]";
