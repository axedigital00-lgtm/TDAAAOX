// Releasit COD AXSO — conversions envoyées depuis le serveur (Meta, TikTok) : réglages et test.
// Les jetons ne sont jamais renvoyés : seulement « configuré » ou non.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { contexteMarchand } from "@/lib/commande-express/acces";
import { ecrirePixels, envoyerAchat, lirePixels } from "@/lib/commande-express/pixels-serveur";
import { listePixels } from "@/lib/pixels";

const schema = z.object({
  metaToken: z.string().max(600).optional(), tiktokToken: z.string().max(600).optional(),
  metaTestCode: z.string().max(40).optional(), modePurchase: z.enum(["creation", "confirmation"]).optional(),
});

async function etat(tenantId: string) {
  const [t, r] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { metaPixelId: true, tiktokPixelId: true } }),
    prisma.reglagesCommandeExpress.findUnique({ where: { tenantId }, select: { pixelsServeur: true } }),
  ]);
  const p = lirePixels(r?.pixelsServeur);
  return {
    metaPixels: listePixels(t?.metaPixelId), tiktokPixels: listePixels(t?.tiktokPixelId),
    metaConfigure: !!p.metaToken, tiktokConfigure: !!p.tiktokToken, metaTestCode: p.metaTestCode ?? "", modePurchase: p.modePurchase ?? "creation",
  };
}

export async function GET() {
  const c = await contexteMarchand("lecture");
  if ("erreur" in c) return c.erreur;
  return NextResponse.json(await etat(c.tenantId));
}

export async function PATCH(req: NextRequest) {
  const c = await contexteMarchand("ecriture");
  if ("erreur" in c) return c.erreur;
  const lu = schema.safeParse(await req.json().catch(() => ({})));
  if (!lu.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  const avant = await prisma.reglagesCommandeExpress.findUnique({ where: { tenantId: c.tenantId }, select: { pixelsServeur: true } });
  const pixelsServeur = ecrirePixels(avant?.pixelsServeur, lu.data);
  await prisma.reglagesCommandeExpress.upsert({ where: { tenantId: c.tenantId }, create: { tenantId: c.tenantId, pixelsServeur }, update: { pixelsServeur } });
  return NextResponse.json(await etat(c.tenantId));
}

/** Événement d'essai (montant 1, n° TEST-…) : visible dans le Gestionnaire d'événements avec le code de test. */
export async function POST(req: NextRequest) {
  const c = await contexteMarchand("ecriture");
  if ("erreur" in c) return c.erreur;
  const t = await prisma.tenant.findUnique({ where: { id: c.tenantId }, select: { devise: true, telephone: true, whatsappNumero: true, pays: true, nomBoutique: true } });
  const resultats = await envoyerAchat(c.tenantId, {
    numero: `TEST-${Date.now().toString(36)}`, montant: 1, devise: t?.devise ?? "XAF", telephone: t?.whatsappNumero || t?.telephone || "", pays: t?.pays, nom: t?.nomBoutique ?? "Test",
    produitIds: ["test"], ip: req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0] ?? null, userAgent: req.headers.get("user-agent"),
  });
  if (!Object.keys(resultats).length) return NextResponse.json({ error: "Ajoutez d'abord un jeton et un pixel" }, { status: 400 });
  return NextResponse.json({ resultats });
}
