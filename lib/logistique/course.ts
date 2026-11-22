// Machine d'états d'une course et correspondance avec Commande.statut (les écrans existants restent justes).
import type { StatutCourse } from "./types";

const AVANT_REMISE: StatutCourse[] = ["attente_fournisseur", "fournisseur_assigne", "attente_acceptation", "acceptee", "enlevement_planifie"];
const TRANSITIONS: Record<StatutCourse, StatutCourse[]> = {
  attente_fournisseur: ["fournisseur_assigne", "annulee"],
  fournisseur_assigne: ["attente_acceptation", "attente_fournisseur", "annulee"],
  attente_acceptation: ["acceptee", "attente_fournisseur", "annulee"],
  acceptee: ["enlevement_planifie", "enlevee", "attente_fournisseur", "annulee"],
  enlevement_planifie: ["enlevee", "attente_fournisseur", "annulee"],
  enlevee: ["en_transit", "echec"],
  en_transit: ["proche_destination", "livree", "echec"],
  proche_destination: ["livree", "echec"],
  livree: ["litige"],
  echec: ["retournee", "attente_fournisseur", "litige"],
  retournee: ["litige"],
  annulee: [],
  litige: ["livree", "echec", "retournee"],
};

export const transitionCourse = (de: StatutCourse, vers: StatutCourse) => TRANSITIONS[de].includes(vers);
export const courseActive = (s: StatutCourse) => !["livree", "retournee", "annulee", "litige"].includes(s);
export const courseAnnulable = (s: StatutCourse) => AVANT_REMISE.includes(s);
/** Position partagée : uniquement quand le colis est en route vers le client. */
export const suiviClientOuvert = (s: StatutCourse) => s === "en_transit" || s === "proche_destination";

export type PreuveFournie = { otpValide?: boolean; signature?: boolean; photo?: boolean; confirmationClient?: boolean; geozoneConfirmee?: boolean };
export type PreuveRequise = "otp" | "signature" | "photo" | "confirmation";

/** Le géorepérage n'est qu'un indice : il ne suffit jamais à prouver une livraison. */
export function preuveSuffisante(requises: PreuveRequise[], p: PreuveFournie) {
  const liste = requises.length ? requises : (["otp"] as PreuveRequise[]);
  return liste.every((r) => (r === "otp" ? p.otpValide : r === "signature" ? p.signature : r === "photo" ? p.photo : p.confirmationClient) === true);
}

export function statutCommandeDe(s: StatutCourse): string | null {
  if (s === "acceptee" || s === "enlevement_planifie") return "en_preparation";
  if (s === "enlevee" || s === "en_transit" || s === "proche_destination") return "expediee";
  if (s === "livree") return "livree";
  if (s === "echec") return "tentative_echouee";
  return null;
}
