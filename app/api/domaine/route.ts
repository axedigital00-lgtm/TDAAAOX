// Domaine personnalisé de la boutique active — voir lib/domaines.ts.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireNiveau } from "@/lib/permissions-server";
import { normaliserDomaine, domainesConfigures, ajouterDomaineVercel, retirerDomaineVercel, etatDomaine, oublierDomaine } from "@/lib/domaines";
import { surWorkers } from "@/lib/domaines-cloudflare";

async function contexte(niveau: "lecture" | "ecriture") {
  const session = await auth();
  const tenantId = (session?.user as any)?.tenantId as string | undefined;
  if (!session || !tenantId) return { erreur: NextResponse.json({ error: "Non authentifié" }, { status: 401 }) };
  const refus = await requireNiveau(session, "parametres", niveau);
  if (refus) return { erreur: NextResponse.json({ error: refus.error }, { status: refus.status }) };
  return { tenantId };
}

const serveurNonConfigure = () => NextResponse.json({ error: "Les domaines personnalisés ne sont pas encore activés sur ce serveur." }, { status: 503 });

// GET ?verifier=1 → état chez Vercel (+ relance de la vérification)
export async function GET(req: NextRequest) {
  const c = await contexte("lecture"); if (c.erreur) return c.erreur;
  const t = await prisma.tenant.findUnique({ where: { id: c.tenantId }, select: { customDomain: true, slug: true, statut: true, domaineActifAt: true, sousDomaineAt: true } });
  const base = { slug: t?.slug, sousDomaineAt: t?.sousDomaineAt ?? null, publiee: t?.statut === "active", configure: domainesConfigures() };
  if (!t?.customDomain) return NextResponse.json({ ...base, domaine: null });
  if (!domainesConfigures()) return NextResponse.json({ ...base, domaine: t.customDomain, etat: null });
  const etat = await etatDomaine(t.customDomain, c.tenantId!, req.nextUrl.searchParams.get("verifier") === "1");
  // Actif chez Vercel (propriété + DNS) ⇒ adresse principale de la boutique ; plus actif ⇒ retour à l'adresse AXSO.
  if (etat.actif !== !!t.domaineActifAt) {
    await prisma.tenant.updateMany({ where: { id: c.tenantId, customDomain: t.customDomain }, data: { domaineActifAt: etat.actif ? new Date() : null } });
    oublierDomaine(t.slug, t.customDomain);
  }
  return NextResponse.json({ ...base, domaine: t.customDomain, etat });
}

// POST { domaine } → validé, unique, ajouté au projet Vercel, enregistré
export async function POST(req: NextRequest) {
  const c = await contexte("ecriture"); if (c.erreur) return c.erreur;
  if (!domainesConfigures()) return serveurNonConfigure();
  const domaine = normaliserDomaine(String((await req.json().catch(() => ({}))).domaine ?? ""));
  if (!domaine) return NextResponse.json({ error: "Domaine invalide. Exemple : boutique.mondomaine.com" }, { status: 400 });
  const pris = await prisma.tenant.findFirst({ where: { customDomain: domaine, NOT: { id: c.tenantId } }, select: { id: true } });
  if (pris) return NextResponse.json({ error: "Ce domaine est déjà utilisé par une autre boutique." }, { status: 409 });
  const ajout = surWorkers() ? { ok: true } : await ajouterDomaineVercel(domaine);
  if (!ajout.ok) return NextResponse.json({ error: ajout.erreur }, { status: 400 });
  const ancien = await prisma.tenant.findUnique({ where: { id: c.tenantId }, select: { customDomain: true, slug: true } });
  // Nouveau domaine : il ne devient principal qu'une fois vérifié actif.
  await prisma.tenant.update({ where: { id: c.tenantId }, data: { customDomain: domaine, domaineActifAt: null } });
  if (ancien) oublierDomaine(ancien.slug, ancien.customDomain);
  if (ancien?.customDomain && ancien.customDomain !== domaine) await retirerDomaineVercel(ancien.customDomain);
  return NextResponse.json({ domaine, etat: await etatDomaine(domaine, c.tenantId!) });
}

// DELETE → retire le domaine (boutique à nouveau servie uniquement sur l'adresse AXSO)
export async function DELETE() {
  const c = await contexte("ecriture"); if (c.erreur) return c.erreur;
  const t = await prisma.tenant.findUnique({ where: { id: c.tenantId }, select: { customDomain: true, slug: true } });
  if (t?.customDomain && domainesConfigures()) await retirerDomaineVercel(t.customDomain);
  await prisma.tenant.update({ where: { id: c.tenantId }, data: { customDomain: null, domaineActifAt: null } });
  if (t) oublierDomaine(t.slug, t.customDomain);
  return NextResponse.json({ ok: true });
}
