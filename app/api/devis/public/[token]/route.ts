// Lien client d'un devis : accepter (crée la commande) ou refuser. Le jeton fait office d'accès.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { notifierMarchand } from "@/lib/notifications-marchand";
import { introuvable, invalide, reponseErreur } from "@/lib/commerce/api";
import { convertirDevis } from "@/lib/commerce/devis";
import { clientPeutRepondre } from "@/lib/commerce/regles";

const corps = z.object({ action: z.enum(["accepter", "refuser"]) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const rl = apiLimiter.check(`devis:${getClientIp(req)}`);
  if (!rl.success) return rateLimitResponse(rl.reset);
  const d = await prisma.devis.findUnique({ where: { token: (await params).token } });
  if (!d) return introuvable();
  const r = corps.safeParse(await req.json().catch(() => null));
  if (!r.success) return invalide(r.error);
  if (!clientPeutRepondre(d, new Date())) return NextResponse.json({ error: "Ce devis n'est plus ouvert" }, { status: 409 });
  try {
    if (r.data.action === "refuser") {
      const { count } = await prisma.devis.updateMany({ where: { id: d.id, statut: "envoye" }, data: { statut: "refuse" } });
      if (!count) return NextResponse.json({ error: "Ce devis n'est plus ouvert" }, { status: 409 });
      await notifierMarchand({ tenantId: d.tenantId, type: "devis", titre: `Devis refusé : ${d.numero}`, message: d.clientNom, lien: `/dashboard/commandes/devis/${d.id}` }).catch(() => {});
      return NextResponse.json({ statut: "refuse" });
    }
    const c = await convertirDevis(d.id, d.tenantId, { statutsPermis: ["envoye"] });
    await notifierMarchand({ tenantId: d.tenantId, type: "commande", titre: `Devis accepté : ${d.numero}`, message: `${d.clientNom} · commande #${c.numero}`, lien: `/dashboard/commandes/${c.id}`, commandeId: c.id }).catch(() => {});
    return NextResponse.json({ statut: "accepte", numero: c.numero, trackingToken: c.trackingToken });
  } catch (e) { return reponseErreur(e); }
}
