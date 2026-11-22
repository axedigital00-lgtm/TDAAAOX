// Retour en libre-service depuis « Mon compte ». Ouvre une demande : seul le marchand l'accepte
// (l'argent et le stock ne bougent qu'à ce moment, dans lib/remboursement.ts).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { creerRetour } from "@/lib/remboursement";
import { notifierMarchand } from "@/lib/notifications-marchand";
import { refusRetour, retourClientSchema } from "@/lib/commerce/regles";

export async function POST(req: Request) {
  const rl = authLimiter.check(`retour:${getClientIp(req as any)}`);
  if (!rl.success) return rateLimitResponse(rl.reset);
  const corps = await req.json().catch(() => null);
  const token = typeof corps?.token === "string" ? corps.token : "", slug = typeof corps?.slug === "string" ? corps.slug : "";
  if (!token || !slug) return NextResponse.json({ error: "Session requise" }, { status: 401 });
  const r = retourClientSchema.safeParse(corps);
  if (!r.success) return NextResponse.json({ error: r.error.issues[0]?.message ?? "Données invalides" }, { status: 400 });

  const tenant = await prisma.tenant.findUnique({ where: { slug }, select: { id: true } });
  if (!tenant) return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });

  // Mêmes règles que /api/clients-acheteurs/commandes : un lien de suivi n'ouvre que SA commande.
  const lien = token.startsWith("lien:") ? token.slice(5) : null;
  const compte = lien ? null : await prisma.compteAcheteur.findFirst({ where: { token, tenantId: tenant.id, tokenExpire: { gt: new Date() }, email: { not: null } }, select: { email: true } });
  if (!lien && !compte) return NextResponse.json({ error: "Session expirée" }, { status: 401 });

  const commande = await prisma.commande.findFirst({
    where: { id: r.data.commandeId, tenantId: tenant.id, ...(lien ? { trackingToken: lien } : { clientEmail: compte!.email }) },
    select: { id: true, numero: true, statut: true, livreeAt: true, clientNom: true, retours: { select: { statut: true } } },
  });
  if (!commande) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  const refus = refusRetour(commande, new Date());
  if (refus) return NextResponse.json({ error: refus }, { status: 409 });

  const cree = await creerRetour({ tenantId: tenant.id, commande: commande.id, raison: r.data.raison, description: r.data.description ?? null, type: r.data.type });
  if (!cree.ok) return NextResponse.json({ error: cree.error }, { status: cree.status });
  await notifierMarchand({ tenantId: tenant.id, type: "retour", titre: `Demande de retour : #${commande.numero}`, message: `${commande.clientNom} · ${r.data.raison}`, lien: "/dashboard/retours", commandeId: commande.id }).catch(() => {});
  return NextResponse.json({ ok: true }, { status: 201 });
}
