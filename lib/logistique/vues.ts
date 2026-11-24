// Lectures des tableaux de bord. Chaque vue ne renvoie que ce que son rôle a le droit de voir.
import { prisma } from "@/lib/prisma";
import { fraicheur, estimerArrivee, distanceM } from "./suivi";
import { suiviClientOuvert } from "./course";
import { alertesZones, simuler, type EtatReseau, type Scenario } from "./intelligence";
import { soldeCredits } from "./service";
import { itineraire } from "./routage";
import { previsionGouvernee } from "./pilotage";
import type { IndicateursScore, StatutCourse } from "./types";

const ACTIFS = ["attente_fournisseur", "fournisseur_assigne", "attente_acceptation", "acceptee", "enlevement_planifie", "enlevee", "en_transit", "proche_destination"];
const n = (x: unknown) => (x == null ? null : Number(x));

const dureeMoyenneMin = (l: { createdAt: Date; livreeLe: Date | null }[]) => {
  const d = l.filter((x) => x.livreeLe).map((x) => (x.livreeLe!.getTime() - x.createdAt.getTime()) / 60_000);
  return d.length ? Math.round(d.reduce((a, b) => a + b, 0) / d.length) : null;
};

/** Profil public : ni document, ni téléphone, ni coordonnées de versement. */
export const profilPublic = (f: { id: string; slug: string; type: string; nom: string; certifie?: boolean; description: string | null; statutLegal: string; disponible: boolean; vehicules: string[]; score: unknown; zones?: { ville: string; quartier: string | null; actif: boolean }[] }) => {
  const s = f.score as Partial<IndicateursScore>;
  return { id: f.id, slug: f.slug, type: f.type, nom: f.nom, description: f.description, certifie: !!f.certifie, verifie: f.statutLegal === "verifie", disponible: f.disponible, vehicules: f.vehicules, niveau: s.niveau ?? null, probation: s.probation ?? true, global: s.probation === false ? s.global ?? null : null, volume: s.volume ?? 0, tauxReussite: s.probation === false ? s.tauxReussite ?? null : null, badges: s.badges ?? [], zones: [...new Set((f.zones ?? []).filter((z) => z.actif).map((z) => z.ville))] };
};

export async function annuaire(ville?: string | null) {
  const l = await prisma.fournisseurLogistique.findMany({ where: { suspendu: false, statutLegal: { notIn: ["rejete", "suspendu"] }, ...(ville ? { zones: { some: { actif: true, ville: { equals: ville, mode: "insensitive" } } } } : {}) }, include: { zones: true }, orderBy: [{ certifie: "desc" }, { scoreGlobal: "desc" }, { createdAt: "asc" }], take: 100 });
  return l.map(profilPublic);
}

/** Fiche détaillée : indicateurs de crédibilité et derniers avis, sans identité des clients. */
export async function ficheTransporteur(id: string) {
  if (!/^[a-z0-9]{8,40}$/i.test(id)) return null;
  const f = await prisma.fournisseurLogistique.findFirst({ where: { id, suspendu: false, statutLegal: { notIn: ["rejete", "suspendu"] } }, include: { zones: true } });
  if (!f) return null;
  const [agg, derniers] = await Promise.all([
    prisma.avisFournisseur.aggregate({ where: { fournisseurId: id }, _avg: { note: true }, _count: true }),
    prisma.avisFournisseur.findMany({ where: { fournisseurId: id }, orderBy: { createdAt: "desc" }, take: 5, select: { note: true, commentaire: true, createdAt: true } }),
  ]);
  const s = f.score as Partial<IndicateursScore>;
  return {
    ...profilPublic(f), fiabilite: s.fiabilite ?? null, operationnel: s.operationnel ?? null, satisfaction: s.satisfaction ?? null, confiance: s.confiance ?? "insuffisante",
    tauxReussite: s.tauxReussite ?? null, tauxATemps: s.tauxATemps ?? null, volume: s.volume ?? 0, certifieLe: f.certifieLe,
    avis: { moyenne: agg._avg.note ?? 0, nombre: agg._count, derniers: derniers.map((a) => ({ note: a.note, commentaire: a.commentaire?.slice(0, 280) ?? null, le: a.createdAt })) },
  };
}

export async function vueMarchand(tenantId: string) {
  const [courses, credits, preferences, commandes, ecritures] = await Promise.all([
    prisma.courseLivraison.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 100 }),
    soldeCredits(tenantId), prisma.preferenceLogistique.findUnique({ where: { tenantId } }),
    prisma.commande.findMany({ where: { tenantId, statut: { in: ["en_attente", "confirmee", "en_preparation"] } }, orderBy: { createdAt: "desc" }, take: 30, select: { id: true, numero: true, clientNom: true, ville: true, montantTotal: true, devise: true } }),
    prisma.ecritureCredit.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 30, select: { id: true, type: true, montant: true, reference: true, createdAt: true } }),
  ]);
  const noms = new Map((await prisma.fournisseurLogistique.findMany({ where: { id: { in: courses.flatMap((c) => c.fournisseurId ?? []) } }, select: { id: true, nom: true, type: true } })).map((f) => [f.id, f]));
  const avecCourse = new Set(courses.filter((c) => ACTIFS.includes(c.statut)).map((c) => c.commandeId));
  const livrees = courses.filter((c) => c.statut === "livree"), echecs = courses.filter((c) => ["echec", "retournee"].includes(c.statut));
  const fin = livrees.length + echecs.length;
  return {
    kpis: { actives: courses.filter((c) => ACTIFS.includes(c.statut)).length, livrees: livrees.length, echecs: echecs.length, tauxReussite: fin ? livrees.length / fin : null, delaiMoyenMin: dureeMoyenneMin(livrees), depenses: livrees.reduce((s, c) => s + (n(c.prixMarchand) ?? 0), 0) },
    credits, ecritures: ecritures.map((e) => ({ ...e, montant: Number(e.montant) })), preferences,
    commandes: commandes.filter((c) => !avecCourse.has(c.id)),
    courses: courses.map((c) => ({ id: c.id, reference: c.reference, statut: c.statut, ville: c.ville, createdAt: c.createdAt, fournisseur: c.fournisseurId ? noms.get(c.fournisseurId)?.nom ?? null : null, prixMarchand: n(c.prixMarchand), devise: c.devise })),
  };
}

export async function vueCourse(courseId: string, role: "marchand" | "fournisseur" | "admin") {
  const c = await prisma.courseLivraison.findUnique({ where: { id: courseId }, include: { evenements: { orderBy: { survenuLe: "asc" }, take: 100 }, preuve: { select: { otpValide: true, confirmationClient: true, createdAt: true, photoUrl: true, signature: true } }, incidents: { orderBy: { createdAt: "desc" }, take: 20 } } });
  if (!c) return null;
  const [cmd, f, decision, devis, positions] = await Promise.all([
    prisma.commande.findUnique({ where: { id: c.commandeId }, select: { numero: true, clientNom: true, adresseLivraison: true, ville: true, clientTelephone: true, montantTotal: true, livreurPosition: true } }),
    c.fournisseurId ? prisma.fournisseurLogistique.findUnique({ where: { id: c.fournisseurId } }) : null,
    prisma.decisionDispatch.findFirst({ where: { courseId }, orderBy: { createdAt: "desc" } }),
    c.devisId ? prisma.devisLivraison.findUnique({ where: { id: c.devisId } }) : null,
    role === "admin" || suiviClientOuvert(c.statut as StatutCourse) ? prisma.positionCourse.findMany({ where: { courseId, suspect: false }, orderBy: { captureLe: "desc" }, take: 60, select: { lat: true, lng: true, captureLe: true } }) : [],
  ]);
  const der = positions[0], maintenant = Date.now(), signal = fraicheur(der?.captureLe.getTime(), maintenant);
  const restant = der && c.latArrivee != null && c.lngArrivee != null ? Math.round(distanceM(der, { lat: c.latArrivee, lng: c.lngArrivee })) : null;
  const aPhoto = c.preuve ? !!c.preuve.photoUrl || (await prisma.preuveLivraison.count({ where: { courseId: c.id, photoChiffree: { not: null } } })) > 0 : false;
  const route = der && c.latArrivee != null && c.lngArrivee != null && ["enlevee", "en_transit", "proche_destination"].includes(c.statut) ? await itineraire([der, { lat: c.latArrivee, lng: c.lngArrivee }]) : null;
  return {
    id: c.id, reference: c.reference, statut: c.statut, ville: c.ville, createdAt: c.createdAt, livreeLe: c.livreeLe, preuvesRequises: c.preuvesRequises, express: c.express, poidsKg: c.poidsKg, distanceKm: c.distanceKm,
    commande: cmd && { numero: cmd.numero, clientNom: cmd.clientNom, adresse: cmd.adresseLivraison, ville: cmd.ville, telephone: role === "fournisseur" && !["acceptee", "enlevement_planifie", "enlevee", "en_transit", "proche_destination"].includes(c.statut) ? null : cmd.clientTelephone },
    fournisseur: f && { id: f.id, nom: f.nom, type: f.type, verifie: f.statutLegal === "verifie", niveau: (f.score as Partial<IndicateursScore>).niveau ?? null },
    prix: devis && { lignes: devis.detail, fournisseur: Number(devis.prixFournisseur), ...(role === "fournisseur" ? { versement: Number(devis.versement) } : { credit: Number(devis.creditApplique), marchand: Number(devis.prixMarchand), ...(role === "admin" ? { commission: Number(devis.commission), versement: Number(devis.versement) } : {}) }), devise: devis.devise },
    explication: role === "fournisseur" ? null : decision?.explication ?? null,
    suivi: { signal, dernierePosition: der ? { lat: der.lat, lng: der.lng, le: der.captureLe } : null, distanceRestanteM: route?.distanceM ?? restant, eta: estimerArrivee({ maintenant, dureeRoutageS: route?.dureeS, distanceRestanteM: route?.distanceM ?? restant, signal }), route: route?.trace ?? null, trace: positions.slice().reverse().map((p) => [p.lat, p.lng] as [number, number]), arrivee: c.latArrivee != null ? { lat: c.latArrivee, lng: c.lngArrivee! } : null, depart: c.latDepart != null ? { lat: c.latDepart, lng: c.lngDepart! } : null },
    chronologie: c.evenements.map((e) => ({ id: e.id, type: e.type, statut: e.statut, le: e.survenuLe, acteur: e.acteurType })),
    preuve: c.preuve && { otp: c.preuve.otpValide, confirmation: c.preuve.confirmationClient, photo: aPhoto, signature: !!c.preuve.signature, le: c.preuve.createdAt },
    incidents: c.incidents.map((i) => ({ id: i.id, type: i.type, statut: i.statut, severite: i.severite, description: i.description, resolution: i.resolution, le: i.createdAt })),
  };
}

export async function vueFournisseur(id: string) {
  const [assignations, courses, ecritures, lots, avis] = await Promise.all([
    prisma.assignationCourse.findMany({ where: { fournisseurId: id, statut: "proposee", expireLe: { gt: new Date() } }, include: { course: { select: { id: true, reference: true, ville: true, quartier: true, poidsKg: true, express: true, versement: true, devise: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.courseLivraison.findMany({ where: { fournisseurId: id, statut: { not: "attente_acceptation" } }, orderBy: { updatedAt: "desc" }, take: 50, select: { id: true, reference: true, statut: true, ville: true, versement: true, devise: true, preuvesRequises: true, updatedAt: true } }),
    prisma.ecritureFinanceCourse.aggregate({ where: { fournisseurId: id, type: "versement" }, _sum: { montant: true } }),
    prisma.lotReglement.findMany({ where: { fournisseurId: id }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, statut: true, total: true, devise: true, createdAt: true, payeLe: true, referencePaiement: true } }),
    prisma.avisFournisseur.aggregate({ where: { fournisseurId: id }, _avg: { note: true }, _count: true }),
  ]);
  const regle = lots.filter((l) => l.statut === "paye").reduce((s, l) => s + Number(l.total), 0), gagne = Number(ecritures._sum.montant ?? 0);
  return {
    assignations: assignations.map((a) => ({ id: a.id, expireLe: a.expireLe, course: { ...a.course, versement: n(a.course.versement) } })),
    courses: courses.map((c) => ({ ...c, versement: n(c.versement) })),
    gains: { total: gagne, regle, aRegler: gagne - regle }, lots: lots.map((l) => ({ ...l, total: Number(l.total) })), avis: { moyenne: avis._avg.note, nombre: avis._count },
  };
}

export async function etatReseau(): Promise<EtatReseau & { joursActifs: number }> {
  const depuis = new Date(Date.now() - 30 * 86_400_000);
  const [f, courses] = await Promise.all([
    prisma.fournisseurLogistique.findMany({ where: { suspendu: false, statutLegal: "verifie" }, select: { id: true, capaciteMax: true } }),
    prisma.courseLivraison.findMany({ where: { createdAt: { gte: depuis } }, select: { createdAt: true, livreeLe: true, prixFournisseur: true } }),
  ]);
  const prix = courses.flatMap((c) => (c.prixFournisseur == null ? [] : [Number(c.prixFournisseur)]));
  return { demandeJour: courses.length / 30, capaciteJour: f.reduce((s, x) => s + x.capaciteMax, 0), coutMoyen: prix.length ? prix.reduce((a, b) => a + b, 0) / prix.length : 0, delaiMoyenMin: dureeMoyenneMin(courses), fournisseurs: f.map((x) => ({ id: x.id, capaciteJour: x.capaciteMax })), joursActifs: new Set(courses.map((c) => c.createdAt.toISOString().slice(0, 10))).size };
}

export const lancerSimulation = async (s: Scenario) => simuler(await etatReseau(), s);

export async function tourDeControle() {
  const depuis90 = new Date(Date.now() - 90 * 86_400_000), maintenant = new Date();
  const [fournisseurs, courses, documents, incidents, alertes, finance, lots, journal, credits, sortants] = await Promise.all([
    prisma.fournisseurLogistique.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { zones: { select: { ville: true } } } }),
    prisma.courseLivraison.findMany({ where: { createdAt: { gte: depuis90 } }, select: { id: true, reference: true, statut: true, ville: true, createdAt: true, livreeLe: true, fournisseurId: true, tenantId: true, prixFournisseur: true, responsableIssue: true } }),
    prisma.documentVerification.findMany({ where: { statut: "en_revue" }, orderBy: { createdAt: "asc" }, take: 50, select: { id: true, fournisseurId: true, type: true, nomFichier: true, expireLe: true, createdAt: true } }),
    prisma.incidentCourse.findMany({ where: { statut: { in: ["ouvert", "en_revue"] } }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.alerteLogistique.findMany({ where: { statut: "ouverte" }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.ecritureFinanceCourse.groupBy({ by: ["type"], _sum: { montant: true } }),
    prisma.lotReglement.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.journalLogistique.findMany({ orderBy: { createdAt: "desc" }, take: 25 }),
    prisma.ecritureCredit.groupBy({ by: ["type"], _sum: { montant: true } }),
    prisma.evenementSortant.groupBy({ by: ["statut"], _count: true }),
  ]);
  const actives = courses.filter((c) => ACTIFS.includes(c.statut)), livrees = courses.filter((c) => c.statut === "livree"), echecs = courses.filter((c) => c.statut === "echec" || c.statut === "retournee");
  const fin = livrees.length + echecs.length, somme = (t: string) => Number(finance.find((x) => x.type === t)?._sum.montant ?? 0);
  const zones = new Map<string, { zone: string; demande7j: number; capaciteDispo: number; echecs30j: number; courses30j: number }>();
  const z = (v: string) => { if (!zones.has(v)) zones.set(v, { zone: v, demande7j: 0, capaciteDispo: 0, echecs30j: 0, courses30j: 0 }); return zones.get(v)!; };
  for (const c of courses) {
    if (!c.ville) continue;
    const e = z(c.ville), age = maintenant.getTime() - c.createdAt.getTime();
    if (age <= 7 * 86_400_000) e.demande7j++;
    if (age <= 30 * 86_400_000) { e.courses30j++; if (c.statut === "echec" || c.statut === "retournee") e.echecs30j++; }
  }
  for (const f of fournisseurs) if (!f.suspendu && f.disponible && f.statutLegal === "verifie") for (const v of new Set(f.zones.map((x) => x.ville))) z(v).capaciteDispo += f.capaciteMax;
  const parJour = new Map<string, number>();
  for (const c of courses) { const k = c.createdAt.toISOString().slice(0, 10); parJour.set(k, (parJour.get(k) ?? 0) + 1); }
  const premier = courses.length ? Math.min(...courses.map((c) => c.createdAt.getTime())) : maintenant.getTime();
  const nb = Math.min(90, Math.floor((maintenant.getTime() - premier) / 86_400_000) + 1);
  const serie = Array.from({ length: nb }, (_, i) => parJour.get(new Date(maintenant.getTime() - (nb - 1 - i) * 86_400_000).toISOString().slice(0, 10)) ?? 0);
  const compteType = (t: string) => fournisseurs.filter((f) => f.type === t).length;
  return {
    kpis: { actives: actives.length, livrees: livrees.length, echecs: echecs.length, tauxReussite: fin ? livrees.length / fin : null, delaiMoyenMin: dureeMoyenneMin(livrees), societes: compteType("societe"), livreurs: compteType("livreur"), disponibles: fournisseurs.filter((f) => f.disponible && !f.suspendu).length, verifies: fournisseurs.filter((f) => f.statutLegal === "verifie").length },
    finance: { versements: somme("versement"), commissions: somme("commission"), subvention: somme("credit"), contributionMarchands: somme("contribution_marchand"), contributionNette: somme("commission") - somme("credit") },
    credits: credits.map((c) => ({ type: c.type, montant: Number(c._sum.montant ?? 0) })),
    fournisseurs: fournisseurs.map((f) => ({ id: f.id, nom: f.nom, certifie: f.certifie, type: f.type, statutLegal: f.statutLegal, suspendu: f.suspendu, disponible: f.disponible, scoreGlobal: f.scoreGlobal, probation: (f.score as Partial<IndicateursScore>).probation ?? true, zones: [...new Set(f.zones.map((x) => x.ville))] })),
    documents, incidents, alertes, journal,
    lots: lots.map((l) => ({ ...l, total: Number(l.total) })),
    actives: actives.slice(0, 50).map((c) => ({ ...c, prixFournisseur: n(c.prixFournisseur) })),
    zones: [...zones.values()], prevision: await previsionGouvernee(serie), alertesProposees: alertesZones([...zones.values()], maintenant.toISOString().slice(0, 10)),
    evenements: sortants.map((s) => ({ statut: s.statut, nombre: s._count })),
  };
}
