// Portail transporteur : mes profils (GET) et inscription d'une société ou d'un livreur (POST).
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { limiter, refus, reponseErreur, sessionLogistique } from "@/lib/logistique/api";
import { creerFournisseur, fournisseursDe } from "@/lib/logistique/service";

export async function GET() {
  const s = await sessionLogistique();
  if (!s) return refus();
  const [liste, u, livreur] = await Promise.all([
    fournisseursDe(s.userId),
    prisma.user.findUnique({ where: { id: s.userId }, select: { name: true, email: true, role: true } }),
    prisma.livreur.findUnique({ where: { userId: s.userId }, select: { nom: true, telephone: true, vehicule: true, zone: true } }),
  ]);
  const compte = { role: u?.role ?? null, type: u?.role === "transporteur" ? "societe" : "livreur", nom: livreur?.nom ?? u?.name ?? "", email: u?.email ?? "", telephone: livreur?.telephone ?? "", vehicule: livreur?.vehicule ?? null, zone: livreur?.zone ?? "" };
  return NextResponse.json({ compte, fournisseurs: liste.map(({ reglement, ...f }) => ({ ...f, reglementRenseigne: !!reglement })) });
}

export async function POST(req: NextRequest) {
  const s = await sessionLogistique();
  if (!s) return refus();
  const l = limiter(s.userId); if (l) return l;
  try {
    const f = await creerFournisseur(s.userId, await req.json().catch(() => null));
    return NextResponse.json({ id: f.id }, { status: 201 });
  } catch (e) { return reponseErreur(e); }
}
