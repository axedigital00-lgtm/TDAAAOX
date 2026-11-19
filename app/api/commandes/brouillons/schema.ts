// Saisie d'une commande provisoire : validée côté serveur (prix jamais reçus du navigateur).
import { z } from "zod";
import { auth } from "@/lib/auth";
import { requireNiveau } from "@/lib/permissions-server";

export const schemaBrouillon = z.object({
  clientId: z.string().max(40).nullish(),
  client: z.object({
    nom: z.string().trim().min(1).max(120),
    telephone: z.string().trim().min(6).max(30),
    email: z.string().trim().email().max(160).nullish().or(z.literal("")),
    adresse: z.string().trim().max(300).nullish(),
    ville: z.string().trim().max(120).nullish(),
    pays: z.string().trim().max(60).nullish(),
  }),
  lignes: z.array(z.object({
    produitId: z.string().min(1).max(40),
    variante: z.string().max(200).nullable(),
    quantite: z.number().int().min(1).max(999),
  })).max(50),
  remise: z.number().min(0).max(1e10),
  livraison: z.number().min(0).max(1e10),
  note: z.string().trim().max(1000).nullish(),
});
export type SaisieBrouillon = z.infer<typeof schemaBrouillon>;

/** Session marchande avec droit d'écriture sur les commandes, sinon la réponse d'erreur. */
export async function marchandCommandes(): Promise<{ tenantId: string } | { status: number; error: string }> {
  const session = await auth();
  const tenantId = (session?.user as any)?.tenantId as string | undefined;
  if (!session || !tenantId) return { status: 401, error: "Non autorisé" };
  const refus = await requireNiveau(session, "commandes", "ecriture");
  return refus ?? { tenantId };
}

/** Champs Prisma d'une saisie validée. */
export const donneesBrouillon = (s: SaisieBrouillon) => ({
  clientId: s.clientId || null,
  clientNom: s.client.nom,
  clientTelephone: s.client.telephone,
  clientEmail: s.client.email || null,
  adresse: s.client.adresse || null,
  ville: s.client.ville || null,
  pays: s.client.pays || null,
  lignes: s.lignes,
  remise: s.remise,
  livraison: s.livraison,
  note: s.note || null,
});
