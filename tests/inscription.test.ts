// Parcours d'inscription (lib/inscription.ts) : paramètres d'arrivée, jauge et reprise après rechargement.
import { test } from "node:test";
import assert from "node:assert/strict";
import { lireParametresInscription, lireProgression, poussee, palierJauge, signatureReponses } from "@/lib/inscription";

const lire = (q: string) => lireParametresInscription(new URLSearchParams(q));

test("?email= : gardé s'il est valide, ignoré sinon", () => {
  assert.equal(lire("email=%20awa%40exemple.com%20").email, "awa@exemple.com");
  assert.equal(lire("email=pas-un-email").email, "");
  assert.equal(lire("").email, "");
});

test("?plan= : seuls les vrais paliers sont gardés", () => {
  assert.equal(lire("plan=palier0").plan, "palier0");
  assert.equal(lire("plan=n-importe").plan, "");
});

test("jauge : monte écran après écran, de « Allumage » à « Décollage »", () => {
  assert.equal(poussee("type"), 0);
  assert.ok(poussee("nom") < poussee("pays"));
  assert.equal(poussee("decollage"), 1);
  assert.equal(palierJauge(0), "Allumage");
  assert.equal(palierJauge(1), "Décollage");
});

const base = { typeBoutique: "physique", vente: "Bijoux", nom: "Awa", paysCode: "CM", le: Date.now() };
const plan = { nomBoutique: "Awa", slug: "awa", themeId: "aube-site.html", produits: [] };
const reprendre = (p: object) => lireProgression(JSON.stringify({ ...base, ...p }));

test("reprise : écran gardé, mot de passe jamais demandé à la sauvegarde", () => {
  assert.equal(reprendre({ etape: "nom" })?.etape, "nom");
  assert.equal(reprendre({ etape: "design", plan, planPour: signatureReponses(base as never) })?.etape, "design");
});

test("reprise : analyse coupée → design si le plan est à jour, sinon pays", () => {
  assert.equal(reprendre({ etape: "analyse", plan, planPour: signatureReponses(base as never) })?.etape, "design");
  assert.equal(reprendre({ etape: "analyse", plan, planPour: "autre" })?.etape, "pays");
  assert.equal(reprendre({ etape: "acces" })?.etape, "pays"); // pas de plan
});

test("reprise : décollage coupé → accès ; boutique déjà créée → code", () => {
  assert.equal(reprendre({ etape: "decollage", plan })?.etape, "acces");
  assert.equal(reprendre({ etape: "revelation", plan, creee: { email: "a@b.co", slug: "awa" } })?.etape, "code");
});

test("reprise : vide, abîmée ou vieille de plus de 7 jours → rien", () => {
  assert.equal(lireProgression(null), null);
  assert.equal(lireProgression("{pas du json"), null);
  assert.equal(lireProgression(JSON.stringify({ ...base, etape: "nom", le: Date.now() - 8 * 86400_000 })), null);
});
