// Logo envoyé à l'écran « Identité visuelle » de l'inscription, avant la création du compte :
// fichier contrôlé (lib/charte-visuelle.ts::validerLogo), rangé dans le dossier temporaire,
// rattaché à la boutique par /api/ai/onboarding (logoTemporaireValide).
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { DOSSIER_LOGOS_TEMP, validerLogo } from "@/lib/charte-visuelle";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

// Route publique : quelques essais par visiteur suffisent.
const limiteur = rateLimit({ windowMs: 15 * 60_000, max: 10, keyPrefix: "logo-inscription" });

export async function POST(req: Request) {
  const rl = limiteur.check(getClientIp(req));
  if (!rl.success) return rateLimitResponse(rl.reset);
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ message: "Envoi indisponible pour le moment." }, { status: 503 });

  const fichier = (await req.formData().catch(() => null))?.get("file");
  if (!(fichier instanceof File)) return NextResponse.json({ message: "Aucun fichier reçu." }, { status: 400 });

  const octets = new Uint8Array(await fichier.arrayBuffer());
  const v = validerLogo({ type: fichier.type, nom: fichier.name, taille: fichier.size, octets });
  if (!v.ok) return NextResponse.json({ message: v.erreur }, { status: 400 });

  try {
    const blob = await put(`${DOSSIER_LOGOS_TEMP}${randomUUID()}.${v.ext}`, Buffer.from(octets), {
      access: "public", contentType: v.type, addRandomSuffix: false,
    });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("[API/INSCRIPTION/LOGO]", err instanceof Error ? err.message : err);
    return NextResponse.json({ message: "L'envoi du logo a échoué, réessaie." }, { status: 500 });
  }
}
