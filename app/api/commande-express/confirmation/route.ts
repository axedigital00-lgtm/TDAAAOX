// Centre de confirmation : file des commandes express à appeler, et chiffres des 30 derniers jours.
// ?vue=a_traiter (défaut) | traitees | toutes
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { contexteMarchand } from "@/lib/commande-express/acces";
import { TENTATIVES_MAX, aTraiter, messageConfirmation, trierFile } from "@/lib/commande-express/confirmation";
import { normaliserTelephone } from "@/lib/devise-convert";
import { formatMontant } from "@/lib/utils";

const JOUR = 86_400_000;

export async function GET(req: NextRequest) {
  const c = await contexteMarchand("lecture");
  if ("erreur" in c) return c.erreur;
  const vue = req.nextUrl.searchParams.get("vue") ?? "a_traiter";
  const depuis = new Date(Date.now() - 60 * JOUR);
  const filtre = vue === "a_traiter"
    ? { OR: [{ statutConfirmation: { in: ["a_confirmer", "rappeler"] } }, { statutConfirmation: "injoignable", tentatives: { lt: TENTATIVES_MAX } }] }
    : vue === "traitees" ? { statutConfirmation: { in: ["confirmee", "annulee", "faux_numero"] } } : {};
  const [fiches, tenant] = await Promise.all([
    prisma.commandeExpress.findMany({ where: { tenantId: c.tenantId, commandeId: { not: null }, createdAt: { gte: depuis }, ...filtre }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.tenant.findUnique({ where: { id: c.tenantId }, select: { nomBoutique: true, pays: true } }),
  ]);
  const [commandes, appels] = await Promise.all([
    prisma.commande.findMany({
      where: { tenantId: c.tenantId, id: { in: fiches.map((f) => f.commandeId!) } },
      select: { id: true, numero: true, clientNom: true, clientTelephone: true, montantTotal: true, devise: true, ville: true, pays: true, adresseLivraison: true, statut: true, livraisonStatut: true, lignes: { select: { nom: true, quantite: true } } },
    }),
    prisma.appelConfirmation.findMany({
      where: { tenantId: c.tenantId, commandeExpressId: { in: fiches.map((f) => f.id) } }, orderBy: { createdAt: "desc" },
      select: { commandeExpressId: true, resultat: true, note: true, agentNom: true, rappelA: true, createdAt: true },
    }),
  ]);
  const parCommande = new Map(commandes.map((x) => [x.id, x]));
  const elements = fiches.flatMap((f) => {
    const cmd = parCommande.get(f.commandeId!);
    if (!cmd) return [];
    const produits = cmd.lignes.map((l) => `${l.quantite} × ${l.nom}`).join(", ");
    const tel = normaliserTelephone(cmd.clientTelephone, cmd.pays || tenant?.pays);
    const message = messageConfirmation({ nom: cmd.clientNom, numero: cmd.numero, boutique: tenant?.nomBoutique ?? "", produits, total: formatMontant(cmd.montantTotal, cmd.devise), ville: cmd.ville });
    return [{
      id: f.id, statutConfirmation: f.statutConfirmation, tentatives: f.tentatives, rappelA: f.rappelA, note: f.noteConfirmation,
      quartier: f.quartier, repere: f.repere, latitude: f.latitude, longitude: f.longitude, scoreRisque: f.scoreRisque, facteursRisque: f.facteursRisque, source: f.source, createdAt: f.createdAt,
      montant: cmd.montantTotal, aTraiter: aTraiter(f),
      commande: { id: cmd.id, numero: cmd.numero, clientNom: cmd.clientNom, clientTelephone: cmd.clientTelephone, montantTotal: cmd.montantTotal, devise: cmd.devise, ville: cmd.ville, adresse: cmd.adresseLivraison, statut: cmd.statut, livraisonStatut: cmd.livraisonStatut, produits },
      lienAppel: tel ? `tel:${tel}` : null,
      lienWhatsApp: tel ? `https://wa.me/${tel.slice(1)}?text=${encodeURIComponent(message)}` : null,
      appels: appels.filter((a) => a.commandeExpressId === f.id).slice(0, 5),
    }];
  });
  return NextResponse.json({ vue, elements: vue === "a_traiter" ? trierFile(elements) : elements, stats: await chiffres(c.tenantId) });
}

/** Taux de confirmation, taux de livraison et activité par agent sur 30 jours. */
async function chiffres(tenantId: string) {
  const depuis = new Date(Date.now() - 30 * JOUR);
  const debutJour = new Date(); debutJour.setHours(0, 0, 0, 0);
  const [parStatut, appels, confirmees] = await Promise.all([
    prisma.commandeExpress.groupBy({ by: ["statutConfirmation"], where: { tenantId, commandeId: { not: null }, createdAt: { gte: depuis } }, _count: { _all: true } }),
    prisma.appelConfirmation.findMany({ where: { tenantId, createdAt: { gte: depuis } }, select: { agentId: true, agentNom: true, resultat: true, createdAt: true } }),
    prisma.commandeExpress.findMany({ where: { tenantId, statutConfirmation: "confirmee", createdAt: { gte: depuis }, commandeId: { not: null } }, select: { commandeId: true } }),
  ]);
  const n: Record<string, number> = Object.fromEntries(parStatut.map((s) => [s.statutConfirmation, s._count._all]));
  const total = Object.values(n).reduce((a, b) => a + b, 0);
  const tranchees = (n.confirmee ?? 0) + (n.annulee ?? 0) + (n.faux_numero ?? 0);
  const livrees = confirmees.length
    ? await prisma.commande.count({ where: { tenantId, id: { in: confirmees.map((x) => x.commandeId!) }, statut: "livree" } })
    : 0;
  const agents = new Map<string, { nom: string; appels: number; confirmees: number; aujourdhui: number }>();
  for (const a of appels) {
    const k = a.agentId ?? "-";
    const s = agents.get(k) ?? { nom: a.agentNom ?? "", appels: 0, confirmees: 0, aujourdhui: 0 };
    s.appels++;
    if (a.resultat === "confirmee") s.confirmees++;
    if (a.createdAt >= debutJour) s.aujourdhui++;
    agents.set(k, s);
  }
  return {
    total, parStatut: n,
    tauxConfirmation: tranchees ? Math.round(((n.confirmee ?? 0) / tranchees) * 100) : null,
    tauxLivraison: confirmees.length ? Math.round((livrees / confirmees.length) * 100) : null,
    appelsAujourdhui: appels.filter((a) => a.createdAt >= debutJour).length,
    agents: [...agents.values()].sort((a, b) => b.appels - a.appels),
  };
}
