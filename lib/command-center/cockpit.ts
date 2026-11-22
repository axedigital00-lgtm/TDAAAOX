// Cockpit : agrégats des graphiques avancés, calculés depuis la Vue (mêmes données et filtres que
// le reste du Command Center). Module pur. `argent: false` retire tout montant de la sortie.
import { JOUR, debutJour, type Fenetre } from "./contexte";
import { tranche, type Vue } from "./moteur";
import { NOM_PLAN, type Commande, type PlanId } from "./types";

const DOUALA = 3_600_000;
export const JOURS_SEMAINE = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

/** Commandes par jour de semaine (lundi = 0) et par heure, à l'heure de Douala. */
export function heatmapActivite(commandes: Pick<Commande, "date">[]): number[][] {
  const g = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  for (const c of commandes) {
    const d = new Date(c.date + DOUALA);
    g[(d.getUTCDay() + 6) % 7][d.getUTCHours()]++;
  }
  return g;
}

export type Noeud = { id: string; nom: string; colonne: number; valeur: number };
export type Lien = { de: string; vers: string; valeur: number };

const groupeMethode = (m: string) => {
  const x = m.toLowerCase();
  if (x.includes("cod") || x.includes("livraison")) return "À la livraison";
  if (x.includes("mobile") || x.includes("momo") || x.includes("orange") || x.includes("mtn") || x.includes("wave")) return "Mobile Money";
  if (x.includes("espece") || x.includes("cash")) return "Espèces";
  if (x.includes("carte") || x.includes("card")) return "Carte";
  if (x.includes("terme")) return "À terme";
  return "Autre";
};
const NOM_STATUT: Record<Commande["statut"], string> = { payee: "Payée", en_attente: "En attente", annulee: "Annulée", remboursee: "Remboursée", echouee: "Échouée" };

/** Flux canal → paiement → statut, en nombre de commandes. */
export function fluxCommandes(commandes: Pick<Commande, "canal" | "methode" | "statut">[]) {
  const liens = new Map<string, Lien>();
  const ajoute = (de: string, vers: string) => { const k = `${de}>${vers}`; const l = liens.get(k); if (l) l.valeur++; else liens.set(k, { de, vers, valeur: 1 }); };
  const noeuds = new Map<string, Noeud>();
  const noeud = (id: string, nom: string, colonne: number) => { const n = noeuds.get(id); if (n) n.valeur++; else noeuds.set(id, { id, nom, colonne, valeur: 1 }); };
  for (const c of commandes) {
    const a = `c:${c.canal}`, b = `m:${groupeMethode(c.methode)}`, d = `s:${c.statut}`;
    noeud(a, c.canal === "pos" ? "Caisse" : "En ligne", 0); noeud(b, groupeMethode(c.methode), 1); noeud(d, NOM_STATUT[c.statut], 2);
    ajoute(a, b); ajoute(b, d);
  }
  return { noeuds: [...noeuds.values()].sort((x, y) => x.colonne - y.colonne || y.valeur - x.valeur), liens: [...liens.values()] };
}

const indexMois = (t: number) => { const d = new Date(t + DOUALA); return d.getUTCFullYear() * 12 + d.getUTCMonth(); };

/** Par mois d'inscription : part des marchands ayant une commande payée k mois plus tard. */
export function cohortes(v: Pick<Vue, "marchands" | "commandes" | "maintenant">, nb = 6) {
  const fin = indexMois(v.maintenant);
  const actifs = new Map<string, Set<number>>();
  for (const c of v.commandes) {
    if (c.statut !== "payee") continue;
    let s = actifs.get(c.marchandId);
    if (!s) actifs.set(c.marchandId, (s = new Set()));
    s.add(indexMois(c.date));
  }
  const lignes: { mois: number; taille: number; retention: (number | null)[] }[] = [];
  for (let i = nb - 1; i >= 0; i--) {
    const mois = fin - i, membres = v.marchands.filter((m) => indexMois(m.creeLe) === mois);
    const retention = Array.from({ length: nb }, (_, k) => {
      if (mois + k > fin) return null;
      if (!membres.length) return null;
      return membres.filter((m) => actifs.get(m.id)?.has(mois + k)).length / membres.length;
    });
    lignes.push({ mois, taille: membres.length, retention });
  }
  return lignes;
}

/** Part du volume portée par les 10 % de marchands les plus actifs (au moins un marchand). */
export function concentration(valeurs: number[]) {
  const t = valeurs.filter((x) => x > 0).sort((a, b) => b - a);
  const total = t.reduce((s, x) => s + x, 0);
  if (!total) return null;
  const top = Math.max(1, Math.ceil(t.length * 0.1));
  return { part: t.slice(0, top).reduce((s, x) => s + x, 0) / total, top, total: t.length };
}

export function donneesCockpit(v: Vue, w: Fenetre, opts: { argent: boolean }) {
  const dansFenetre = tranche(v.commandes, w);
  const payees = dansFenetre.filter((c) => c.statut === "payee");
  const m = v.marchands;
  const entonnoir = [
    { nom: "Inscrits", valeur: m.length },
    { nom: "Boutique créée", valeur: m.filter((x) => x.etapes.boutique).length },
    { nom: "Produit ajouté", valeur: m.filter((x) => x.etapes.produit).length },
    { nom: "Première commande", valeur: m.filter((x) => x.etapes.commande).length },
    { nom: "Premier paiement", valeur: m.filter((x) => x.etapes.paiement).length },
  ];
  const plans = (Object.keys(NOM_PLAN) as PlanId[]).map((p) => ({ nom: NOM_PLAN[p], valeur: m.filter((x) => x.plan === p).length }));

  const parIndustrie = new Map<string, number>();
  for (const c of payees) {
    const ind = v.parId.get(c.marchandId)?.industrie || "Autre";
    parIndustrie.set(ind, (parIndustrie.get(ind) ?? 0) + (opts.argent ? c.montant : 1));
  }
  const industries = [...parIndustrie].map(([nom, valeur]) => ({ nom, valeur })).sort((a, b) => b.valeur - a.valeur).slice(0, 12);

  const parMarchand = new Map<string, number>();
  for (const c of payees) parMarchand.set(c.marchandId, (parMarchand.get(c.marchandId) ?? 0) + (opts.argent ? c.montant : 1));

  const nbJours = Math.min(90, Math.max(14, Math.ceil((w.fin - w.debut) / JOUR)));
  const depart = debutJour(w.fin - (nbJours - 1) * JOUR);
  const jours = Array.from({ length: nbJours }, (_, i) => ({ t: depart + i * JOUR, commandes: 0, gmv: 0, annulees: 0 }));
  for (const c of tranche(v.commandes, { debut: depart, fin: w.fin })) {
    const j = jours[Math.floor((debutJour(c.date) - depart) / JOUR)];
    if (!j) continue;
    j.commandes++;
    if (c.statut === "payee" && opts.argent) j.gmv += c.montant;
    if (c.statut === "annulee" || c.statut === "echouee") j.annulees++;
  }
  const expediees = dansFenetre.filter((c) => c.livraison !== "sans_objet");
  const logistique = [
    { nom: "Non expédiées", valeur: expediees.filter((c) => c.livraison === "non_expediee").length },
    { nom: "En route", valeur: expediees.filter((c) => c.livraison === "expediee").length },
    { nom: "Livrées", valeur: expediees.filter((c) => c.livraison === "livree").length },
    { nom: "Échecs", valeur: expediees.filter((c) => c.livraison === "echec").length },
  ];
  const delais = dansFenetre.map((c) => c.delaiLivraisonH).filter((x): x is number => x != null);
  return {
    argent: opts.argent,
    total: dansFenetre.length, payees: payees.length,
    heatmap: heatmapActivite(dansFenetre), flux: fluxCommandes(dansFenetre), cohortes: cohortes(v),
    entonnoir, plans, industries, concentration: concentration([...parMarchand.values()]), jours, logistique,
    delaiMoyenH: delais.length ? delais.reduce((s, x) => s + x, 0) / delais.length : null,
  };
}
export type DonneesCockpit = ReturnType<typeof donneesCockpit>;
