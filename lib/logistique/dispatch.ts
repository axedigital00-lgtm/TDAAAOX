// Décision de dispatch : pure et rejouable. Elle dit quoi faire et pourquoi ; le service l'exécute.
import { classer, phraseRecommandation, POIDS_CLASSEMENT, type Classe } from "./classement";
import type { BesoinLivraison, Candidat, ModeDispatch } from "./types";

export type PolitiqueDispatch = {
  version: number;
  mode: ModeDispatch;
  pause?: boolean;
  delaiAcceptationS: number;
  tentativesMax: number;
  preferVerifie: boolean;
  noteMinAuto: number;
  valeurApprobation?: number | null;
  valeurMaxEssai?: number | null;
  deploiementPct?: number;
  poids?: typeof POIDS_CLASSEMENT;
};
export const POLITIQUE_DEFAUT: PolitiqueDispatch = { version: 1, mode: "recommandation", delaiAcceptationS: 300, tentativesMax: 3, preferVerifie: true, noteMinAuto: 60, valeurApprobation: 200_000 };

export type DecisionDispatch = {
  action: "assigner" | "proposer" | "approbation" | "escalader";
  fournisseurId: string | null;
  explication: string;
  politiqueVersion: number;
  alternatives: { id: string; note: number }[];
  ecartes: { id: string; nom: string; motifs: string[] }[];
};

/** Déploiement progressif : une boutique reste dans le même groupe d'une évaluation à l'autre. */
export const dansDeploiement = (tenantId: string, pct = 100) => pct >= 100 || ([...tenantId].reduce((n, c) => (Math.imul(n, 31) + c.charCodeAt(0)) >>> 0, 7) % 100) < pct;

export function decider(p: { candidats: Candidat[]; besoin?: BesoinLivraison; politique?: PolitiqueDispatch; valeurCommande?: number; tentatives?: number }): DecisionDispatch {
  const pol = p.politique ?? POLITIQUE_DEFAUT, tentatives = p.tentatives ?? 0;
  const { classes, ecartes } = classer(p.candidats, p.besoin, pol.poids);
  const base = { politiqueVersion: pol.version, alternatives: classes.slice(1, 4).map((c) => ({ id: c.candidat.id, note: c.note })), ecartes };
  if (tentatives >= pol.tentativesMax) return { ...base, action: "escalader", fournisseurId: null, explication: `Aucune acceptation après ${tentatives} tentatives : intervention requise.` };
  if (!classes.length) return { ...base, action: "escalader", fournisseurId: null, explication: "Aucun fournisseur éligible pour cette livraison." };

  const verifie = pol.preferVerifie ? classes.find((c) => c.candidat.statutLegal === "verifie" && classes[0].note - c.note <= 5) : undefined;
  const choisi: Classe = verifie ?? classes[0];
  const explication = phraseRecommandation(choisi);
  const id = choisi.candidat.id;
  if (pol.pause || pol.mode === "recommandation") return { ...base, action: "proposer", fournisseurId: id, explication };
  if (pol.valeurApprobation != null && (p.valeurCommande ?? 0) >= pol.valeurApprobation) return { ...base, action: "approbation", fournisseurId: id, explication: `${explication} Validation requise : commande de forte valeur.` };
  if (choisi.note < pol.noteMinAuto) return { ...base, action: "approbation", fournisseurId: id, explication: `${explication} Validation requise : confiance insuffisante pour une assignation automatique.` };
  const essaiAutorise = pol.valeurMaxEssai != null && choisi.candidat.statutLegal === "verifie" && (p.valeurCommande ?? Infinity) <= pol.valeurMaxEssai;
  if (pol.mode === "autonome" && choisi.candidat.score.probation && !essaiAutorise) return { ...base, action: "approbation", fournisseurId: id, explication: `${explication} Validation requise : fournisseur en période d'essai.` };
  return { ...base, action: "assigner", fournisseurId: id, explication };
}

/** Fournisseurs à ne plus solliciter : une société exclut aussi ses livreurs, et inversement. */
export function exclusionsApresRefus(refuses: string[], candidats: Candidat[]) {
  const e = new Set(refuses);
  for (const c of candidats) {
    if (c.societeParenteId && e.has(c.societeParenteId)) e.add(c.id);
    if (e.has(c.id) && c.societeParenteId) e.add(c.societeParenteId);
  }
  return [...e];
}

export const assignationExpiree = (a: { statut: string; expireLe: Date }, maintenant: Date) => a.statut === "proposee" && a.expireLe <= maintenant;
