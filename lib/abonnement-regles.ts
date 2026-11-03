// Règles de l'abonnement payé sans base de données (testables) : rappels d'échéance.
// Utilisées par lib/abonnement-paiement.ts.

const JOUR = 24 * 3600 * 1000;

// ─── Rappels d'échéance ───────────────────────────────────────────────────────

/** Rappel à envoyer : j3 (3 jours ou moins avant l'échéance), j0 (moins de 24 h, ou échue), null sinon. Chacun une fois. */
export function rappelEcheanceDu(expireLe: Date, dejaEnvoye: string | null | undefined, maintenant = new Date()): "j3" | "j0" | null {
  const reste = expireLe.getTime() - maintenant.getTime();
  if (reste <= JOUR) return dejaEnvoye === "j0" ? null : "j0";
  if (reste <= 3 * JOUR && !dejaEnvoye) return "j3";
  return null;
}
