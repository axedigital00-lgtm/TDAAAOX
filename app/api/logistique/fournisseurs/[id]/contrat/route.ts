// Contrat de versement : lecture, signature électronique et activation des versements automatiques.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { limiter, refus, reponseErreur, sessionLogistique } from "@/lib/logistique/api";
import { majAutoVersement, signerContrat, vueContrat } from "@/lib/logistique/versements";

type Ctx = { params: Promise<{ id: string }> };
const signature = z.object({ nom: z.string().trim().min(3).max(160), accepte: z.literal(true), autoVersement: z.boolean() });

export async function GET(_req: NextRequest, { params }: Ctx) {
  const s = await sessionLogistique();
  if (!s) return refus();
  try { return NextResponse.json(await vueContrat(s.userId, (await params).id)); } catch (e) { return reponseErreur(e); }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const s = await sessionLogistique();
  if (!s) return refus();
  const l = limiter(s.userId); if (l) return l;
  const d = signature.safeParse(await req.json().catch(() => null));
  if (!d.success) return refus(400, "Nom et acceptation requis");
  try { return NextResponse.json(await signerContrat(s.userId, (await params).id, d.data), { status: 201 }); } catch (e) { return reponseErreur(e); }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const s = await sessionLogistique();
  if (!s) return refus();
  const l = limiter(s.userId); if (l) return l;
  const d = z.object({ autoVersement: z.boolean() }).safeParse(await req.json().catch(() => null));
  if (!d.success) return refus(400, "Réglage invalide");
  try { await majAutoVersement(s.userId, (await params).id, d.data.autoVersement); return NextResponse.json({ ok: true }); } catch (e) { return reponseErreur(e); }
}
