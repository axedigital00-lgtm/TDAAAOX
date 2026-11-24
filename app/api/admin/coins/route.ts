// Gains des coins : lecture pour la section IA, réglages et ajustements réservés au super-admin.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSessionPour } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { ajusterCoins, ErreurCoins } from "@/lib/ia/coins";
import { vueGainsCoins } from "@/lib/ia/gains";

const action = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reglages"), budgetMensuelUsd: z.number().min(0).max(1_000_000).nullable(), alertePct: z.number().int().min(10).max(100), plafondDur: z.boolean(), tauxXaf: z.number().min(100).max(2000), actionsActives: z.boolean() }),
  z.object({ action: z.literal("ajuster"), tenantId: z.string().max(40), montant: z.number().int(), motif: z.string().min(3).max(200) }),
]);

export async function GET(req: NextRequest) {
  if (!(await getAdminSessionPour("ia"))) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const jours = Math.min(365, Math.max(7, Number(req.nextUrl.searchParams.get("jours")) || 30));
  return NextResponse.json(await vueGainsCoins(jours));
}

export async function POST(req: NextRequest) {
  const a = await getAdminSessionPour("ia");
  if (!a) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  if (a.role !== "admin") return NextResponse.json({ error: "Action réservée au super-admin" }, { status: 403 });
  const r = action.safeParse(await req.json().catch(() => null));
  if (!r.success) return NextResponse.json({ error: r.error.issues[0]?.message ?? "Données invalides" }, { status: 400 });
  const d = r.data;
  try {
    if (d.action === "reglages") {
      const { action: _a, ...v } = d;
      await prisma.reglageIa.upsert({ where: { id: "global" }, create: { id: "global", ...v }, update: v });
    } else await ajusterCoins(a.userId, d.tenantId, d.montant, d.motif);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ErreurCoins) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
