// Retrait d'un marchand versé automatiquement par pawaPay (Mobile Money).
// Le retrait est déjà débité du solde disponible (lib/wallet.ts initierRetrait). Ici : opérateur
// reconnu d'après le numéro, frais du versement déduits du montant envoyé (payés par le marchand),
// payout pawaPay avec un identifiant stable (un nouvel envoi du même payoutId est ignoré par pawaPay :
// jamais de double versement). L'issue arrive par rappel ou par la tâche planifiée ; un échec
// recrédite le marchand (appliquerStatutTransfert → rembourserRetraitEchoue).
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { appliquerStatutTransfert, signalerRetraitAValider } from "@/lib/wallet";
import { clientPawapay, deviseIso3, paysPawapay, type ClientPawapay } from "./pawapay";

/** Versement automatique possible dans ce pays (au moins un opérateur ouvert aux versements sur le compte) ? */
export async function versementAutoPossible(paysIso2: string | null | undefined, client: ClientPawapay | null = clientPawapay()) {
  if (!client || !paysIso2) return false;
  const iso3 = paysPawapay(paysIso2)?.iso3;
  if (!iso3) return false;
  const conf = await client.configuration("PAYOUT").catch(() => []);
  return conf.some((c) => c.pays === iso3 && c.operateurs.some((o) => o.ouvert));
}

/** Frais d'un versement, en % du montant retiré, déduits de la somme envoyée (AXSO_FRAIS_RETRAIT_POURCENT). */
export const tauxFraisRetrait = (env: Record<string, string | undefined> = process.env) => {
  const v = Number(env.AXSO_FRAIS_RETRAIT_POURCENT ?? "0");
  return Number.isFinite(v) && v >= 0 && v < 20 ? v / 100 : 0;
};
export function fraisRetrait(montant: number, taux = tauxFraisRetrait()) {
  const frais = Math.ceil(montant * taux);
  return { frais, envoye: montant - frais };
}

/** Lance (ou relance, sans risque de doublon) le versement pawaPay d'un retrait Mobile Money. */
export async function lancerVersement(retraitId: string, client: ClientPawapay | null = clientPawapay()): Promise<"envoye" | "manuel" | "refuse"> {
  const r = await prisma.retrait.findUnique({ where: { id: retraitId } });
  if (!r || !["en_attente", "traitement"].includes(r.statut) || r.methode !== "mobile_money") return "manuel";
  // Sans pawaPay (ou pays non couvert), le circuit manuel reste : Axso est prévenu et verse à la main.
  if (!client) { await signalerRetraitAValider(r.id).catch(() => {}); return "manuel"; }
  // Opérateur et pays déduits du numéro ; le versement part dans la monnaie de ce pays, qui doit
  // être celle du portefeuille (sinon versement manuel : aucune conversion sur l'argent du marchand).
  const op = await client.operateur(r.destinataire).catch(() => null);
  const devisePays = op ? deviseIso3(op.pays) : null;
  // Versements ouverts pour cet opérateur sur le compte ? Sinon (ou en cas de doute) : circuit manuel,
  // jamais un refus qui ferait échouer le retrait du marchand.
  const ouverts = op ? await client.configuration("PAYOUT").catch(() => []) : [];
  const versementOuvert = !!op && ouverts.some((c) => c.pays === op.pays && c.operateurs.some((o) => o.code === op.operateur && o.ouvert));
  if (!op || !devisePays || devisePays !== r.devise || !versementOuvert) {
    const raison = !op ? "Opérateur non reconnu" : devisePays !== r.devise ? `Devise ${r.devise} ≠ ${devisePays ?? op.pays}` : "Versement automatique non ouvert pour cet opérateur";
    await prisma.retrait.update({ where: { id: r.id }, data: { notes: [r.notes, `${raison} : versement manuel`].filter(Boolean).join(" · ") } });
    await signalerRetraitAValider(r.id).catch(() => {});
    return "manuel";
  }
  const { frais, envoye } = fraisRetrait(r.montant);
  const payoutId = r.payoutId ?? randomUUID();
  await prisma.retrait.updateMany({ where: { id: r.id, payoutId: null }, data: { payoutId, frais, operateur: op.operateur, destinataire: `+${op.telephone}` } });
  const id = (await prisma.retrait.findUniqueOrThrow({ where: { id: r.id }, select: { payoutId: true } })).payoutId!;
  const res = await client.verser({ payoutId: id, telephone: op.telephone, operateur: op.operateur, montant: envoye, devise: r.devise, message: "AXSO retrait" }).catch(() => null);
  if (res?.accepte) {
    await prisma.retrait.updateMany({ where: { id: r.id, statut: "en_attente" }, data: { statut: "traitement" } });
    return "envoye";
  }
  if (res && !res.accepte) {
    await prisma.retrait.update({ where: { id: r.id }, data: { notes: [r.notes, `Versement refusé : ${res.motif}`].filter(Boolean).join(" · ") } });
    await appliquerStatutTransfert(r.id, "failed");
    return "refuse";
  }
  return "envoye"; // réponse perdue : la tâche planifiée relit le statut (et relance le même payoutId si besoin)
}


/** Applique l'issue d'un versement relue chez pawaPay (rappel ou tâche planifiée). */
export async function synchroniserVersement(payoutId: string, client: ClientPawapay | null = clientPawapay()) {
  if (!client) return;
  const r = await prisma.retrait.findUnique({ where: { payoutId }, select: { id: true, statut: true, createdAt: true } });
  if (!r || !["en_attente", "traitement"].includes(r.statut)) return;
  const e = await client.versement(payoutId);
  if (e.etat === "paye") await appliquerStatutTransfert(r.id, "complete", e.reference ?? undefined);
  else if (e.etat === "echoue") await appliquerStatutTransfert(r.id, "failed");
  else if (e.etat === "introuvable" && Date.now() - r.createdAt.getTime() > 2 * 60_000) await lancerVersement(r.id, client);
}

/** Filet de sécurité : versements dont le rappel n'est pas arrivé. */
export async function passeVersements(client: ClientPawapay | null = clientPawapay()) {
  if (!client) return { actif: false, verifies: 0 };
  const attente = await prisma.retrait.findMany({
    where: { payoutId: { not: null }, statut: { in: ["en_attente", "traitement"] }, createdAt: { gte: new Date(Date.now() - 14 * 86_400_000) } },
    select: { payoutId: true }, take: 100,
  });
  for (const r of attente) await synchroniserVersement(r.payoutId!, client).catch((e) => console.error("[pawapay] versement", r.payoutId, e instanceof Error ? e.message : e));
  return { actif: true, verifies: attente.length };
}
