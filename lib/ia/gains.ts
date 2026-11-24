// Suivi des gains du système de coins pour le Command Center.
import { prisma } from "@/lib/prisma";
import { COIN_FCFA } from "./coins-regles";
import { depenseDuMois, reglagesIa } from "./depenses";

const JOUR = 86_400_000;

export async function vueGainsCoins(jours = 30, maintenant = new Date()) {
  const depuis = new Date(maintenant.getTime() - jours * JOUR);
  const [r, ecritures, depenses, soldes, depMois] = await Promise.all([
    reglagesIa(),
    prisma.ecritureCoins.findMany({ where: { createdAt: { gte: depuis } }, select: { tenantId: true, type: true, source: true, montant: true, action: true, createdAt: true } }),
    prisma.depenseIa.findMany({ where: { createdAt: { gte: depuis } }, select: { tenantId: true, action: true, modele: true, coutUsd: true, coins: true, statut: true, createdAt: true } }),
    prisma.ecritureCoins.groupBy({ by: ["source"], _sum: { montant: true } }),
    depenseDuMois(maintenant),
  ]);
  const taux = r.tauxXaf, fcfa = (usd: number) => usd * taux;
  const conso = ecritures.filter((e) => e.type === "consommation"), rembourse = ecritures.filter((e) => e.type === "remboursement");
  const net = (source?: string) => -conso.filter((e) => !source || e.source === source).reduce((s, e) => s + e.montant, 0) - rembourse.filter((e) => !source || e.source === source).reduce((s, e) => s + e.montant, 0);
  const coinsAchetesConsommes = net("achete"), coinsInclusConsommes = net("inclus");
  const achats = ecritures.filter((e) => e.type === "achat").reduce((s, e) => s + e.montant, 0);
  const coutTotalUsd = depenses.reduce((s, d) => s + Number(d.coutUsd), 0);
  const revenuEncaisse = achats * COIN_FCFA, valeurConsommee = (coinsAchetesConsommes + coinsInclusConsommes) * COIN_FCFA;

  const parJour = new Map<string, { x: string; cout: number; valeur: number }>();
  for (let i = jours - 1; i >= 0; i--) { const k = new Date(maintenant.getTime() - i * JOUR).toISOString().slice(0, 10); parJour.set(k, { x: k.slice(5), cout: 0, valeur: 0 }); }
  for (const d of depenses) { const p = parJour.get(d.createdAt.toISOString().slice(0, 10)); if (p) p.cout += fcfa(Number(d.coutUsd)); }
  for (const e of [...conso, ...rembourse]) { const p = parJour.get(e.createdAt.toISOString().slice(0, 10)); if (p) p.valeur += -e.montant * COIN_FCFA; }

  const parAction = new Map<string, { action: string; actions: number; echecs: number; coins: number; cout: number }>();
  for (const d of depenses) {
    if (d.statut === "echec") { const a = parAction.get(d.action) ?? { action: d.action, actions: 0, echecs: 0, coins: 0, cout: 0 }; a.echecs++; a.cout += fcfa(Number(d.coutUsd)); parAction.set(d.action, a); continue; }
    const a = parAction.get(d.action) ?? { action: d.action, actions: 0, echecs: 0, coins: 0, cout: 0 };
    if (d.coins) { a.actions++; a.coins += d.coins; }
    a.cout += fcfa(Number(d.coutUsd)); parAction.set(d.action, a);
  }
  const parBoutique = new Map<string, { coins: number; cout: number }>();
  for (const e of conso) { const b = parBoutique.get(e.tenantId) ?? { coins: 0, cout: 0 }; b.coins += -e.montant; parBoutique.set(e.tenantId, b); }
  for (const d of depenses) if (d.tenantId) { const b = parBoutique.get(d.tenantId) ?? { coins: 0, cout: 0 }; b.cout += fcfa(Number(d.coutUsd)); parBoutique.set(d.tenantId, b); }
  const top = [...parBoutique.entries()].sort((a, b) => b[1].coins - a[1].coins).slice(0, 10);
  const noms = new Map((await prisma.tenant.findMany({ where: { id: { in: top.map(([id]) => id) } }, select: { id: true, nomBoutique: true } })).map((t) => [t.id, t.nomBoutique]));
  const circulation = Object.fromEntries(soldes.map((s) => [s.source, Number(s._sum.montant ?? 0)]));
  const jourDuMois = maintenant.getUTCDate(), joursMois = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth() + 1, 0)).getUTCDate();

  return {
    periodeJours: jours, tauxXaf: taux, reglages: r,
    kpis: {
      revenuEncaisse, valeurConsommee, coutReel: fcfa(coutTotalUsd), coutUsd: coutTotalUsd,
      margeBrute: coinsAchetesConsommes * COIN_FCFA - fcfa(coutTotalUsd),
      coutParCoin: coinsAchetesConsommes + coinsInclusConsommes ? fcfa(coutTotalUsd) / (coinsAchetesConsommes + coinsInclusConsommes) : null,
      multiplicateurReel: coutTotalUsd ? valeurConsommee / fcfa(coutTotalUsd) : null,
      coinsAchetesConsommes, coinsInclusConsommes, coinsAchetes: achats,
      echecs: depenses.filter((d) => d.statut === "echec").length,
      boutiquesActives: parBoutique.size,
    },
    budget: { mois: depMois, plafond: r.budgetMensuelUsd, projection: jourDuMois ? (depMois / jourDuMois) * joursMois : depMois, pct: r.budgetMensuelUsd ? Math.round((depMois / r.budgetMensuelUsd) * 100) : null },
    circulation: { inclus: circulation.inclus ?? 0, achetes: circulation.achete ?? 0, passifFcfa: (circulation.achete ?? 0) * COIN_FCFA },
    serie: [...parJour.values()].map((p) => ({ ...p, cout: Math.round(p.cout), valeur: Math.round(p.valeur) })),
    parAction: [...parAction.values()].map((a) => ({ ...a, cout: Math.round(a.cout), valeur: a.coins * COIN_FCFA, marge: a.coins * COIN_FCFA - Math.round(a.cout) })),
    topBoutiques: top.map(([id, b]) => ({ id, nom: noms.get(id) ?? "Boutique", coins: b.coins, cout: Math.round(b.cout) })),
  };
}
