// Produits proposés dans l'éditeur de devis, et comptes entreprises à rattacher.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nonAutorise, sessionBoutique } from "@/lib/commerce/api";
import { catalogueVendable } from "@/lib/commerce/devis";

export async function GET() {
  const s = await sessionBoutique();
  if (!s) return nonAutorise();
  const [catalogue, entreprises, tenant] = await Promise.all([
    catalogueVendable(s.tenantId),
    prisma.compteEntreprise.findMany({ where: { tenantId: s.tenantId, actif: true }, orderBy: { nom: "asc" }, select: { id: true, nom: true, contactNom: true, email: true, telephone: true, adresse: true, ville: true, pays: true, conditions: true, remisePct: true } }),
    prisma.tenant.findUnique({ where: { id: s.tenantId }, select: { devise: true } }),
  ]);
  return NextResponse.json({ catalogue, entreprises, devise: tenant?.devise ?? "XAF" });
}
