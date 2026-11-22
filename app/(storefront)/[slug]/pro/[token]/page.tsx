// Portail entreprise (lien privé) : commande rapide au prix négocié.
export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { catalogueVendable } from "@/lib/commerce/devis";
import { grilleAffichage, prixPourQuantite } from "@/lib/commerce/gros";
import { prixEntreprise, LIBELLES_CONDITIONS, type ConditionPaiement } from "@/lib/commerce/regles";
import { PortailPro } from "./PortailPro";

export const metadata: Metadata = { title: "Commande professionnelle", robots: { index: false, follow: false } };

export default async function PortailProPage({ params }: { params: Promise<{ slug: string; token: string }> }) {
  const { slug, token } = await params;
  const e = await prisma.compteEntreprise.findUnique({ where: { token } });
  if (!e || !e.actif) notFound();
  const tenant = await prisma.tenant.findUnique({ where: { id: e.tenantId }, select: { slug: true, nomBoutique: true, devise: true } });
  if (!tenant || tenant.slug !== slug) notFound();
  const catalogue = await catalogueVendable(e.tenantId);
  // Paliers calculés ici : le navigateur n'a jamais à connaître le prix de base ni le stock exact.
  const articles = catalogue.map((a) => ({
    produitId: a.produitId, nom: a.nom, variante: a.variante, sku: a.sku, imageUrl: a.imageUrl, disponible: a.stock > 0,
    prix: prixEntreprise(prixPourQuantite(a.prixBase, a.gros, 1), e.remisePct),
    paliers: grilleAffichage(a.prixBase, a.gros).map((p) => ({ min: p.min, prix: prixEntreprise(p.prix, e.remisePct) })),
    min: a.gros?.min ?? 1, max: a.gros?.max ?? null, multiple: a.gros?.multiple ?? 1,
  }));
  return <PortailPro token={token} boutique={tenant.nomBoutique} entreprise={e.nom} devise={tenant.devise} conditions={LIBELLES_CONDITIONS[e.conditions as ConditionPaiement] ?? "À la livraison"} articles={articles} />;
}
