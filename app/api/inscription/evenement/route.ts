// Analytics anonyme du parcours d'inscription (vue, choix, abandon, durée par étape).
// Public, avant la création du compte : limité par IP, répond toujours 204 (rien à apprendre d'une erreur).
// Corps lu en texte : navigator.sendBeacon envoie du JSON sans en-tête application/json.
import { prisma } from "@/lib/prisma";
import { apiLimiter, getClientIp } from "@/lib/rate-limit";
import { lireEvenements } from "@/lib/inscription-evenement";

const vide = () => new Response(null, { status: 204 });

export async function POST(request: Request) {
  try {
    if (!apiLimiter.check(getClientIp(request)).success) return vide();
    const evenements = lireEvenements((await request.text()).slice(0, 20_000));
    if (evenements) await prisma.evenementInscription.createMany({ data: evenements });
  } catch (err) {
    console.warn("[API/INSCRIPTION/EVENEMENT]", err);
  }
  return vide();
}
