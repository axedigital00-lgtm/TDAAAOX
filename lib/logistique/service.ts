// Service du réseau logistique : orchestre les moteurs purs, la base et les commandes existantes.
// Toute action sensible écrit dans JournalLogistique ; tout événement passe par EvenementSortant.
import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { chiffrer } from "@/lib/chiffrement";
import { assignerLivreurCommande, changerStatutCommande } from "@/lib/cycle-livraison";
import { notifierMarchand } from "@/lib/notifications-marchand";
import { slugify } from "@/lib/utils";
import { motifsInegibilite } from "./classement";
import { courseActive, courseAnnulable, preuveSuffisante, statutCommandeDe, transitionCourse, type PreuveRequise } from "./course";
import { consommer, liberer, annulerConsommation, reserver, soldes, type Ecriture } from "./credits";
import { dansDeploiement, decider, exclusionsApresRefus, POLITIQUE_DEFAUT, type PolitiqueDispatch } from "./dispatch";
import { lirePosition } from "./position";
import { calculerScore } from "./score";
import { itineraire } from "./routage";
import { detecterAnomalies, distanceM, ETAT_INITIAL, evaluerGeozone } from "./suivi";
import { calculerDevis, devisEncoreValable, type DemandeDevis, type RegleTarif } from "./tarifs";
import type { BesoinLivraison, Candidat, IndicateursScore, ModeDispatch, ResultatCourse, StatutCourse, StatutVerification, Vehicule } from "./types";
import { documentValide, statutDossier, transitionPermise } from "./verification";

export class ErreurLogistique extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export type Acteur = { type: "marchand" | "fournisseur" | "admin" | "systeme"; id?: string | null };
type Tx = Prisma.TransactionClient;
const SYSTEME: Acteur = { type: "systeme" };
const JSONV = (v: unknown) => JSON.parse(JSON.stringify(v ?? null)) as Prisma.InputJsonValue;

export const DOCUMENTS_OBLIGATOIRES: Record<string, string[]> = { societe: ["registre_commerce", "identifiant_fiscal"], livreur: ["piece_identite"] };
export const TYPES_DOCUMENT = ["registre_commerce", "identifiant_fiscal", "autorisation", "assurance", "piece_identite", "permis"] as const;
const MIMES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const TAILLE_MAX = 2_000_000;

async function journal(db: Tx | typeof prisma, a: Acteur, action: string, entite: string, entiteId: string | null, avant?: unknown, apres?: unknown) {
  await db.journalLogistique.create({ data: { acteurType: a.type, acteurId: a.id ?? null, action, entite, entiteId, avant: avant === undefined ? undefined : JSONV(avant), apres: apres === undefined ? undefined : JSONV(apres) } });
}
const emettre = (tx: Tx, type: string, donnees: Record<string, unknown>) => tx.evenementSortant.create({ data: { type, donnees: JSONV(donnees) } });
const evenementCourse = (tx: Tx, courseId: string, type: string, a: Acteur, statut?: string, donnees: Record<string, unknown> = {}) =>
  tx.evenementCourse.create({ data: { courseId, type, statut, acteurType: a.type, acteurId: a.id ?? null, donnees: JSONV(donnees) } });

// ─── Fournisseurs ─────────────────────────────────────────────────────
const vehicule = z.enum(["moto", "velo", "voiture", "fourgon", "camion", "a_pied", "autre"]);
export const fournisseurSchema = z.object({
  type: z.enum(["societe", "livreur"]),
  nom: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).nullish(),
  raisonSociale: z.string().trim().max(160).nullish(),
  registre: z.string().trim().max(60).nullish(),
  identifiantFiscal: z.string().trim().max(60).nullish(),
  adresseLegale: z.string().trim().max(240).nullish(),
  adresseOperation: z.string().trim().max(240).nullish(),
  telephone: z.string().trim().min(8).max(30),
  email: z.string().trim().email().max(200).nullish().or(z.literal("").transform(() => null)),
  pays: z.string().trim().length(2).toUpperCase().default("CM"),
  capaciteMax: z.number().int().min(1).max(5000).default(3),
  vehicules: z.array(vehicule).min(1).max(7),
  poidsMaxKg: z.number().positive().max(100000).nullish(),
  zones: z.array(z.object({ ville: z.string().trim().min(2).max(80), quartier: z.string().trim().max(80).nullish() })).min(1).max(100),
  tarif: z.object({
    modele: z.enum(["zone", "distance", "poids", "volume", "hybride", "contrat"]), base: z.number().min(0), parKm: z.number().min(0).optional(), kmInclus: z.number().min(0).optional(),
    parKg: z.number().min(0).optional(), kgInclus: z.number().min(0).optional(), parLitre: z.number().min(0).optional(), litresInclus: z.number().min(0).optional(), zones: z.record(z.string(), z.number().min(0)).optional(),
    enlevement: z.number().min(0).optional(), zoneEloignee: z.number().min(0).optional(), expressPct: z.number().min(0).max(300).optional(), manutention: z.number().min(0).optional(), retour: z.number().min(0).optional(), attenteParMin: z.number().min(0).optional(), nuitWeekendPct: z.number().min(0).max(300).optional(), prixContrat: z.number().min(0).optional(),
  }),
  reglement: z.string().trim().max(200).nullish(),
});

export async function fournisseursDe(userId: string) {
  return prisma.fournisseurLogistique.findMany({ where: { OR: [{ proprietaireId: userId }, { membres: { some: { userId } } }] }, include: { zones: true, vehiculesFlotte: true, tarifs: { where: { actif: true }, orderBy: { version: "desc" }, take: 1 }, documents: { select: { id: true, type: true, statut: true, nomFichier: true, expireLe: true, motifRejet: true, createdAt: true } } } });
}
export async function peutGerer(userId: string, fournisseurId: string) {
  return !!(await prisma.fournisseurLogistique.findFirst({ where: { id: fournisseurId, OR: [{ proprietaireId: userId }, { membres: { some: { userId } } }] }, select: { id: true } }));
}

export async function creerFournisseur(userId: string, brut: unknown) {
  const r = fournisseurSchema.safeParse(brut);
  if (!r.success) throw new ErreurLogistique(r.error.issues[0]?.message ?? "Données invalides");
  const d = r.data;
  if (await prisma.fournisseurLogistique.findFirst({ where: { proprietaireId: userId, type: d.type }, select: { id: true } })) throw new ErreurLogistique("Ce compte a déjà un profil de ce type", 409);
  const livreur = d.type === "livreur" ? await prisma.livreur.findUnique({ where: { userId }, select: { id: true } }) : null;
  const base = slugify(d.nom) || "transporteur";
  const slug = `${base}-${randomBytes(3).toString("hex")}`;
  return prisma.$transaction(async (tx) => {
    const f = await tx.fournisseurLogistique.create({
      data: {
        type: d.type, nom: d.nom, slug, description: d.description, raisonSociale: d.raisonSociale, registre: d.registre, identifiantFiscal: d.identifiantFiscal, adresseLegale: d.adresseLegale, adresseOperation: d.adresseOperation,
        telephone: d.telephone, email: d.email, pays: d.pays, capaciteMax: d.capaciteMax, vehicules: d.vehicules, poidsMaxKg: d.poidsMaxKg, reglement: d.reglement ? chiffrer(d.reglement) : null, livreurId: livreur?.id ?? null, proprietaireId: userId,
        membres: { create: { userId, role: "admin" } },
        zones: { create: d.zones.map((z) => ({ pays: d.pays, ville: z.ville, quartier: z.quartier || null })) },
        tarifs: { create: { version: 1, regle: JSONV({ ...d.tarif, devise: "XAF" }) } },
      },
    });
    await journal(tx, { type: "fournisseur", id: userId }, "fournisseur.cree", "FournisseurLogistique", f.id, undefined, { type: d.type, nom: d.nom });
    return f;
  });
}

export async function majDisponibilite(userId: string, id: string, disponible: boolean) {
  if (!(await peutGerer(userId, id))) throw new ErreurLogistique("Accès refusé", 403);
  await prisma.fournisseurLogistique.update({ where: { id }, data: { disponible } });
  await journal(prisma, { type: "fournisseur", id: userId }, "fournisseur.disponibilite", "FournisseurLogistique", id, undefined, { disponible });
}

export async function publierTarif(userId: string, id: string, brut: unknown) {
  if (!(await peutGerer(userId, id))) throw new ErreurLogistique("Accès refusé", 403);
  const r = fournisseurSchema.shape.tarif.safeParse(brut);
  if (!r.success) throw new ErreurLogistique("Tarif invalide");
  return prisma.$transaction(async (tx) => {
    const der = await tx.regleTarifFournisseur.findFirst({ where: { fournisseurId: id }, orderBy: { version: "desc" }, select: { version: true } });
    await tx.regleTarifFournisseur.updateMany({ where: { fournisseurId: id, actif: true }, data: { actif: false } });
    const t = await tx.regleTarifFournisseur.create({ data: { fournisseurId: id, version: (der?.version ?? 0) + 1, regle: JSONV({ ...r.data, devise: "XAF" }) } });
    await journal(tx, { type: "fournisseur", id: userId }, "tarif.publie", "FournisseurLogistique", id, undefined, { version: t.version });
    return t;
  });
}

export async function soumettreDocument(userId: string, fournisseurId: string, d: { type: string; nomFichier: string; mime: string; base64: string; expireLe?: string | null }) {
  if (!(await peutGerer(userId, fournisseurId))) throw new ErreurLogistique("Accès refusé", 403);
  if (!(TYPES_DOCUMENT as readonly string[]).includes(d.type)) throw new ErreurLogistique("Type de document inconnu");
  if (!MIMES.has(d.mime)) throw new ErreurLogistique("Format accepté : PDF, JPEG, PNG ou WebP");
  const taille = Math.floor(d.base64.length * 0.75);
  if (!taille || taille > TAILLE_MAX) throw new ErreurLogistique("Fichier trop lourd : 2 Mo maximum");
  const expireLe = d.expireLe ? new Date(d.expireLe) : null;
  if (expireLe && Number.isNaN(expireLe.getTime())) throw new ErreurLogistique("Date d'expiration invalide");
  const doc = await prisma.documentVerification.create({ data: { fournisseurId, type: d.type, statut: "en_revue", nomFichier: d.nomFichier.slice(0, 160), mime: d.mime, taille, contenuChiffre: chiffrer(d.base64), expireLe }, select: { id: true, type: true, statut: true } });
  await recalculerStatutLegal(fournisseurId);
  await journal(prisma, { type: "fournisseur", id: userId }, "document.soumis", "DocumentVerification", doc.id, undefined, { type: d.type });
  return doc;
}

export async function recalculerStatutLegal(fournisseurId: string, db: Tx | typeof prisma = prisma) {
  const f = await db.fournisseurLogistique.findUniqueOrThrow({ where: { id: fournisseurId }, select: { type: true, statutLegal: true, documents: { select: { type: true, statut: true, expireLe: true } } } });
  const maintenant = new Date();
  const docs = f.documents.map((d) => ({ ...d, statut: d.statut as StatutVerification }));
  const statutLegal = statutDossier(DOCUMENTS_OBLIGATOIRES[f.type], docs, maintenant);
  const valide = (t: string) => docs.some((d) => d.type === t && documentValide(d, maintenant));
  await db.fournisseurLogistique.update({ where: { id: fournisseurId }, data: { statutLegal, assuranceVerifiee: valide("assurance"), identiteVerifiee: valide("piece_identite") } });
  return statutLegal;
}

export async function deciderDocument(adminId: string, id: string, statut: "verifie" | "rejete" | "suspendu", motif?: string | null, expireLe?: string | null) {
  const doc = await prisma.documentVerification.findUnique({ where: { id }, select: { id: true, statut: true, fournisseurId: true, type: true, expireLe: true } });
  if (!doc) throw new ErreurLogistique("Document introuvable", 404);
  if (!transitionPermise(doc.statut as StatutVerification, statut)) throw new ErreurLogistique(`Transition interdite : ${doc.statut} vers ${statut}`, 409);
  if (statut !== "verifie" && !motif?.trim()) throw new ErreurLogistique("Motif requis");
  const fin = expireLe ? new Date(expireLe) : doc.expireLe;
  if (statut === "verifie" && fin && fin <= new Date()) throw new ErreurLogistique("Document déjà expiré", 409);
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.documentVerification.updateMany({ where: { id, statut: doc.statut }, data: { statut, motifRejet: motif?.trim() || null, relecteurId: adminId, relueLe: new Date(), expireLe: fin } });
    if (!count) throw new ErreurLogistique("Ce document vient d'être traité", 409);
    const legal = await recalculerStatutLegal(doc.fournisseurId, tx);
    await journal(tx, { type: "admin", id: adminId }, "document.decision", "DocumentVerification", id, { statut: doc.statut }, { statut, motif, legal });
    await emettre(tx, "verification.changed", { fournisseurId: doc.fournisseurId, statut: legal });
  });
  await recalculerScore(doc.fournisseurId, "verification");
}

export async function suspendreFournisseur(adminId: string, id: string, suspendu: boolean, motif?: string | null) {
  if (suspendu && !motif?.trim()) throw new ErreurLogistique("Motif requis");
  await prisma.$transaction(async (tx) => {
    const avant = await tx.fournisseurLogistique.findUnique({ where: { id }, select: { suspendu: true } });
    if (!avant) throw new ErreurLogistique("Fournisseur introuvable", 404);
    await tx.fournisseurLogistique.update({ where: { id }, data: { suspendu, motifSuspension: suspendu ? motif!.trim() : null, disponible: suspendu ? false : undefined } });
    await journal(tx, { type: "admin", id: adminId }, suspendu ? "fournisseur.suspendu" : "fournisseur.retabli", "FournisseurLogistique", id, avant, { suspendu, motif });
    await emettre(tx, "provider.suspended", { fournisseurId: id, suspendu });
  });
}

// ─── Score ────────────────────────────────────────────────────────────
export async function resultatsFournisseur(fournisseurId: string): Promise<ResultatCourse[]> {
  const [courses, avis, incidents] = await Promise.all([
    prisma.courseLivraison.findMany({ where: { fournisseurId, statut: { in: ["livree", "echec", "retournee", "annulee", "litige"] } }, select: { id: true, statut: true, responsableIssue: true, finPrevue: true, livreeLe: true, updatedAt: true } }),
    prisma.avisFournisseur.findMany({ where: { fournisseurId }, select: { courseId: true, note: true } }),
    prisma.incidentCourse.findMany({ where: { fournisseurId, type: { in: ["incident", "litige"] } }, select: { courseId: true, statut: true, responsable: true } }),
  ]);
  const notes = new Map(avis.map((a) => [a.courseId, a.note]));
  return courses.map((c) => {
    const inc = incidents.filter((i) => i.courseId === c.id);
    const issue = c.statut === "livree" ? "livree" : c.statut === "annulee" ? "annulee" : "echec";
    return {
      date: (c.livreeLe ?? c.updatedAt).getTime(), issue, responsable: (c.responsableIssue ?? "inconnu") as ResultatCourse["responsable"],
      aTemps: c.finPrevue && c.livreeLe ? c.livreeLe <= c.finPrevue : null, note: notes.get(c.id) ?? null,
      // Une plainte ne pèse qu'une fois établie contre le fournisseur.
      incident: inc.some((i) => i.statut === "resolu" && i.responsable === "fournisseur"),
      exclue: c.statut === "litige",
    } satisfies ResultatCourse;
  });
}

export async function recalculerScore(fournisseurId: string, motif: string) {
  const f = await prisma.fournisseurLogistique.findUnique({ where: { id: fournisseurId }, select: { statutLegal: true, assuranceVerifiee: true, identiteVerifiee: true, scoreGlobal: true } });
  if (!f) return null;
  const s = calculerScore({ resultats: await resultatsFournisseur(fournisseurId), maintenant: Date.now(), legal: { verifie: f.statutLegal === "verifie", assurance: f.assuranceVerifiee, identite: f.identiteVerifiee } });
  await prisma.$transaction(async (tx) => {
    await tx.fournisseurLogistique.update({ where: { id: fournisseurId }, data: { score: JSONV(s), scoreGlobal: s.global, scoreCalculeLe: new Date() } });
    await tx.historiqueScore.create({ data: { fournisseurId, global: s.global, score: JSONV(s), motif } });
    if (s.global !== f.scoreGlobal) await emettre(tx, "provider.score_updated", { fournisseurId, avant: f.scoreGlobal, apres: s.global });
  });
  return s;
}

// ─── Crédits ──────────────────────────────────────────────────────────
const lireEcritures = async (db: Tx | typeof prisma, tenantId: string): Promise<Ecriture[]> =>
  (await db.ecritureCredit.findMany({ where: { tenantId }, select: { type: true, montant: true, courseId: true, reference: true } })).map((e) => ({ ...e, type: e.type as Ecriture["type"], montant: Number(e.montant), courseId: /^(?:res|con|lib|ann):(.+)$/.exec(e.reference)?.[1] ?? e.courseId })); // clé = course + tentative
const verrouMarchand = (tx: Tx, tenantId: string) => tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`credits:${tenantId}`}))`;
const ecrire = (tx: Tx, tenantId: string, e: Ecriture | null) => (e ? tx.ecritureCredit.create({ data: { tenantId, courseId: e.courseId ?? null, type: e.type, montant: e.montant, reference: e.reference } }) : null);

export async function soldeCredits(tenantId: string) { return soldes(await lireEcritures(prisma, tenantId)); }

/** Attribution mensuelle selon la configuration centrale ; sans droit actif, aucun crédit. Idempotente par mois. */
export async function attribuerCreditsMensuels(maintenant = new Date()) {
  const droits = await prisma.droitLivraisonPlan.findMany({ where: { actif: true, creditsMensuels: { gt: 0 } } });
  const mois = maintenant.toISOString().slice(0, 7);
  let attribues = 0;
  for (const d of droits) {
    const tenants = await prisma.tenant.findMany({ where: { planType: d.plan, planExpiresAt: { gt: maintenant } }, select: { id: true } });
    for (const t of tenants) {
      const ref = `plan:${t.id}:${mois}`;
      const fait = await prisma.$transaction(async (tx) => {
        await verrouMarchand(tx, t.id);
        if (await tx.ecritureCredit.findUnique({ where: { reference: ref }, select: { id: true } })) return false;
        const reste = soldes(await lireEcritures(tx, t.id)).disponible;
        if (reste > 0) await tx.ecritureCredit.create({ data: { tenantId: t.id, type: "expiration", montant: reste, reference: `exp:${t.id}:${mois}` } });
        await tx.ecritureCredit.create({ data: { tenantId: t.id, type: "attribution", montant: d.creditsMensuels, reference: ref } });
        return true;
      });
      if (fait) attribues++;
    }
  }
  return { attribues };
}

// ─── Candidats et décisions ───────────────────────────────────────────
type CourseDb = Prisma.CourseLivraisonGetPayload<object>;
const STATUTS_CHARGE = ["attente_acceptation", "acceptee", "enlevement_planifie", "enlevee", "en_transit", "proche_destination"];
const demandeDe = (c: CourseDb): DemandeDevis => ({ zone: c.quartier ?? c.ville, distanceKm: c.distanceKm, poidsKg: c.poidsKg, express: c.express });
const scoreVide = (): IndicateursScore => calculerScore({ resultats: [], maintenant: Date.now(), legal: { verifie: false } });

async function creditPossible(tenantId: string, prix: number, poidsKg: number | null) {
  const t = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { planType: true, planExpiresAt: true } });
  if (!t?.planExpiresAt || t.planExpiresAt <= new Date()) return 0;
  const d = await prisma.droitLivraisonPlan.findUnique({ where: { plan: t.planType } });
  if (!d?.actif || (d.poidsMaxKg != null && poidsKg != null && poidsKg > d.poidsMaxKg)) return 0;
  const { disponible } = await soldeCredits(tenantId);
  return Math.max(0, Math.min(disponible, prix, d.montantMaxCourse ?? prix));
}

export async function candidatsPour(course: CourseDb) {
  const zone = course.ville ? { zones: { some: { actif: true, pays: course.pays ?? undefined, ville: { equals: course.ville, mode: "insensitive" as const } } } } : {};
  const liste = await prisma.fournisseurLogistique.findMany({ where: zone, include: { tarifs: { where: { actif: true }, orderBy: { version: "desc" }, take: 1 }, documents: { select: { type: true, statut: true, expireLe: true } } }, take: 200 });
  const charges = await prisma.courseLivraison.groupBy({ by: ["fournisseurId"], where: { fournisseurId: { in: liste.map((f) => f.id) }, statut: { in: STATUTS_CHARGE } }, _count: true });
  const maintenant = new Date();
  const devis = new Map<string, Extract<ReturnType<typeof calculerDevis>, { eligible: true }> & { regleVersion: number }>();
  const candidats: Candidat[] = liste.map((f) => {
    const regle = f.tarifs[0];
    const q = regle ? calculerDevis(regle.regle as unknown as RegleTarif, demandeDe(course), { maintenant }) : null;
    if (q?.eligible) devis.set(f.id, { ...q, regleVersion: regle.version });
    const charge = charges.find((x) => x.fournisseurId === f.id)?._count ?? 0;
    const obligatoires = DOCUMENTS_OBLIGATOIRES[f.type];
    const docs = f.documents.map((d) => ({ ...d, statut: d.statut as StatutVerification }));
    const stocke = f.score as unknown as IndicateursScore;
    return {
      id: f.id, type: f.type as Candidat["type"], nom: f.nom, societeParenteId: f.societeParenteId, statutLegal: f.statutLegal as StatutVerification,
      documentsObligatoiresValides: obligatoires.every((t) => docs.some((d) => d.type === t && documentValide(d, maintenant))), suspendu: f.suspendu,
      couvreZone: true, disponible: f.disponible, capaciteRestante: Math.max(0, f.capaciteMax - charge), chargeActive: charge, vehicules: f.vehicules as Vehicule[], poidsMaxKg: f.poidsMaxKg,
      score: stocke?.badges ? stocke : scoreVide(), prix: q?.eligible ? q.prixFournisseur : null, etaMinutes: null, distanceKm: course.distanceKm,
    };
  });
  return { candidats, devis };
}

async function refusDe(courseId: string) {
  return (await prisma.assignationCourse.findMany({ where: { courseId, statut: { in: ["refusee", "expiree"] } }, select: { fournisseurId: true } })).map((a) => a.fournisseurId);
}

export async function politiquePour(tenantId: string): Promise<PolitiqueDispatch> {
  const [g, p] = await Promise.all([
    prisma.politiqueDispatch.findFirst({ where: { portee: "global", actif: true }, orderBy: { version: "desc" } }),
    prisma.preferenceLogistique.findUnique({ where: { tenantId } }),
  ]);
  // Autonomie active par défaut, dans ses garde-fous : forte valeur, note minimale et essai plafonné.
  const base = { ...POLITIQUE_DEFAUT, mode: "autonome", valeurMaxEssai: 25_000, deploiementPct: 100, ...((g?.config as object) ?? {}), version: g?.version ?? POLITIQUE_DEFAUT.version } as PolitiqueDispatch;
  const mode = (p?.mode as ModeDispatch) ?? base.mode;
  return { ...base, mode: mode === "autonome" && !dansDeploiement(tenantId, base.deploiementPct) ? "semi_automatique" : mode, pause: base.pause || p?.pause };
}

export const besoinDe = async (c: CourseDb, exclus: string[]): Promise<BesoinLivraison> => {
  const p = await prisma.preferenceLogistique.findUnique({ where: { tenantId: c.tenantId } });
  return { poidsKg: c.poidsKg, vehiculeRequis: c.vehiculeRequis as Vehicule | null, exclus, budgetMax: p?.budgetMax, exigerVerifie: p?.exigerVerifie };
};

export async function recommandations(courseId: string) {
  const c = await prisma.courseLivraison.findUniqueOrThrow({ where: { id: courseId } });
  const { candidats, devis } = await candidatsPour(c);
  const exclus = exclusionsApresRefus(await refusDe(c.id), candidats);
  const { classer } = await import("./classement");
  const r = classer(candidats, await besoinDe(c, exclus));
  return { ...r, classes: r.classes.map((x) => ({ ...x, devis: devis.get(x.candidat.id) ?? null })) };
}

// ─── Courses ──────────────────────────────────────────────────────────
export async function creerCourse(tenantId: string, commandeId: string, o: { poidsKg?: number | null; express?: boolean; vehiculeRequis?: string | null; quartier?: string | null } = {}) {
  const cmd = await prisma.commande.findFirst({ where: { id: commandeId, tenantId }, select: { id: true, statut: true, ville: true, pays: true, devise: true, latitudeClient: true, longitudeClient: true, numero: true } });
  if (!cmd) throw new ErreurLogistique("Commande introuvable", 404);
  if (["livree", "annulee", "remboursee"].includes(cmd.statut)) throw new ErreurLogistique("Cette commande est déjà terminée", 409);
  const existante = await prisma.courseLivraison.findFirst({ where: { commandeId, statut: { notIn: ["livree", "retournee", "annulee"] } } });
  if (existante) return existante;
  const p = await prisma.preferenceLogistique.findUnique({ where: { tenantId } });
  const a = p?.latEnlevement != null && p.lngEnlevement != null ? { lat: p.latEnlevement, lng: p.lngEnlevement } : null;
  const b = cmd.latitudeClient != null && cmd.longitudeClient != null ? { lat: cmd.latitudeClient, lng: cmd.longitudeClient } : null;
  const reference = `LV-${cmd.numero.slice(-10)}-${randomBytes(2).toString("hex").toUpperCase()}`;
  const route = a && b ? await itineraire([a, b]) : null;
  try {
    return await prisma.$transaction(async (tx) => {
      const c = await tx.courseLivraison.create({ data: {
        reference, tenantId, commandeId, poidsKg: o.poidsKg ?? null, express: !!o.express, vehiculeRequis: o.vehiculeRequis ?? null, quartier: o.quartier ?? null,
        ville: cmd.ville === "—" ? null : cmd.ville, pays: cmd.pays?.length === 2 ? cmd.pays : p?.paysEnlevement ?? null, devise: cmd.devise, preuvesRequises: p?.preuves?.length ? p.preuves : ["otp"],
        latDepart: a?.lat, lngDepart: a?.lng, latArrivee: b?.lat, lngArrivee: b?.lng,
        // Sans coordonnées des deux points, aucune distance n'est calculée.
        distanceKm: a && b ? Math.round((route?.distanceM ?? distanceM(a, b)) / 100) / 10 : null,
      } });
      await evenementCourse(tx, c.id, "delivery.requested", { type: "marchand", id: tenantId }, c.statut);
      await emettre(tx, "delivery.requested", { courseId: c.id, tenantId });
      return c;
    });
  } catch (e: any) {
    if (e?.code === "P2002") return prisma.courseLivraison.findFirstOrThrow({ where: { commandeId, statut: { notIn: ["livree", "retournee", "annulee"] } } });
    throw e;
  }
}

export async function lancerDispatch(courseId: string, acteur: Acteur = SYSTEME) {
  const c = await prisma.courseLivraison.findUnique({ where: { id: courseId } });
  if (!c) throw new ErreurLogistique("Course introuvable", 404);
  if (c.statut !== "attente_fournisseur") throw new ErreurLogistique("Cette course n'attend pas de fournisseur", 409);
  const { candidats } = await candidatsPour(c);
  const politique = await politiquePour(c.tenantId);
  const exclus = exclusionsApresRefus(await refusDe(c.id), candidats);
  const cmd = await prisma.commande.findUnique({ where: { id: c.commandeId }, select: { montantTotal: true } });
  const d = decider({ candidats, besoin: await besoinDe(c, exclus), politique, valeurCommande: cmd?.montantTotal, tentatives: c.tentatives });
  const decision = await prisma.decisionDispatch.create({ data: { courseId, action: d.action, fournisseurId: d.fournisseurId, explication: d.explication, alternatives: JSONV(d.alternatives), ecartes: JSONV(d.ecartes), politiqueVersion: d.politiqueVersion } });
  if (d.action === "assigner") await assignerFournisseur(courseId, d.fournisseurId!, acteur, `auto:${courseId}:${c.tentatives}`, decision.id);
  if (d.action === "escalader") await notifierMarchand({ tenantId: c.tenantId, type: "livraison_echec", titre: `Livraison ${c.reference} : action requise`, message: d.explication, lien: "/dashboard/logistique/reseau", commandeId: c.commandeId });
  return { decision: d, decisionId: decision.id };
}

export async function assignerFournisseur(courseId: string, fournisseurId: string, acteur: Acteur, cle: string, decisionId?: string) {
  const deja = await prisma.assignationCourse.findUnique({ where: { cleIdempotence: cle } });
  if (deja) return deja;
  const c = await prisma.courseLivraison.findUnique({ where: { id: courseId } });
  if (!c) throw new ErreurLogistique("Course introuvable", 404);
  if (c.statut !== "attente_fournisseur") throw new ErreurLogistique("Cette course a déjà un fournisseur", 409);
  const { candidats, devis } = await candidatsPour(c);
  const f = candidats.find((x) => x.id === fournisseurId);
  if (!f) throw new ErreurLogistique("Fournisseur hors zone ou introuvable", 409);
  const exclus = exclusionsApresRefus(await refusDe(c.id), candidats);
  const motifs = motifsInegibilite(f, await besoinDe(c, exclus));
  if (motifs.length) throw new ErreurLogistique(`Fournisseur non éligible : ${motifs.join(", ")}`, 409);
  const q = devis.get(fournisseurId)!;
  if (!devisEncoreValable(q, demandeDe(c), new Date())) throw new ErreurLogistique("Devis expiré : relancez le calcul", 409);
  const credit = await creditPossible(c.tenantId, q.prixFournisseur, c.poidsKg);
  const politique = await politiquePour(c.tenantId);
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`charge:${fournisseurId}`}))`;
      const charge = await tx.courseLivraison.count({ where: { fournisseurId, statut: { in: STATUTS_CHARGE } } });
      const cap = await tx.fournisseurLogistique.findUniqueOrThrow({ where: { id: fournisseurId }, select: { capaciteMax: true } });
      if (charge >= cap.capaciteMax) throw new ErreurLogistique("Capacité du fournisseur atteinte", 409);
      let creditApplique = 0;
      if (credit > 0) {
        await verrouMarchand(tx, c.tenantId);
        const ref = `${c.id}:${c.tentatives}`;
        const r = reserver(await lireEcritures(tx, c.tenantId), ref, credit);
        if (r.ok && r.ecriture) { await tx.ecritureCredit.create({ data: { tenantId: c.tenantId, courseId: c.id, type: "reservation", montant: credit, reference: r.ecriture.reference } }); creditApplique = credit; await emettre(tx, "credits.reserved", { courseId, montant: credit }); }
      }
      const prixMarchand = q.prixFournisseur - creditApplique;
      const quote = await tx.devisLivraison.create({ data: { courseId, fournisseurId, regleVersion: q.regleVersion, detail: JSONV(q.lignes), prixFournisseur: q.prixFournisseur, commission: q.commission, versement: q.versementFournisseur, creditApplique, prixMarchand, devise: q.devise, empreinte: q.empreinte, expireLe: q.expireLe } });
      const { count } = await tx.courseLivraison.updateMany({ where: { id: courseId, statut: "attente_fournisseur" }, data: { statut: "attente_acceptation", fournisseurId, devisId: quote.id, prixFournisseur: q.prixFournisseur, commission: q.commission, versement: q.versementFournisseur, creditApplique, prixMarchand } });
      if (!count) throw new ErreurLogistique("Cette course vient d'être assignée", 409);
      const a = await tx.assignationCourse.create({ data: { courseId, fournisseurId, cleIdempotence: cle, decisionId, expireLe: new Date(Date.now() + politique.delaiAcceptationS * 1000) } });
      await evenementCourse(tx, courseId, "assignment.created", acteur, "attente_acceptation", { fournisseurId, prix: q.prixFournisseur });
      await emettre(tx, "assignment.created", { courseId, assignationId: a.id, fournisseurId, tenantId: c.tenantId });
      await journal(tx, acteur, "assignation.creee", "CourseLivraison", courseId, undefined, { fournisseurId, cle });
      return a;
    });
  } catch (e: any) {
    if (e?.code === "P2002") throw new ErreurLogistique("Cette course a déjà une assignation ouverte", 409);
    throw e;
  }
}

async function libererCreditsCourse(tx: Tx, c: Pick<CourseDb, "id" | "tenantId" | "tentatives">) {
  await verrouMarchand(tx, c.tenantId);
  const e = await lireEcritures(tx, c.tenantId);
  const r = liberer(e, `${c.id}:${c.tentatives}`);
  if (r.ok && r.ecriture) { await tx.ecritureCredit.create({ data: { tenantId: c.tenantId, courseId: c.id, type: "liberation", montant: r.ecriture.montant, reference: r.ecriture.reference } }); await emettre(tx, "credits.released", { courseId: c.id, montant: r.ecriture.montant }); }
}

/** Refus, délai dépassé ou retrait : la course repart proprement et les crédits sont rendus. */
async function fermerAssignation(assignationId: string, statut: "refusee" | "expiree" | "annulee", acteur: Acteur, motif?: string | null) {
  const a = await prisma.assignationCourse.findUnique({ where: { id: assignationId }, include: { course: true } });
  if (!a) throw new ErreurLogistique("Assignation introuvable", 404);
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.assignationCourse.updateMany({ where: { id: a.id, statut: statut === "annulee" ? { in: ["proposee", "acceptee"] } : "proposee" }, data: { statut, motif: motif ?? null, repondueLe: new Date() } });
    if (!count) throw new ErreurLogistique("Assignation déjà traitée", 409);
    await libererCreditsCourse(tx, a.course);
    await tx.courseLivraison.update({ where: { id: a.courseId }, data: { statut: "attente_fournisseur", fournisseurId: null, devisId: null, prixFournisseur: null, commission: null, versement: null, creditApplique: 0, prixMarchand: null, tentatives: { increment: 1 } } });
    await evenementCourse(tx, a.courseId, `assignment.${statut === "refusee" ? "rejected" : statut === "expiree" ? "timeout" : "cancelled"}`, acteur, "attente_fournisseur", { fournisseurId: a.fournisseurId, motif });
    await journal(tx, acteur, `assignation.${statut}`, "CourseLivraison", a.courseId, undefined, { fournisseurId: a.fournisseurId, motif });
    await emettre(tx, "assignment.reassigned", { courseId: a.courseId, tenantId: a.course.tenantId, motif: statut });
  });
  return a.courseId;
}

export async function repondreAssignation(userId: string, assignationId: string, accepte: boolean, motif?: string | null) {
  const a = await prisma.assignationCourse.findUnique({ where: { id: assignationId }, include: { course: true } });
  if (!a) throw new ErreurLogistique("Assignation introuvable", 404);
  if (!(await peutGerer(userId, a.fournisseurId))) throw new ErreurLogistique("Accès refusé", 403);
  const acteur: Acteur = { type: "fournisseur", id: userId };
  if (a.statut === "proposee" && a.expireLe <= new Date()) { const id = await fermerAssignation(a.id, "expiree", SYSTEME, "Délai dépassé"); await lancerDispatch(id); throw new ErreurLogistique("Le délai d'acceptation est dépassé", 410); }
  if (!accepte) { const id = await fermerAssignation(a.id, "refusee", acteur, motif); await lancerDispatch(id).catch(() => {}); return { statut: "refusee" }; }
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.assignationCourse.updateMany({ where: { id: a.id, statut: "proposee", expireLe: { gt: new Date() } }, data: { statut: "acceptee", repondueLe: new Date() } });
    if (!count) throw new ErreurLogistique("Assignation déjà traitée", 409);
    await tx.courseLivraison.update({ where: { id: a.courseId }, data: { statut: "acceptee" } });
    await evenementCourse(tx, a.courseId, "assignment.accepted", acteur, "acceptee");
    await emettre(tx, "assignment.accepted", { courseId: a.courseId, tenantId: a.course.tenantId, fournisseurId: a.fournisseurId });
  });
  const f = await prisma.fournisseurLogistique.findUniqueOrThrow({ where: { id: a.fournisseurId }, select: { livreurId: true, nom: true, telephone: true } });
  if (f.livreurId) await assignerLivreurCommande({ commandeId: a.course.commandeId, tenantId: a.course.tenantId, livreurId: f.livreurId, source: "axia" }).catch(() => null);
  else await prisma.commande.update({ where: { id: a.course.commandeId }, data: { livreurNom: f.nom, livreurTelephone: f.telephone } });
  await synchroniserCommande(a.course.commandeId, a.course.tenantId, "acceptee");
  return { statut: "acceptee" };
}

const CHEMIN = ["en_attente", "confirmee", "en_preparation", "expediee"];
/** Fait avancer la Commande par le cycle existant : stock, notifications et paiement restent gérés au même endroit. */
async function synchroniserCommande(commandeId: string, tenantId: string, s: StatutCourse, echecRaison?: string | null) {
  const cible = statutCommandeDe(s);
  if (!cible) return;
  const cmd = await prisma.commande.findUnique({ where: { id: commandeId }, select: { statut: true } });
  if (!cmd || cmd.statut === cible) return;
  const acteur = { type: "marchand" as const, tenantId, source: "axia" as const };
  const etapes = cible === "livree" || cible === "tentative_echouee" ? [...CHEMIN, cible] : CHEMIN.slice(0, CHEMIN.indexOf(cible) + 1);
  const depart = cmd.statut === "tentative_echouee" ? CHEMIN.indexOf("en_preparation") : etapes.indexOf(cmd.statut);
  for (const statut of etapes.slice(Math.max(depart, 0) + (depart >= 0 ? 1 : 0))) {
    const r = await changerStatutCommande({ commandeId, statut, acteur, echecRaison });
    if (!r.ok) throw new ErreurLogistique(r.error, r.status);
  }
}

async function exigerGestionCourse(acteur: Acteur, c: CourseDb) {
  if (acteur.type === "admin" || acteur.type === "systeme") return;
  if (acteur.type === "marchand") { if (acteur.id !== c.tenantId) throw new ErreurLogistique("Course introuvable", 404); return; }
  if (!c.fournisseurId || !(await peutGerer(acteur.id!, c.fournisseurId))) throw new ErreurLogistique("Accès refusé", 403);
}

export async function avancerCourse(courseId: string, statut: StatutCourse, acteur: Acteur, o: { motif?: string | null; responsable?: string | null } = {}) {
  const c = await prisma.courseLivraison.findUnique({ where: { id: courseId } });
  if (!c) throw new ErreurLogistique("Course introuvable", 404);
  await exigerGestionCourse(acteur, c);
  if (statut === "livree") throw new ErreurLogistique("Une livraison se termine avec sa preuve");
  if (!transitionCourse(c.statut as StatutCourse, statut)) throw new ErreurLogistique(`Transition interdite : ${c.statut} vers ${statut}`, 409);
  if (statut === "annulee" && !courseAnnulable(c.statut as StatutCourse)) throw new ErreurLogistique("Colis déjà enlevé : signalez un échec ou un litige", 409);
  if (statut === "attente_fournisseur") {
    const a = await prisma.assignationCourse.findFirst({ where: { courseId, statut: { in: ["proposee", "acceptee"] } } });
    if (!a) throw new ErreurLogistique("Aucune assignation à retirer", 409);
    await fermerAssignation(a.id, "annulee", acteur, o.motif);
    return { statut };
  }
  await synchroniserCommande(c.commandeId, c.tenantId, statut, o.motif);
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.courseLivraison.updateMany({ where: { id: courseId, statut: c.statut }, data: { statut, ...(["echec", "annulee"].includes(statut) ? { responsableIssue: o.responsable ?? (statut === "annulee" ? "marchand" : "inconnu") } : {}) } });
    if (!count) throw new ErreurLogistique("Cette course vient de changer", 409);
    if (["echec", "annulee", "retournee"].includes(statut)) {
      await libererCreditsCourse(tx, c);
      await tx.assignationCourse.updateMany({ where: { courseId, statut: { in: ["proposee", "acceptee"] } }, data: { statut: statut === "annulee" ? "annulee" : "terminee" } });
    }
    await evenementCourse(tx, courseId, `delivery.${statut}`, acteur, statut, { motif: o.motif });
    await emettre(tx, statut === "enlevee" ? "pickup.confirmed" : `delivery.${statut}`, { courseId, tenantId: c.tenantId });
  });
  if (c.fournisseurId && ["echec", "annulee", "retournee"].includes(statut)) await recalculerScore(c.fournisseurId, statut);
  return { statut };
}

export async function livrerCourse(courseId: string, acteur: Acteur, p: { photo?: string | null; code?: string | null; signature?: string | null; photoUrl?: string | null; confirmationClient?: boolean; lat?: number | null; lng?: number | null }) {
  const c = await prisma.courseLivraison.findUnique({ where: { id: courseId } });
  if (!c) throw new ErreurLogistique("Course introuvable", 404);
  await exigerGestionCourse(acteur, c);
  if (!transitionCourse(c.statut as StatutCourse, "livree")) throw new ErreurLogistique("Le colis doit être en route", 409);
  const cmd = await prisma.commande.findUniqueOrThrow({ where: { id: c.commandeId }, select: { codeLivraison: true, codeEssais: true } });
  let otpValide = false;
  if (c.preuvesRequises.includes("otp")) {
    if (cmd.codeEssais >= 5) throw new ErreurLogistique("Trop de codes incorrects : la boutique doit confirmer", 423);
    otpValide = !!cmd.codeLivraison && String(p.code ?? "").trim() === cmd.codeLivraison;
    if (!otpValide && p.code != null) await prisma.commande.update({ where: { id: c.commandeId }, data: { codeEssais: { increment: 1 } } });
  }
  if (p.photo != null && !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(p.photo)) throw new ErreurLogistique("Photo de preuve invalide");
  const preuve = { otpValide, signature: !!p.signature, photo: !!p.photoUrl || !!p.photo, confirmationClient: !!p.confirmationClient };
  if (!preuveSuffisante(c.preuvesRequises as PreuveRequise[], preuve)) throw new ErreurLogistique("Preuve de livraison incomplète ou code incorrect");
  await synchroniserCommande(c.commandeId, c.tenantId, "livree");
  const maintenant = new Date();
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.courseLivraison.updateMany({ where: { id: courseId, statut: c.statut }, data: { statut: "livree", livreeLe: maintenant, responsableIssue: "fournisseur" } });
    if (!count) throw new ErreurLogistique("Cette course vient de changer", 409);
    await tx.preuveLivraison.create({ data: { courseId, otpValide, signature: p.signature ?? null, photoUrl: p.photoUrl ?? null, photoChiffree: p.photo ? chiffrer(p.photo) : null, confirmationClient: !!p.confirmationClient, lat: p.lat ?? null, lng: p.lng ?? null, acteurId: acteur.id ?? null } });
    await tx.assignationCourse.updateMany({ where: { courseId, statut: "acceptee" }, data: { statut: "terminee" } });
    if (Number(c.creditApplique) > 0) {
      await verrouMarchand(tx, c.tenantId);
      const r = consommer(await lireEcritures(tx, c.tenantId), `${c.id}:${c.tentatives}`);
      if (!r.ok) throw new ErreurLogistique(r.erreur, 409);
      if (r.ecriture) { await tx.ecritureCredit.create({ data: { tenantId: c.tenantId, courseId, type: "consommation", montant: r.ecriture.montant, reference: r.ecriture.reference } }); await emettre(tx, "credits.consumed", { courseId, montant: r.ecriture.montant }); }
    }
    if (c.prixFournisseur != null) {
      const ligne = (type: string, montant: number) => tx.ecritureFinanceCourse.create({ data: { courseId, fournisseurId: c.fournisseurId, tenantId: c.tenantId, type, montant, devise: c.devise, reference: `${type}:${courseId}` } });
      await ligne("versement", Number(c.versement)); await ligne("commission", Number(c.commission));
      if (Number(c.creditApplique) > 0) await ligne("credit", Number(c.creditApplique));
      await ligne("contribution_marchand", Number(c.prixMarchand));
    }
    await evenementCourse(tx, courseId, "delivery.completed", acteur, "livree", { preuve });
    await emettre(tx, "delivery.completed", { courseId, tenantId: c.tenantId, fournisseurId: c.fournisseurId });
  });
  if (c.fournisseurId) await recalculerScore(c.fournisseurId, "livraison");
  return { statut: "livree" };
}

// ─── GPS ──────────────────────────────────────────────────────────────
const pointSchema = z.object({ id: z.string().uuid(), lat: z.number(), lng: z.number(), captureLe: z.string(), precisionM: z.number().min(0).max(100000).nullish(), vitesseMs: z.number().min(0).max(100).nullish(), capDeg: z.number().min(0).max(360).nullish() });
const STATUTS_GPS = ["enlevee", "en_transit", "proche_destination"];

export async function enregistrerPositions(userId: string, courseId: string, brut: unknown) {
  const c = await prisma.courseLivraison.findUnique({ where: { id: courseId } });
  if (!c?.fournisseurId || !(await peutGerer(userId, c.fournisseurId))) throw new ErreurLogistique("Accès refusé", 403);
  if (!STATUTS_GPS.includes(c.statut)) return { acceptes: 0, ignore: "course_inactive" };
  const lot = z.array(pointSchema).min(1).max(50).safeParse(brut);
  if (!lot.success) throw new ErreurLogistique("Lot de positions invalide");
  const maintenant = Date.now();
  const valides = lot.data.flatMap((p) => { const pos = lirePosition(p.lat, p.lng), t = Date.parse(p.captureLe); return pos && Number.isFinite(t) && t <= maintenant + 120_000 && t > maintenant - 86_400_000 ? [{ ...p, ...pos, t }] : []; }).sort((a, b) => a.t - b.t);
  if (!valides.length) throw new ErreurLogistique("Aucune position valide");
  const der = await prisma.positionCourse.findFirst({ where: { courseId }, orderBy: { captureLe: "desc" }, select: { lat: true, lng: true, captureLe: true, precisionM: true } });
  const avant = der ? [{ lat: der.lat, lng: der.lng, t: der.captureLe.getTime(), precisionM: der.precisionM }] : [];
  const lignes = valides.map((p, i) => {
    const prec = i ? [valides[i - 1]] : avant;
    const suspect = prec.length ? detecterAnomalies({ points: [...prec, { lat: p.lat, lng: p.lng, t: p.t, precisionM: p.precisionM }], maintenant: p.t }).some((a) => a.type === "saut_impossible") : false;
    return { id: p.id, courseId, captureLe: new Date(p.t), lat: p.lat, lng: p.lng, precisionM: p.precisionM ?? null, vitesseMs: p.vitesseMs ?? null, capDeg: p.capDeg ?? null, suspect };
  });
  const { count } = await prisma.positionCourse.createMany({ data: lignes, skipDuplicates: true });
  const dernier = lignes.filter((l) => !l.suspect).at(-1);
  // Un point arrivé en retard rejoint l'historique sans remplacer la position la plus récente.
  if (dernier && (!der || dernier.captureLe > der.captureLe)) await prisma.commande.update({ where: { id: c.commandeId }, data: { livreurPosition: { lat: dernier.lat, lng: dernier.lng, updatedAt: dernier.captureLe.toISOString() } } });
  const arrivee = c.statut === "en_transit" ? await detecterArrivee(c) : false;
  return { acceptes: count, doublons: lignes.length - count, suspects: lignes.filter((l) => l.suspect).length, arrivee };
}

export const GEOZONE_ARRIVEE = { rayonM: 150, hysteresisM: 50, presenceMs: 30_000, precisionMaxM: 100 };
/** Présence confirmée près du client : annonce l'arrivée. Ce n'est jamais une preuve de livraison. */
async function detecterArrivee(c: CourseDb) {
  if (c.latArrivee == null || c.lngArrivee == null) return false;
  const points = await prisma.positionCourse.findMany({ where: { courseId: c.id, suspect: false, captureLe: { gte: new Date(Date.now() - 30 * 60_000) } }, orderBy: { captureLe: "asc" }, take: 200, select: { lat: true, lng: true, captureLe: true, precisionM: true } });
  const zone = { centre: { lat: c.latArrivee, lng: c.lngArrivee }, ...GEOZONE_ARRIVEE };
  let etat = ETAT_INITIAL, arrive = false;
  for (const p of points) { const r = evaluerGeozone(zone, etat, { lat: p.lat, lng: p.lng, t: p.captureLe.getTime(), precisionM: p.precisionM }); etat = r.etat; if (r.evenement === "arrivee") arrive = true; if (r.evenement === "sortie") arrive = false; }
  if (!arrive) return false;
  try { await avancerCourse(c.id, "proche_destination", SYSTEME, { motif: "Arrivée détectée par géorepérage" }); return true; }
  catch (e) { if (e instanceof ErreurLogistique) return false; throw e; }
}

// ─── Incidents, avis, règlements ──────────────────────────────────────
export async function ouvrirIncident(courseId: string, acteur: Acteur, d: { type: "incident" | "litige" | "contestation"; description: string; severite?: string }) {
  const c = await prisma.courseLivraison.findUnique({ where: { id: courseId } });
  if (!c) throw new ErreurLogistique("Course introuvable", 404);
  await exigerGestionCourse(acteur, c);
  const description = d.description.trim().slice(0, 1000);
  if (description.length < 5) throw new ErreurLogistique("Décrivez le problème");
  return prisma.$transaction(async (tx) => {
    const i = await tx.incidentCourse.create({ data: { courseId, tenantId: c.tenantId, fournisseurId: c.fournisseurId, type: d.type, severite: d.severite ?? "WARNING", description, ouvertPar: acteur.id ?? null } });
    if (d.type === "litige" && transitionCourse(c.statut as StatutCourse, "litige")) await tx.courseLivraison.update({ where: { id: courseId }, data: { statut: "litige" } });
    await evenementCourse(tx, courseId, `incident.${d.type}`, acteur, undefined, { incidentId: i.id });
    await emettre(tx, "delivery.disputed", { courseId, tenantId: c.tenantId, type: d.type });
    return i;
  });
}

export async function resoudreIncident(adminId: string, id: string, d: { statut: "resolu" | "rejete"; resolution: string; responsable?: string | null; issue?: "livree" | "echec" | "retournee" | null }) {
  const i = await prisma.incidentCourse.findUnique({ where: { id }, include: { course: true } });
  if (!i) throw new ErreurLogistique("Incident introuvable", 404);
  if (!d.resolution?.trim()) throw new ErreurLogistique("Décision à motiver");
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.incidentCourse.updateMany({ where: { id, statut: { in: ["ouvert", "en_revue"] } }, data: { statut: d.statut, resolution: d.resolution.trim(), responsable: d.responsable ?? null, resoluPar: adminId, resoluLe: new Date() } });
    if (!count) throw new ErreurLogistique("Incident déjà traité", 409);
    const data: Prisma.CourseLivraisonUpdateInput = {};
    if (d.responsable) data.responsableIssue = d.responsable;
    if (i.course.statut === "litige" && d.issue) data.statut = d.issue;
    if (Object.keys(data).length) await tx.courseLivraison.update({ where: { id: i.courseId }, data });
    await journal(tx, { type: "admin", id: adminId }, "incident.resolu", "IncidentCourse", id, { statut: i.statut, responsable: i.responsable }, d);
  });
  if (i.fournisseurId) await recalculerScore(i.fournisseurId, "decision_incident");
}

export async function noterCourse(tenantId: string, courseId: string, note: number, commentaire?: string | null) {
  const c = await prisma.courseLivraison.findFirst({ where: { id: courseId, tenantId, statut: "livree" }, select: { id: true, fournisseurId: true } });
  if (!c?.fournisseurId) throw new ErreurLogistique("Seule une course livrée peut être évaluée", 409);
  if (!Number.isInteger(note) || note < 1 || note > 5) throw new ErreurLogistique("Note entre 1 et 5");
  try { await prisma.avisFournisseur.create({ data: { courseId, tenantId, fournisseurId: c.fournisseurId, note, commentaire: commentaire?.trim().slice(0, 500) || null } }); }
  catch (e: any) { if (e?.code === "P2002") throw new ErreurLogistique("Cette course est déjà évaluée", 409); throw e; }
  await recalculerScore(c.fournisseurId, "avis");
}

export async function preparerLotReglement(adminId: string, fournisseurId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`lot:${fournisseurId}`}))`;
    const pris = (await tx.ligneReglement.findMany({ where: { lot: { fournisseurId, statut: { notIn: ["annule", "echec"] } } }, select: { courseId: true } })).map((l) => l.courseId);
    const dus = await tx.ecritureFinanceCourse.findMany({ where: { fournisseurId, type: "versement", courseId: { notIn: pris } }, select: { courseId: true, montant: true, devise: true } });
    const litiges = new Set((await tx.courseLivraison.findMany({ where: { id: { in: dus.map((d) => d.courseId) }, statut: "litige" }, select: { id: true } })).map((c) => c.id));
    const reglables = dus.filter((d) => !litiges.has(d.courseId));
    if (!reglables.length) throw new ErreurLogistique("Rien à régler", 409);
    const total = reglables.reduce((s, d) => s + Number(d.montant), 0);
    const lot = await tx.lotReglement.create({ data: { fournisseurId, total, devise: reglables[0].devise, creePar: adminId, lignes: { create: reglables.map((d) => ({ courseId: d.courseId, montant: d.montant })) } } });
    await journal(tx, { type: "admin", id: adminId }, "reglement.prepare", "LotReglement", lot.id, undefined, { total, lignes: reglables.length });
    return lot;
  });
}

export async function marquerLotPaye(adminId: string, id: string, referencePaiement: string) {
  if (!referencePaiement?.trim()) throw new ErreurLogistique("Référence du paiement requise");
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.lotReglement.updateMany({ where: { id, statut: "prepare" }, data: { statut: "paye", referencePaiement: referencePaiement.trim().slice(0, 120), payePar: adminId, payeLe: new Date() } });
    if (!count) throw new ErreurLogistique("Lot déjà traité", 409);
    await journal(tx, { type: "admin", id: adminId }, "reglement.paye", "LotReglement", id, undefined, { referencePaiement });
    await emettre(tx, "settlement.paid", { lotId: id });
  });
}

/** Remboursement après livraison : le crédit consommé revient au marchand par une écriture d'annulation. */
export async function rendreCreditsCourse(adminId: string, courseId: string) {
  const c = await prisma.courseLivraison.findUnique({ where: { id: courseId }, select: { id: true, tenantId: true, tentatives: true } });
  if (!c) throw new ErreurLogistique("Course introuvable", 404);
  await prisma.$transaction(async (tx) => {
    await verrouMarchand(tx, c.tenantId);
    const r = annulerConsommation(await lireEcritures(tx, c.tenantId), `${c.id}:${c.tentatives}`);
    if (!r.ok) throw new ErreurLogistique(r.erreur, 409);
    if (r.ecriture) await tx.ecritureCredit.create({ data: { tenantId: c.tenantId, courseId: c.id, type: "annulation", montant: r.ecriture.montant, reference: r.ecriture.reference } });
    await journal(tx, { type: "admin", id: adminId }, "credits.rendus", "CourseLivraison", courseId);
  });
}

// ─── Tâches planifiées ────────────────────────────────────────────────
const MESSAGES: Record<string, [string, string]> = {
  "assignment.accepted": ["Livreur confirmé", "Votre livraison a été acceptée."],
  "pickup.confirmed": ["Colis enlevé", "Votre colis a été récupéré."],
  "delivery.completed": ["Livraison terminée", "Le colis a été remis avec sa preuve."],
  "delivery.echec": ["Échec de livraison", "Une action peut être nécessaire."],
  "delivery.disputed": ["Incident sur une livraison", "Un incident a été ouvert."],
};

export async function publierEvenements(limite = 100) {
  const lot = await prisma.evenementSortant.findMany({ where: { statut: "attente", prochainEssai: { lte: new Date() } }, orderBy: { createdAt: "asc" }, take: limite });
  let publies = 0;
  for (const e of lot) {
    const { count } = await prisma.evenementSortant.updateMany({ where: { id: e.id, statut: "attente", essais: e.essais }, data: { essais: { increment: 1 } } });
    if (!count) continue;
    try {
      const d = e.donnees as { tenantId?: string; courseId?: string };
      const m = MESSAGES[e.type];
      if (m && d.tenantId) await notifierMarchand({ tenantId: d.tenantId, type: "logistique", titre: m[0], message: m[1], lien: "/dashboard/logistique/reseau" });
      await prisma.evenementSortant.update({ where: { id: e.id }, data: { statut: "publie" } });
      publies++;
    } catch {
      const essais = e.essais + 1;
      await prisma.evenementSortant.update({ where: { id: e.id }, data: essais >= 6 ? { statut: "echec" } : { prochainEssai: new Date(Date.now() + 2 ** essais * 30_000) } });
    }
  }
  return { publies };
}

export async function passeDelais(maintenant = new Date()) {
  const dues = await prisma.assignationCourse.findMany({ where: { statut: "proposee", expireLe: { lte: maintenant } }, select: { id: true }, take: 50 });
  let reassignes = 0;
  for (const a of dues) {
    try { const id = await fermerAssignation(a.id, "expiree", SYSTEME, "Délai d'acceptation dépassé"); await lancerDispatch(id); reassignes++; }
    catch (e) { if (!(e instanceof ErreurLogistique)) console.error("[logistique] délai", e); }
  }
  return { expirees: dues.length, reassignes };
}

export async function passeDocuments(maintenant = new Date()) {
  const expires = await prisma.documentVerification.findMany({ where: { statut: "verifie", expireLe: { lte: maintenant } }, select: { id: true, fournisseurId: true } });
  for (const d of expires) {
    await prisma.documentVerification.updateMany({ where: { id: d.id, statut: "verifie" }, data: { statut: "expire" } });
    await recalculerStatutLegal(d.fournisseurId);
    await journal(prisma, SYSTEME, "document.expire", "DocumentVerification", d.id);
  }
  return { expires: expires.length };
}

export async function passePurgePositions(maintenant = new Date(), jours = 30) {
  const { count } = await prisma.positionCourse.deleteMany({ where: { captureLe: { lt: new Date(maintenant.getTime() - jours * 86_400_000) } } });
  return { purgees: count };
}

/** Autonomie : demande les livraisons des boutiques qui l'ont activé et relance les courses restées sans transporteur. */
export async function passeAutonomie(maintenant = new Date()) {
  const prefs = await prisma.preferenceLogistique.findMany({ where: { autoCourses: true, pause: false, mode: { in: ["semi_automatique", "autonome"] } }, select: { tenantId: true }, take: 200 });
  let creees = 0, relancees = 0;
  for (const { tenantId } of prefs) {
    const commandes = await prisma.commande.findMany({ where: { tenantId, statut: "confirmee", createdAt: { gte: new Date(maintenant.getTime() - 86_400_000) } }, select: { id: true }, take: 20 });
    const avecCourse = new Set((await prisma.courseLivraison.findMany({ where: { commandeId: { in: commandes.map((x) => x.id) } }, select: { commandeId: true } })).map((x) => x.commandeId));
    for (const { id } of commandes) {
      if (avecCourse.has(id)) continue;
      try { const c = await creerCourse(tenantId, id); await lancerDispatch(c.id); creees++; }
      catch (e) { if (!(e instanceof ErreurLogistique)) console.error("[logistique] autonomie", e); }
    }
  }
  const attente = await prisma.courseLivraison.findMany({ where: { statut: "attente_fournisseur", updatedAt: { lte: new Date(maintenant.getTime() - 10 * 60_000) }, createdAt: { gte: new Date(maintenant.getTime() - 86_400_000) } }, select: { id: true, tenantId: true }, take: 30 });
  for (const c of attente) {
    const pol = await politquePourRelance(c.tenantId);
    if (!pol) continue;
    const der = await prisma.decisionDispatch.findFirst({ where: { courseId: c.id }, orderBy: { createdAt: "desc" }, select: { createdAt: true, action: true } });
    if (der && (der.action === "escalader" || der.action === "approbation" || maintenant.getTime() - der.createdAt.getTime() < 10 * 60_000)) continue;
    try { await lancerDispatch(c.id); relancees++; } catch (e) { if (!(e instanceof ErreurLogistique)) console.error("[logistique] relance", e); }
  }
  return { creees, relancees };
}
const politquePourRelance = async (tenantId: string) => { const p = await politiquePour(tenantId); return !p.pause && p.mode !== "recommandation" ? p : null; };

export async function passeLogistique() {
  const [{ passeVersements }, { passeModeles }] = await Promise.all([import("./versements"), import("./pilotage")]);
  const [delais, documents, evenements, purge, credits] = await Promise.all([passeDelais(), passeDocuments(), publierEvenements(), passePurgePositions(), attribuerCreditsMensuels()]);
  const autonomie = await passeAutonomie(), versements = await passeVersements(), modeles = await passeModeles();
  return { delais, documents, evenements, purge, credits, autonomie, versements, modeles };
}

// ─── Gestion du transporteur ──────────────────────────────────────────
const gestionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("vehicule_ajout"), type: vehicule, immatriculation: z.string().trim().max(30).nullish(), capaciteKg: z.number().positive().max(100000).nullish() }),
  z.object({ action: z.literal("vehicule_etat"), id: z.string().max(40), actif: z.boolean() }),
  z.object({ action: z.literal("membre_ajout"), email: z.string().trim().email().max(200), role: z.enum(["admin", "dispatch"]) }),
  z.object({ action: z.literal("membre_retrait"), id: z.string().max(40) }),
  z.object({ action: z.literal("zones"), zones: fournisseurSchema.shape.zones }),
  z.object({ action: z.literal("capacite"), capaciteMax: z.number().int().min(1).max(5000) }),
]);

export async function vueGestion(userId: string, id: string) {
  if (!(await peutGerer(userId, id))) throw new ErreurLogistique("Accès refusé", 403);
  const f = await prisma.fournisseurLogistique.findUniqueOrThrow({ where: { id }, include: { membres: true, vehiculesFlotte: true, zones: { where: { actif: true } }, tarifs: { where: { actif: true }, orderBy: { version: "desc" }, take: 1 } } });
  const users = await prisma.user.findMany({ where: { id: { in: f.membres.map((m) => m.userId) } }, select: { id: true, email: true, name: true } });
  return { proprietaire: f.proprietaireId === userId, capaciteMax: f.capaciteMax, vehicules: f.vehiculesFlotte, zones: f.zones.map((z) => ({ ville: z.ville, quartier: z.quartier })), tarif: f.tarifs[0]?.regle ?? null, membres: f.membres.filter((m) => m.userId !== f.proprietaireId).map((m) => { const u = users.find((x) => x.id === m.userId); return { id: m.id, role: m.role, nom: u?.name ?? null, email: u?.email ?? null }; }) };
}

export async function gererFournisseur(userId: string, id: string, brut: unknown) {
  const f = await prisma.fournisseurLogistique.findUnique({ where: { id }, select: { proprietaireId: true, pays: true, type: true } });
  if (!f || !(await peutGerer(userId, id))) throw new ErreurLogistique("Accès refusé", 403);
  const r = gestionSchema.safeParse(brut);
  if (!r.success) throw new ErreurLogistique("Données invalides");
  const d = r.data, acteur: Acteur = { type: "fournisseur", id: userId };
  if ((d.action === "membre_ajout" || d.action === "membre_retrait") && f.proprietaireId !== userId) throw new ErreurLogistique("Seul le responsable gère l'équipe", 403);
  if (d.action === "vehicule_ajout") {
    const v = await prisma.vehiculeFlotte.create({ data: { fournisseurId: id, type: d.type, immatriculation: d.immatriculation || null, capaciteKg: d.capaciteKg ?? null } });
    await synchroniserVehicules(id); await journal(prisma, acteur, "flotte.ajout", "VehiculeFlotte", v.id);
  } else if (d.action === "vehicule_etat") {
    const { count } = await prisma.vehiculeFlotte.updateMany({ where: { id: d.id, fournisseurId: id }, data: { actif: d.actif } });
    if (!count) throw new ErreurLogistique("Véhicule introuvable", 404);
    await synchroniserVehicules(id); await journal(prisma, acteur, "flotte.etat", "VehiculeFlotte", d.id, undefined, { actif: d.actif });
  } else if (d.action === "membre_ajout") {
    if (f.type !== "societe") throw new ErreurLogistique("L'équipe est réservée aux sociétés");
    const u = await prisma.user.findFirst({ where: { email: { equals: d.email, mode: "insensitive" } }, select: { id: true } });
    // Réponse identique si l'e-mail n'existe pas ou n'est pas ajoutable : l'annuaire des comptes ne fuit pas.
    if (!u || u.id === f.proprietaireId) throw new ErreurLogistique("Ce compte ne peut pas être ajouté", 404);
    await prisma.membreFournisseur.upsert({ where: { fournisseurId_userId: { fournisseurId: id, userId: u.id } }, create: { fournisseurId: id, userId: u.id, role: d.role }, update: { role: d.role } });
    await journal(prisma, acteur, "equipe.ajout", "FournisseurLogistique", id, undefined, { role: d.role });
  } else if (d.action === "membre_retrait") {
    const { count } = await prisma.membreFournisseur.deleteMany({ where: { id: d.id, fournisseurId: id, userId: { not: f.proprietaireId } } });
    if (!count) throw new ErreurLogistique("Membre introuvable", 404);
    await journal(prisma, acteur, "equipe.retrait", "FournisseurLogistique", id);
  } else if (d.action === "zones") {
    const uniques = [...new Map(d.zones.map((z) => [`${z.ville.toLowerCase()}|${(z.quartier ?? "").toLowerCase()}`, z])).values()];
    await prisma.$transaction([prisma.zoneService.deleteMany({ where: { fournisseurId: id } }), prisma.zoneService.createMany({ data: uniques.map((z) => ({ fournisseurId: id, pays: f.pays, ville: z.ville, quartier: z.quartier || null })) })]);
    await journal(prisma, acteur, "zones.maj", "FournisseurLogistique", id, undefined, { zones: uniques.length });
  } else {
    await prisma.fournisseurLogistique.update({ where: { id }, data: { capaciteMax: d.capaciteMax } });
    await journal(prisma, acteur, "capacite.maj", "FournisseurLogistique", id, undefined, { capaciteMax: d.capaciteMax });
  }
  return vueGestion(userId, id);
}
async function synchroniserVehicules(id: string) {
  const v = await prisma.vehiculeFlotte.findMany({ where: { fournisseurId: id, actif: true }, select: { type: true } });
  if (v.length) await prisma.fournisseurLogistique.update({ where: { id }, data: { vehicules: [...new Set(v.map((x) => x.type))] } });
}

export { courseActive };
