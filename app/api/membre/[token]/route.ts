// Espace membre d'un abonnement (lien privé) : statut, échéance, contenus inclus.
import { NextRequest, NextResponse } from "next/server";
import { chargerAdhesion } from "@/lib/numerique/abonnement";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const a = await chargerAdhesion((await params).token);
  if (!a) return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
  return NextResponse.json({
    produit: a.abonnement.produit.nom, boutique: a.abonnement.produit.tenant.nomBoutique, slug: a.abonnement.produit.slug,
    actif: a.active, statut: a.statut, debut: a.debut, fin: a.fin, avantages: a.abonnement.avantages,
    contenus: a.active ? a.abonnement.contenus.map((c) => ({ id: c.produitInclus.id, nom: c.produitInclus.nom, type: c.produitInclus.type, image: c.produitInclus.images[0] ?? null })) : [],
  });
}
