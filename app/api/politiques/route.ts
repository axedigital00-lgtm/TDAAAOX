// Politiques de la boutique (Tenant.politiques) : lire, enregistrer, valider, faire (ré)écrire par Axia,
// revenir au brouillon d'Axia. Module « boutique » (lecture pour GET, écriture pour le reste).
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireNiveau } from "@/lib/permissions-server";
import { aiLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { estTypePolitique, lirePolitiques, politiqueValidable, TYPES_POLITIQUES, type Politique, type TypePolitique } from "@/lib/politiques";
import { redigerPolitiques } from "@/lib/politiques-axia";

export const maxDuration = 60;

async function acces(minimum: "lecture" | "ecriture") {
  const session = await auth();
  const tenantId = (session?.user as any)?.tenantId as string | undefined;
  if (!session || !tenantId) return { refus: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };
  const refus = await requireNiveau(session, "boutique", minimum);
  if (refus) return { refus: NextResponse.json({ error: refus.error }, { status: refus.status }) };
  return { tenantId };
}

async function charger(tenantId: string) {
  const t = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { politiques: true, slug: true } });
  return t && { slug: t.slug, brut: (t.politiques && typeof t.politiques === "object" ? t.politiques : {}) as Record<string, unknown> };
}

const reponse = async (tenantId: string) => {
  const t = await charger(tenantId);
  return NextResponse.json({ politiques: lirePolitiques(t?.brut), slug: t?.slug ?? null });
};

export async function GET() {
  const a = await acces("lecture");
  if (a.refus) return a.refus;
  return reponse(a.tenantId);
}

/** Corps : { action: "enregistrer" | "valider" | "revenir" | "rediger", type?, contenu?, consigne? } */
export async function POST(request: Request) {
  const a = await acces("ecriture");
  if (a.refus) return a.refus;
  const tenantId = a.tenantId;

  const body = await request.json().catch(() => ({}));
  const action = body?.action;
  const type = body?.type as TypePolitique;
  const contenu = typeof body?.contenu === "string" ? body.contenu.replace(/\r/g, "").slice(0, 20000) : undefined;

  if (action === "rediger") {
    const lim = aiLimiter.check(`politiques:${tenantId}`);
    if (!lim.success) return rateLimitResponse(lim.reset);
    const types = estTypePolitique(type) ? [type] : Array.isArray(body?.types) ? body.types.filter(estTypePolitique) : undefined;
    const consigne = typeof body?.consigne === "string" ? body.consigne : undefined;
    // Réécriture d'une politique avec consigne : Axia part du texte affiché (même non enregistré).
    if (types?.length === 1 && consigne?.trim() && contenu?.trim()) await ecrire(tenantId, types[0], (p) => ({ ...p, contenu }));
    await redigerPolitiques(tenantId, { types, consigne });
    return reponse(tenantId);
  }

  if (!estTypePolitique(type)) return NextResponse.json({ error: "Politique inconnue" }, { status: 400 });

  if (action === "enregistrer") {
    if (contenu === undefined) return NextResponse.json({ error: "Texte manquant" }, { status: 400 });
    await ecrire(tenantId, type, (p) => ({
      ...p, contenu,
      // Toute modification d'une politique validée la retire de la boutique jusqu'à la prochaine validation.
      valideeLe: p?.valideeLe && p.contenu === contenu ? p.valideeLe : null,
    }));
    return reponse(tenantId);
  }

  if (action === "valider") {
    const t = await charger(tenantId);
    const texte = contenu ?? lirePolitiques(t?.brut)[type]?.contenu ?? "";
    if (!politiqueValidable(texte)) {
      return NextResponse.json({ error: texte.trim() ? "Complète d'abord tous les passages « À compléter » surlignés en jaune." : "Cette politique est vide." }, { status: 400 });
    }
    await ecrire(tenantId, type, (p) => ({ ...p, contenu: texte, valideeLe: new Date().toISOString() }));
    return reponse(tenantId);
  }

  if (action === "revenir") {
    const t = await charger(tenantId);
    const brouillon = lirePolitiques(t?.brut)[type]?.brouillonAxia;
    if (!brouillon) return NextResponse.json({ error: "Aucun brouillon d'Axia pour cette politique." }, { status: 404 });
    await ecrire(tenantId, type, (p) => ({ ...p, contenu: brouillon, valideeLe: null }));
    return reponse(tenantId);
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}

async function ecrire(tenantId: string, type: TypePolitique, maj: (p: Politique | undefined) => Politique) {
  const t = await charger(tenantId);
  if (!t) return;
  const actuelle = lirePolitiques(t.brut)[type];
  t.brut[type] = { ...maj(actuelle), majLe: new Date().toISOString() };
  // Ne garde que les clés connues (pas de champ arbitraire stocké).
  const propre = Object.fromEntries(TYPES_POLITIQUES.filter((k) => t.brut[k]).map((k) => [k, t.brut[k]]));
  await prisma.tenant.update({ where: { id: tenantId }, data: { politiques: propre as any } });
}
