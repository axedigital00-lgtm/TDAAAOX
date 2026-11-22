// Utilitaires des routes logistiques : session, acteur d'une course, erreurs homogènes.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdminSessionPour } from "@/lib/admin-auth";
import { requireNiveau } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { ErreurLogistique, peutGerer, type Acteur } from "./service";

export async function sessionLogistique() {
  const session = await auth();
  const u = session?.user as { id?: string; tenantId?: string | null } | undefined;
  return u?.id ? { session, userId: u.id, tenantId: u.tenantId ?? null } : null;
}

export const refus = (status = 401, error = "Non autorisé") => NextResponse.json({ error }, { status });

export function reponseErreur(e: unknown) {
  if (e instanceof ErreurLogistique) return NextResponse.json({ error: e.message }, { status: e.status });
  console.error("[logistique]", e);
  return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
}

const limiteEcriture = rateLimit({ windowMs: 60_000, max: 60, keyPrefix: "logistique" });
export function limiter(userId: string) {
  const r = limiteEcriture.check(userId);
  return r.success ? null : rateLimitResponse(r.reset);
}

/** Qui agit sur cette course : son fournisseur, son marchand (droits d'équipe) ou un admin Opérations. Sinon null. */
export async function acteurCourse(courseId: string, s: NonNullable<Awaited<ReturnType<typeof sessionLogistique>>>, niveau: "lecture" | "ecriture"): Promise<Acteur | null> {
  const c = await prisma.courseLivraison.findUnique({ where: { id: courseId }, select: { tenantId: true, fournisseurId: true } });
  if (!c) return null;
  if (s.tenantId === c.tenantId && !(await requireNiveau(s.session, "commandes", niveau))) return { type: "marchand", id: c.tenantId };
  if (c.fournisseurId && (await peutGerer(s.userId, c.fournisseurId))) return { type: "fournisseur", id: s.userId };
  const a = await getAdminSessionPour("operations");
  if (a && (niveau === "lecture" || a.role === "admin" || a.role === "admin_operations")) return { type: "admin", id: a.userId };
  return null;
}

export async function exigerMarchand(niveau: "lecture" | "ecriture") {
  const s = await sessionLogistique();
  if (!s?.tenantId) return { erreur: refus() } as const;
  const r = await requireNiveau(s.session, "commandes", niveau);
  if (r) return { erreur: refus(r.status, r.error) } as const;
  return { s, tenantId: s.tenantId } as const;
}
