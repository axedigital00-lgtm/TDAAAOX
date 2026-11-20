// Règles pures des produits numériques avancés (services, abonnements, parcours, projets) :
// schémas de validation, calculs de dates, droits et transitions d'état. Aucune base de données.
import { z } from "zod";
import { normaliserDisponibilites } from "./creneaux";

const heure = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Heure au format HH:MM");
const jourIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date au format AAAA-MM-JJ");
const urlHttps = z.string().trim().url().max(2000).refine((u) => u.startsWith("https://"), "Adresse https requise");

// ─── Service ────────────────────────────────────────────────────────────────

export const questionBriefSchema = z.object({
  id: z.string().trim().min(1).max(40),
  label: z.string().trim().min(1).max(300),
  type: z.enum(["texte", "long", "choix", "fichier", "date"]),
  requis: z.boolean().default(false),
  options: z.array(z.string().trim().min(1).max(120)).max(30).optional(),
}).refine((q) => q.type !== "choix" || (q.options?.length ?? 0) >= 2, "Une question à choix demande au moins deux options");

export const serviceSchema = z.object({
  mode: z.enum(["rendez_vous", "livrable"]),
  seances: z.number().int().min(1).max(100).default(1),
  dureeMin: z.number().int().min(10).max(600).default(60),
  lieu: z.enum(["visio", "presentiel", "telephone", "whatsapp"]).default("visio"),
  lienVisio: urlHttps.nullable().optional(),
  adresse: z.string().trim().max(400).nullable().optional(),
  fuseau: z.string().trim().min(3).max(60).default("Africa/Douala"),
  disponibilites: z.array(z.object({ jour: z.number().int().min(0).max(6), debut: heure, fin: heure })
    .refine((d) => d.fin > d.debut, "La fin doit suivre le début")).max(50).default([]),
  indisponibilites: z.array(z.object({ du: jourIso, au: jourIso }).refine((c) => c.au >= c.du, "Période inversée")).max(100).default([]),
  tamponMin: z.number().int().min(0).max(240).default(15),
  preavisHeures: z.number().int().min(0).max(720).default(24),
  horizonJours: z.number().int().min(1).max(365).default(60),
  maxParJour: z.number().int().min(1).max(50).nullable().optional(),
  validationManuelle: z.boolean().default(false),
  delaiLivraisonJours: z.number().int().min(1).max(365).nullable().optional(),
  revisionsIncluses: z.number().int().min(0).max(20).default(1),
  brief: z.array(questionBriefSchema).max(30).default([]),
}).superRefine((s, ctx) => {
  if (s.mode === "rendez_vous" && !normaliserDisponibilites(s.disponibilites).length) {
    ctx.addIssue({ code: "custom", path: ["disponibilites"], message: "Ajoutez au moins une plage de disponibilité" });
  }
  if (s.mode === "livrable" && !s.delaiLivraisonJours) {
    ctx.addIssue({ code: "custom", path: ["delaiLivraisonJours"], message: "Indiquez le délai de livraison" });
  }
  if (s.lieu === "presentiel" && !s.adresse?.trim()) {
    ctx.addIssue({ code: "custom", path: ["adresse"], message: "Indiquez l'adresse du rendez-vous" });
  }
});
export type ReglagesService = z.infer<typeof serviceSchema>;

export type QuestionBrief = z.infer<typeof questionBriefSchema>;

/** Réponses du client au brief : chaque question requise renseignée, rien d'inconnu. */
export function validerBrief(questions: QuestionBrief[], reponses: Record<string, unknown>): { ok: true; propres: Record<string, string> } | { ok: false; erreur: string } {
  const propres: Record<string, string> = {};
  for (const q of questions) {
    const brut = reponses[q.id];
    const v = typeof brut === "string" ? brut.trim().slice(0, 5000) : "";
    if (q.requis && !v) return { ok: false, erreur: `« ${q.label} » est obligatoire` };
    if (v && q.type === "choix" && !q.options?.includes(v)) return { ok: false, erreur: `Réponse invalide pour « ${q.label} »` };
    if (v && q.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return { ok: false, erreur: `Date invalide pour « ${q.label} »` };
    if (v && q.type === "fichier" && !/^https:\/\//.test(v)) return { ok: false, erreur: `Lien https attendu pour « ${q.label} »` };
    if (v) propres[q.id] = v;
  }
  return { ok: true, propres };
}

export type StatutCommandeService = "brief_attendu" | "a_planifier" | "en_cours" | "livre" | "revision" | "termine" | "annule";

/** Statut de départ d'un achat de service : brief à remplir s'il y a des questions. */
export function statutInitialService(mode: "rendez_vous" | "livrable", nbQuestions: number): StatutCommandeService {
  if (nbQuestions > 0) return "brief_attendu";
  return mode === "rendez_vous" ? "a_planifier" : "en_cours";
}

/** Échéance d'un livrable : délai compté à partir de la réception du brief. */
export function echeanceLivrable(depart: Date, delaiJours: number | null | undefined): Date | null {
  return delaiJours ? new Date(depart.getTime() + delaiJours * 86_400_000) : null;
}

/** Le client peut-il demander une révision ? */
export function peutDemanderRevision(statut: string, utilisees: number, incluses: number): boolean {
  return statut === "livre" && utilisees < incluses;
}

/** Une séance peut-elle encore être annulée ou déplacée par le client (même préavis que la réservation) ? */
export function peutModifierSeance(debut: Date, preavisHeures: number, maintenant = new Date()): boolean {
  return debut.getTime() - maintenant.getTime() >= preavisHeures * 3_600_000;
}

// ─── Abonnement ─────────────────────────────────────────────────────────────

export const abonnementSchema = z.object({
  periodeJours: z.number().int().min(1).max(3660),
  essaiJours: z.number().int().min(0).max(90).default(0),
  graceJours: z.number().int().min(0).max(30).default(0),
  rappelJours: z.number().int().min(0).max(30).default(3),
  avantages: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
  remiseMembresPct: z.number().int().min(1).max(90).nullable().optional(),
  contenus: z.array(z.string().min(1).max(40)).max(200).default([]),
});

/**
 * Nouvelle fin d'adhésion après un achat : un renouvellement avant l'échéance prolonge la date
 * de fin (aucun jour payé n'est perdu) ; après expiration, la période repart d'aujourd'hui.
 * Les jours d'essai ne s'ajoutent qu'au tout premier achat.
 */
export function prolongerAdhesion(p: { finActuelle: Date | null; periodeJours: number; essaiJours: number; premierAchat: boolean }, maintenant = new Date()): Date {
  const base = p.finActuelle && p.finActuelle.getTime() > maintenant.getTime() ? p.finActuelle : maintenant;
  const jours = p.periodeJours + (p.premierAchat ? p.essaiJours : 0);
  return new Date(base.getTime() + jours * 86_400_000);
}

/** Adhésion donnant accès maintenant (fin + délai de grâce non dépassés). */
export function adhesionActive(a: { statut: string; fin: Date }, graceJours: number, maintenant = new Date()): boolean {
  return a.statut === "active" && a.fin.getTime() + graceJours * 86_400_000 > maintenant.getTime();
}

/** Le rappel de renouvellement est-il dû (une seule fois par période) ? */
export function rappelAbonnementDu(a: { statut: string; fin: Date; rappelEnvoyeAt: Date | null }, rappelJours: number, maintenant = new Date()): boolean {
  if (a.statut !== "active" || rappelJours <= 0) return false;
  const debutFenetre = a.fin.getTime() - rappelJours * 86_400_000;
  if (maintenant.getTime() < debutFenetre || maintenant.getTime() > a.fin.getTime()) return false;
  return !a.rappelEnvoyeAt || a.rappelEnvoyeAt.getTime() < debutFenetre;
}

// ─── Parcours ───────────────────────────────────────────────────────────────

export const parcoursSchema = z.object({
  ordreImpose: z.boolean().default(true),
  certificatFinal: z.boolean().default(true),
  etapes: z.array(z.object({ formationProduitId: z.string().min(1).max(40), obligatoire: z.boolean().default(true) })).min(2, "Un parcours enchaîne au moins deux formations").max(30),
});

export type EtapeEtat = { formationProduitId: string; ordre: number; obligatoire: boolean; certifiee: boolean };

/** Étapes ouvertes : toutes si l'ordre est libre ; sinon jusqu'à la première étape obligatoire non certifiée incluse. */
export function etapesOuvertes(etapes: EtapeEtat[], ordreImpose: boolean): Set<string> {
  const triees = [...etapes].sort((a, b) => a.ordre - b.ordre);
  if (!ordreImpose) return new Set(triees.map((e) => e.formationProduitId));
  const ouvertes = new Set<string>();
  for (const e of triees) {
    ouvertes.add(e.formationProduitId);
    if (e.obligatoire && !e.certifiee) break;
  }
  return ouvertes;
}

/** Certificat final : toutes les étapes obligatoires certifiées (et au moins une étape obligatoire). */
export function parcoursTermine(etapes: EtapeEtat[]): boolean {
  const obligatoires = etapes.filter((e) => e.obligatoire);
  return obligatoires.length > 0 && obligatoires.every((e) => e.certifiee);
}

// ─── Projets évalués (grille) ───────────────────────────────────────────────

export const grilleSchema = z.array(z.object({
  id: z.string().trim().min(1).max(40),
  critere: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional(),
  points: z.number().int().min(1).max(100),
})).min(1).max(20);
export type Grille = z.infer<typeof grilleSchema>;

export const evaluationSchema = z.array(z.object({
  critereId: z.string().min(1).max(40),
  points: z.number().int().min(0).max(100),
  commentaire: z.string().trim().max(2000).optional(),
}));

/** Note sur 100 d'une évaluation par critères (points plafonnés au barème de chaque critère). */
export function noteGrille(grille: Grille, evaluation: z.infer<typeof evaluationSchema>): { note: number; complete: boolean } {
  const total = grille.reduce((s, c) => s + c.points, 0);
  let obtenus = 0, notes = 0;
  for (const c of grille) {
    const e = evaluation.find((x) => x.critereId === c.id);
    if (!e) continue;
    notes++;
    obtenus += Math.min(e.points, c.points);
  }
  return { note: total ? Math.round((obtenus / total) * 100) : 0, complete: notes === grille.length };
}

// ─── Formation : fiche et accès ─────────────────────────────────────────────

export const ficheFormationSchema = z.object({
  sousTitre: z.string().trim().max(200).nullable().optional(),
  objectifs: z.array(z.string().trim().min(1).max(300)).max(20).optional(),
  competences: z.array(z.string().trim().min(1).max(120)).max(30).optional(),
  publicCible: z.string().trim().max(2000).nullable().optional(),
  prerequisTexte: z.string().trim().max(2000).nullable().optional(),
  bandeAnnonceUrl: urlHttps.nullable().optional(),
  accesDureeJours: z.number().int().min(1).max(3660).nullable().optional(),
  mode: z.enum(["autonome", "cohorte"]).optional(),
  questionsActives: z.boolean().optional(),
  certifProjetsRequis: z.boolean().optional(),
});

export const sessionFormationSchema = z.object({
  nom: z.string().trim().min(1).max(120),
  debut: z.coerce.date(),
  fin: z.coerce.date().nullable().optional(),
  places: z.number().int().min(1).max(100000).nullable().optional(),
}).refine((s) => !s.fin || s.fin > s.debut, "La fin doit suivre le début");

/** Fin d'accès d'une formation achetée : null = à vie ; sinon durée choisie, bornée par la fin de cohorte. */
export function finAccesFormation(p: { accesDureeJours: number | null; finSession?: Date | null }, depart = new Date()): Date | null {
  const parDuree = p.accesDureeJours ? new Date(depart.getTime() + p.accesDureeJours * 86_400_000) : null;
  if (parDuree && p.finSession) return parDuree < p.finSession ? parDuree : p.finSession;
  return parDuree ?? p.finSession ?? null;
}

/** Contenu d'une leçon « intégration » accepté : https et hôte d'une liste connue (pas d'iframe arbitraire). */
const HOTES_INTEGRATION = ["www.canva.com", "canva.com", "www.figma.com", "figma.com", "docs.google.com", "www.loom.com", "loom.com", "player.vimeo.com", "www.youtube.com", "youtube.com", "www.youtube-nocookie.com", "drive.google.com", "miro.com", "www.miro.com", "codepen.io", "replit.com", "www.notion.so", "notion.so", "app.genially.com", "view.genially.com", "h5p.org"];
export function integrationAutorisee(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && HOTES_INTEGRATION.includes(u.hostname);
  } catch { return false; }
}
