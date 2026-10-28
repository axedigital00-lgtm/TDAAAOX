import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { annoncerInscription } from "@/lib/push";
import { lierAffiliationsAuCompte } from "@/lib/affiliation";
import { emailDejaPris, normaliserEmail } from "@/lib/unicite-email";
import { authLimiter, getClientIp } from "@/lib/rate-limit";

const schema = z.object({
  nom: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: z.string().min(6),
});

// Compte affilié : un User sans boutique. Les anciens partenariats au même e-mail y sont rattachés.
export async function POST(req: NextRequest) {
  if (!authLimiter.check(getClientIp(req)).success) {
    return NextResponse.json({ error: "Trop de tentatives — réessayez dans quelques minutes." }, { status: 429 });
  }
  try {
    const data = schema.parse(await req.json());
    const email = normaliserEmail(data.email);

    const emailPris = await emailDejaPris(email);
    if (emailPris) return NextResponse.json({ error: emailPris, emailPris: true }, { status: 400 });

    const user = await prisma.user.create({
      data: { name: data.nom, email, password: await hash(data.password, 10), role: "affilie" },
    });
    await lierAffiliationsAuCompte(user.id, email);
    await annoncerInscription({ name: data.nom, email, role: "affilie" });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    console.error("[API/AFFILIE/INSCRIPTION]", err);
    return NextResponse.json({ error: "Erreur lors de la création du compte" }, { status: 500 });
  }
}
