// Arrivée sur /inscription depuis la landing (lib/inscription.ts) : ?email=.
import { test } from "node:test";
import assert from "node:assert/strict";
import { lireParametresInscription } from "@/lib/inscription";

const lire = (q: string) => lireParametresInscription(new URLSearchParams(q));

test("?email= : gardé s'il est valide, ignoré sinon", () => {
  assert.equal(lire("email=%20awa%40exemple.com%20").email, "awa@exemple.com");
  assert.equal(lire("email=pas-un-email").email, "");
  assert.equal(lire("").email, "");
});
