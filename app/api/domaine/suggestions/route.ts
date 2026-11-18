// Proposition d'Axia : noms de domaine dérivés du nom de la boutique, disponibilité et prix vérifiés
// chez Vercel. Aucun nom n'est renvoyé sans cette vérification ; pas d'achat dans Axso.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireNiveau } from "@/lib/permissions-server";
import { disponibilitesDomaines } from "@/lib/domaines";
import { nomsCandidats, lienAchatDomaine, FOURNISSEUR_DOMAINES } from "@/lib/domaines-noms";
import { codePays } from "@/lib/devise-convert";

export async function GET() {
  const session = await auth();
  const tenantId = (session?.user as any)?.tenantId as string | undefined;
  if (!session || !tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const refus = await requireNiveau(session, "parametres", "lecture");
  if (refus) return NextResponse.json({ error: refus.error }, { status: refus.status });

  const t = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { nomBoutique: true, pays: true } });
  const candidats = nomsCandidats(t?.nomBoutique ?? "", t?.pays);
  if (!candidats.length) return NextResponse.json({ fournisseur: FOURNISSEUR_DOMAINES, suggestions: [], extensionPays: null });

  let offres;
  try {
    offres = await disponibilitesDomaines(candidats);
  } catch (e) {
    console.error("[domaine/suggestions]", e);
    return NextResponse.json({ error: "Le service de vérification des domaines ne répond pas. Réessaie dans quelques minutes." }, { status: 503 });
  }
  const suggestions = offres.filter((o) => o.disponible).slice(0, 5).map((o) => ({ ...o, lienAchat: lienAchatDomaine(o.domaine) }));
  // Extension du pays (.cm, .sn…) : souvent pas vendue chez Vercel — on le dit plutôt que de la taire.
  const cc = codePays(t?.pays)?.toLowerCase();
  const pays = cc ? offres.find((o) => o.domaine.endsWith(`.${cc}`) && !o.domaine.includes("-")) : undefined;
  return NextResponse.json({
    fournisseur: FOURNISSEUR_DOMAINES,
    suggestions,
    extensionPays: pays && !pays.disponible ? `.${cc}` : null,
  });
}
