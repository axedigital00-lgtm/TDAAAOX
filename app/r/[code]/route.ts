// Lien de parrainage : mémorise le parrain (cookie) puis envoie vers l'inscription.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiLimiter, getClientIp } from "@/lib/rate-limit";
import { codeValide, COOKIE_PARRAIN, DUREE_COOKIE_JOURS } from "@/lib/parrainage-regles";

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.toUpperCase();
  const reponse = NextResponse.redirect(new URL("/inscription", process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin), 302);
  if (!codeValide(code)) return reponse;
  const existe = apiLimiter.check(`parrain:${getClientIp(req)}`).success
    ? await prisma.codeParrain.updateMany({ where: { code }, data: { clics: { increment: 1 } } }).then((r) => r.count > 0).catch(() => false)
    : !!(await prisma.codeParrain.findUnique({ where: { code }, select: { code: true } }).catch(() => null));
  if (existe) reponse.cookies.set(COOKIE_PARRAIN, code, { httpOnly: true, sameSite: "lax", secure: req.nextUrl.protocol === "https:", path: "/", maxAge: DUREE_COOKIE_JOURS * 86400 });
  return reponse;
}
