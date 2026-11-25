// Commande Express AXSO : source de la commande, réglages, clé d'idempotence.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cleValide, lireSource, nettoyerReglages } from "@/lib/commande-express/reglages";

test("source : clés connues seulement, valeurs bornées", () => {
  const s = lireSource({ utm_source: " facebook ", utm_campaign: "noel", fbclid: "x".repeat(400), inconnu: "a", page: 12 });
  assert.deepEqual(Object.keys(s).sort(), ["fbclid", "utm_campaign", "utm_source"]);
  assert.equal(s.utm_source, "facebook");
  assert.equal(s.fbclid!.length, 150);
  assert.deepEqual(lireSource(null), {});
  assert.deepEqual(lireSource("texte"), {});
});

test("réglages : texte borné, couleur hexadécimale seulement, booléens stricts", () => {
  assert.deepEqual(nettoyerReglages({ actif: true, texteBouton: "  Je commande  ", couleur: "#AABBCC", boutonCollant: "oui" }), { actif: true, texteBouton: "Je commande", couleur: "#AABBCC" });
  assert.deepEqual(nettoyerReglages({ couleur: "red", texteBouton: "   " }), {});
  assert.equal(nettoyerReglages({ texteBouton: "x".repeat(80) }).texteBouton!.length, 40);
});

test("clé d'idempotence : 16 à 64 caractères sûrs", () => {
  assert.equal(cleValide("4f9c2a1b8e7d4c3ba1f0e9d8c7b6a5f4"), true);
  assert.equal(cleValide("court"), false);
  assert.equal(cleValide("a'; drop table x;--aaaaaaaaaaaa"), false);
  assert.equal(cleValide(42), false);
});
