// Moteur de devis : prix détaillé et transparent. Une distance inconnue n'est jamais inventée.
import { createHash } from "crypto";

export type ModeleTarif = "zone" | "distance" | "poids" | "volume" | "hybride" | "contrat";
export type RegleTarif = {
  modele: ModeleTarif;
  devise: string;
  base: number;
  parKm?: number;
  kmInclus?: number;
  parKg?: number;
  kgInclus?: number;
  parLitre?: number;
  litresInclus?: number;
  zones?: Record<string, number>;
  enlevement?: number;
  zoneEloignee?: number;
  expressPct?: number;
  manutention?: number;
  retour?: number;
  attenteParMin?: number;
  nuitWeekendPct?: number;
  prixContrat?: number;
};
export type DemandeDevis = {
  zone?: string | null;
  distanceKm?: number | null;
  poidsKg?: number | null;
  dimensionsCm?: [number, number, number] | null;
  express?: boolean;
  eloignee?: boolean;
  fragile?: boolean;
  nuitOuWeekend?: boolean;
  retour?: boolean;
  attenteMin?: number | null;
};
export type LigneDevis = { code: string; libelle: string; montant: number };
export type Devis =
  | { eligible: false; motif: string }
  | { eligible: true; devise: string; lignes: LigneDevis[]; prixFournisseur: number; commission: number; versementFournisseur: number; creditApplique: number; prixMarchand: number; expireLe: Date; empreinte: string };

export const DUREE_DEVIS_MS = 15 * 60_000;
export const TAUX_COMMISSION_DEFAUT = 0.1;

const entier = (n: number) => Math.round(n);
export const volumeLitres = (d?: [number, number, number] | null) => (d ? (d[0] * d[1] * d[2]) / 1000 : null);

/** Empreinte des conditions : si elle change, le devis doit être recalculé. */
export const empreinteDemande = (d: DemandeDevis) => createHash("sha256").update(JSON.stringify([d.zone ?? null, d.distanceKm ?? null, d.poidsKg ?? null, d.dimensionsCm ?? null, !!d.express, !!d.eloignee, !!d.fragile, !!d.nuitOuWeekend, !!d.retour, d.attenteMin ?? 0])).digest("hex").slice(0, 32);

export function calculerDevis(r: RegleTarif, d: DemandeDevis, o: { maintenant: Date; tauxCommission?: number; creditDisponible?: number }): Devis {
  const lignes: LigneDevis[] = [];
  const ajoute = (code: string, libelle: string, montant: number) => { if (montant > 0) lignes.push({ code, libelle, montant: entier(montant) }); };
  const litres = volumeLitres(d.dimensionsCm);

  if (r.modele === "contrat") {
    if (r.prixContrat == null) return { eligible: false, motif: "Prix contractuel non défini" };
    ajoute("contrat", "Prix contractuel", r.prixContrat);
  } else if (r.modele === "zone") {
    const prix = d.zone ? r.zones?.[d.zone] : undefined;
    if (prix == null) return { eligible: false, motif: "Zone non tarifée" };
    ajoute("zone", `Zone ${d.zone}`, prix);
  } else {
    ajoute("base", "Prix de base", r.base);
  }
  if (r.modele === "distance" || (r.modele === "hybride" && r.parKm)) {
    if (d.distanceKm == null) return { eligible: false, motif: "Distance indisponible" };
    ajoute("distance", "Distance", Math.max(0, d.distanceKm - (r.kmInclus ?? 0)) * (r.parKm ?? 0));
  }
  if (r.modele === "poids" || r.modele === "hybride") {
    if (r.parKg) {
      if (d.poidsKg == null) return { eligible: false, motif: "Poids requis" };
      ajoute("poids", "Supplément poids", Math.max(0, d.poidsKg - (r.kgInclus ?? 0)) * r.parKg);
    }
  }
  if (r.modele === "volume" || (r.modele === "hybride" && r.parLitre)) {
    if (litres == null) return { eligible: false, motif: "Dimensions requises" };
    ajoute("volume", "Supplément volume", Math.max(0, litres - (r.litresInclus ?? 0)) * (r.parLitre ?? 0));
  }
  if (r.modele !== "contrat") {
    ajoute("enlevement", "Enlèvement", r.enlevement ?? 0);
    if (d.eloignee) ajoute("eloignee", "Zone éloignée", r.zoneEloignee ?? 0);
    if (d.fragile) ajoute("manutention", "Manutention spéciale", r.manutention ?? 0);
    if (d.retour) ajoute("retour", "Retour du colis", r.retour ?? 0);
    if (d.attenteMin) ajoute("attente", "Temps d'attente", d.attenteMin * (r.attenteParMin ?? 0));
    const sousTotal = lignes.reduce((s, l) => s + l.montant, 0);
    if (d.express) ajoute("express", "Livraison express", sousTotal * ((r.expressPct ?? 0) / 100));
    if (d.nuitOuWeekend) ajoute("nuit", "Nuit ou week-end", sousTotal * ((r.nuitWeekendPct ?? 0) / 100));
  }

  const prixFournisseur = lignes.reduce((s, l) => s + l.montant, 0);
  if (prixFournisseur <= 0) return { eligible: false, motif: "Tarif incomplet" };
  const commission = entier(prixFournisseur * (o.tauxCommission ?? TAUX_COMMISSION_DEFAUT));
  const creditApplique = Math.min(prixFournisseur, Math.max(0, entier(o.creditDisponible ?? 0)));
  return {
    eligible: true, devise: r.devise, lignes, prixFournisseur, commission,
    versementFournisseur: prixFournisseur - commission, creditApplique, prixMarchand: prixFournisseur - creditApplique,
    expireLe: new Date(o.maintenant.getTime() + DUREE_DEVIS_MS), empreinte: empreinteDemande(d),
  };
}

export function devisEncoreValable(q: { expireLe: Date; empreinte: string }, d: DemandeDevis, maintenant: Date) {
  return q.expireLe > maintenant && q.empreinte === empreinteDemande(d);
}
