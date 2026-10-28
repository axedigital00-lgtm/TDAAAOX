// État public de la promo de lancement (lib/promo.ts) : date de fin, ou null si terminée.
import { NextResponse } from "next/server";
import { finPromo } from "@/lib/promo";

export async function GET() {
  return NextResponse.json({ finLe: (await finPromo())?.toISOString() ?? null, maintenant: Date.now() });
}
