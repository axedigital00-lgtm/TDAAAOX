// Événements du parcours d'inscription (lib/inscription-suivi.ts → /api/inscription/evenement).
// Module pur : partagé par la route et tests/inscription-evenement.test.ts.
import { z } from "zod";

export const TYPES_EVENEMENT = ["vue", "choix", "abandon", "fin", "erreur"] as const;

const schemaEvenement = z.object({
  session: z.string().min(1).max(40),
  type: z.enum(TYPES_EVENEMENT),
  etape: z.string().min(1).max(40),
  valeur: z.string().max(60).optional(),
  dureeMs: z.number().int().min(0).max(3_600_000).optional(),
}).strict();

export type EvenementInscription = z.infer<typeof schemaEvenement>;

/** Corps brut (texte JSON : un événement ou un tableau de 20 au plus) → événements valides, ou null. */
export function lireEvenements(texte: string): EvenementInscription[] | null {
  let brut: unknown;
  try { brut = JSON.parse(texte); } catch { return null; }
  const r = z.union([schemaEvenement.transform((e) => [e]), z.array(schemaEvenement).min(1).max(20)]).safeParse(brut);
  return r.success ? r.data : null;
}
