// Releasit COD AXSO — formulaires abandonnés (dashboard) : liste, chiffres, réglage des relances WhatsApp.
// POST { id } : relance faite à la main (le marchand a écrit sur WhatsApp depuis la liste).
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { contexteMarchand } from "@/lib/commande-express/acces";
import { lireRelances, messageRelance, schemaRelances } from "@/lib/commande-express/abandons";
import { adresse, cheminProduit } from "@/lib/seo-boutique";

export async function GET() {
  const c = await contexteMarchand("lecture");
  if ("erreur" in c) return c.erreur;
  const depuis = new Date(Date.now() - 30 * 86_400_000);
  const [liste, tenant, reglages] = await Promise.all([
    prisma.abandonReleasit.findMany({ where: { tenantId: c.tenantId, createdAt: { gte: depuis } }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.tenant.findUnique({ where: { id: c.tenantId }, select: { slug: true, nomBoutique: true, devise: true, customDomain: true, domaineActifAt: true, sousDomaineAt: true } }),
    prisma.reglagesCommandeExpress.findUnique({ where: { tenantId: c.tenantId }, select: { relances: true } }),
  ]);
  const cfg = lireRelances(reglages?.relances);
  const produits = await prisma.produit.findMany({ where: { tenantId: c.tenantId, id: { in: liste.map((a) => a.produitId).filter((x): x is string => !!x) } }, select: { id: true, slug: true, nom: true } });
  const parId = new Map(produits.map((p) => [p.id, p]));
  const recuperees = liste.filter((a) => a.recupereeCommandeId);
  const commandes = recuperees.length ? await prisma.commande.findMany({ where: { tenantId: c.tenantId, id: { in: recuperees.map((a) => a.recupereeCommandeId!) } }, select: { id: true, numero: true, montantTotal: true } }) : [];
  const cmd = new Map(commandes.map((x) => [x.id, x]));
  return NextResponse.json({
    relances: cfg, devise: tenant?.devise ?? "XAF",
    stats: {
      total: liste.length, recuperees: recuperees.length,
      apresRelance: recuperees.filter((a) => a.relances > 0).length,
      caRecupere: recuperees.reduce((n, a) => n + (cmd.get(a.recupereeCommandeId!)?.montantTotal ?? 0), 0),
    },
    abandons: liste.map((a) => {
      const p = a.produitId ? parId.get(a.produitId) : undefined;
      const lien = tenant ? adresse(tenant, p ? cheminProduit(p) : "") : "";
      const texte = messageRelance(cfg.message, { nom: a.nom, produit: p?.nom ?? "votre article", boutique: tenant?.nomBoutique ?? "", lien });
      return {
        id: a.id, nom: a.nom, telephone: a.telephone, produit: p?.nom ?? null, quantite: a.quantite, montant: a.montant, relances: a.relances,
        derniereRelance: a.derniereRelance, createdAt: a.createdAt, commande: a.recupereeCommandeId ? cmd.get(a.recupereeCommandeId) ?? null : null,
        lienWhatsApp: `https://wa.me/${a.telephone.replace(/\D/g, "")}?text=${encodeURIComponent(texte)}`, lienAppel: `tel:${a.telephone}`,
      };
    }),
  });
}

export async function PATCH(req: NextRequest) {
  const c = await contexteMarchand("ecriture");
  if ("erreur" in c) return c.erreur;
  const lu = schemaRelances.safeParse(await req.json().catch(() => ({})));
  if (!lu.success) return NextResponse.json({ error: lu.error.issues[0]?.message ?? "Réglages invalides" }, { status: 400 });
  await prisma.reglagesCommandeExpress.upsert({ where: { tenantId: c.tenantId }, create: { tenantId: c.tenantId, relances: lu.data }, update: { relances: lu.data } });
  return NextResponse.json({ relances: lu.data });
}

export async function POST(req: NextRequest) {
  const c = await contexteMarchand("ecriture");
  if ("erreur" in c) return c.erreur;
  const b = await req.json().catch(() => ({}));
  const r = await prisma.abandonReleasit.updateMany({ where: { id: String(b.id ?? ""), tenantId: c.tenantId }, data: { relances: { increment: 1 }, derniereRelance: new Date() } });
  return r.count ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Introuvable" }, { status: 404 });
}
