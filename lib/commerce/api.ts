// Petits utilitaires communs aux routes des modules commerce.
import { NextResponse } from "next/server";
import type { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { ErreurDevis } from "./devis";

export async function sessionBoutique() {
  const u = (await auth())?.user as { id?: string; tenantId?: string } | undefined;
  return u?.tenantId && u.id ? { tenantId: u.tenantId, userId: u.id } : null;
}

export const nonAutorise = () => NextResponse.json({ error: "Non autorisé" }, { status: 401 });
export const introuvable = () => NextResponse.json({ error: "Introuvable" }, { status: 404 });
export const invalide = (e: ZodError) => NextResponse.json({ error: e.issues[0]?.message ?? "Données invalides" }, { status: 400 });

export function reponseErreur(e: unknown) {
  if (e instanceof ErreurDevis) return NextResponse.json({ error: e.message }, { status: e.status });
  console.error("[commerce]", e);
  return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
}
