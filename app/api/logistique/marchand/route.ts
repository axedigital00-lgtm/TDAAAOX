// Espace logistique du marchand : vue d'ensemble (GET) et préférences (PATCH).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigerMarchand, limiter, refus } from "@/lib/logistique/api";
import { vueMarchand } from "@/lib/logistique/vues";

const preferences = z.object({
  mode: z.enum(["recommandation", "semi_automatique", "autonome"]).optional(), pause: z.boolean().optional(), autoCourses: z.boolean().optional(), budgetMax: z.number().positive().nullable().optional(), exigerVerifie: z.boolean().optional(),
  preuves: z.array(z.enum(["otp", "signature", "photo", "confirmation"])).min(1).optional(), adresseEnlevement: z.string().trim().max(240).nullable().optional(), villeEnlevement: z.string().trim().max(80).nullable().optional(),
  paysEnlevement: z.string().trim().length(2).toUpperCase().nullable().optional(), latEnlevement: z.number().min(-90).max(90).nullable().optional(), lngEnlevement: z.number().min(-180).max(180).nullable().optional(),
});

export async function GET() {
  const m = await exigerMarchand("lecture");
  if ("erreur" in m) return m.erreur;
  return NextResponse.json(await vueMarchand(m.tenantId));
}

export async function PATCH(req: NextRequest) {
  const m = await exigerMarchand("ecriture");
  if ("erreur" in m) return m.erreur;
  const l = limiter(m.s.userId); if (l) return l;
  const r = preferences.safeParse(await req.json().catch(() => null));
  if (!r.success) return refus(400, r.error.issues[0]?.message ?? "Réglages invalides");
  await prisma.preferenceLogistique.upsert({ where: { tenantId: m.tenantId }, create: { tenantId: m.tenantId, ...r.data }, update: r.data });
  await prisma.journalLogistique.create({ data: { acteurType: "marchand", acteurId: m.s.userId, action: "preferences.modifiees", entite: "PreferenceLogistique", entiteId: m.tenantId, apres: r.data } });
  return NextResponse.json({ ok: true });
}
