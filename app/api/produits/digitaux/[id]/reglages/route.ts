// Réglages propres au type d'un produit numérique avancé (service, abonnement, parcours,
// fiche pédagogique d'une formation). GET : réglages actuels ; PUT : enregistrement validé.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { abonnementSchema, ficheFormationSchema, parcoursSchema, serviceSchema } from "@/lib/numerique/regles";

type Ctx = { params: Promise<{ id: string }> };

async function produitDuMarchand(id: string) {
  const session = await auth();
  const tenantId = (session?.user as { tenantId?: string } | undefined)?.tenantId;
  if (!tenantId) return null;
  return prisma.produit.findFirst({ where: { id, tenantId }, select: { id: true, tenantId: true, type: true } });
}

const erreurZod = (e: { issues: { message: string; path: PropertyKey[] }[] }) =>
  NextResponse.json({ error: e.issues[0]?.message ?? "Données invalides", champ: e.issues[0]?.path.join(".") }, { status: 400 });

export async function GET(_req: NextRequest, { params }: Ctx) {
  const p = await produitDuMarchand((await params).id);
  if (!p) return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
  if (p.type === "service") return NextResponse.json({ type: p.type, reglages: await prisma.serviceProduit.findUnique({ where: { produitId: p.id } }) });
  if (p.type === "abonnement") {
    const a = await prisma.abonnementProduit.findUnique({ where: { produitId: p.id }, include: { contenus: { orderBy: { ordre: "asc" }, include: { produitInclus: { select: { id: true, nom: true, type: true, images: true } } } } } });
    return NextResponse.json({ type: p.type, reglages: a });
  }
  if (p.type === "parcours") {
    const pp = await prisma.parcoursProduit.findUnique({ where: { produitId: p.id }, include: { etapes: { orderBy: { ordre: "asc" }, include: { formation: { select: { id: true, nom: true, images: true } } } } } });
    return NextResponse.json({ type: p.type, reglages: pp });
  }
  if (p.type === "formation") return NextResponse.json({ type: p.type, reglages: await prisma.formation.findUnique({ where: { produitId: p.id }, include: { sessions: { orderBy: { debut: "asc" } } } }) });
  return NextResponse.json({ error: "Ce type n'a pas de réglages avancés" }, { status: 400 });
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const p = await produitDuMarchand((await params).id);
  if (!p) return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
  const body = await req.json().catch(() => null);

  if (p.type === "service") {
    const r = serviceSchema.safeParse(body);
    if (!r.success) return erreurZod(r.error);
    const d = r.data;
    const reglages = await prisma.serviceProduit.upsert({
      where: { produitId: p.id },
      create: { produitId: p.id, ...d, lienVisio: d.lienVisio ?? null, adresse: d.adresse ?? null, maxParJour: d.maxParJour ?? null, delaiLivraisonJours: d.delaiLivraisonJours ?? null },
      update: { ...d, lienVisio: d.lienVisio ?? null, adresse: d.adresse ?? null, maxParJour: d.maxParJour ?? null, delaiLivraisonJours: d.delaiLivraisonJours ?? null },
    });
    return NextResponse.json({ reglages });
  }

  if (p.type === "abonnement") {
    const r = abonnementSchema.safeParse(body);
    if (!r.success) return erreurZod(r.error);
    const { contenus, ...d } = r.data;
    // Contenus inclus : produits numériques livrables de la même boutique (pas un autre abonnement).
    const valides = await prisma.produit.findMany({ where: { id: { in: contenus }, tenantId: p.tenantId, type: { in: ["fichier", "digital", "formation", "licence", "evenement"] } }, select: { id: true } });
    const ok = new Set(valides.map((v) => v.id));
    const ab = await prisma.abonnementProduit.upsert({ where: { produitId: p.id }, create: { produitId: p.id, ...d, remiseMembresPct: d.remiseMembresPct ?? null }, update: { ...d, remiseMembresPct: d.remiseMembresPct ?? null } });
    await prisma.$transaction([
      prisma.contenuAbonnement.deleteMany({ where: { abonnementId: ab.id } }),
      prisma.contenuAbonnement.createMany({ data: contenus.filter((id) => ok.has(id)).map((produitInclusId, ordre) => ({ abonnementId: ab.id, produitInclusId, ordre })) }),
    ]);
    return NextResponse.json({ reglages: ab, ignores: contenus.filter((id) => !ok.has(id)).length });
  }

  if (p.type === "parcours") {
    const r = parcoursSchema.safeParse(body);
    if (!r.success) return erreurZod(r.error);
    const ids = r.data.etapes.map((e) => e.formationProduitId);
    if (new Set(ids).size !== ids.length) return NextResponse.json({ error: "Une formation ne peut figurer qu'une fois dans le parcours" }, { status: 400 });
    const formations = await prisma.produit.count({ where: { id: { in: ids }, tenantId: p.tenantId, type: "formation" } });
    if (formations !== ids.length) return NextResponse.json({ error: "Chaque étape doit être une formation de votre boutique" }, { status: 400 });
    const pp = await prisma.parcoursProduit.upsert({ where: { produitId: p.id }, create: { produitId: p.id, ordreImpose: r.data.ordreImpose, certificatFinal: r.data.certificatFinal }, update: { ordreImpose: r.data.ordreImpose, certificatFinal: r.data.certificatFinal } });
    await prisma.$transaction([
      prisma.etapeParcours.deleteMany({ where: { parcoursId: pp.id } }),
      prisma.etapeParcours.createMany({ data: r.data.etapes.map((e, ordre) => ({ parcoursId: pp.id, formationProduitId: e.formationProduitId, obligatoire: e.obligatoire, ordre })) }),
    ]);
    return NextResponse.json({ reglages: pp });
  }

  if (p.type === "formation") {
    const r = ficheFormationSchema.safeParse(body);
    if (!r.success) return erreurZod(r.error);
    const reglages = await prisma.formation.update({ where: { produitId: p.id }, data: r.data });
    return NextResponse.json({ reglages });
  }
  return NextResponse.json({ error: "Ce type n'a pas de réglages avancés" }, { status: 400 });
}
