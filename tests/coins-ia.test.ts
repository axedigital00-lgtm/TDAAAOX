// Coins IA : marge garantie, ordre de dépense et prix des actions.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ACTIONS, COIN_FCFA, coinsMinimum, coutUsd, MARGE, repartirDebit, soldes } from "@/lib/ia/coins-regles";

test("chaque action garde au moins la marge × 4 sur son coût maximal", () => {
  for (const [id, a] of Object.entries(ACTIONS)) assert.ok(a.coins >= coinsMinimum(a.coutMaxUsd, 650), id);
  assert.equal(COIN_FCFA / MARGE, 50);
});

test("le coût maximal prévu couvre la consommation réelle attendue", () => {
  // Image moyenne 1024 px avec gpt-image-1-mini : environ 1 056 jetons de sortie ; haute : environ 4 160.
  assert.ok((coutUsd("gpt-image-1-mini", 80, 1056) ?? 1) <= ACTIONS.visuel.coutMaxUsd);
  assert.ok((coutUsd("gpt-image-1-mini", 80, 4160) ?? 1) <= ACTIONS.visuel_hd.coutMaxUsd);
  const pub = (coutUsd("gpt-5-mini", 400, 600) ?? 1) + (coutUsd("gpt-image-1-mini", 120, 4160) ?? 1);
  assert.ok(pub <= ACTIONS.publicite.coutMaxUsd);
  assert.equal(coutUsd("modele-inconnu", 1, 1), null);
});

test("coins inclus dépensés avant les coins achetés", () => {
  const s = soldes([{ source: "inclus", montant: 5 }, { source: "achete", montant: 10 }, { source: "inclus", montant: -3 }]);
  assert.deepEqual(s, { inclus: 2, achetes: 10, total: 12 });
  assert.deepEqual(repartirDebit(s, 3), { inclus: 2, achetes: 1 });
  assert.equal(repartirDebit(s, 13), null);
  assert.equal(repartirDebit(s, 0), null);
});
