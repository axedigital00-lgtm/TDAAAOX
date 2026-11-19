// Suivi des paniers abandonnés (vitrine) : appelé quand l'acheteur a saisi son nom et son
// téléphone au paiement. Prix relus en base ; jamais d'erreur visible pour l'acheteur.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { lignesCod } from "@/lib/commande-cod";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const limite = rateLimit({ windowMs: 60_000, max: 20, keyPrefix: "panier-vitrine" });
const schema = z.object({
  tenantId: z.string().min(1).max(40),
  cle: z.string().min(8).max(64),
  nom: z.string().trim().max(120).nullish(),
  telephone: z.string().trim().min(6).max(30),
  ville: z.string().trim().max(120).nullish(),
  items: z.array(z.object({ produitId: z.string().min(1).max(40), variante: z.string().max(200).nullish(), quantite: z.number().int().min(1).max(999) })).min(1).max(50),
});

export async function POST(req: NextRequest) {
  const rl = limite.check(getClientIp(req));
  if (!rl.success) return rateLimitResponse(rl.reset);
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success || p.data.telephone.replace(/\D/g, "").length < 6) return new NextResponse(null, { status: 204 });
  const { tenantId, cle, nom, telephone } = p.data;
  const ville = p.data.ville || null;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { statut: true, devise: true } });
  if (tenant?.statut !== "active") return new NextResponse(null, { status: 204 });
  const lus = await lignesCod(tenantId, p.data.items);
  if (!lus.ok) return new NextResponse(null, { status: 204 });
  const lignes = lus.items.map((i) => ({ produitId: i.produitId, nom: i.nom, variante: i.variante, quantite: i.quantite, prix: i.prix }));
  const total = lignes.reduce((s, l) => s + l.prix * l.quantite, 0);
  // Un panier déjà récupéré (commande passée) n'est plus modifié.
  const existant = await prisma.panierAbandonne.findUnique({ where: { tenantId_cle: { tenantId, cle } }, select: { recupereLe: true } });
  if (existant?.recupereLe) return new NextResponse(null, { status: 204 });
  await prisma.panierAbandonne.upsert({
    where: { tenantId_cle: { tenantId, cle } },
    create: { tenantId, cle, nom: nom || null, telephone, ville, lignes, total, devise: tenant.devise },
    update: { nom: nom || null, telephone, ville, lignes, total, devise: tenant.devise },
  });
  return new NextResponse(null, { status: 204 });
}
