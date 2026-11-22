import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { STATUTS_COURSE_ACTIVE } from "@/lib/commandes";
import { STATUT_EN_ROUTE, vueLivreurPlateforme } from "@/lib/logistique/position";

// Livreurs indépendants de la plateforme, assignables par n'importe quel marchand.
// Téléphone et position ne sont révélés qu'au marchand qui a une course en cours avec ce livreur.
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const tenantId = (session.user as any)?.tenantId as string | undefined;
  if (!tenantId) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const livreurs = await prisma.livreur.findMany({
    where: { actif: true, tenantId: null },
    select: {
      id: true,
      nom: true,
      telephone: true,
      vehicule: true,
      zone: true,
      disponible: true,
      latitude: true,
      longitude: true,
      positionAt: true,
      tenantId: true,
      createdAt: true,
      _count: { select: { commandes: { where: { statut: { in: STATUTS_COURSE_ACTIVE } } } } },
      tenant: { select: { nomBoutique: true, pays: true } },
    },
    orderBy: [{ disponible: "desc" }, { createdAt: "asc" }],
  });

  const courses = await prisma.commande.findMany({
    where: { tenantId, livreurId: { in: livreurs.map((l) => l.id) }, statut: { in: STATUTS_COURSE_ACTIVE } },
    select: { livreurId: true, statut: true },
  });
  const assignes = new Set(courses.map((c) => c.livreurId!));
  const enRoute = new Set(courses.filter((c) => c.statut === STATUT_EN_ROUTE).map((c) => c.livreurId!));
  return NextResponse.json({ livreurs: livreurs.map((l) => vueLivreurPlateforme(l, assignes, enRoute)) });
}
