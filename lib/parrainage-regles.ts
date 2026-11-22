// Parrainage des abonnements AXSO : règles pures.
export const TAUX_PARRAINAGE = 0.2;
export const SEQUESTRE_PARRAINAGE_HEURES = 48;
export const COOKIE_PARRAIN = "axso_parrain";
export const DUREE_COOKIE_JOURS = 60;

export const codeValide = (c: unknown): c is string => typeof c === "string" && /^[A-Z0-9]{6,16}$/.test(c);

/** Commission sur un paiement d'abonnement, à l'unité : les XAF et XOF n'ont pas de centimes. */
export const commissionAbonnement = (montant: number) => (montant > 0 ? Math.floor(montant * TAUX_PARRAINAGE) : 0);

export type EtatParrainage = "en_attente" | "disponible" | "versee" | "annulee";
export function etatCommissionParrainage(c: { statut: string; disponibleLe: Date }, maintenant: Date): EtatParrainage {
  if (c.statut === "annulee") return "annulee";
  if (c.statut === "payee") return "versee";
  return c.disponibleLe <= maintenant ? "disponible" : "en_attente";
}

const chiffres = (t?: string | null) => (t ?? "").replace(/\D/g, "").slice(-9);
const email = (e?: string | null) => (e ?? "").trim().toLowerCase().replace(/\+[^@]*@/, "@");

/** Vrai si le filleul est manifestement le parrain (même e-mail, alias « + » compris, ou même téléphone). */
export function estAutoParrainage(parrain: { email?: string | null; telephone?: string | null }, filleul: { email?: string | null; telephone?: string | null }) {
  const a = email(parrain.email), b = email(filleul.email);
  if (a && a === b) return true;
  const x = chiffres(parrain.telephone), y = chiffres(filleul.telephone);
  return x.length === 9 && x === y;
}

/** Montant retenu : jamais plus que le prix du forfait sur la durée payée (mois entamés). */
export function montantPlafonne(montant: number, prixMensuel: number, jours: number) {
  if (!(montant > 0) || !(prixMensuel > 0)) return 0;
  return Math.min(montant, prixMensuel * Math.max(1, Math.ceil(jours / 30)));
}

/** « Awa Diallo » → « Awa D. » : un parrain ne voit pas l'identité complète de ses filleuls. */
export function nomMasque(nom?: string | null) {
  const p = (nom ?? "").trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "Filleul";
  return p.length === 1 ? p[0] : `${p[0]} ${p[p.length - 1][0].toUpperCase()}.`;
}
