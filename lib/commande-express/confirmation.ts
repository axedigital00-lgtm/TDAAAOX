// Centre de confirmation Commande Express : résultats d'appel, file de priorité et effet sur la
// commande. Les fonctions pures sont testées (tests/commande-express-confirmation.test.ts).
import { z } from "zod";

export const RESULTATS = ["confirmee", "injoignable", "rappeler", "annulee", "faux_numero"] as const;
export type ResultatAppel = (typeof RESULTATS)[number];

/** Au-delà, une commande injoignable sort de la file « À traiter » (elle reste consultable). */
export const TENTATIVES_MAX = 3;

export const schemaAppel = z.object({
  resultat: z.enum(RESULTATS),
  note: z.string().trim().max(500).optional().transform((v) => v || undefined),
  rappelA: z.coerce.date().optional(),
}).refine((a) => a.resultat !== "rappeler" || (a.rappelA && !Number.isNaN(a.rappelA.getTime())), { message: "Indiquez l'heure du rappel", path: ["rappelA"] });
export type Appel = z.infer<typeof schemaAppel>;

type Etat = { statutConfirmation: string; tentatives: number; rappelA: Date | null };

/** Nouvel état de la fiche express après un appel. */
export function apresAppel(etat: Etat, appel: Pick<Appel, "resultat" | "rappelA">, maintenant = new Date()): Etat & { confirmeeAt?: Date } {
  switch (appel.resultat) {
    case "confirmee": return { statutConfirmation: "confirmee", tentatives: etat.tentatives, rappelA: null, confirmeeAt: maintenant };
    case "injoignable": return { statutConfirmation: "injoignable", tentatives: etat.tentatives + 1, rappelA: null };
    case "rappeler": return { statutConfirmation: "rappeler", tentatives: etat.tentatives, rappelA: appel.rappelA ?? null };
    default: return { statutConfirmation: appel.resultat, tentatives: etat.tentatives, rappelA: null };
  }
}

/** Statut à donner à la commande elle-même (null : on n'y touche pas). */
export function statutCommandePour(resultat: ResultatAppel, statutActuel: string): string | null {
  if (resultat === "confirmee") return statutActuel === "en_attente" ? "confirmee" : null;
  if (resultat === "annulee" || resultat === "faux_numero") return ["en_attente", "confirmee", "en_preparation"].includes(statutActuel) ? "annulee" : null;
  return null;
}

/** Encore à appeler : nouvelle, rappel prévu, ou injoignable sous la limite d'essais. */
export function aTraiter(e: Etat): boolean {
  return e.statutConfirmation === "a_confirmer" || e.statutConfirmation === "rappeler"
    || (e.statutConfirmation === "injoignable" && e.tentatives < TENTATIVES_MAX);
}

/**
 * Ordre d'appel : rappels arrivés à l'heure d'abord, puis les nouvelles (risque élevé, puis
 * montant élevé, puis la plus ancienne), puis les injoignables (moins d'essais d'abord), enfin
 * les rappels encore à venir.
 */
export function trierFile<E extends Etat & { createdAt: Date; scoreRisque: number | null; montant: number }>(liste: E[], maintenant = new Date()): E[] {
  const rang = (e: E) => e.statutConfirmation === "rappeler" ? (e.rappelA && e.rappelA <= maintenant ? 0 : 3) : e.statutConfirmation === "a_confirmer" ? 1 : 2;
  return [...liste].sort((a, b) =>
    rang(a) - rang(b)
    || (rang(a) === 0 || rang(a) === 3 ? (a.rappelA?.getTime() ?? 0) - (b.rappelA?.getTime() ?? 0) : 0)
    || (rang(a) === 2 ? a.tentatives - b.tentatives : 0)
    || (b.scoreRisque ?? 0) - (a.scoreRisque ?? 0)
    || b.montant - a.montant
    || a.createdAt.getTime() - b.createdAt.getTime());
}

/** Message WhatsApp pré-rempli pour confirmer une commande. */
export function messageConfirmation(p: { nom: string; numero: string; boutique: string; produits: string; total: string; ville: string }): string {
  const prenom = p.nom.trim().split(/\s+/)[0] || "";
  return `Bonjour ${prenom}, ici ${p.boutique}. Merci pour votre commande n° ${p.numero} : ${p.produits}, total ${p.total}, livraison à ${p.ville}. Pouvez-vous nous confirmer qu'elle est bien pour vous ? Répondez simplement OUI.`;
}
