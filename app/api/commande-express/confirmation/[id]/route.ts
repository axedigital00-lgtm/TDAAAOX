// Enregistre le résultat d'un appel de confirmation et répercute la décision sur la commande
// (confirmée ou annulée) par le cycle de livraison habituel : stock, notifications, WhatsApp.
import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { contexteMarchand } from "@/lib/commande-express/acces";
import { apresAppel, schemaAppel, statutCommandePour } from "@/lib/commande-express/confirmation";
import { changerStatutCommande } from "@/lib/cycle-livraison";
import { envoyerAchatCommande } from "@/lib/commande-express/pixels-serveur";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const c = await contexteMarchand("ecriture");
  if ("erreur" in c) return c.erreur;
  const { id } = await params;
  const lu = schemaAppel.safeParse(await req.json().catch(() => ({})));
  if (!lu.success) return NextResponse.json({ error: lu.error.issues[0]?.message ?? "Données invalides" }, { status: 400 });
  const appel = lu.data;

  const fiche = await prisma.commandeExpress.findFirst({ where: { id, tenantId: c.tenantId } });
  if (!fiche?.commandeId) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  const commande = await prisma.commande.findFirst({ where: { id: fiche.commandeId, tenantId: c.tenantId }, select: { id: true, statut: true } });
  if (!commande) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });

  const etat = apresAppel(fiche, appel);
  await prisma.$transaction([
    prisma.appelConfirmation.create({ data: { tenantId: c.tenantId, commandeExpressId: fiche.id, agentId: c.userId, agentNom: c.nom, resultat: appel.resultat, note: appel.note, rappelA: appel.rappelA } }),
    prisma.commandeExpress.update({ where: { id: fiche.id }, data: { ...etat, agentId: c.userId ?? fiche.agentId, ...(appel.note && { noteConfirmation: appel.note }) } }),
  ]);

  // La décision de l'appel fait foi ; si la commande ne peut plus changer (déjà expédiée…), on le signale.
  const statut = statutCommandePour(appel.resultat, commande.statut);
  let avertissement: string | null = null;
  if (statut) {
    const r = await changerStatutCommande({ commandeId: commande.id, statut, echecRaison: appel.note ?? null, acteur: { type: "marchand", tenantId: c.tenantId, source: "interface" } });
    if (!r.ok) avertissement = r.error;
  }
  // Mode « Purchase à la confirmation » : la publicité n'apprend que des commandes réellement confirmées.
  if (appel.resultat === "confirmee") after(() => envoyerAchatCommande(c.tenantId, fiche.id, "confirmation").catch(() => null));
  return NextResponse.json({ ok: true, statutConfirmation: etat.statutConfirmation, tentatives: etat.tentatives, statutCommande: statut ?? commande.statut, avertissement });
}
