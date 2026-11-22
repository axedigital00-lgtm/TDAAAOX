// Pilotage admin : gouvernance des modèles, graphe de confiance et intelligence financière.
import { prisma } from "@/lib/prisma";
import { prevoirDemande, type Prevision } from "./intelligence";

const MODELE_DEMANDE = "demande";

/** La prévision n'est plus publiée si un administrateur a retiré le modèle. */
export async function previsionGouvernee(serie: number[]): Promise<Prevision> {
  const m = await prisma.versionModele.findFirst({ where: { nom: MODELE_DEMANDE }, orderBy: { version: "desc" }, select: { etat: true } });
  if (m?.etat === "retire") return { disponible: false, motif: "Modèle retiré par un administrateur", joursObserves: serie.length };
  return prevoirDemande(serie);
}

/** Évaluation quotidienne : une nouvelle version n'est créée que si les métriques changent de jour. */
export async function passeModeles(maintenant = new Date()) {
  const depuis = new Date(maintenant.getTime() - 90 * 86_400_000);
  const courses = await prisma.courseLivraison.findMany({ where: { createdAt: { gte: depuis } }, select: { createdAt: true } });
  if (!courses.length) return { evalue: false };
  const parJour = new Map<string, number>();
  for (const c of courses) { const k = c.createdAt.toISOString().slice(0, 10); parJour.set(k, (parJour.get(k) ?? 0) + 1); }
  const premier = Math.min(...courses.map((c) => c.createdAt.getTime())), nb = Math.min(90, Math.floor((maintenant.getTime() - premier) / 86_400_000) + 1);
  const serie = Array.from({ length: nb }, (_, i) => parJour.get(new Date(maintenant.getTime() - (nb - 1 - i) * 86_400_000).toISOString().slice(0, 10)) ?? 0);
  const p = prevoirDemande(serie), jour = maintenant.toISOString().slice(0, 10);
  const der = await prisma.versionModele.findFirst({ where: { nom: MODELE_DEMANDE }, orderBy: { version: "desc" } });
  if ((der?.metriques as { jour?: string } | undefined)?.jour === jour) return { evalue: false };
  const metriques = { jour, joursObserves: serie.length, ...(p.disponible ? { erreurModele: p.erreurModele, erreurNaive: p.erreurNaive, confiance: p.confiance, publiable: p.publiable } : { motif: p.motif }) };
  const etat = der?.etat === "retire" ? "retire" : p.disponible && p.publiable ? "actif" : "shadow";
  await prisma.versionModele.create({ data: { nom: MODELE_DEMANDE, version: (der?.version ?? 0) + 1, etat, metriques } });
  return { evalue: true, etat };
}

export async function changerEtatModele(adminId: string, id: string, etat: "actif" | "shadow" | "retire") {
  const m = await prisma.versionModele.update({ where: { id }, data: { etat } });
  await prisma.journalLogistique.create({ data: { acteurType: "admin", acteurId: adminId, action: "modele.etat", entite: "VersionModele", entiteId: id, apres: { nom: m.nom, version: m.version, etat } } });
}

export type LienConfiance = { marchand: string; fournisseur: string; livrees: number; echecs: number; reussite: number };
/** Relations réelles marchand–transporteur et dépendance d'un marchand à un seul transporteur. */
export function construireGraphe(courses: { tenantId: string; fournisseurId: string | null; statut: string }[], noms: { marchands: Map<string, string>; fournisseurs: Map<string, string> }) {
  const liens = new Map<string, { t: string; f: string; livrees: number; echecs: number }>();
  for (const c of courses) {
    if (!c.fournisseurId || !["livree", "echec", "retournee"].includes(c.statut)) continue;
    const k = `${c.tenantId}|${c.fournisseurId}`, l = liens.get(k) ?? { t: c.tenantId, f: c.fournisseurId, livrees: 0, echecs: 0 };
    if (c.statut === "livree") l.livrees++; else l.echecs++;
    liens.set(k, l);
  }
  const liste: LienConfiance[] = [...liens.values()].map((l) => ({ marchand: noms.marchands.get(l.t) ?? "Boutique", fournisseur: noms.fournisseurs.get(l.f) ?? "Transporteur", livrees: l.livrees, echecs: l.echecs, reussite: Math.round((l.livrees / (l.livrees + l.echecs)) * 100) })).sort((a, b) => b.livrees + b.echecs - a.livrees - a.echecs);
  const parMarchand = new Map<string, LienConfiance[]>();
  for (const l of liste) parMarchand.set(l.marchand, [...(parMarchand.get(l.marchand) ?? []), l]);
  const dependances = [...parMarchand.entries()].flatMap(([marchand, x]) => {
    const total = x.reduce((s, l) => s + l.livrees + l.echecs, 0), top = x[0];
    const part = Math.round(((top.livrees + top.echecs) / total) * 100);
    return total >= 5 && part >= 80 ? [{ marchand, fournisseur: top.fournisseur, part, total }] : [];
  });
  return { liens: liste.slice(0, 40), dependances };
}

export function economieParVille(courses: { ville: string | null; statut: string; prixFournisseur: unknown; commission: unknown; creditApplique: unknown }[]) {
  const v = new Map<string, { ville: string; courses: number; volume: number; commission: number; credits: number }>();
  for (const c of courses) {
    if (c.statut !== "livree" || c.prixFournisseur == null) continue;
    const k = c.ville ?? "Non renseignée", x = v.get(k) ?? { ville: k, courses: 0, volume: 0, commission: 0, credits: 0 };
    x.courses++; x.volume += Number(c.prixFournisseur); x.commission += Number(c.commission ?? 0); x.credits += Number(c.creditApplique ?? 0);
    v.set(k, x);
  }
  return [...v.values()].map((x) => ({ ...x, prixMoyen: Math.round(x.volume / x.courses), contribution: x.commission - x.credits, deficitaire: x.commission < x.credits })).sort((a, b) => b.volume - a.volume);
}

export async function vuePilotage() {
  const depuis = new Date(Date.now() - 90 * 86_400_000);
  const [courses, modeles] = await Promise.all([
    prisma.courseLivraison.findMany({ where: { createdAt: { gte: depuis } }, take: 5000, select: { tenantId: true, fournisseurId: true, statut: true, ville: true, prixFournisseur: true, commission: true, creditApplique: true } }),
    prisma.versionModele.findMany({ orderBy: [{ nom: "asc" }, { version: "desc" }], take: 12 }),
  ]);
  const [t, f] = await Promise.all([
    prisma.tenant.findMany({ where: { id: { in: [...new Set(courses.map((c) => c.tenantId))] } }, select: { id: true, nomBoutique: true } }),
    prisma.fournisseurLogistique.findMany({ where: { id: { in: [...new Set(courses.flatMap((c) => c.fournisseurId ?? []))] } }, select: { id: true, nom: true } }),
  ]);
  return { graphe: construireGraphe(courses, { marchands: new Map(t.map((x) => [x.id, x.nomBoutique])), fournisseurs: new Map(f.map((x) => [x.id, x.nom])) }), economie: economieParVille(courses), modeles };
}
