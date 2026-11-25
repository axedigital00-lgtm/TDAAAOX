// Paiement d'un abonnement par Mobile Money direct (marque AXSO seulement). Seul le statut relu chez
// le prestataire active un palier.
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { expirationApresPaiement } from "@/lib/abonnement";
import { PALIER_PRIX } from "@/lib/abonnement-paiement";
import { NOMS_PALIERS, type Palier } from "@/lib/plans";
import { crediterParrainSurAbonnement } from "@/lib/parrainage";
import { finPromo } from "@/lib/promo";
import { boutiquesDuCompte } from "@/lib/tenant";
import { clientPawapay, type ClientPawapay, type EtatDepot } from "./pawapay";
import { appliquerDepotCommande, convertir } from "./commande-numerique";
import { preparerDepot, lancerDepot, ErreurMobileMoney } from "./depot-direct";
import { tauxDuJour } from "@/lib/taux-change";

const JOURS = 30, ABANDON_MS = 15 * 60_000;
export class ErreurPaiement extends Error { constructor(message: string, public status = 400) { super(message); } }

export async function demarrerPaiementAbonnement(p: { userId: string; tenantId: string; plan: string; origine: string; telephone: string }, client: ClientPawapay | null = clientPawapay()) {
  try { return await demarrer(p, client); }
  catch (e) { throw e instanceof ErreurMobileMoney ? new ErreurPaiement(e.message, e.status) : e; }
}

async function demarrer(p: { userId: string; tenantId: string; plan: string; origine: string; telephone: string }, client: ClientPawapay | null) {
  const prixXaf = PALIER_PRIX[p.plan];
  if (!prixXaf) throw new ErreurPaiement("Forfait invalide");
  if (!client) throw new ErreurPaiement("Paiement en ligne bientôt disponible", 503);
  if (await finPromo()) throw new ErreurPaiement("Les forfaits sont offerts pendant la promotion", 409);
  const { proprietaire } = await boutiquesDuCompte(p.userId);
  if (!proprietaire.includes(p.tenantId)) throw new ErreurPaiement("Seul le propriétaire peut payer l'abonnement", 403);
  // Pays et monnaie déduits du numéro ; prix du forfait (FCFA) converti si besoin.
  const depot = await preparerDepot(client, p.telephone);
  const montant = convertir(prixXaf, "XAF", depot.devise, await tauxDuJour());
  const id = randomUUID();
  await prisma.paiementPawapay.create({ data: { id, tenantId: p.tenantId, userId: p.userId, plan: p.plan, jours: JOURS, montant, devise: depot.devise, pays: depot.pays } });
  try {
    await lancerDepot(client, { depositId: id, telephone: depot.telephone, operateur: depot.operateur, montant, devise: depot.devise, message: `AXSO ${NOMS_PALIERS[p.plan as Palier]}`, retour: `${p.origine}/dashboard/abonnement/retour?id=${id}` });
    return { id };
  } catch (e) {
    await prisma.paiementPawapay.update({ where: { id }, data: { statut: "echoue", motifEchec: e instanceof Error ? e.message.slice(0, 200) : "Paiement refusé" } });
    if (e instanceof ErreurMobileMoney) throw e;
    console.error("[mobile-money] abonnement", id, e instanceof Error ? e.message : e);
    throw new ErreurPaiement("Paiement indisponible pour le moment, réessaie dans quelques instants", 502);
  }
}

/** Idempotent : un rappel rejoué ou deux passages simultanés ne prolongent l'abonnement qu'une fois.
 *  Point d'entrée de tout dépôt pawaPay : une commande numérique part vers appliquerDepotCommande. */
export async function appliquerDepot(id: string, d: EtatDepot, maintenant = new Date()) {
  const p = await prisma.paiementPawapay.findUnique({ where: { id } });
  if (!p || p.statut === "paye" || p.statut === "a_verifier") return p;
  if (p.type === "commande") {
    await appliquerDepotCommande(p, d, maintenant);
    return prisma.paiementPawapay.findUnique({ where: { id } });
  }
  const { userId, plan, jours } = p;
  if (p.type !== "abonnement" || !userId || !plan || !jours) return p;
  if (d.etat === "echoue" || (d.etat === "introuvable" && maintenant.getTime() - p.createdAt.getTime() >= ABANDON_MS)) {
    await prisma.paiementPawapay.updateMany({ where: { id, statut: "cree" }, data: { statut: "echoue", motifEchec: d.motif ?? "Paiement abandonné" } });
  } else if (d.etat === "paye") {
    if (d.montant !== p.montant || d.devise !== p.devise) {
      await prisma.paiementPawapay.updateMany({ where: { id, statut: { in: ["cree", "echoue"] } }, data: { statut: "a_verifier", motifEchec: `Reçu ${d.montant} ${d.devise}`, referenceOperateur: d.reference } });
      console.error("[pawapay] montant différent", id);
    } else {
      const { proprietaire } = await boutiquesDuCompte(userId);
      const ids = [...new Set([...proprietaire, p.tenantId])];
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`abonnement:${userId}`}))`;
        const { count } = await tx.paiementPawapay.updateMany({ where: { id, statut: { in: ["cree", "echoue"] } }, data: { statut: "paye", payeLe: maintenant, referenceOperateur: d.reference, motifEchec: null } });
        if (!count) return;
        const boutiques = await tx.tenant.findMany({ where: { id: { in: ids } }, select: { planType: true, planExpiresAt: true, essaiFinLe: true } });
        const essai = boutiques.reduce<Date | null>((m, b) => (b.essaiFinLe && (!m || b.essaiFinLe > m) ? b.essaiFinLe : m), null);
        const fin = expirationApresPaiement(boutiques, plan, jours, maintenant, essai);
        await tx.tenant.updateMany({ where: { id: { in: ids } }, data: { planType: plan, planExpiresAt: fin, planRappel: null } });
      });
    }
  }
  await traiterParrain(id);
  return prisma.paiementPawapay.findUnique({ where: { id } });
}

async function traiterParrain(id: string) {
  const p = await prisma.paiementPawapay.findUnique({ where: { id } });
  if (p?.statut !== "paye" || p.parrainTraite || p.type !== "abonnement" || !p.plan || !p.jours) return;
  await crediterParrainSurAbonnement({ tenantId: p.tenantId, plan: p.plan, jours: p.jours, montant: p.montant, reference: `pawapay:${p.id}` });
  await prisma.paiementPawapay.update({ where: { id }, data: { parrainTraite: true } });
}

export async function synchroniserPaiement(id: string, client: ClientPawapay | null = clientPawapay()) {
  if (!client) return prisma.paiementPawapay.findUnique({ where: { id } });
  return appliquerDepot(id, await client.depot(id));
}

/** Filet de sécurité si un rappel de pawaPay n'arrive pas. */
export async function passePaiements(client: ClientPawapay | null = clientPawapay(), maintenant = new Date()) {
  if (!client) return { actif: false, verifies: 0 };
  const attente = await prisma.paiementPawapay.findMany({ where: { OR: [{ statut: "cree", createdAt: { lte: new Date(maintenant.getTime() - 2 * 60_000), gte: new Date(maintenant.getTime() - 7 * 86_400_000) } }, { statut: "paye", parrainTraite: false, type: "abonnement" }] }, select: { id: true, statut: true }, take: 100 });
  for (const p of attente) {
    try { if (p.statut === "paye") await traiterParrain(p.id); else await appliquerDepot(p.id, await client.depot(p.id), maintenant); }
    catch (e) { console.error("[pawapay] vérification", p.id, e instanceof Error ? e.message : e); }
  }
  return { actif: true, verifies: attente.length };
}
