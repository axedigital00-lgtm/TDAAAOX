// Événements du parcours d'inscription (lib/inscription-evenement.ts) : validation du corps reçu.
import { test } from "node:test";
import assert from "node:assert/strict";
import { lireEvenements } from "@/lib/inscription-evenement";

const evt = { session: "abc", type: "vue", etape: "type" };

test("un événement seul ou un tableau, jusqu'à 20", () => {
  assert.equal(lireEvenements(JSON.stringify(evt))?.length, 1);
  assert.equal(lireEvenements(JSON.stringify(Array(20).fill(evt)))?.length, 20);
  assert.equal(lireEvenements(JSON.stringify(Array(21).fill(evt))), null);
  assert.equal(lireEvenements("[]"), null);
});

test("rejette le JSON invalide, les types inconnus, les champs en trop et les durées hors bornes", () => {
  assert.equal(lireEvenements("pas du json"), null);
  assert.equal(lireEvenements(JSON.stringify({ ...evt, type: "clic" })), null);
  assert.equal(lireEvenements(JSON.stringify({ ...evt, email: "a@b.c" })), null);
  assert.equal(lireEvenements(JSON.stringify({ ...evt, dureeMs: -1 })), null);
  assert.equal(lireEvenements(JSON.stringify({ ...evt, valeur: "x".repeat(61) })), null);
  assert.equal(lireEvenements(JSON.stringify({ ...evt, type: "choix", valeur: "CM", dureeMs: 1200 }))?.[0].valeur, "CM");
});
