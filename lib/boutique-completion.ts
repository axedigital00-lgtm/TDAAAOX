// Source unique de vérité pour savoir si une boutique a le minimum requis
// pour passer de "brouillon" à "active" (publiée, visible sur /{slug}).
// Utilisé par PATCH /api/tenants (garde-fou serveur) et par l'outil Axia
// publier_boutique — les deux doivent toujours s'accorder sur les mêmes critères.
import { prisma } from "@/lib/prisma";

export interface CriterePublication {
  cle: string;
  label: string;
  ok: boolean;
  /** Où le corriger (liste des manquants du bouton « Publier »). */
  href: string;
}

export interface EvaluationPublication {
  prete: boolean;
  criteres: CriterePublication[];
}

export async function evaluerPublication(tenantId: string): Promise<EvaluationPublication> {
  const [tenant, nbProduitsActifs] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { nomBoutique: true, whatsapp: true, pays: true, description: true },
    }),
    // Les produits d'exemple d'Axia ne comptent pas : il faut un vrai produit.
    prisma.produit.count({ where: { tenantId, actif: true, exempleAxia: false } }),
  ]);

  const criteres: CriterePublication[] = [
    { cle: "nomBoutique", label: "Nom de la boutique", ok: !!tenant?.nomBoutique?.trim(), href: "/dashboard/boutique" },
    { cle: "whatsapp", label: "Numéro WhatsApp (reçoit les commandes)", ok: !!tenant?.whatsapp?.trim(), href: "/dashboard/boutique" },
    { cle: "pays", label: "Pays de la boutique", ok: !!tenant?.pays?.trim(), href: "/dashboard/boutique" },
    { cle: "description", label: "Description de la boutique", ok: !!tenant?.description?.trim(), href: "/dashboard/boutique" },
    { cle: "produits", label: "Au moins un produit actif", ok: nbProduitsActifs > 0, href: "/dashboard/produits" },
  ];

  return { prete: criteres.every(c => c.ok), criteres };
}
