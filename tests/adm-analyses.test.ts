// Lot 10 (refonte admin) : calculs purs de la page Analyses de données.
import { test } from "node:test";
import assert from "node:assert/strict";
import { aligner, bornesPrecedentes, echecsParVille, ventilation } from "../app/(dashboard)/dashboard/analytics/regles";
import { bornesPeriode, courbe } from "../lib/tableau-de-bord";

test("comparaison : la période précédente a le même découpage et la même longueur", () => {
  const b = bornesPeriode("7j", new Date(2026, 10, 19, 14));
  const p = bornesPrecedentes(b);
  assert.equal(p.debut.getTime(), b.precedente.debut.getTime());
  assert.equal(courbe([], p).length, courbe([], b).length);
  assert.deepEqual(aligner([1, 2, 3], 2), [1, 2]);
  assert.deepEqual(aligner([1], 3), [1, 0, 0]);
});

test("ventilation : lignes vides masquées, total toujours affiché", () => {
  assert.deepEqual(ventilation({ sousTotal: 100, reduction: 0, livraison: 0, taxes: 0, total: 100 }).map((l) => l.cle), ["brutes", "total"]);
  const v = ventilation({ sousTotal: 100, reduction: 10, livraison: 5, taxes: 0, total: 95 });
  assert.deepEqual(v.map((l) => l.cle), ["brutes", "reductions", "nettes", "livraison", "total"]);
  assert.equal(v.find((l) => l.cle === "nettes")!.valeur, 90);
  assert.equal(v.find((l) => l.cle === "reductions")!.valeur, -10);
});

test("refus à la livraison par ville : seulement les livraisons COD terminées, triées par taux", () => {
  const exp = new Date();
  const cmds = [
    { ville: "Douala", methodePaiement: "direct_cod", statut: "livree", expedieeAt: exp },
    { ville: "Douala", methodePaiement: "direct_cod", statut: "annulee", expedieeAt: exp },
    { ville: "Yaoundé", methodePaiement: "whatsapp_cod", statut: "livree", expedieeAt: exp },
    { ville: "Yaoundé", methodePaiement: "whatsapp_cod", statut: "expediee", expedieeAt: exp }, // pas terminée
    { ville: "Kribi", methodePaiement: "direct_cod", statut: "annulee", expedieeAt: null }, // jamais partie
  ];
  assert.deepEqual(echecsParVille(cmds), [
    { ville: "Douala", echecs: 1, total: 2, pourcent: 50 },
    { ville: "Yaoundé", echecs: 0, total: 1, pourcent: 0 },
  ]);
});
