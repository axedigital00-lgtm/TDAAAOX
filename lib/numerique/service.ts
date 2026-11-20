// Services (coaching, consultation, prestation avec livrable) : suivi d'un achat côté client
// (lien privé `token`, sans compte) et côté prestataire. Les droits ne naissent que d'une
// commande payée (lib/livraison-numerique.ts → accorderService) ; une réservation de séance
// est revérifiée côté serveur dans une transaction (pas de double réservation).
import crypto from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PAIEMENT } from "@/lib/commandes";
import { notifierMarchand } from "@/lib/notifications-marchand";
import { emailReel, envoyerEmailTexte } from "@/lib/email";
import { lienBoutique } from "@/lib/origine-site";
import { creneauValide, creneauxLibres, normaliserDisponibilites, type ReglesCreneaux } from "./creneaux";
import { echeanceLivrable, peutDemanderRevision, peutModifierSeance, statutInitialService, validerBrief, type QuestionBrief } from "./regles";

export const JETON_SERVICE = /^[a-f0-9]{64}$/;
const jeton = () => crypto.randomBytes(32).toString("hex");

type Commande = { id: string; tenantId: string; clientEmail: string | null; clientNom?: string | null; clientTelephone?: string | null };

/** Crée le suivi d'un service acheté (une fois par commande et par produit). */
export async function accorderService(commande: Commande, produitId: string): Promise<"ok" | "manque"> {
  const service = await prisma.serviceProduit.findUnique({ where: { produitId }, select: { id: true, mode: true, brief: true, delaiLivraisonJours: true } });
  if (!service) return "manque";
  const deja = await prisma.commandeService.findUnique({ where: { commandeId_produitId: { commandeId: commande.id, produitId } }, select: { id: true } });
  if (deja) return "ok";
  const questions = Array.isArray(service.brief) ? service.brief.length : 0;
  const statut = statutInitialService(service.mode as "rendez_vous" | "livrable", questions);
  await prisma.commandeService.create({
    data: {
      serviceId: service.id, produitId, tenantId: commande.tenantId, commandeId: commande.id,
      clientEmail: commande.clientEmail, clientNom: commande.clientNom?.trim() || "Client", clientTelephone: commande.clientTelephone ?? null,
      token: jeton(), statut,
      echeance: service.mode === "livrable" && statut === "en_cours" ? echeanceLivrable(new Date(), service.delaiLivraisonJours) : null,
    },
  });
  return "ok";
}

/** Achat de service chargé par son jeton client (commande payée, non annulée). */
export async function chargerCommandeService(token: string) {
  if (!JETON_SERVICE.test(token)) return null;
  const cs = await prisma.commandeService.findUnique({
    where: { token },
    include: {
      seances: { orderBy: { debut: "asc" } },
      service: { include: { produit: { select: { nom: true, images: true, tenantId: true, tenant: { select: { slug: true, nomBoutique: true, email: true } } } } } },
    },
  });
  if (!cs) return null;
  const commande = await prisma.commande.findUnique({ where: { id: cs.commandeId }, select: { paiementStatut: true, statut: true } });
  if (!commande || commande.paiementStatut !== PAIEMENT.PAYE || commande.statut === "annulee") return null;
  return cs;
}
export type CommandeServiceChargee = NonNullable<Awaited<ReturnType<typeof chargerCommandeService>>>;

export function reglesDuService(s: { disponibilites: unknown; indisponibilites: unknown; dureeMin: number; tamponMin: number; preavisHeures: number; horizonJours: number; maxParJour: number | null; fuseau: string }): ReglesCreneaux {
  return {
    disponibilites: normaliserDisponibilites(s.disponibilites),
    indisponibilites: Array.isArray(s.indisponibilites) ? (s.indisponibilites as { du: string; au: string }[]) : [],
    dureeMin: s.dureeMin, tamponMin: s.tamponMin, preavisHeures: s.preavisHeures, horizonJours: s.horizonJours,
    maxParJour: s.maxParJour, fuseau: s.fuseau,
  };
}

async function seancesOccupees(serviceId: string, sauf?: string) {
  return prisma.seanceService.findMany({
    where: { serviceId, statut: { in: ["en_attente", "confirmee"] }, fin: { gt: new Date() }, ...(sauf ? { id: { not: sauf } } : {}) },
    select: { debut: true, fin: true },
  });
}

/** Créneaux libres d'un service (vue client). */
export async function creneauxDuService(serviceId: string) {
  const s = await prisma.serviceProduit.findUnique({ where: { id: serviceId } });
  if (!s || s.mode !== "rendez_vous") return [];
  return creneauxLibres(reglesDuService(s), await seancesOccupees(serviceId));
}

/** Le client enregistre son brief. */
export async function soumettreBrief(cs: CommandeServiceChargee, reponses: Record<string, unknown>) {
  if (cs.statut !== "brief_attendu") return { ok: false as const, erreur: "Le brief a déjà été envoyé" };
  const v = validerBrief((cs.service.brief as QuestionBrief[]) ?? [], reponses);
  if (!v.ok) return v;
  const statut = cs.service.mode === "rendez_vous" ? "a_planifier" : "en_cours";
  await prisma.commandeService.update({
    where: { id: cs.id },
    data: { briefReponses: v.propres, statut, echeance: cs.service.mode === "livrable" ? echeanceLivrable(new Date(), cs.service.delaiLivraisonJours) : null },
  });
  await notifierMarchand({
    tenantId: cs.tenantId, type: "nouvelle_commande", lien: `/dashboard/produits/services/${cs.id}`,
    titre: `Brief reçu : ${cs.service.produit.nom}`, message: `${cs.clientNom} a rempli le brief. ${statut === "en_cours" ? "Tu peux démarrer." : "Il va réserver ses séances."}`,
  }).catch(() => {});
  return { ok: true as const };
}

/** Réservation d'une séance par le client : créneau revérifié dans une transaction sérialisable. */
export async function reserverSeance(cs: CommandeServiceChargee, debutIso: string) {
  if (cs.service.mode !== "rendez_vous") return { ok: false as const, erreur: "Ce service ne se réserve pas" };
  if (cs.statut === "brief_attendu") return { ok: false as const, erreur: "Remplissez d'abord le brief" };
  if (cs.statut === "termine" || cs.statut === "annule") return { ok: false as const, erreur: "Ce service est terminé" };
  const actives = cs.seances.filter((s) => s.statut !== "annulee");
  if (actives.length >= cs.service.seances) return { ok: false as const, erreur: "Toutes vos séances sont déjà réservées" };
  const debut = new Date(debutIso);
  if (Number.isNaN(debut.getTime())) return { ok: false as const, erreur: "Créneau invalide" };
  const regles = reglesDuService(cs.service);
  const statut = cs.service.validationManuelle ? "en_attente" : "confirmee";
  try {
    const seance = await prisma.$transaction(async (tx) => {
      const occupes = await tx.seanceService.findMany({ where: { serviceId: cs.serviceId, statut: { in: ["en_attente", "confirmee"] }, fin: { gt: new Date() } }, select: { debut: true, fin: true } });
      if (!creneauValide(regles, occupes, debut)) throw new Error("CRENEAU_PRIS");
      return tx.seanceService.create({
        data: { commandeServiceId: cs.id, serviceId: cs.serviceId, numero: actives.length + 1, debut, fin: new Date(debut.getTime() + cs.service.dureeMin * 60000), statut },
      });
    }, { isolationLevel: "Serializable" });
    await prisma.commandeService.update({ where: { id: cs.id }, data: { statut: "en_cours" } });
    await notifierMarchand({
      tenantId: cs.tenantId, type: "nouvelle_commande", lien: `/dashboard/produits/services/${cs.id}`,
      titre: statut === "en_attente" ? `Séance à confirmer : ${cs.service.produit.nom}` : `Nouvelle séance : ${cs.service.produit.nom}`,
      message: `${cs.clientNom} — ${debut.toLocaleString("fr-FR", { timeZone: cs.service.fuseau, dateStyle: "full", timeStyle: "short" })}`,
    }).catch(() => {});
    return { ok: true as const, seance };
  } catch (e) {
    if ((e as Error).message === "CRENEAU_PRIS" || (e as { code?: string }).code === "P2034") return { ok: false as const, erreur: "Ce créneau vient d'être pris. Choisissez-en un autre." };
    throw e;
  }
}

/** Annulation d'une séance par le client (dans le préavis) : la séance redevient réservable. */
export async function annulerSeanceClient(cs: CommandeServiceChargee, seanceId: string) {
  const s = cs.seances.find((x) => x.id === seanceId);
  if (!s || !["en_attente", "confirmee"].includes(s.statut)) return { ok: false as const, erreur: "Séance introuvable" };
  if (!peutModifierSeance(s.debut, cs.service.preavisHeures)) return { ok: false as const, erreur: `Annulation possible jusqu'à ${cs.service.preavisHeures} h avant la séance` };
  await prisma.seanceService.update({ where: { id: s.id }, data: { statut: "annulee" } });
  return { ok: true as const };
}

/** Message dans le fil client ↔ prestataire. */
export async function ajouterMessage(id: string, auteur: "client" | "prestataire", texte: string) {
  const propre = texte.trim().slice(0, 4000);
  if (!propre) return { ok: false as const, erreur: "Message vide" };
  const cs = await prisma.commandeService.findUnique({ where: { id }, select: { messages: true, tenantId: true, clientNom: true, clientEmail: true, token: true, produitId: true } });
  if (!cs) return { ok: false as const, erreur: "Introuvable" };
  const messages = [...((cs.messages as Prisma.JsonArray) ?? []), { auteur, texte: propre, date: new Date().toISOString() }].slice(-300) as Prisma.InputJsonValue;
  await prisma.commandeService.update({ where: { id }, data: { messages } });
  if (auteur === "client") {
    await notifierMarchand({ tenantId: cs.tenantId, type: "nouvelle_commande", lien: `/dashboard/produits/services/${id}`, titre: `Message de ${cs.clientNom}`, message: propre.slice(0, 160) }).catch(() => {});
  } else {
    await prevenirClient(id, "Nouveau message de votre prestataire", propre).catch(() => {});
  }
  return { ok: true as const };
}

/** Le prestataire dépose un livrable (lien https) : la commande passe à « livré ». */
export async function deposerLivrable(id: string, l: { nom: string; url: string; note?: string }) {
  const cs = await prisma.commandeService.findUnique({ where: { id }, select: { livrables: true } });
  if (!cs) return { ok: false as const, erreur: "Introuvable" };
  const existants = (cs.livrables as { version?: number }[]) ?? [];
  const version = existants.reduce((m, x) => Math.max(m, x.version ?? 0), 0) + 1;
  const livrables = [...existants, { id: crypto.randomUUID(), nom: l.nom.trim().slice(0, 200), url: l.url, note: l.note?.trim().slice(0, 2000), version, date: new Date().toISOString() }];
  await prisma.commandeService.update({ where: { id }, data: { livrables, statut: "livre" } });
  await prevenirClient(id, "Votre livrable est prêt", `Version ${version} : ${l.nom}`).catch(() => {});
  return { ok: true as const };
}

/** Le client demande une révision (dans la limite incluse). */
export async function demanderRevision(cs: CommandeServiceChargee, motif: string) {
  if (!peutDemanderRevision(cs.statut, cs.revisionsUtilisees, cs.service.revisionsIncluses)) return { ok: false as const, erreur: "Aucune révision disponible" };
  await prisma.commandeService.update({ where: { id: cs.id }, data: { statut: "revision", revisionsUtilisees: { increment: 1 } } });
  await ajouterMessage(cs.id, "client", `Demande de révision : ${motif}`);
  return { ok: true as const };
}

/** Le client valide la prestation (avec une note facultative) : terminé. */
export async function validerPrestation(cs: CommandeServiceChargee, note?: number, avis?: string) {
  if (!["livre", "en_cours"].includes(cs.statut)) return { ok: false as const, erreur: "Rien à valider pour le moment" };
  await prisma.commandeService.update({
    where: { id: cs.id },
    data: { statut: "termine", noteClient: note && note >= 1 && note <= 5 ? Math.round(note) : null, avisClient: avis?.trim().slice(0, 2000) || null },
  });
  return { ok: true as const };
}

/** E-mail au client avec son lien de suivi (sans bloquer si l'e-mail échoue). */
export async function prevenirClient(id: string, sujet: string, texte: string) {
  const cs = await prisma.commandeService.findUnique({
    where: { id },
    select: { clientEmail: true, clientNom: true, token: true, service: { select: { produit: { select: { nom: true, tenant: { select: { slug: true, nomBoutique: true, email: true } } } } } } },
  });
  if (!cs || !emailReel(cs.clientEmail)) return false;
  const t = cs.service.produit.tenant;
  const lien = await lienBoutique(t.slug, `/service/${cs.token}`);
  return envoyerEmailTexte({
    a: cs.clientEmail!, repondreA: t.email ?? "noreply@axsoafrica.com", boutique: t.nomBoutique, sujet: `${sujet} — ${cs.service.produit.nom}`,
    texte: `Bonjour ${cs.clientNom},\n\n${texte}\n\nSuivre votre prestation : ${lien}\n\n${t.nomBoutique}`,
  });
}

/** Rappels 24 h avant chaque séance confirmée (idempotent : une fois par séance). */
export async function passeRappelsSeances(maintenant = new Date()) {
  const seances = await prisma.seanceService.findMany({
    where: { statut: "confirmee", rappelEnvoyeAt: null, debut: { gt: maintenant, lte: new Date(maintenant.getTime() + 24 * 3_600_000) } },
    select: { id: true, debut: true, commandeServiceId: true, commandeService: { select: { service: { select: { fuseau: true } } } } },
    take: 200,
  });
  let envoyes = 0;
  for (const s of seances) {
    const quand = s.debut.toLocaleString("fr-FR", { timeZone: s.commandeService.service.fuseau, dateStyle: "full", timeStyle: "short" });
    const ok = await prevenirClient(s.commandeServiceId, "Rappel de votre séance", `Votre séance a lieu le ${quand}. Les informations de connexion sont sur votre page de suivi.`).catch(() => false);
    await prisma.seanceService.update({ where: { id: s.id }, data: { rappelEnvoyeAt: maintenant } });
    if (ok) envoyes++;
  }
  return { envoyes, total: seances.length };
}
