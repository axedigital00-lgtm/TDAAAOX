// Règles pures de IndexTable / IndexFilters (§7.5) : sélection, tri, paramètres d'URL. Server-safe, testées.

export type EtatSelection = "none" | "some" | "all";
export type Tri = { colonne: string; ordre: "asc" | "desc" };

/** État de la case d'en-tête : rien, une partie (indéterminée) ou toute la page. */
export function etatSelection(selection: readonly string[], ids: readonly string[]): EtatSelection {
  const n = ids.filter((id) => selection.includes(id)).length;
  return n === 0 ? "none" : n === ids.length ? "all" : "some";
}

/** Case d'en-tête : tout coché → on vide ; sinon on prend toute la page. */
export function basculerTout(selection: readonly string[], ids: readonly string[]): string[] {
  return etatSelection(selection, ids) === "all" ? [] : [...ids];
}

export function basculer(selection: readonly string[], id: string): string[] {
  return selection.includes(id) ? selection.filter((s) => s !== id) : [...selection, id];
}

/** « date:desc » ↔ { colonne, ordre }. Valeur invalide → null. */
export function lireTri(valeur: string | null | undefined): Tri | null {
  const m = valeur?.match(/^([\w.-]+):(asc|desc)$/);
  return m ? { colonne: m[1], ordre: m[2] as Tri["ordre"] } : null;
}
export const ecrireTri = (t: Tri) => `${t.colonne}:${t.ordre}`;

/** Tri local stable (listes déjà chargées) ; chaînes comparées à la française. */
export function trier<T>(lignes: readonly T[], valeur: (l: T) => string | number | Date | null | undefined, ordre: Tri["ordre"]): T[] {
  const sens = ordre === "asc" ? 1 : -1;
  const cle = (v: ReturnType<typeof valeur>) => (v instanceof Date ? v.getTime() : v);
  return [...lignes].sort((a, b) => {
    const x = cle(valeur(a)), y = cle(valeur(b));
    if (x == null || y == null) return x == null ? (y == null ? 0 : 1) : -1; // vides toujours en bas
    return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "fr", { numeric: true })) * sens;
  });
}

/**
 * Nouvelle chaîne de requête : applique `patch` (null ou "" = supprime la clé) sur `actuelle`.
 * Tout changement de recherche, filtre ou tri remet la pagination à zéro (`page`, `curseur`).
 */
export function majRecherche(actuelle: string, patch: Record<string, string | null | undefined>): string {
  const p = new URLSearchParams(actuelle);
  for (const [k, v] of Object.entries(patch)) {
    if (v) p.set(k, v);
    else p.delete(k);
  }
  if (!("page" in patch)) p.delete("page");
  if (!("curseur" in patch)) p.delete("curseur");
  return p.toString();
}
