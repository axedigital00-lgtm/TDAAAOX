// Traduction : la clé est le texte français lui-même (pas de dictionnaire fr à maintenir).
// Clé absente du dictionnaire → le français s'affiche tel quel.
export type Langue = "fr" | "en";
export type Dico = Record<string, string>;
export const ZONES = ["commun", "admin", "dashboard", "livreur", "boutique"] as const;
export type Zone = (typeof ZONES)[number];

/** Cookies à écrire : sur le domaine AXSO, le choix vaut pour www et tous les sous-domaines de boutiques.
 *  L'ancien cookie limité à l'hôte est retiré d'abord, sinon il masquerait le nouveau. */
export function cookiesLangue(langue: Langue, hote: string, domaine = "") {
  const base = `langue=${langue}; path=/; max-age=31536000; samesite=lax`, d = domaine.split(":")[0].toLowerCase(), h = hote.toLowerCase();
  if (!d || d === "localhost" || d.endsWith(".workers.dev") || (h !== d && !h.endsWith(`.${d}`))) return [base];
  return ["langue=; path=/; max-age=0", `${base}; domain=.${d}`];
}

export interface T {
  (texte: string, ...valeurs: unknown[]): string;
  <V>(valeur: V): V;
  langue: Langue;
  /** Locale pour toLocaleString / Intl. */
  loc: string;
}

export function creerT(langue: Langue, dico: Dico): T {
  const t = ((texte: unknown, ...valeurs: unknown[]) => {
    if (typeof texte !== "string") return texte;
    let r = texte;
    if (Object.hasOwn(dico, texte)) r = dico[texte];
    else {
      // Espaces en bord de chaîne (« Bonjour » + nom) : on traduit le cœur et on les garde.
      const coeur = texte.trim();
      if (coeur !== texte && Object.hasOwn(dico, coeur)) r = texte.replace(coeur, dico[coeur]);
    }
    return valeurs.length ? r.replace(/\{(\d+)\}/g, (m, i) => (i < valeurs.length ? String(valeurs[i] ?? "") : m)) : r;
  }) as T;
  t.langue = langue;
  t.loc = langue === "en" ? "en-US" : "fr-FR";
  return t;
}
