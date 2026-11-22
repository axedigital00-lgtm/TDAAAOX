// Jumeau numérique et tournées : l'état du réseau reconstruit à partir des courses et positions réelles.
import { prisma } from "@/lib/prisma";
import { detecterAnomalies, fraicheur, type Anomalie, type Fraicheur, type Point } from "./suivi";
import { optimiserRoute, type Arret } from "./intelligence";
import { itineraire } from "./routage";

const ACTIFS = ["attente_fournisseur", "fournisseur_assigne", "attente_acceptation", "acceptee", "enlevement_planifie", "enlevee", "en_transit", "proche_destination"];
const A_ENLEVER = ["acceptee", "enlevement_planifie"], EMBARQUEES = ["enlevee", "en_transit", "proche_destination"];
const VITESSE_URBAINE_MS = 6;

type CourseTournee = { id: string; statut: string; express: boolean; finPrevue: Date | null; latDepart: number | null; lngDepart: number | null; latArrivee: number | null; lngArrivee: number | null };

/** Colis à enlever : deux arrêts. Colis déjà à bord : seulement sa livraison, et une place de capacité occupée. */
export function arretsDeTournee(courses: CourseTournee[]) {
  const arrets: Arret[] = [], sansCoordonnees: string[] = [];
  let embarques = 0;
  for (const c of courses) {
    const aBord = EMBARQUEES.includes(c.statut);
    if (aBord) embarques++;
    if (c.latArrivee == null || c.lngArrivee == null || (!aBord && (c.latDepart == null || c.lngDepart == null))) { sansCoordonnees.push(c.id); continue; }
    const commun = { commandeId: c.id, charge: 1, priorite: c.express ? 1 : 0, finAu: c.finPrevue?.getTime() ?? null };
    if (A_ENLEVER.includes(c.statut)) arrets.push({ ...commun, id: `${c.id}:enlevement`, type: "enlevement", lat: c.latDepart!, lng: c.lngDepart! });
    arrets.push({ ...commun, id: `${c.id}:livraison`, type: "livraison", lat: c.latArrivee, lng: c.lngArrivee });
  }
  return { arrets, embarques, sansCoordonnees };
}

export type ZoneJumeau = { ville: string; actives: number; capacite: number; tension: number | null; niveau: "calme" | "soutenu" | "sature" | "sans_capacite" };
export function tensionZones(courses: { ville: string | null }[], fournisseurs: { capaciteMax: number; villes: string[] }[]): ZoneJumeau[] {
  const z = new Map<string, { actives: number; capacite: number }>();
  const lire = (v: string) => { if (!z.has(v)) z.set(v, { actives: 0, capacite: 0 }); return z.get(v)!; };
  for (const c of courses) if (c.ville) lire(c.ville).actives++;
  for (const f of fournisseurs) for (const v of new Set(f.villes)) lire(v).capacite += f.capaciteMax;
  return [...z.entries()].map(([ville, x]) => {
    const tension = x.capacite ? x.actives / x.capacite : null;
    const niveau: ZoneJumeau["niveau"] = tension == null ? (x.actives ? "sans_capacite" : "calme") : tension >= 1 ? "sature" : tension >= .7 ? "soutenu" : "calme";
    return { ville, ...x, tension, niveau };
  }).sort((a, b) => b.actives - a.actives || a.ville.localeCompare(b.ville));
}

export async function tourneeFournisseur(fournisseurId: string, maintenant = Date.now()) {
  const [f, courses] = await Promise.all([
    prisma.fournisseurLogistique.findUniqueOrThrow({ where: { id: fournisseurId }, select: { capaciteMax: true } }),
    prisma.courseLivraison.findMany({ where: { fournisseurId, statut: { in: [...A_ENLEVER, ...EMBARQUEES] } }, select: { id: true, reference: true, statut: true, express: true, finPrevue: true, ville: true, quartier: true, latDepart: true, lngDepart: true, latArrivee: true, lngArrivee: true } }),
  ]);
  const vide = { arrets: [], distanceM: 0, dureeS: null, routier: false, route: null, ignorees: [], sansCoordonnees: [], explication: null, depart: null };
  if (!courses.length) return vide;
  const { arrets, embarques, sansCoordonnees } = arretsDeTournee(courses);
  if (!arrets.length) return { ...vide, sansCoordonnees: courses.filter((c) => sansCoordonnees.includes(c.id)).map((c) => c.reference) };
  const der = await prisma.positionCourse.findFirst({ where: { courseId: { in: courses.map((c) => c.id) }, suspect: false, captureLe: { gte: new Date(maintenant - 30 * 60_000) } }, orderBy: { captureLe: "desc" }, select: { lat: true, lng: true } });
  const depart: Point = der ?? { lat: arrets[0].lat, lng: arrets[0].lng };
  const r = optimiserRoute({ depart, arrets, capacite: Math.max(f.capaciteMax - embarques, 0), vitesseMs: VITESSE_URBAINE_MS, maintenant });
  const parId = new Map(arrets.map((a) => [a.id, a])), route = await itineraire([depart, ...r.ordre.slice(0, 23).map((id) => parId.get(id)!)]), parCourse = new Map(courses.map((c) => [c.id, c]));
  return {
    depart: der ? depart : null,
    arrets: r.ordre.map((id, i) => { const a = parId.get(id)!, c = parCourse.get(a.commandeId)!; return { id, ordre: i + 1, type: a.type, courseId: c.id, reference: c.reference, ville: c.ville, quartier: c.quartier, express: c.express, lat: a.lat, lng: a.lng }; }),
    distanceM: route?.distanceM ?? r.distanceM, dureeS: route?.dureeS ?? null, routier: !!route, route: route?.trace ?? null, explication: r.explication,
    ignorees: r.ignores.map((id) => parCourse.get(id)?.reference ?? id),
    sansCoordonnees: courses.filter((c) => sansCoordonnees.includes(c.id)).map((c) => c.reference),
  };
}

export type VehiculeJumeau = { courseId: string; reference: string; statut: string; ville: string | null; fournisseur: string | null; lat: number | null; lng: number | null; signal: Fraicheur; le: Date | null; anomalies: Anomalie[] };

/** Vue admin : position du livreur et tension des zones, sans adresse ni identité du client. */
export async function etatJumeau(maintenant = Date.now()) {
  const [courses, fournisseurs] = await Promise.all([
    prisma.courseLivraison.findMany({ where: { statut: { in: ACTIFS } }, orderBy: { createdAt: "desc" }, take: 200, select: { id: true, reference: true, statut: true, ville: true, fournisseurId: true, finPrevue: true } }),
    prisma.fournisseurLogistique.findMany({ where: { suspendu: false, disponible: true, statutLegal: "verifie" }, select: { id: true, capaciteMax: true, zones: { select: { ville: true } } } }),
  ]);
  const ids = courses.map((c) => c.id);
  const [positions, noms] = await Promise.all([
    ids.length ? prisma.positionCourse.findMany({ where: { courseId: { in: ids }, suspect: false, captureLe: { gte: new Date(maintenant - 6 * 3_600_000) } }, orderBy: { captureLe: "desc" }, take: 2000, select: { courseId: true, lat: true, lng: true, captureLe: true, precisionM: true } }) : [],
    prisma.fournisseurLogistique.findMany({ where: { id: { in: courses.flatMap((c) => c.fournisseurId ?? []) } }, select: { id: true, nom: true } }),
  ]);
  const nomDe = new Map(noms.map((f) => [f.id, f.nom])), traces = new Map<string, typeof positions>();
  for (const p of positions) { const l = traces.get(p.courseId) ?? []; if (l.length < 40) l.push(p); traces.set(p.courseId, l); }
  const vehicules: VehiculeJumeau[] = courses.map((c) => {
    const t = traces.get(c.id) ?? [], der = t[0];
    return { courseId: c.id, reference: c.reference, statut: c.statut, ville: c.ville, fournisseur: c.fournisseurId ? nomDe.get(c.fournisseurId) ?? null : null, lat: der?.lat ?? null, lng: der?.lng ?? null, signal: fraicheur(der?.captureLe.getTime(), maintenant), le: der?.captureLe ?? null,
      anomalies: detecterAnomalies({ points: t.map((p) => ({ lat: p.lat, lng: p.lng, t: p.captureLe.getTime(), precisionM: p.precisionM })), maintenant, finPrevue: c.finPrevue?.getTime() ?? null }) };
  });
  return {
    genereLe: new Date(maintenant).toISOString(), vehicules,
    zones: tensionZones(courses, fournisseurs.map((f) => ({ capaciteMax: f.capaciteMax, villes: f.zones.map((z) => z.ville) }))),
    resume: { actives: courses.length, localisees: vehicules.filter((v) => v.lat != null).length, signalPerdu: vehicules.filter((v) => v.signal === "perime").length, anomalies: vehicules.reduce((s, v) => s + v.anomalies.length, 0) },
  };
}
