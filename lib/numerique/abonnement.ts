// Abonnements (adhésions prépayées, renouvelables par un nouvel achat — jamais de prélèvement
// automatique) et parcours de formations. Les droits ne naissent que d'une commande payée
// (lib/livraison-numerique.ts). À l'échéance (+ grâce), les accès livrés par l'adhésion sont coupés.
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { PAIEMENT } from "@/lib/commandes";
import { emailReel, envoyerEmailTexte } from "@/lib/email";
import { lienBoutique } from "@/lib/origine-site";
import { notifierMarchand } from "@/lib/notifications-marchand";
import { cleApprenant, eligibiliteCertificat, genererCodeCertificat } from "@/lib/formation/regles";
import { adhesionActive, etapesOuvertes, parcoursTermine, prolongerAdhesion, rappelAbonnementDu, type EtapeEtat } from "./regles";

export const JETON_ADHESION = /^[a-f0-9]{64}$/;

type Commande = { id: string; tenantId: string; clientEmail: string | null; clientNom?: string | null };

/**
 * Crée ou prolonge l'adhésion de l'acheteur. Idempotent par commande (une commande déjà
 * comptée ne prolonge pas deux fois). Renvoie les produits inclus à livrer.
 */
export async function accorderAdhesion(commande: Commande, produitId: string): Promise<{ statut: "ok"; inclus: string[]; expireAt: Date } | { statut: "manque" }> {
  const ab = await prisma.abonnementProduit.findUnique({ where: { produitId }, select: { id: true, periodeJours: true, essaiJours: true, graceJours: true, contenus: { orderBy: { ordre: "asc" }, select: { produitInclusId: true } } } });
  if (!ab) return { statut: "manque" };
  const email = commande.clientEmail?.trim().toLowerCase();
  if (!email) return { statut: "manque" }; // une adhésion se rattache à un e-mail
  const inclus = ab.contenus.map((c) => c.produitInclusId);
  const existante = await prisma.adhesion.findUnique({ where: { abonnementId_clientEmail: { abonnementId: ab.id, clientEmail: email } } });
  const avecGrace = (fin: Date) => new Date(fin.getTime() + ab.graceJours * 86_400_000);
  if (existante?.commandeIds.includes(commande.id)) {
    if (!adhesionActive(existante, ab.graceJours)) return { statut: "manque" };
    return { statut: "ok", inclus, expireAt: avecGrace(existante.fin) };
  }
  const fin = prolongerAdhesion({ finActuelle: existante?.statut === "annulee" ? null : existante?.fin ?? null, periodeJours: ab.periodeJours, essaiJours: ab.essaiJours, premierAchat: !existante });
  if (existante) {
    await prisma.adhesion.update({
      where: { id: existante.id },
      data: { fin, statut: "active", renouvellements: { increment: 1 }, commandeIds: { push: commande.id }, rappelEnvoyeAt: null, expirationTraiteeAt: null, clientNom: commande.clientNom ?? existante.clientNom },
    });
  } else {
    await prisma.adhesion.create({
      data: { abonnementId: ab.id, produitId, tenantId: commande.tenantId, clientEmail: email, clientNom: commande.clientNom ?? null, token: crypto.randomBytes(32).toString("hex"), fin, commandeIds: [commande.id] },
    });
  }
  // Les accès déjà livrés par les achats précédents de l'adhésion suivent la nouvelle échéance (+ grâce).
  const expireAt = avecGrace(fin);
  if (existante && inclus.length) {
    const where = { produitId: { in: inclus }, commandeId: { in: existante.commandeIds }, revoqueAt: null, expireAt: { lt: expireAt } };
    await prisma.accesFormation.updateMany({ where, data: { expireAt } });
    await prisma.telechargement.updateMany({ where, data: { expireAt } });
  }
  return { statut: "ok", inclus, expireAt };
}

/** Espace membre chargé par son jeton (vue client). */
export async function chargerAdhesion(token: string) {
  if (!JETON_ADHESION.test(token)) return null;
  const a = await prisma.adhesion.findUnique({
    where: { token },
    include: { abonnement: { include: { produit: { select: { id: true, nom: true, images: true, slug: true, tenant: { select: { slug: true, nomBoutique: true } } } }, contenus: { orderBy: { ordre: "asc" }, include: { produitInclus: { select: { id: true, nom: true, type: true, images: true } } } } } } },
  });
  if (!a) return null;
  return { ...a, active: adhesionActive(a, a.abonnement.graceJours) };
}

/**
 * Passe planifiée : rappels de renouvellement, puis expiration (accès inclus coupés).
 * Idempotente : `rappelEnvoyeAt` et `expirationTraiteeAt`.
 */
export async function passeAdhesions(maintenant = new Date()) {
  const actives = await prisma.adhesion.findMany({
    where: { statut: "active", fin: { lte: new Date(maintenant.getTime() + 31 * 86_400_000) } },
    include: { abonnement: { select: { rappelJours: true, graceJours: true, produit: { select: { nom: true, slug: true, tenant: { select: { slug: true, nomBoutique: true, email: true } } } }, contenus: { select: { produitInclusId: true } } } } },
    take: 500,
  });
  let rappels = 0, expirees = 0;
  for (const a of actives) {
    const t = a.abonnement.produit.tenant;
    if (!adhesionActive(a, a.abonnement.graceJours, maintenant)) {
      const expiree = await prisma.$transaction(async tx => {
        const transition = await tx.adhesion.updateMany({ where: { id: a.id, statut: "active", fin: a.fin }, data: { statut: "expiree", expirationTraiteeAt: maintenant } });
        if (!transition.count) return false;
        // Un autre abonnement de la commande peut encore couvrir le même contenu.
        const where = { commandeId: { in: a.commandeIds }, produitId: { in: a.abonnement.contenus.map(c => c.produitInclusId) }, revoqueAt: null, expireAt: { lte: maintenant } };
        await tx.accesFormation.updateMany({ where, data: { revoqueAt: maintenant } });
        await tx.telechargement.updateMany({ where, data: { revoqueAt: maintenant } });
        return true;
      });
      if (!expiree) continue;
      expirees++;
      if (emailReel(a.clientEmail)) {
        const lien = await lienBoutique(t.slug, `/produits/${a.abonnement.produit.slug}`);
        await envoyerEmailTexte({ a: a.clientEmail, repondreA: t.email ?? "noreply@axsoafrica.com", boutique: t.nomBoutique, sujet: `Votre abonnement « ${a.abonnement.produit.nom} » est arrivé à échéance`, texte: `Bonjour ${a.clientNom ?? ""},\n\nVotre abonnement est terminé. Pour retrouver vos accès, renouvelez-le ici : ${lien}\n\n${t.nomBoutique}` }).catch(() => false);
      }
      continue;
    }
    if (rappelAbonnementDu(a, a.abonnement.rappelJours, maintenant)) {
      if (emailReel(a.clientEmail)) {
        const lien = await lienBoutique(t.slug, `/produits/${a.abonnement.produit.slug}`);
        const quand = a.fin.toLocaleDateString("fr-FR", { dateStyle: "long" });
        await envoyerEmailTexte({ a: a.clientEmail, repondreA: t.email ?? "noreply@axsoafrica.com", boutique: t.nomBoutique, sujet: `Votre abonnement « ${a.abonnement.produit.nom} » se termine le ${quand}`, texte: `Bonjour ${a.clientNom ?? ""},\n\nVotre abonnement se termine le ${quand}. Renouvelez-le avant cette date pour garder vos accès sans interruption (les jours restants sont conservés) : ${lien}\n\n${t.nomBoutique}` }).catch(() => false);
      }
      await prisma.adhesion.update({ where: { id: a.id }, data: { rappelEnvoyeAt: maintenant } });
      rappels++;
    }
  }
  return { rappels, expirees };
}

// ─── Parcours ───────────────────────────────────────────────────────────────

/** Formations d'un parcours (à livrer comme un bundle). */
export async function formationsDuParcours(produitId: string): Promise<string[]> {
  const p = await prisma.parcoursProduit.findUnique({ where: { produitId }, select: { etapes: { orderBy: { ordre: "asc" }, select: { formationProduitId: true } } } });
  return p?.etapes.map((e) => e.formationProduitId) ?? [];
}

/** État d'un parcours pour un apprenant : étapes, certifiées, ouvertes, terminé. */
export async function etatParcours(parcoursProduitId: string, apprenant: string) {
  const p = await prisma.parcoursProduit.findUnique({ where: { produitId: parcoursProduitId }, select: { ordreImpose: true, certificatFinal: true, etapes: { orderBy: { ordre: "asc" }, select: { formationProduitId: true, ordre: true, obligatoire: true } } } });
  if (!p) return null;
  const certs = await prisma.certificat.findMany({ where: { produitId: { in: p.etapes.map((e) => e.formationProduitId) }, apprenant, revoqueAt: null }, select: { produitId: true } });
  const certifiees = new Set(certs.map((c) => c.produitId));
  // Une formation sans certificat individuel peut aussi valider une étape du parcours.
  const visibles = { actif: true, statut: "publie" };
  const sansCertificat = await prisma.formation.findMany({
    where: { produitId: { in: p.etapes.map(e => e.formationProduitId) }, certif: false },
    select: { produitId: true, certifLeconsPct: true, certifQuizRequis: true, certifDevoirsRequis: true,
      chapitres: { where: visibles, select: { lecons: { where: visibles, select: {
        id: true, type: true, quiz: { select: { id: true } },
        progressions: { where: { clientEmail: apprenant, complete: true }, select: { id: true } },
        rendus: { where: { apprenant, statut: "valide" }, select: { id: true } },
      } } } } },
  });
  for (const f of sansCertificat) {
    const lecons = f.chapitres.flatMap(ch => ch.lecons);
    const quiz = lecons.filter(l => l.type === "quiz" && l.quiz).map(l => l.id);
    const reussis = quiz.length ? await prisma.tentativeQuiz.findMany({ where: { apprenant, leconId: { in: quiz }, reussi: true }, select: { leconId: true }, distinct: ["leconId"] }) : [];
    if (eligibiliteCertificat(f, {
      lecons: lecons.map(l => l.id), completes: new Set(lecons.filter(l => l.progressions.length).map(l => l.id)),
      quiz, quizReussis: new Set(reussis.map(t => t.leconId)), devoirs: lecons.filter(l => l.type === "devoir").map(l => l.id),
      devoirsValides: new Set(lecons.filter(l => l.rendus.length).map(l => l.id)),
    }).eligible) certifiees.add(f.produitId);
  }
  const etapes: EtapeEtat[] = p.etapes.map((e) => ({ ...e, certifiee: certifiees.has(e.formationProduitId) }));
  return { etapes, ouvertes: etapesOuvertes(etapes, p.ordreImpose), termine: parcoursTermine(etapes), certificatFinal: p.certificatFinal };
}

/** Pour un jeton donné, seules les voies d'accès de sa commande peuvent l'ouvrir. */
export async function formationOuverteDansCommande(commandeId: string, produitId: string, apprenant: string) {
  const parcours = await prisma.parcoursProduit.findMany({
    where: { produit: { lignesCommande: { some: { commandeId } } }, etapes: { some: { formationProduitId: produitId } } },
    select: { produitId: true, ordreImpose: true },
  });
  if (!parcours.length || parcours.some(p => !p.ordreImpose)) return true;
  const independant = await prisma.ligneCommande.findFirst({
    where: { commandeId, OR: [{ produitId }, { produit: { bundleProduit: { elements: { some: { produitInclusId: produitId } } } } }] },
    select: { id: true },
  });
  if (independant) return true;
  const adhesions = await prisma.adhesion.findMany({
    where: { commandeIds: { has: commandeId }, statut: "active", abonnement: { contenus: { some: { produitInclusId: produitId } } } },
    select: { fin: true, statut: true, abonnement: { select: { graceJours: true } } },
  });
  if (adhesions.some(a => adhesionActive(a, a.abonnement.graceJours))) return true;
  for (const p of parcours) {
    const etat = await etatParcours(p.produitId, apprenant);
    if (etat?.ouvertes.has(produitId)) return true;
  }
  return false;
}

/**
 * Après chaque certificat de formation : délivre le certificat final des parcours qui la
 * contiennent et que l'apprenant a achetés, si toutes les étapes obligatoires sont certifiées.
 */
export async function verifierCertificatsParcours(formationProduitId: string, apprenant: string, nom: string) {
  const etapes = await prisma.etapeParcours.findMany({ where: { formationProduitId }, select: { parcours: { select: { produitId: true, certificatFinal: true, produit: { select: { nom: true, tenantId: true, tenant: { select: { nomBoutique: true } } } } } } } });
  for (const e of etapes) {
    const pp = e.parcours;
    if (!pp.certificatFinal) continue;
    // L'apprenant doit avoir acheté le parcours (commande payée).
    const achat = await prisma.ligneCommande.findFirst({
      where: { produitId: pp.produitId, commande: { paiementStatut: PAIEMENT.PAYE, statut: { not: "annulee" }, ...(apprenant.startsWith("commande:") ? { id: apprenant.slice(9) } : { clientEmail: { equals: apprenant, mode: "insensitive" } }) } },
      select: { id: true },
    });
    if (!achat) continue;
    const etat = await etatParcours(pp.produitId, apprenant);
    if (!etat?.termine) continue;
    const deja = await prisma.certificat.findUnique({ where: { produitId_apprenant: { produitId: pp.produitId, apprenant } }, select: { id: true } });
    if (deja) continue;
    await prisma.certificat.create({ data: { code: genererCodeCertificat(), produitId: pp.produitId, tenantId: pp.produit.tenantId, apprenant, nom, formationTitre: pp.produit.nom, boutiqueNom: pp.produit.tenant.nomBoutique } }).catch(() => null);
    await notifierMarchand({ tenantId: pp.produit.tenantId, type: "nouvelle_commande", lien: `/dashboard/produits/${pp.produitId}`, titre: `Parcours terminé : ${pp.produit.nom}`, message: `${nom} a obtenu le certificat final du parcours.` }).catch(() => {});
  }
}

export { cleApprenant };
