// Crédits de livraison : registre en écritures immuables. Le solde est toujours recalculé.
export type TypeEcriture = "attribution" | "achat" | "reservation" | "consommation" | "liberation" | "expiration" | "annulation";
export type Ecriture = { type: TypeEcriture; montant: number; courseId?: string | null; reference: string };

export function soldes(e: Ecriture[]) {
  let credite = 0, reserve = 0, consomme = 0, expire = 0;
  for (const x of e) {
    if (x.type === "attribution" || x.type === "achat") credite += x.montant;
    else if (x.type === "reservation") reserve += x.montant;
    else if (x.type === "liberation") reserve -= x.montant;
    else if (x.type === "consommation") { reserve -= x.montant; consomme += x.montant; }
    else if (x.type === "annulation") consomme -= x.montant;
    else if (x.type === "expiration") expire += x.montant;
  }
  return { credite, reserve, consomme, expire, disponible: credite - reserve - consomme - expire };
}

const dejaFait = (e: Ecriture[], courseId: string, type: TypeEcriture) => e.some((x) => x.courseId === courseId && x.type === type);
const montantReserve = (e: Ecriture[], courseId: string) => e.filter((x) => x.courseId === courseId && x.type === "reservation").reduce((s, x) => s + x.montant, 0);

export type Resultat = { ok: true; ecriture: Ecriture | null } | { ok: false; erreur: string };

/** Réserver : idempotent par course ; refuse tout dépassement du disponible. */
export function reserver(e: Ecriture[], courseId: string, montant: number): Resultat {
  if (!(montant > 0)) return { ok: false, erreur: "Montant invalide" };
  if (dejaFait(e, courseId, "reservation")) return { ok: true, ecriture: null };
  if (soldes(e).disponible < montant) return { ok: false, erreur: "Crédits insuffisants" };
  return { ok: true, ecriture: { type: "reservation", montant, courseId, reference: `res:${courseId}` } };
}

export function consommer(e: Ecriture[], courseId: string): Resultat {
  if (dejaFait(e, courseId, "consommation")) return { ok: true, ecriture: null };
  if (dejaFait(e, courseId, "liberation")) return { ok: false, erreur: "Réservation déjà libérée" };
  const montant = montantReserve(e, courseId);
  if (!montant) return { ok: false, erreur: "Aucune réservation" };
  return { ok: true, ecriture: { type: "consommation", montant, courseId, reference: `con:${courseId}` } };
}

export function liberer(e: Ecriture[], courseId: string): Resultat {
  if (dejaFait(e, courseId, "liberation")) return { ok: true, ecriture: null };
  if (dejaFait(e, courseId, "consommation")) return { ok: false, erreur: "Crédit déjà consommé" };
  const montant = montantReserve(e, courseId);
  if (!montant) return { ok: true, ecriture: null };
  return { ok: true, ecriture: { type: "liberation", montant, courseId, reference: `lib:${courseId}` } };
}

/** Annule une consommation (remboursement) : nouvelle écriture, jamais une modification. */
export function annulerConsommation(e: Ecriture[], courseId: string): Resultat {
  if (dejaFait(e, courseId, "annulation")) return { ok: true, ecriture: null };
  const c = e.find((x) => x.courseId === courseId && x.type === "consommation");
  if (!c) return { ok: false, erreur: "Aucune consommation" };
  return { ok: true, ecriture: { type: "annulation", montant: c.montant, courseId, reference: `ann:${courseId}` } };
}
