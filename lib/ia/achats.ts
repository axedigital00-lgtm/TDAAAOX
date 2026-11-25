// Achat de packs de coins par Mobile Money direct (marque AXSO seulement). Le statut est toujours relu
// chez le prestataire avant de créditer ; le prix d'un pack (FCFA) est converti dans la monnaie du numéro.
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { tauxDuJour } from "@/lib/taux-change";
import { clientPawapay, type ClientPawapay, type EtatDepot } from "@/lib/paiements/pawapay";
import { preparerDepot, lancerDepot, ErreurMobileMoney } from "@/lib/paiements/depot-direct";
import { convertir } from "@/lib/paiements/commande-numerique";
import { PACKS } from "./coins-regles";
import { ErreurCoins } from "./coins";

const ABANDON_MS = 15 * 60_000;

export async function demarrerAchat(p: { userId: string; tenantId: string; pack: string; origine: string; telephone: string }, client: ClientPawapay | null = clientPawapay()) {
  const pack = PACKS.find((x) => x.id === p.pack);
  if (!pack) throw new ErreurCoins("Pack inconnu");
  if (!client) throw new ErreurCoins("L'achat de coins arrive bientôt", 503);
  let depot;
  try { depot = await preparerDepot(client, p.telephone); }
  catch (e) { throw e instanceof ErreurMobileMoney ? new ErreurCoins(e.message, e.status) : e; }
  const montant = convertir(pack.prix, "XAF", depot.devise, await tauxDuJour());
  const id = randomUUID(); // identifiant du paiement : UUID v4
  await prisma.achatCoins.create({ data: { id, tenantId: p.tenantId, userId: p.userId, pack: pack.id, coins: pack.coins, montant, devise: depot.devise, prestataire: "mobile_money" } });
  try {
    await lancerDepot(client, { depositId: id, telephone: depot.telephone, operateur: depot.operateur, montant, devise: depot.devise, message: `AXSO ${pack.coins} coins`, retour: `${p.origine}/dashboard/coins?achat=${id}` });
    return { id };
  } catch (e) {
    await prisma.achatCoins.update({ where: { id }, data: { statut: "echoue", motif: e instanceof Error ? e.message.slice(0, 200) : "Paiement refusé" } });
    if (e instanceof ErreurMobileMoney) throw new ErreurCoins(e.message, e.status);
    console.error("[mobile-money] achat coins", id, e instanceof Error ? e.message : e);
    throw new ErreurCoins("Paiement indisponible pour le moment, réessaie dans quelques instants", 502);
  }
}

/** Idempotent : un rappel rejoué ne crédite jamais deux fois. Un montant différent part en vérification. */
export async function appliquerAchat(id: string, d: EtatDepot, maintenant = new Date()) {
  const a = await prisma.achatCoins.findUnique({ where: { id } });
  if (!a || a.statut === "paye" || a.statut === "a_verifier") return a;
  if (d.etat === "echoue" || (d.etat === "introuvable" && maintenant.getTime() - a.createdAt.getTime() >= ABANDON_MS)) {
    await prisma.achatCoins.updateMany({ where: { id, statut: "cree" }, data: { statut: "echoue", motif: d.motif?.slice(0, 200) ?? "Paiement abandonné" } });
  } else if (d.etat === "paye") {
    if (Number(d.montant) !== a.montant || d.devise !== a.devise) {
      await prisma.achatCoins.updateMany({ where: { id, statut: { in: ["cree", "echoue"] } }, data: { statut: "a_verifier", motif: `Reçu ${d.montant} ${d.devise}`, referenceOperateur: d.reference } });
    } else {
      await prisma.$transaction(async (tx) => {
        const { count } = await tx.achatCoins.updateMany({ where: { id, statut: { in: ["cree", "echoue"] } }, data: { statut: "paye", payeLe: maintenant, referenceOperateur: d.reference, motif: null } });
        if (count) await tx.ecritureCoins.create({ data: { tenantId: a.tenantId, type: "achat", source: "achete", montant: a.coins, reference: `achat:${id}`, motif: `Pack ${a.coins} coins` } });
      });
    }
  }
  return prisma.achatCoins.findUnique({ where: { id } });
}

export async function synchroniserAchat(id: string, client: ClientPawapay | null = clientPawapay()) {
  if (!client) return prisma.achatCoins.findUnique({ where: { id } });
  return appliquerAchat(id, await client.depot(id));
}

/** Achats en attente d'une boutique, relus à l'ouverture de la page des coins. Renvoie le lien de
 *  validation dans l'application (Wave) de l'achat en attente le plus récent, s'il y en a un. */
export async function synchroniserAchatsEnAttente(tenantId: string, client: ClientPawapay | null = clientPawapay()): Promise<string | null> {
  if (!client) return null;
  const l = await prisma.achatCoins.findMany({ where: { tenantId, statut: "cree", createdAt: { gte: new Date(Date.now() - 3 * 86_400_000) } }, orderBy: { createdAt: "desc" }, select: { id: true }, take: 5 });
  let lien: string | null = null;
  for (const a of l) {
    const d = await client.depot(a.id).catch(() => null);
    if (!d) continue;
    if (!lien && d.lienAutorisation) lien = d.lienAutorisation;
    await appliquerAchat(a.id, d).catch(() => {});
  }
  return lien;
}

/** Filet de sécurité de la tâche planifiée : achats dont le rappel n'est pas arrivé. */
export async function passeAchats(client: ClientPawapay | null = clientPawapay()) {
  if (!client) return { actif: false, verifies: 0 };
  const l = await prisma.achatCoins.findMany({ where: { statut: "cree", createdAt: { lte: new Date(Date.now() - 2 * 60_000), gte: new Date(Date.now() - 3 * 86_400_000) } }, select: { id: true }, take: 100 });
  for (const a of l) await synchroniserAchat(a.id, client).catch((e) => console.error("[pawapay] achat coins", a.id, e instanceof Error ? e.message : e));
  return { actif: true, verifies: l.length };
}
