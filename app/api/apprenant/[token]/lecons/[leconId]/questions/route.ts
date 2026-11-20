// Questions-réponses sous une leçon (apprenants ayant accès). GET : fil visible ; POST : question ou réponse.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { leconOuverte, parcoursOuRefus } from "@/lib/formation/parcours";
import { notifierMarchand } from "@/lib/notifications-marchand";

type Ctx = { params: Promise<{ token: string; leconId: string }> };
const corps = z.object({ texte: z.string().trim().min(2, "Message trop court").max(4000), parentId: z.string().max(40).optional() });

export async function GET(req: NextRequest, { params }: Ctx) {
  const { token, leconId } = await params;
  const p = await parcoursOuRefus(req, token);
  if (p instanceof NextResponse) return p;
  if (!leconOuverte(p, leconId)) return NextResponse.json({ error: "Leçon introuvable" }, { status: 404 });
  const questions = await prisma.questionLecon.findMany({
    where: { leconId, masquee: false }, orderBy: { createdAt: "asc" },
    select: { id: true, auteurNom: true, texte: true, parentId: true, parFormateur: true, resolue: true, createdAt: true },
  });
  return NextResponse.json({ questions });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { token, leconId } = await params;
  const p = await parcoursOuRefus(req, token);
  if (p instanceof NextResponse) return p;
  const trouve = leconOuverte(p, leconId);
  if (!trouve) return NextResponse.json({ error: "Leçon introuvable" }, { status: 404 });
  const f = await prisma.formation.findUnique({ where: { produitId: p.acces.produitId }, select: { questionsActives: true } });
  if (f && !f.questionsActives) return NextResponse.json({ error: "Les questions sont fermées pour cette formation" }, { status: 403 });
  const parse = corps.safeParse(await req.json().catch(() => null));
  if (!parse.success) return NextResponse.json({ error: parse.error.issues[0]?.message }, { status: 400 });
  if (parse.data.parentId && !(await prisma.questionLecon.findFirst({ where: { id: parse.data.parentId, leconId, parentId: null } }))) {
    return NextResponse.json({ error: "Question introuvable" }, { status: 404 });
  }
  const q = await prisma.questionLecon.create({
    data: { leconId, produitId: p.acces.produitId, tenantId: p.tenantId, apprenant: p.apprenant, auteurNom: p.nomApprenant || "Apprenant", texte: parse.data.texte, parentId: parse.data.parentId ?? null },
  });
  if (!parse.data.parentId) {
    await notifierMarchand({ tenantId: p.tenantId, type: "devoir", titre: `Question sur « ${trouve.lecon.titre} »`, message: parse.data.texte.slice(0, 160), lien: `/dashboard/produits/${p.acces.produitId}/apprenants` }).catch(() => {});
  }
  return NextResponse.json({ question: q }, { status: 201 });
}
