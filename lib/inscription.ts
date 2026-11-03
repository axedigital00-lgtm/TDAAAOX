// Arrivée sur /inscription depuis la landing : ?email=<email> pré-remplit le formulaire.
// Module pur : utilisé par la page (navigateur) et testé dans tests/inscription.test.ts.
import { z } from "zod";

export const emailValide = (email?: string | null) => !!email && z.string().email().safeParse(email).success;

export function lireParametresInscription(params: URLSearchParams) {
  const email = params.get("email")?.trim() ?? "";
  return { email: emailValide(email) ? email : "" };
}
