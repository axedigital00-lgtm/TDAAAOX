// Statistiques Releasit COD AXSO : entonnoir réel du paiement à la livraison (affichages → ouvertures →
// commandes → confirmées → livrées), CA commandé et encaissé, sources, villes, test A/B avec significativité.

/** Test de deux proportions (z) : la variante B fait-elle mieux ou moins bien que A, avec quelle confiance ? */
export function comparerVariantes(a: { essais: number; succes: number }, b: { essais: number; succes: number }) {
  const pa = a.essais ? a.succes / a.essais : 0, pb = b.essais ? b.succes / b.essais : 0;
  const p = (a.succes + b.succes) / Math.max(1, a.essais + b.essais);
  const se = Math.sqrt(p * (1 - p) * (1 / Math.max(1, a.essais) + 1 / Math.max(1, b.essais)));
  const z = se > 0 ? (pb - pa) / se : 0;
  // Confiance bilatérale (approximation de la loi normale, précision suffisante pour l'affichage).
  const cdf = (x: number) => { const t = 1 / (1 + 0.2316419 * Math.abs(x)); const d = 0.3989423 * Math.exp((-x * x) / 2); const q = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return x > 0 ? 1 - q : q; };
  const confiance = Math.round((1 - 2 * (1 - cdf(Math.abs(z)))) * 100);
  const assez = a.essais >= 100 && b.essais >= 100;
  return {
    tauxA: Math.round(pa * 1000) / 10, tauxB: Math.round(pb * 1000) / 10, confiance,
    gagnant: assez && confiance >= 95 ? (pb > pa ? "B" : "A") : null,
    message: !assez ? "Pas encore assez de visites (100 par variante au minimum)." : confiance >= 95 ? `Résultat fiable à ${confiance} %.` : `Écart encore incertain (confiance ${confiance} %).`,
  };
}

type Ligne = { source: Record<string, string> | null; ville: string; statut: string; confirmee: boolean; montant: number };

/** Regroupe les commandes par clé (source, ville) avec taux de confirmation et de livraison. */
export function regrouper(lignes: Ligne[], cle: (l: Ligne) => string) {
  const m = new Map<string, { nom: string; commandes: number; confirmees: number; livrees: number; ca: number }>();
  for (const l of lignes) {
    const k = cle(l) || "Direct";
    const s = m.get(k) ?? { nom: k, commandes: 0, confirmees: 0, livrees: 0, ca: 0 };
    s.commandes++; if (l.confirmee) s.confirmees++; if (l.statut === "livree") { s.livrees++; s.ca += l.montant; }
    m.set(k, s);
  }
  return [...m.values()].sort((a, b) => b.commandes - a.commandes).slice(0, 10)
    .map((s) => ({ ...s, tauxConfirmation: Math.round((s.confirmees / s.commandes) * 100), tauxLivraison: Math.round((s.livrees / s.commandes) * 100) }));
}
