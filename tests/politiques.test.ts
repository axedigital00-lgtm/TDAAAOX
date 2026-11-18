// Politiques de la boutique (lib/politiques.ts, B5) : le client ne voit qu'une politique validée.
import { test } from "node:test";
import assert from "node:assert/strict";
import { politiquePublique, politiquesPubliees, politiqueValidable, statutPolitique } from "@/lib/politiques";

const A_COMPLETER = "Retours sous [À compléter : délai de retour en jours] jours.";

test("statutPolitique : absente, à compléter, brouillon d'Axia, validée", () => {
  assert.equal(statutPolitique(undefined), "absente");
  assert.equal(statutPolitique({ contenu: "  " }), "absente");
  assert.equal(statutPolitique({ contenu: A_COMPLETER, valideeLe: "2026-11-01" }), "a_completer");
  assert.equal(statutPolitique({ contenu: "Retours sous 7 jours." }), "brouillon_axia");
  assert.equal(statutPolitique({ contenu: "Retours sous 7 jours.", valideeLe: "2026-11-01" }), "validee");
});

test("politiqueValidable : du contenu et plus aucun « À compléter »", () => {
  assert.equal(politiqueValidable(""), false);
  assert.equal(politiqueValidable(A_COMPLETER), false);
  assert.equal(politiqueValidable("Retours sous 7 jours."), true);
});

test("politiquePublique : seulement une politique validée", () => {
  assert.equal(politiquePublique({ contenu: "Brouillon" }), null);
  assert.equal(politiquePublique({ contenu: A_COMPLETER, valideeLe: "2026-11-01" }), null);
  assert.equal(politiquePublique({ contenu: "Texte", valideeLe: "2026-11-01" }), "Texte");
});

test("politiquesPubliees : validées seulement, dans l'ordre livraison, retours, confidentialité, CGV", () => {
  const v = { valideeLe: "2026-11-01" };
  const liste = politiquesPubliees({ cgv: { contenu: "C", ...v }, retours: { contenu: "R" }, livraison: { contenu: "L", ...v }, autre: { contenu: "x", ...v } });
  assert.deepEqual(liste.map((p) => p.type), ["livraison", "cgv"]);
  assert.deepEqual(politiquesPubliees(null), []);
});
