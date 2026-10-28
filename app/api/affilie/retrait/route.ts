// Retrait des commissions disponibles du compte connecté vers son Mobile Money (validé à la main par Axso).
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { demanderRetraitAffilie } from "@/lib/affiliation";

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { devise, telephone } = await req.json().catch(() => ({}));
  if (typeof devise !== "string" || typeof telephone !== "string" || !telephone.trim()) {
    return NextResponse.json({ error: "Numéro Mobile Money requis" }, { status: 400 });
  }
  try {
    const r = await demanderRetraitAffilie({ userId, devise, telephone });
    return NextResponse.json({ id: r.id, montant: r.montant, devise: r.devise }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 400 });
  }
}
