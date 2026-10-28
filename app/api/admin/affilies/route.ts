// Retraits d'affiliés à verser (circuit manuel, voir lib/affiliation.ts) : Axso fait le transfert
// dans NotchPay puis clôture ici. Même format que /api/admin/wallet/retraits.
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, getAdminSessionPour, estAdminComplet } from "@/lib/admin-auth";
import { journaliser } from "@/lib/command-center/serveur";
import { cloturerRetraitAffilie } from "@/lib/affiliation";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getAdminSessionPour("affilies");
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const retraits = await prisma.retraitAffilie.findMany({
    where: { statut: "en_attente" }, orderBy: { createdAt: "asc" }, take: 100,
    include: { user: { select: { name: true, email: true } } },
  });
  return NextResponse.json({
    retraits: retraits.map((r) => ({
      id: r.id, nomBoutique: "Affiliation Axso", montant: r.montant, devise: r.devise,
      methode: "mobile_money", destinataire: r.destinataire, operateur: r.operateur?.toUpperCase(),
      notes: `Affilié : ${r.user.name ?? "?"}${r.user.email ? ` (${r.user.email})` : ""} · réf. AXSO-AFF-${r.id}`,
      createdAt: r.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!estAdminComplet(session)) return NextResponse.json({ error: "Lecture seule — réservé au super-admin" }, { status: 403 });

  const { id, action } = await req.json().catch(() => ({}));
  if (typeof id !== "string" || !["payer", "refuser"].includes(action)) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  try {
    const avant = await prisma.retraitAffilie.findUnique({ where: { id }, select: { statut: true, montant: true, devise: true, userId: true } });
    await cloturerRetraitAffilie(id, action === "payer");
    await journaliser(session, `retrait_affilie.${action}`, "RetraitAffilie", id, avant, { statut: action === "payer" ? "complete" : "echoue" });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Erreur" }, { status: 400 });
  }
}
