// Releasit COD AXSO — ajout en 1 clic après la commande (offre « après achat »).
// Le jeton remis avec la commande (30 min) prouve que c'est bien l'acheteur ; le prix vient de la base.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { ajouterApresAchat, jetonAjoutValide, RefusAjout } from "@/lib/commande-express/offres";

const limite = rateLimit({ windowMs: 60_000, max: 10, keyPrefix: "releasit-ajout" });

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const l = limite.check(getClientIp(req));
  if (!l.success) return rateLimitResponse(l.reset);
  const t = await prisma.tenant.findUnique({ where: { slug: (await params).slug }, select: { id: true, statut: true } });
  if (!t || t.statut !== "active") return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });
  const b = await req.json().catch(() => null);
  if (!b || typeof b.commandeId !== "string" || typeof b.offreId !== "string" || !jetonAjoutValide(b.jeton, b.commandeId)) {
    return NextResponse.json({ error: "Offre expirée" }, { status: 403 });
  }
  try {
    const r = await ajouterApresAchat({ tenantId: t.id, commandeId: b.commandeId, offreId: b.offreId });
    return NextResponse.json({ ok: true, numero: r.numero, montantTotal: r.montantTotal, produit: r.produit });
  } catch (e) {
    if (e instanceof RefusAjout) return NextResponse.json({ error: e.message }, { status: 409 });
    if ((e as Error)?.name === "RuptureStock" || /Stock insuffisant/.test((e as Error)?.message ?? "")) return NextResponse.json({ error: "Ce produit vient d'être épuisé" }, { status: 409 });
    throw e;
  }
}
