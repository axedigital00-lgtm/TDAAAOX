// Dépôt d'une pièce légale : chiffrée au repos, jamais visible des marchands.
import { NextRequest, NextResponse } from "next/server";
import { limiter, refus, reponseErreur, sessionLogistique } from "@/lib/logistique/api";
import { soumettreDocument } from "@/lib/logistique/service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await sessionLogistique();
  if (!s) return refus();
  const l = limiter(s.userId); if (l) return l;
  const b = await req.json().catch(() => null);
  if (typeof b?.type !== "string" || typeof b?.nomFichier !== "string" || typeof b?.mime !== "string" || typeof b?.base64 !== "string") return refus(400, "Document incomplet");
  try {
    return NextResponse.json({ document: await soumettreDocument(s.userId, (await params).id, b) }, { status: 201 });
  } catch (e) { return reponseErreur(e); }
}
