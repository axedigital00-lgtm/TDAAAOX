// Photo de preuve : déchiffrée à la demande pour le marchand de la course ou un admin.
import { NextRequest, NextResponse } from "next/server";
import { dechiffrer } from "@/lib/chiffrement";
import { prisma } from "@/lib/prisma";
import { acteurCourse, refus, sessionLogistique } from "@/lib/logistique/api";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await sessionLogistique();
  if (!s) return refus();
  const { id } = await params;
  const a = await acteurCourse(id, s, "lecture");
  if (!a || (a.type !== "marchand" && a.type !== "admin")) return refus(404, "Preuve introuvable");
  const p = await prisma.preuveLivraison.findUnique({ where: { courseId: id }, select: { photoChiffree: true } });
  const brut = p?.photoChiffree ? dechiffrer(p.photoChiffree) : null;
  if (!brut?.startsWith("data:image/jpeg;base64,")) return refus(404, "Preuve introuvable");
  return new NextResponse(Buffer.from(brut.split(",")[1], "base64"), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
