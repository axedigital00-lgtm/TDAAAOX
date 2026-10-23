import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { trouverUserParEmail } from "@/lib/unicite-email";
import { hash } from "bcryptjs";
import { z } from "zod";
import { authLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { verifierCode } from "@/lib/two-factor";

const schema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  nouveauMotDePasse: z.string().min(6),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Données invalides (mot de passe : 6 caractères min.)" }, { status: 400 });

  // Limite par IP et par email : bloque la devinette du code à 6 chiffres / du mot de passe.
  for (const cle of [getClientIp(req), `email:${parsed.data.email.toLowerCase()}`]) {
    const rl = authLimiter.check(cle);
    if (!rl.success) return rateLimitResponse(rl.reset);
  }
  // Le code a été créé sous l'e-mail tel qu'enregistré (casse comprise).
  const compte = await trouverUserParEmail(parsed.data.email);
  if (!compte?.email) return NextResponse.json({ error: "Code invalide ou expiré" }, { status: 400 });
  const codeOk = await verifierCode(compte.email, parsed.data.code);
  if (!codeOk) return NextResponse.json({ error: "Code invalide ou expiré" }, { status: 400 });

  const hashed = await hash(parsed.data.nouveauMotDePasse, 10);
  try {
    await prisma.user.update({ where: { id: compte.id }, data: { password: hashed } });
  } catch {
    return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
