// Fiche publique d'un transporteur : performances et avis, sans document ni coordonnée.
import { NextResponse } from "next/server";
import { ficheTransporteur } from "@/lib/logistique/vues";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const f = await ficheTransporteur((await params).id);
  return f ? NextResponse.json({ transporteur: f }) : NextResponse.json({ error: "Transporteur introuvable" }, { status: 404 });
}
