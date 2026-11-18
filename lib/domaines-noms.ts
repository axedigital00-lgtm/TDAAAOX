// Noms de domaine candidats dérivés du nom de la boutique (pur, testable). Leur disponibilité et
// leur prix sont TOUJOURS vérifiés ensuite chez Vercel (app/api/domaine/suggestions) : rien n'est
// proposé au marchand sans cette vérification.
import { codePays } from "@/lib/devise-convert";

const nettoyer = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " et ").replace(/'/g, "");

/** Jusqu'à 8 candidats, du plus évident au moins évident : .com, extension du pays, .shop, .store, variantes. */
export function nomsCandidats(nomBoutique: string, pays?: string | null): string[] {
  const motsNom = nettoyer(nomBoutique).split(/[^a-z0-9]+/).filter(Boolean);
  const colle = motsNom.join("").slice(0, 63);
  if (colle.length < 2) return [];
  const tirets = motsNom.join("-").slice(0, 63);
  const cc = codePays(pays)?.toLowerCase();
  const liste = [
    `${colle}.com`,
    cc && `${colle}.${cc}`,
    `${colle}.shop`,
    `${colle}.store`,
    tirets !== colle && `${tirets}.com`,
    colle.length <= 59 && `${colle}shop.com`,
    cc && `${colle}-${cc}.com`,
  ].filter((d): d is string => !!d);
  return [...new Set(liste)].slice(0, 8);
}

/** Page du domaine chez le fournisseur (Vercel) : recherche + achat, hors d'Axso. */
export const lienAchatDomaine = (domaine: string) => `https://vercel.com/domains/search?q=${encodeURIComponent(domaine)}`;
export const FOURNISSEUR_DOMAINES = "Vercel";
