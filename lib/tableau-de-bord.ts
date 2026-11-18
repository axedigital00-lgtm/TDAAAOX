// Tableau de bord (/dashboard/accueil) : périodes, comparaison et indicateurs, sans base de données (testés).
// Heure du serveur, comme le reste des tableaux de bord.
// ponytail: fuseau du serveur (UTC sur Vercel) ; passer le fuseau de la boutique si un écart d'une heure gêne.

export const PERIODES = ["jour", "7j", "30j", "mois"] as const;
export type Periode = (typeof PERIODES)[number];
export const LIBELLES_PERIODE: Record<Periode, string> = { jour: "Aujourd'hui", "7j": "7 jours", "30j": "30 jours", mois: "Ce mois" };
export const PERIODE_DEFAUT: Periode = "30j";

export const lirePeriode = (v?: string | string[] | null): Periode =>
  (PERIODES as readonly string[]).includes(v as string) ? (v as Periode) : PERIODE_DEFAUT;

export interface Intervalle { debut: Date; fin: Date }
export interface Bornes extends Intervalle { precedente: Intervalle; parHeure: boolean }

const JOUR = 86400_000;
const minuit = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const plusJours = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());

/**
 * Période en cours [debut, fin) et période précédente de même longueur, arrêtée au même moment
 * (aujourd'hui jusqu'à 14 h ↔ hier jusqu'à 14 h ; ce mois au 17 ↔ mois dernier au 17).
 */
export function bornesPeriode(p: Periode, maintenant = new Date()): Bornes {
  const fin = maintenant;
  if (p === "mois") {
    const debut = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
    const debutPrec = new Date(maintenant.getFullYear(), maintenant.getMonth() - 1, 1);
    // Même jour du mois précédent, borné à sa fin (31 mars ↔ 29 février, pas 2 mars).
    const dernierJourPrec = new Date(maintenant.getFullYear(), maintenant.getMonth(), 0).getDate();
    const finPrec = new Date(debutPrec.getFullYear(), debutPrec.getMonth(), Math.min(maintenant.getDate(), dernierJourPrec),
      maintenant.getHours(), maintenant.getMinutes(), maintenant.getSeconds(), maintenant.getMilliseconds());
    return { debut, fin, precedente: { debut: debutPrec, fin: finPrec }, parHeure: false };
  }
  const jours = p === "jour" ? 1 : p === "7j" ? 7 : 30;
  const debut = plusJours(minuit(maintenant), -(jours - 1));
  return { debut, fin, precedente: { debut: plusJours(debut, -jours), fin: plusJours(fin, -jours) }, parHeure: p === "jour" };
}

/** Tranches de la courbe : une par heure (aujourd'hui) ou par jour, jusqu'à maintenant. */
export function tranches(b: Bornes): Date[] {
  const out: Date[] = [];
  if (b.parHeure) for (let h = 0; h <= b.fin.getHours(); h++) out.push(new Date(b.debut.getTime() + h * 3600_000));
  else for (let d = b.debut; d < b.fin; d = plusJours(d, 1)) out.push(d);
  return out;
}

export interface LigneCommande { createdAt: Date; montantTotal: number; paiementStatut: string; canal?: string; statut?: string }

/** Courbe des ventes : montant payé et nombre de commandes par tranche (commandes annulées exclues par l'appelant). */
export function courbe(cmds: LigneCommande[], b: Bornes, loc = "fr-FR") {
  const t = tranches(b);
  const pas = b.parHeure ? 3600_000 : JOUR;
  const points = t.map((d) => ({
    date: b.parHeure ? `${d.getHours()}h` : d.toLocaleDateString(loc, { day: "2-digit", month: "2-digit" }),
    montant: 0, commandes: 0,
  }));
  for (const c of cmds) {
    // Index par jour calendaire (pas par 24 h) pour rester juste au changement d'heure.
    const i = b.parHeure ? Math.floor((c.createdAt.getTime() - b.debut.getTime()) / pas)
      : Math.round((minuit(c.createdAt).getTime() - b.debut.getTime()) / JOUR);
    const p = points[i];
    if (!p) continue;
    p.commandes++;
    if (c.paiementStatut === "completed") p.montant += c.montantTotal;
  }
  return points;
}

/**
 * Indicateurs d'une période, sur les commandes non annulées :
 * - commandes : toutes (en ligne + caisse) ;
 * - chiffre d'affaires et panier moyen : commandes payées seulement (même définition que partout : paiementStatut « completed ») ;
 * - conversion : commandes EN LIGNE / visiteurs de la vitrine ; null sans visiteur (jamais inventée).
 */
export function indicateurs(cmds: LigneCommande[], visiteurs: number) {
  const payees = cmds.filter((c) => c.paiementStatut === "completed");
  const ca = payees.reduce((s, c) => s + c.montantTotal, 0);
  const enLigne = cmds.filter((c) => (c.canal ?? "en_ligne") === "en_ligne").length;
  return {
    commandes: cmds.length,
    chiffreAffaires: ca,
    panierMoyen: payees.length ? ca / payees.length : null,
    visiteurs,
    conversion: visiteurs > 0 ? (enLigne / visiteurs) * 100 : null,
  };
}

/** Évolution en % par rapport à la période précédente ; null si rien à comparer. */
export function variation(actuel: number | null, precedent: number | null): number | null {
  if (actuel === null || precedent === null || precedent === 0) return null;
  return Math.round(((actuel - precedent) / precedent) * 100);
}

/** Projection fin de mois (période « Ce mois ») : moyenne par jour écoulé × jours du mois. */
export function projectionMois(ca: number, maintenant = new Date()) {
  const jours = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 0).getDate();
  return Math.round((ca / maintenant.getDate()) * jours);
}
