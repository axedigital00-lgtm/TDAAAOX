// Lecture d'une pièce légale : réservée aux admins autorisés, chaque accès est journalisé.
import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionPour } from "@/lib/admin-auth";
import { dechiffrer } from "@/lib/chiffrement";
import { prisma } from "@/lib/prisma";
import { refus } from "@/lib/logistique/api";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await getAdminSessionPour("operations");
  if (!a || (a.role !== "admin" && a.role !== "admin_operations")) return refus(403, "Accès refusé");
  const { id } = await params;
  const d = await prisma.documentVerification.findUnique({ where: { id } });
  if (!d) return refus(404, "Document introuvable");
  const clair = dechiffrer(d.contenuChiffre);
  if (!clair) return refus(500, "Document illisible");
  await prisma.journalLogistique.create({ data: { acteurType: "admin", acteurId: a.userId, action: "document.consulte", entite: "DocumentVerification", entiteId: id } });
  const nom = d.nomFichier.replace(/[^\w.-]/g, "_");
  return new NextResponse(Buffer.from(clair, "base64"), { headers: { "Content-Type": d.mime, "Content-Disposition": `inline; filename="${nom}"`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox" } });
}
