// Promo de lancement (lib/promo.ts) : en cours jusqu'à la date réglée par l'admin, puis terminée.
import { test } from "node:test";
import assert from "node:assert/strict";
import { promoEnCours } from "@/lib/promo";
import { SCHEMAS, REGLAGES_DEFAUT } from "@/lib/command-center/reglages";

test("promo : en cours avant la fin, terminée après ou si arrêtée", () => {
  const fin = "2026-11-04T22:59:59.000Z";
  assert.deepEqual(promoEnCours(fin, new Date("2026-11-01T10:00:00Z")), new Date(fin));
  assert.equal(promoEnCours(fin, new Date("2026-11-04T23:00:00Z")), null);
  assert.equal(promoEnCours(null, new Date("2026-11-01T10:00:00Z")), null);
});

test("réglage promo : date ISO ou null, rien d'autre", () => {
  assert.ok(SCHEMAS.promo.safeParse(REGLAGES_DEFAUT.promo).success);
  assert.ok(SCHEMAS.promo.safeParse({ finLe: null }).success);
  assert.ok(SCHEMAS.promo.safeParse({ finLe: "2026-12-01T10:00:00+01:00" }).success);
  assert.equal(SCHEMAS.promo.safeParse({ finLe: "demain" }).success, false);
});
