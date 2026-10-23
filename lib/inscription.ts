// Arrivée sur /inscription depuis la landing : ?email=<email> pré-remplit le formulaire,
// ?plan=<palier> choisit l'abonnement (payé dans le tunnel s'il est payant), et
// ?paiement=en_cours est le retour de NotchPay (callback de /api/abonnement/paiement).
// Module pur : utilisé par la page (navigateur) et testé dans tests/inscription.test.ts.
import { z } from "zod";
import { PLANS_CATALOGUE } from "./plans-catalogue";
import { palierAuMoins, type Palier } from "./plans";

export const planInscription = (id?: string | null) => PLANS_CATALOGUE.find((p) => p.id === id) ?? null;
export const planPayant = (id?: string | null) => (planInscription(id)?.prixXAF ?? 0) > 0;
export const emailValide = (email?: string | null) => !!email && z.string().email().safeParse(email).success;

export function lireParametresInscription(params: URLSearchParams) {
  const email = params.get("email")?.trim() ?? "";
  return {
    email: emailValide(email) ? email : "",
    plan: (planInscription(params.get("plan"))?.id ?? null) as Palier | null,
    retourPaiement: params.get("paiement") === "en_cours",
  };
}

/** Le plan payé (renvoyé par /api/abonnement/etat) couvre-t-il le plan choisi dans le tunnel ? */
export const planObtenu = (planActuel: string | null | undefined, choisi: Palier) =>
  !!planInscription(planActuel) && palierAuMoins(planActuel as Palier, choisi);
