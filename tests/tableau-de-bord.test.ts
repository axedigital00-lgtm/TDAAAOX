// Tableau de bord (lib/tableau-de-bord.ts) : périodes, période précédente, courbe et indicateurs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { bornesPeriode, courbe, indicateurs, lirePeriode, projectionMois, tranches, variation } from "@/lib/tableau-de-bord";

// Heure locale : les bornes suivent l'heure du serveur.
const L = (a: number, m: number, j: number, h = 0, mi = 0) => new Date(a, m - 1, j, h, mi);
const MAINTENANT = L(2026, 11, 17, 14, 30);

test("période lue dans l'URL, 30 jours par défaut", () => {
  assert.equal(lirePeriode("7j"), "7j");
  assert.equal(lirePeriode("mois"), "mois");
  assert.equal(lirePeriode("n'importe"), "30j");
  assert.equal(lirePeriode(undefined), "30j");
});

test("aujourd'hui : depuis minuit, comparé à hier à la même heure", () => {
  const b = bornesPeriode("jour", MAINTENANT);
  assert.deepEqual(b.debut, L(2026, 11, 17));
  assert.deepEqual(b.fin, MAINTENANT);
  assert.deepEqual(b.precedente.debut, L(2026, 11, 16));
  assert.deepEqual(b.precedente.fin, L(2026, 11, 16, 14, 30));
  assert.equal(b.parHeure, true);
  assert.equal(tranches(b).length, 15); // 0 h … 14 h
});

test("7 jours : aujourd'hui compris, précédente = les 7 jours d'avant", () => {
  const b = bornesPeriode("7j", MAINTENANT);
  assert.deepEqual(b.debut, L(2026, 11, 11));
  assert.deepEqual(b.precedente.debut, L(2026, 11, 4));
  assert.deepEqual(b.precedente.fin, L(2026, 11, 10, 14, 30));
  assert.equal(tranches(b).length, 7);
});

test("30 jours : 30 tranches, précédente de même longueur", () => {
  const b = bornesPeriode("30j", MAINTENANT);
  assert.deepEqual(b.debut, L(2026, 10, 19));
  assert.deepEqual(b.precedente.debut, L(2026, 9, 19));
  assert.equal(tranches(b).length, 30);
});

test("ce mois : du 1er à maintenant, comparé au mois dernier à la même date", () => {
  const b = bornesPeriode("mois", MAINTENANT);
  assert.deepEqual(b.debut, L(2026, 11, 1));
  assert.deepEqual(b.precedente.debut, L(2026, 10, 1));
  assert.deepEqual(b.precedente.fin, L(2026, 10, 17, 14, 30));
  assert.equal(tranches(b).length, 17);
  // 31 mars : le mois précédent s'arrête à sa fin (29 février 2028), pas le 2 mars.
  const m = bornesPeriode("mois", L(2028, 3, 31, 10));
  assert.deepEqual(m.precedente.fin, L(2028, 2, 29, 10));
  // Janvier : décembre de l'année d'avant.
  assert.deepEqual(bornesPeriode("mois", L(2027, 1, 5)).precedente.debut, L(2026, 12, 1));
});

test("courbe : montant payé et commandes par jour ou par heure", () => {
  const b = bornesPeriode("7j", MAINTENANT);
  const pts = courbe([
    { createdAt: L(2026, 11, 11, 9), montantTotal: 1000, paiementStatut: "completed" },
    { createdAt: L(2026, 11, 17, 8), montantTotal: 500, paiementStatut: "pending" },
    { createdAt: L(2026, 11, 17, 9), montantTotal: 2000, paiementStatut: "completed" },
    { createdAt: L(2026, 11, 1), montantTotal: 9999, paiementStatut: "completed" }, // hors période
  ], b);
  assert.equal(pts.length, 7);
  assert.deepEqual([pts[0].montant, pts[0].commandes], [1000, 1]);
  assert.deepEqual([pts[6].montant, pts[6].commandes], [2000, 2]);
  const h = courbe([{ createdAt: L(2026, 11, 17, 9, 45), montantTotal: 300, paiementStatut: "completed" }], bornesPeriode("jour", MAINTENANT));
  assert.equal(h[9].date, "9h");
  assert.equal(h[9].montant, 300);
});

test("indicateurs : CA sur les payées, conversion sur le en ligne, jamais inventée", () => {
  const i = indicateurs([
    { createdAt: MAINTENANT, montantTotal: 1000, paiementStatut: "completed", canal: "en_ligne" },
    { createdAt: MAINTENANT, montantTotal: 3000, paiementStatut: "completed", canal: "pos" },
    { createdAt: MAINTENANT, montantTotal: 500, paiementStatut: "pending", canal: "en_ligne" },
  ], 40);
  assert.equal(i.commandes, 3);
  assert.equal(i.chiffreAffaires, 4000);
  assert.equal(i.panierMoyen, 2000);
  assert.equal(i.conversion, 5); // 2 commandes en ligne / 40 visiteurs
  const vide = indicateurs([], 0);
  assert.equal(vide.conversion, null);
  assert.equal(vide.panierMoyen, null);
});

test("variation : null quand il n'y a rien à comparer", () => {
  assert.equal(variation(150, 100), 50);
  assert.equal(variation(50, 100), -50);
  assert.equal(variation(10, 0), null);
  assert.equal(variation(null, 10), null);
});

test("projection fin de mois", () => {
  assert.equal(projectionMois(17000, L(2026, 11, 17)), 30000);
});
