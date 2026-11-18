// Parcours de démarrage (lib/demarrage.ts) : état de complétude (GET) et clics du marchand (POST).
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireNiveau } from "@/lib/permissions-server";
import { etatCompletude, marquerDemarrage, marquerUneFois } from "@/lib/demarrage";

const JOUR = 86400_000;

async function contexte(niveau: "lecture" | "ecriture") {
  const session = await auth();
  const tenantId = (session?.user as any)?.tenantId as string | undefined;
  if (!session || !tenantId) return { refus: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };
  const refus = await requireNiveau(session, "boutique", niveau);
  if (refus) return { refus: NextResponse.json({ error: refus.error }, { status: refus.status }) };
  return { tenantId };
}

export async function GET() {
  const c = await contexte("lecture");
  if (!c.tenantId) return c.refus;
  return NextResponse.json(await etatCompletude(c.tenantId));
}

export async function POST(request: Request) {
  const c = await contexte("ecriture");
  if (!c.tenantId) return c.refus;
  const { action } = await request.json().catch(() => ({}));
  if (action === "lien_affilies_partage") await marquerUneFois(c.tenantId, "lienAffiliesPartageLe");
  else if (action === "reduire_bandeau") await marquerDemarrage(c.tenantId, { bandeauReduitJusqua: new Date(Date.now() + JOUR).toISOString() });
  else return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
