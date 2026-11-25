// Versements automatiques aux transporteurs : contrat signé, lot idempotent, envoi Mobile Money, suivi du résultat.
import { randomUUID } from "crypto";
import { dechiffrer } from "@/lib/chiffrement";
import { prisma } from "@/lib/prisma";
import { genererContrat, identiteAxso, lireCompte, VERSION_CONDITIONS } from "./contrat";
import { ErreurLogistique, peutGerer, preparerLotReglement } from "./service";
import { TAUX_COMMISSION_DEFAUT } from "./tarifs";

const SEUIL_MIN = 1000, INTERVALLE_LOT_MS = 24 * 3_600_000;
const plafond = () => Number(process.env.AXSO_VERSEMENT_MAX) || 500_000;
const journal = (action: string, entite: string, entiteId: string, acteurType: string, acteurId: string | null, apres?: object) => prisma.journalLogistique.create({ data: { acteurType, acteurId, action, entite, entiteId, apres: apres ? JSON.parse(JSON.stringify(apres)) : undefined } });

type Resultat = { etat: "accepte" | "paye" | "echec" | "en_cours" | "inconnu"; motif?: string };
export type Adaptateur = { envoyer(p: { id: string; montant: number; devise: string; correspondant: string; numero: string }): Promise<Resultat>; statut(id: string): Promise<Resultat> };

/** Aucun envoi réel sans jeton ET activation explicite ; l'URL par défaut est le bac à sable. */
export function adaptateurVersement(env: Record<string, string | undefined> = process.env, f: typeof fetch = fetch): Adaptateur | null {
  if (env.AXSO_VERSEMENTS_AUTO !== "1" || !env.PAWAPAY_API_TOKEN) return null;
  const base = (env.PAWAPAY_API_URL || "https://api.sandbox.pawapay.io").replace(/\/$/, "");
  const entetes = { Authorization: `Bearer ${env.PAWAPAY_API_TOKEN}`, "Content-Type": "application/json" };
  return {
    async envoyer(p) {
      const r = await f(`${base}/v2/payouts`, { method: "POST", headers: entetes, signal: AbortSignal.timeout(15_000), body: JSON.stringify({ payoutId: p.id, amount: String(Math.floor(p.montant)), currency: p.devise, recipient: { type: "MMO", accountDetails: { phoneNumber: p.numero, provider: p.correspondant } }, customerMessage: "AXSO livraisons" }) });
      const d = await r.json().catch(() => ({}));
      if (d.status === "ACCEPTED" || d.status === "DUPLICATE_IGNORED") return { etat: "accepte" };
      if (d.status === "REJECTED") return { etat: "echec", motif: String(d.failureReason?.failureCode ?? "Refusé par l'opérateur") };
      return { etat: "inconnu", motif: `Réponse ${r.status}` };
    },
    async statut(id) {
      const r = await f(`${base}/v2/payouts/${id}`, { headers: entetes, signal: AbortSignal.timeout(10_000) });
      if (!r.ok) return { etat: "inconnu", motif: `Réponse ${r.status}` };
      const d = await r.json().catch(() => null);
      if (d?.status === "NOT_FOUND") return { etat: "inconnu", motif: "Versement non reçu" };
      const x = d?.status === "FOUND" ? d.data : null;
      if (!x) return { etat: "inconnu", motif: "Réponse illisible" };
      if (x.status === "COMPLETED") return { etat: "paye" };
      if (x.status === "FAILED") return { etat: "echec", motif: String(x.failureReason?.failureCode ?? "Échec opérateur") };
      return { etat: "en_cours" };
    },
  };
}

const contratActif = (fournisseurId: string) => prisma.contratTransporteur.findFirst({ where: { fournisseurId, statut: "signe" }, orderBy: { version: "desc" } });

export async function vueContrat(userId: string, id: string) {
  if (!(await peutGerer(userId, id))) throw new ErreurLogistique("Accès refusé", 403);
  const [f, signe] = await Promise.all([prisma.fournisseurLogistique.findUniqueOrThrow({ where: { id } }), contratActif(id)]);
  const axso = identiteAxso();
  const projet = axso ? genererContrat(f, axso, TAUX_COMMISSION_DEFAUT) : null;
  const aJour = !!signe && signe.conditions === VERSION_CONDITIONS && (!projet || signe.empreinte === projet.empreinte);
  return {
    pret: !!axso, aJour, texte: aJour ? signe!.texte : projet?.texte ?? null,
    signe: signe && { version: signe.version, signeLe: signe.signeLe, signataireNom: signe.signataireNom, autoVersement: signe.autoVersement, empreinte: signe.empreinte },
    compteValide: !!lireCompte(f.reglement ? dechiffrer(f.reglement) : null, f.pays), versementsActifs: !!adaptateurVersement(),
  };
}

export async function signerContrat(userId: string, id: string, d: { nom: string; accepte: boolean; autoVersement: boolean }) {
  const f = await prisma.fournisseurLogistique.findUnique({ where: { id } });
  if (!f) throw new ErreurLogistique("Transporteur introuvable", 404);
  if (f.proprietaireId !== userId) throw new ErreurLogistique("Seul le responsable du compte peut signer", 403);
  if (!d.accepte) throw new ErreurLogistique("Le contrat doit être accepté");
  const nom = d.nom.trim();
  if (nom.length < 3) throw new ErreurLogistique("Saisissez votre nom complet");
  const axso = identiteAxso();
  if (!axso) throw new ErreurLogistique("Contrat indisponible : l'identité légale d'AXSO n'est pas renseignée", 409);
  const c = genererContrat(f, axso, TAUX_COMMISSION_DEFAUT);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`contrat:${id}`}))`;
    const der = await tx.contratTransporteur.findFirst({ where: { fournisseurId: id }, orderBy: { version: "desc" } });
    if (der?.statut === "signe" && der.empreinte === c.empreinte) throw new ErreurLogistique("Contrat déjà signé", 409);
    await tx.contratTransporteur.updateMany({ where: { fournisseurId: id, statut: "signe" }, data: { statut: "remplace", revoqueLe: new Date() } });
    const x = await tx.contratTransporteur.create({ data: { fournisseurId: id, version: (der?.version ?? 0) + 1, conditions: c.conditions, texte: c.texte, empreinte: c.empreinte, tauxCommission: c.tauxCommission, autoVersement: d.autoVersement, signataireNom: nom.slice(0, 160), signataireId: userId } });
    await tx.journalLogistique.create({ data: { acteurType: "fournisseur", acteurId: userId, action: "contrat.signe", entite: "ContratTransporteur", entiteId: x.id, apres: { version: x.version, empreinte: x.empreinte, autoVersement: d.autoVersement } } });
    return { version: x.version };
  });
}

export async function majAutoVersement(userId: string, id: string, actif: boolean) {
  const f = await prisma.fournisseurLogistique.findUnique({ where: { id }, select: { proprietaireId: true } });
  if (f?.proprietaireId !== userId) throw new ErreurLogistique("Seul le responsable du compte peut changer ce réglage", 403);
  const c = await contratActif(id);
  if (!c) throw new ErreurLogistique("Signez d'abord le contrat", 409);
  await prisma.contratTransporteur.update({ where: { id: c.id }, data: { autoVersement: actif } });
  await journal("contrat.auto_versement", "ContratTransporteur", c.id, "fournisseur", userId, { actif });
}

async function appliquer(lotId: string, r: Resultat) {
  if (r.etat === "paye") {
    const lot = await prisma.lotReglement.findUnique({ where: { id: lotId }, select: { idVersement: true } });
    const { count } = await prisma.lotReglement.updateMany({ where: { id: lotId, statut: "envoi" }, data: { statut: "paye", payeLe: new Date(), payePar: "systeme", referencePaiement: lot?.idVersement, erreurVersement: null } });
    if (count) { await journal("reglement.paye", "LotReglement", lotId, "systeme", null, { automatique: true }); await prisma.evenementSortant.create({ data: { type: "settlement.paid", donnees: { lotId } } }); }
  } else if (r.etat === "echec") {
    // Les lignes quittent le lot en échec pour redevenir réglables ; le journal garde leur détail.
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.lotReglement.updateMany({ where: { id: lotId, statut: "envoi" }, data: { statut: "echec", erreurVersement: r.motif?.slice(0, 200) } });
      if (!count) return;
      const lignes = await tx.ligneReglement.findMany({ where: { lotId }, select: { courseId: true, montant: true } });
      await tx.ligneReglement.deleteMany({ where: { lotId } });
      await tx.journalLogistique.create({ data: { acteurType: "systeme", action: "reglement.echec", entite: "LotReglement", entiteId: lotId, apres: { motif: r.motif ?? null, lignes: lignes.map((l) => ({ courseId: l.courseId, montant: Number(l.montant) })) } } });
    });
  } else if (r.etat === "inconnu") await prisma.lotReglement.update({ where: { id: lotId }, data: { erreurVersement: r.motif?.slice(0, 200) } });
}

/** L'identifiant est écrit avant l'envoi : un rejeu renvoie le même versement, jamais un second. */
export async function envoyerLot(lotId: string, a: Adaptateur) {
  const lot = await prisma.lotReglement.findUnique({ where: { id: lotId } });
  if (!lot || lot.statut !== "prepare") return { envoye: false, motif: "statut" };
  const f = await prisma.fournisseurLogistique.findUniqueOrThrow({ where: { id: lot.fournisseurId } });
  const contrat = await contratActif(f.id), compte = lireCompte(f.reglement ? dechiffrer(f.reglement) : null, f.pays), total = Number(lot.total);
  if (!contrat?.autoVersement || f.suspendu || f.statutLegal !== "verifie" || !compte) return { envoye: false, motif: "non_eligible" };
  if (total > plafond()) { await prisma.lotReglement.update({ where: { id: lotId }, data: { erreurVersement: "Au-dessus du plafond automatique : validation manuelle" } }); return { envoye: false, motif: "plafond" }; }
  const id = lot.idVersement ?? randomUUID();
  const { count } = await prisma.lotReglement.updateMany({ where: { id: lotId, statut: "prepare" }, data: { statut: "envoi", idVersement: id, tentativesVersement: { increment: 1 } } });
  if (!count) return { envoye: false, motif: "concurrence" };
  await journal("reglement.envoi", "LotReglement", lotId, "systeme", null, { idVersement: id, total });
  try { await appliquer(lotId, await a.envoyer({ id, montant: total, devise: lot.devise, correspondant: compte.correspondant, numero: compte.numero })); }
  catch (e) { await appliquer(lotId, { etat: "inconnu", motif: e instanceof Error ? e.message : "Erreur réseau" }); }
  return { envoye: true };
}

export async function passeVersements(a: Adaptateur | null = adaptateurVersement(), maintenant = new Date()) {
  if (!a) return { actif: false, prepares: 0, envoyes: 0, regles: 0 };
  let prepares = 0, envoyes = 0, regles = 0;
  for (const l of await prisma.lotReglement.findMany({ where: { statut: "envoi" }, take: 50 })) {
    const r = await a.statut(l.idVersement!).catch((): Resultat => ({ etat: "inconnu", motif: "Erreur réseau" }));
    // Non reçu par l'opérateur : on renvoie avec le même identifiant.
    if (r.etat === "inconnu" && r.motif === "Versement non reçu" && l.tentativesVersement < 5) {
      const f = await prisma.fournisseurLogistique.findUniqueOrThrow({ where: { id: l.fournisseurId } }), compte = lireCompte(f.reglement ? dechiffrer(f.reglement) : null, f.pays);
      if (compte) { await prisma.lotReglement.update({ where: { id: l.id }, data: { tentativesVersement: { increment: 1 } } }); await appliquer(l.id, await a.envoyer({ id: l.idVersement!, montant: Number(l.total), devise: l.devise, correspondant: compte.correspondant, numero: compte.numero }).catch((): Resultat => ({ etat: "inconnu", motif: "Erreur réseau" }))); }
      continue;
    }
    await appliquer(l.id, r);
    if (r.etat === "paye") regles++;
  }
  const contrats = await prisma.contratTransporteur.findMany({ where: { statut: "signe", autoVersement: true }, select: { fournisseurId: true }, take: 200 });
  for (const { fournisseurId } of contrats) {
    // Un lot récent, même en échec, espace les tentatives : un numéro erroné ne relance pas toutes les 5 minutes.
    const recent = await prisma.lotReglement.findFirst({ where: { fournisseurId, createdAt: { gt: new Date(maintenant.getTime() - INTERVALLE_LOT_MS) } }, select: { id: true } });
    const attente = await prisma.lotReglement.findFirst({ where: { fournisseurId, statut: "prepare" }, select: { id: true } });
    let lotId = attente?.id;
    if (!lotId && !recent) {
      const pris = (await prisma.ligneReglement.findMany({ where: { lot: { fournisseurId, statut: { notIn: ["annule", "echec"] } } }, select: { courseId: true } })).map((x) => x.courseId);
      const du = await prisma.ecritureFinanceCourse.aggregate({ where: { fournisseurId, type: "versement", courseId: { notIn: pris } }, _sum: { montant: true } });
      if (Number(du._sum.montant ?? 0) >= SEUIL_MIN) { try { lotId = (await preparerLotReglement("systeme", fournisseurId)).id; prepares++; } catch (e) { if (!(e instanceof ErreurLogistique)) throw e; } }
    }
    if (lotId && (await envoyerLot(lotId, a)).envoye) envoyes++;
  }
  return { actif: true, prepares, envoyes, regles };
}
