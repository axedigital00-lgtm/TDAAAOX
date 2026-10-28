// Partenariats d'affiliation de la boutique connectée (un affilié a toujours un compte Axso).
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STATUTS = ["actif", "suspendu", "en_attente"];

async function tenantDeSession() {
  const session = await auth();
  if (!session) return { erreur: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };
  const tenantId = (session.user as any)?.tenantId as string | undefined;
  if (!tenantId) return { erreur: NextResponse.json({ error: "Pas de boutique" }, { status: 400 }) };
  return { tenantId };
}

// GET — ?statut=&search=
export async function GET(req: NextRequest) {
  const { tenantId, erreur } = await tenantDeSession();
  if (erreur) return erreur;
  const { searchParams } = new URL(req.url);
  const statut = searchParams.get("statut");
  const search = searchParams.get("search")?.trim();
  const affilies = await prisma.affilie.findMany({
    where: {
      tenantId,
      ...(statut && STATUTS.includes(statut) ? { statut } : {}),
      ...(search ? { OR: [
        { nom: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
        { codeParrainage: { contains: search, mode: "insensitive" as const } },
      ] } : {}),
    },
    select: { id: true, nom: true, email: true, codeParrainage: true, statut: true, clics: true, conversions: true, commissionTotal: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ affilies });
}

// PATCH — { id, statut } : approuver, suspendre, réactiver
export async function PATCH(req: NextRequest) {
  const { tenantId, erreur } = await tenantDeSession();
  if (erreur) return erreur;
  const { id, statut } = await req.json().catch(() => ({}));
  if (!id || !STATUTS.includes(statut)) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  const { count } = await prisma.affilie.updateMany({ where: { id, tenantId }, data: { statut } });
  if (!count) return NextResponse.json({ error: "Affilié introuvable" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
