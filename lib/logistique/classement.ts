// Éligibilité (règles dures) puis classement multi-critères, avec une explication fondée sur les données.
import type { BesoinLivraison, Candidat, CategorieReco } from "./types";

export type PoidsClassement = { fiabilite: number; prix: number; delai: number; charge: number; legal: number };
export const POIDS_CLASSEMENT: PoidsClassement = { fiabilite: 0.4, prix: 0.25, delai: 0.15, charge: 0.1, legal: 0.1 };

export function motifsInegibilite(c: Candidat, b: BesoinLivraison = {}): string[] {
  const m: string[] = [];
  if (c.suspendu || c.statutLegal === "suspendu") m.push("Compte suspendu");
  if (!c.documentsObligatoiresValides) m.push("Document obligatoire manquant ou expiré");
  if (b.exigerVerifie && c.statutLegal !== "verifie") m.push("Vérification légale requise");
  if (!c.couvreZone) m.push("Zone non couverte");
  if (!c.disponible) m.push("Indisponible");
  if (c.capaciteRestante <= 0) m.push("Capacité atteinte");
  if (b.vehiculeRequis && !c.vehicules.includes(b.vehiculeRequis)) m.push("Véhicule incompatible");
  if (b.poidsKg != null && c.poidsMaxKg != null && b.poidsKg > c.poidsMaxKg) m.push("Colis trop lourd");
  if (c.prix == null) m.push("Prix indisponible");
  if (c.prix != null && b.budgetMax != null && c.prix > b.budgetMax) m.push("Au-dessus du budget");
  if (b.exclus?.includes(c.id) || (c.societeParenteId && b.exclus?.includes(c.societeParenteId))) m.push("Déjà sollicité pour cette course");
  return m;
}

const normaliser = (v: number | null | undefined, min: number, max: number) => (v == null ? 0.5 : max === min ? 1 : 1 - (v - min) / (max - min));

export type Classe = { candidat: Candidat; note: number; raisons: string[] };

export function classer(candidats: Candidat[], b: BesoinLivraison = {}, poids = POIDS_CLASSEMENT) {
  const eligibles = candidats.filter((c) => !motifsInegibilite(c, b).length);
  const ecartes = candidats.filter((c) => motifsInegibilite(c, b).length).map((c) => ({ id: c.id, nom: c.nom, motifs: motifsInegibilite(c, b) }));
  const bornes = (f: (c: Candidat) => number | null | undefined) => {
    const v = eligibles.map(f).filter((x): x is number => x != null);
    return v.length ? [Math.min(...v), Math.max(...v)] : [0, 0];
  };
  const [pMin, pMax] = bornes((c) => c.prix), [eMin, eMax] = bornes((c) => c.etaMinutes);
  const classes: Classe[] = eligibles.map((c) => {
    const charge = c.chargeActive + c.capaciteRestante > 0 ? c.capaciteRestante / (c.chargeActive + c.capaciteRestante) : 0;
    // Nouveau fournisseur : fiabilité prudente, ni avantagé ni présenté comme établi.
    const fiabilite = (c.score.probation ? Math.min(c.score.fiabilite, 70) : c.score.fiabilite) / 100;
    const note = fiabilite * poids.fiabilite + normaliser(c.prix, pMin, pMax) * poids.prix + normaliser(c.etaMinutes, eMin, eMax) * poids.delai + charge * poids.charge + (c.statutLegal === "verifie" ? 1 : 0) * poids.legal;
    return { candidat: c, note: Math.round(note * 1000) / 10, raisons: expliquer(c, pMin) };
  }).sort((a, b2) => b2.note - a.note || (a.candidat.prix ?? 0) - (b2.candidat.prix ?? 0) || a.candidat.id.localeCompare(b2.candidat.id));
  return { classes, ecartes, categories: categories(classes) };
}

function expliquer(c: Candidat, prixMin: number) {
  const r: string[] = [];
  if (c.statutLegal === "verifie") r.push("documents légaux vérifiés");
  if (c.score.probation) r.push(`nouveau fournisseur (${c.score.volume} livraison${c.score.volume > 1 ? "s" : ""})`);
  else if (c.score.tauxReussite != null) r.push(`${Math.round(c.score.tauxReussite * 100)} % de livraisons réussies sur ${c.score.volume}`);
  if (c.capaciteRestante > 0) r.push("capacité disponible");
  if (c.prix != null && c.prix === prixMin) r.push("meilleur prix pour cette destination");
  if (c.etaMinutes != null) r.push(`arrivée estimée en ${c.etaMinutes} min`);
  return r;
}

export const phraseRecommandation = (x: Classe) => `AXSO recommande ${x.candidat.nom} : ${x.raisons.join(", ")}.`;

function categories(l: Classe[]): Partial<Record<CategorieReco, string>> {
  const meilleur = (f: (c: Candidat) => number | null | undefined, liste = l) => {
    const v = liste.filter((x) => f(x.candidat) != null).sort((a, b) => f(a.candidat)! - f(b.candidat)!);
    return v[0]?.candidat.id;
  };
  const r: Partial<Record<CategorieReco, string>> = {};
  if (l[0]) r.meilleur_global = l[0].candidat.id;
  const societe = l.find((x) => x.candidat.type === "societe" && x.candidat.statutLegal === "verifie");
  if (societe) r.meilleure_societe = societe.candidat.id;
  const prix = meilleur((c) => c.prix); if (prix) r.meilleur_prix = prix;
  const rapide = meilleur((c) => c.etaMinutes); if (rapide) r.plus_rapide = rapide;
  const fiable = meilleur((c) => -c.score.fiabilite, l.filter((x) => !x.candidat.score.probation)); if (fiable) r.plus_fiable = fiable;
  const proche = meilleur((c) => c.distanceKm); if (proche) r.plus_proche = proche;
  return r;
}
