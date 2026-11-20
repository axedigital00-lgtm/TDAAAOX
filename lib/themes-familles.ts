// Familles de style des thèmes AXSO (filtres du store de thèmes, admin et site
// public) : les ambiances des designs sont regroupées pour garder peu de filtres.
export const FAMILLES_THEMES: { nom: string; mots: string[] }[] = [
  { nom: "Élégant", mots: ["raffiné", "raffinée", "élégant", "couture", "sophistiqué", "premium", "éditorial", "littéraire", "horlogère"] },
  { nom: "Minimaliste", mots: ["minimaliste", "épuré", "clinique"] },
  { nom: "Audacieux", mots: ["dynamique", "énergique", "puissante", "sportif", "urbain", "brut", "industriel", "industrielle"] },
  { nom: "Naturel", mots: ["naturelle", "naturel", "organique", "apaisant", "apaisante"] },
  { nom: "Tech", mots: ["technologique", "technique", "moderne", "sombre"] },
  { nom: "Artisanal", mots: ["artisanal", "authentique", "ludique"] },
];

/** Familles d'un design à partir de ses ambiances (liste, ou texte « a · b · c »). */
export function famillesTheme(ambiances: string[] | string | undefined | null): string[] {
  const mots = (Array.isArray(ambiances) ? ambiances : String(ambiances || "").split(" · ")).map((m) => m.toLowerCase().trim());
  return FAMILLES_THEMES.filter((f) => f.mots.some((m) => mots.includes(m))).map((f) => f.nom);
}
