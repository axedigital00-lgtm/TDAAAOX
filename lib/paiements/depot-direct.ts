// Encaissement Mobile Money direct, aux couleurs d'AXSO : le client saisit son numéro sur une page
// AXSO, valide sur son téléphone (code secret), le message affiché est celui d'AXSO. Aucune page ni
// marque du prestataire n'est montrée. Commun aux ventes numériques, abonnements et achats de coins.
import { deviseIso3, type ClientPawapay } from "./pawapay";

export class ErreurMobileMoney extends Error { constructor(message: string, public status = 400) { super(message); } }

/** Messages clairs pour le client, à partir des codes de refus du prestataire. */
const MOTIFS: Record<string, string> = {
  INVALID_PHONE_NUMBER: "Ce numéro Mobile Money n'est pas valide.",
  AMOUNT_OUT_OF_BOUNDS: "Ce montant n'est pas accepté par votre opérateur.",
  INVALID_AMOUNT: "Ce montant n'est pas accepté par votre opérateur.",
  PROVIDER_TEMPORARILY_UNAVAILABLE: "Votre opérateur est momentanément indisponible. Réessayez dans quelques minutes.",
  DEPOSITS_NOT_ALLOWED: "Le paiement Mobile Money n'est pas encore ouvert pour cet opérateur.",
  INVALID_PROVIDER: "Le paiement Mobile Money n'est pas encore ouvert pour cet opérateur.",
  INVALID_CURRENCY: "Le paiement Mobile Money n'est pas encore ouvert dans ce pays.",
};
export const motifClient = (code: string) => MOTIFS[code] ?? "Le paiement n'a pas pu être lancé. Vérifiez le numéro et réessayez.";

/** Opérateur, pays et monnaie d'un numéro ; refuse les opérateurs fermés ou à code préalable (OTP). */
export async function preparerDepot(client: ClientPawapay, telephone: string) {
  const chiffres = String(telephone ?? "").replace(/\D/g, "");
  if (chiffres.length < 8) throw new ErreurMobileMoney("Indiquez votre numéro Mobile Money, avec l'indicatif du pays (ex. 237 6…).");
  const op = await client.operateur(chiffres).catch(() => null);
  if (!op) throw new ErreurMobileMoney("Numéro Mobile Money non reconnu : ajoutez l'indicatif du pays (ex. 237 pour le Cameroun).");
  const devise = deviseIso3(op.pays);
  if (!devise) throw new ErreurMobileMoney("Le paiement Mobile Money n'est pas encore disponible dans ce pays.", 422);
  const conf = await client.configuration("DEPOSIT").catch(() => []);
  const operateur = conf.find((c) => c.pays === op.pays)?.operateurs.find((o) => o.code === op.operateur);
  if (conf.length && (!operateur || !operateur.ouvert)) throw new ErreurMobileMoney("Le paiement n'est pas encore ouvert pour cet opérateur. Essayez avec un autre numéro.", 422);
  if (operateur?.validation === "PREAUTH") throw new ErreurMobileMoney("Cet opérateur demande un code préalable que nous ne gérons pas encore. Essayez avec un autre numéro.", 422);
  return { ...op, devise, nomOperateur: operateur?.nom ?? op.operateur, min: operateur?.min, max: operateur?.max };
}

/** Lance le paiement. Refus définitif → ErreurMobileMoney ; réponse perdue → le statut sera relu. */
export async function lancerDepot(client: ClientPawapay, p: { depositId: string; telephone: string; operateur: string; montant: number; devise: string; message: string; retour?: string; reference?: string }) {
  const r = await client.deposer({
    depositId: p.depositId, telephone: p.telephone, operateur: p.operateur, montant: p.montant, devise: p.devise, message: p.message,
    retourOk: p.retour, retourKo: p.retour, reference: p.reference,
  });
  if (r.accepte === false) throw new ErreurMobileMoney(motifClient(r.code), 422);
  return { application: r.accepte === true && r.application };
}
