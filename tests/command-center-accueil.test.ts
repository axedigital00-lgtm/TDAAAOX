// Accueil du Command Center : périodes calendaires (Douala) et classement par plan.
import { test } from "node:test";
import assert from "node:assert/strict";
import { debutMois, periodesCA, debutInscription, etatPlan, repartitionPlans } from "@/lib/command-center/accueil";
import { JOUR } from "@/lib/command-center/contexte";

const H = 3_600_000;

test("début de mois à l'heure de Douala", () => {
  assert.equal(debutMois(Date.UTC(2026, 10, 18, 12)), Date.UTC(2026, 10, 1) - H);
  // 31/10 23 h 30 UTC = 1er novembre 00 h 30 à Douala.
  assert.equal(debutMois(Date.UTC(2026, 9, 31, 23, 30)), Date.UTC(2026, 10, 1) - H);
  assert.equal(debutMois(Date.UTC(2026, 0, 15), -1), Date.UTC(2025, 11, 1) - H);
});

test("périodes de CA : en cours vs même durée de la période précédente", () => {
  const t = Date.UTC(2026, 10, 18, 13); // mercredi 18/11/2026, 14 h à Douala
  const p = Object.fromEntries(periodesCA(t).map((x) => [x.id, x]));
  assert.deepEqual(p.jour.cur, { debut: Date.UTC(2026, 10, 18) - H, fin: t });
  assert.deepEqual(p.jour.prev, { debut: Date.UTC(2026, 10, 17) - H, fin: t - JOUR });
  assert.equal(p.semaine.cur.debut, Date.UTC(2026, 10, 16) - H); // lundi
  assert.equal(p.semaine.prev.fin, t - 7 * JOUR);
  assert.equal(p.mois.prev.debut, Date.UTC(2026, 9, 1) - H);
  assert.equal(p.mois.prev.fin - p.mois.prev.debut, t - p.mois.cur.debut);
  assert.equal(p.annee.prev.debut, Date.UTC(2025, 0, 1) - H);
  // 31 mars : la comparaison avec février s'arrête au 1er mars, sans déborder.
  const m = periodesCA(Date.UTC(2026, 2, 31, 12)).find((x) => x.id === "mois")!;
  assert.equal(m.prev.fin, m.cur.debut);
});

test("périodes d'inscription", () => {
  const t = Date.UTC(2026, 10, 18, 13);
  assert.equal(debutInscription("jour", t), Date.UTC(2026, 10, 18) - H);
  assert.equal(debutInscription("7j", t), t - 7 * JOUR);
  assert.equal(debutInscription("tout", t), null);
});

test("état du plan : payé non échu, essai en cours, sinon Essentiel", () => {
  const now = new Date(Date.UTC(2026, 10, 18));
  const apres = new Date(now.getTime() + JOUR), avant = new Date(now.getTime() - JOUR);
  assert.equal(etatPlan({ planType: "palier1", planExpiresAt: apres, essaiFinLe: null }, now), "pro");
  assert.equal(etatPlan({ planType: "palier2", planExpiresAt: apres, essaiFinLe: apres }, now), "illimite");
  assert.equal(etatPlan({ planType: "palier2", planExpiresAt: avant, essaiFinLe: null }, now), "essentiel"); // échu
  assert.equal(etatPlan({ planType: "palier1", planExpiresAt: avant, essaiFinLe: apres }, now), "essai");
  assert.equal(etatPlan({ planType: "gratuit", planExpiresAt: null, essaiFinLe: avant }, now), "essentiel");
  assert.equal(etatPlan({ planType: "premium", planExpiresAt: apres, essaiFinLe: null }, now), "essentiel"); // valeur héritée
});

test("répartition par plan depuis les agrégats", () => {
  assert.deepEqual(repartitionPlans(30, [{ planType: "palier1", n: 2 }, { planType: "palier2", n: 3 }], 1), { essentiel: 24, pro: 2, illimite: 3, essai: 1 });
  assert.deepEqual(repartitionPlans(0, [], 0), { essentiel: 0, pro: 0, illimite: 0, essai: 0 });
});
