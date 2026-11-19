import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lienBoutique } from "@/lib/origine-site";
import { lienWhatsapp, messageRelancePanier } from "@/lib/commandes-provisoires";
import { marchandCommandes } from "../../brouillons/schema";

// Relancer un panier abandonné sur WhatsApp (lien wa.me), sauf si le client a refusé les relances.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const m = await marchandCommandes();
  if ("error" in m) return NextResponse.json({ error: m.error }, { status: m.status });
  const { id } = await params;
  const panier = await prisma.panierAbandonne.findFirst({ where: { id, tenantId: m.tenantId } });
  if (!panier) return NextResponse.json({ error: "Panier introuvable" }, { status: 404 });
  if (panier.recupereLe) return NextResponse.json({ error: "Ce panier a déjà donné une commande" }, { status: 409 });
  const refus = await prisma.client.findFirst({ where: { tenantId: m.tenantId, telephone: panier.telephone, relancesRefuseesLe: { not: null } }, select: { id: true } });
  if (refus) return NextResponse.json({ error: "Ce client a refusé les relances" }, { status: 409 });
  const t = await prisma.tenant.findUnique({ where: { id: m.tenantId }, select: { nomBoutique: true, slug: true } });
  if (!t) return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });
  const lignes = (Array.isArray(panier.lignes) ? panier.lignes : []) as { nom: string; quantite: number }[];
  const url = lienWhatsapp(panier.telephone, messageRelancePanier({ boutique: t.nomBoutique, nom: panier.nom, lignes, lien: await lienBoutique(t.slug) }));
  if (!url) return NextResponse.json({ error: "Numéro invalide" }, { status: 400 });
  await prisma.panierAbandonne.update({ where: { id }, data: { relanceLe: new Date() } });
  return NextResponse.json({ whatsappUrl: url });
}
