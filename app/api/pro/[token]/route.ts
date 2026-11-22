// Portail entreprise (lien privé) : la commande rapide crée une demande que le marchand valide.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { notifierMarchand } from "@/lib/notifications-marchand";
import { introuvable, invalide, reponseErreur } from "@/lib/commerce/api";
import { catalogueVendable, ErreurDevis, jeton, lignesPro, numeroDevis } from "@/lib/commerce/devis";
import { erreurQuantite } from "@/lib/commerce/gros";
import { commandeProSchema, totauxDevis } from "@/lib/commerce/regles";

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const rl = apiLimiter.check(`pro:${getClientIp(req)}`);
  if (!rl.success) return rateLimitResponse(rl.reset);
  const e = await prisma.compteEntreprise.findUnique({ where: { token: (await params).token } });
  if (!e || !e.actif) return introuvable();
  const r = commandeProSchema.safeParse(await req.json().catch(() => null));
  if (!r.success) return invalide(r.error);
  try {
    const catalogue = await catalogueVendable(e.tenantId);
    for (const l of r.data.lignes) {
      const c = catalogue.find((x) => x.produitId === l.produitId && (x.variante ?? null) === (l.variante ?? null));
      const refus = c && erreurQuantite(c.gros, l.quantite, c.nom);
      if (refus) throw new ErreurDevis(refus);
    }
    const lignes = lignesPro(catalogue, r.data.lignes, e.remisePct);
    const t = totauxDevis(lignes);
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: e.tenantId }, select: { devise: true } });
    const devis = await prisma.devis.create({
      data: {
        tenantId: e.tenantId, numero: numeroDevis(), token: jeton(), statut: "soumis", entrepriseId: e.id, clientNom: e.nom, clientEmail: e.email, clientTelephone: e.telephone,
        adresse: e.adresse, ville: e.ville, pays: e.pays, lignes, total: t.total, devise: tenant.devise, conditions: e.conditions, bonCommande: r.data.bonCommande || null, note: r.data.note || null,
      },
    });
    await notifierMarchand({ tenantId: e.tenantId, type: "devis", titre: `Commande pro à valider : ${e.nom}`, message: `${devis.numero} · ${t.total.toLocaleString("fr-FR")} ${tenant.devise}`, lien: `/dashboard/commandes/devis/${devis.id}` }).catch(() => {});
    return NextResponse.json({ numero: devis.numero, total: t.total }, { status: 201 });
  } catch (err) { return reponseErreur(err); }
}
