// Lot 12 — Réductions : statut calculé sur les vraies données du code promo, vues et recherche.
import { test } from "node:test";
import assert from "node:assert/strict";
import { filtrerReductions, statutReduction, type CodeReduction } from "../app/(dashboard)/dashboard/marketing/codes-promo/regles";

const MAINTENANT = Date.parse("2026-11-19T12:00:00Z");
const code = (p: Partial<CodeReduction>): CodeReduction => ({
  id: p.code ?? "x", code: "X", type: "pourcentage", valeur: 10, actif: true, utilisations: 0, maxUtilisations: null, dateExpiration: null, ...p,
});

test("statut : inactif, expiré par date ou par quota, sinon actif", () => {
  assert.equal(statutReduction(code({ actif: false }), MAINTENANT), "inactif");
  assert.equal(statutReduction(code({ dateExpiration: "2026-11-18T00:00:00Z" }), MAINTENANT), "expire");
  assert.equal(statutReduction(code({ maxUtilisations: 5, utilisations: 5 }), MAINTENANT), "expire");
  assert.equal(statutReduction(code({ dateExpiration: "2026-12-01T00:00:00Z", maxUtilisations: 5, utilisations: 4 }), MAINTENANT), "actif");
});

test("vues et recherche (insensible à la casse) ; vue inconnue = toutes", () => {
  const codes = [code({ code: "SOLDES" }), code({ code: "NOEL", dateExpiration: "2026-01-01T00:00:00Z" }), code({ code: "OFF", actif: false })];
  const ids = (l: CodeReduction[]) => l.map((c) => c.code);
  assert.deepEqual(ids(filtrerReductions(codes, "actives", null, MAINTENANT)), ["SOLDES"]);
  assert.deepEqual(ids(filtrerReductions(codes, "expirees", null, MAINTENANT)), ["NOEL"]);
  assert.deepEqual(ids(filtrerReductions(codes, "inconnue", "o", MAINTENANT)), ["SOLDES", "NOEL", "OFF"]);
  assert.deepEqual(ids(filtrerReductions(codes, null, " noe ", MAINTENANT)), ["NOEL"]);
});
