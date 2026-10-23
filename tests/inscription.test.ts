// Arrivée sur /inscription depuis la landing (lib/inscription.ts) : ?email=, ?plan=, retour NotchPay.
import { test } from "node:test";
import assert from "node:assert/strict";
import { lireParametresInscription, planObtenu, planPayant } from "@/lib/inscription";

const lire = (q: string) => lireParametresInscription(new URLSearchParams(q));

test("?email= : gardé s'il est valide, ignoré sinon", () => {
  assert.equal(lire("email=%20awa%40exemple.com%20").email, "awa@exemple.com");
  assert.equal(lire("email=pas-un-email").email, "");
  assert.equal(lire("").email, "");
});

test("?plan= : seuls les paliers connus, payants = Pro et Illimité", () => {
  assert.equal(lire("plan=palier1").plan, "palier1");
  assert.equal(lire("plan=palier9").plan, null);
  assert.equal(lire("plan=").plan, null);
  assert.deepEqual(["palier0", "palier1", "palier2", null, "x"].map(planPayant), [false, true, true, false, false]);
});

test("retour NotchPay et plan obtenu (le plan payé couvre le plan choisi)", () => {
  assert.equal(lire("paiement=en_cours&plan=palier2").retourPaiement, true);
  assert.equal(planObtenu("palier1", "palier1"), true);
  assert.equal(planObtenu("palier2", "palier1"), true);
  assert.equal(planObtenu("palier0", "palier1"), false);
  assert.equal(planObtenu("palier1", "palier2"), false);
  assert.equal(planObtenu(undefined, "palier1"), false);
});
