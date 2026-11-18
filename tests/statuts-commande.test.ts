// Libellés des commandes côté marchand (app/(dashboard)/dashboard/commandes/statuts.ts) :
// chaque statut que l'API peut écrire a un libellé, et « À traiter » ne contient que des statuts non terminés.
import { test } from "node:test";
import assert from "node:assert/strict";
import { TRANSITIONS_VALIDES } from "@/lib/commandes";
import { STATUTS_COMMANDE, STATUTS_A_TRAITER, libelleMethodePaiement, statutCommande } from "@/app/(dashboard)/dashboard/commandes/statuts";

test("chaque statut de commande a un libellé", () => {
  for (const st of Object.keys(TRANSITIONS_VALIDES)) assert.ok(STATUTS_COMMANDE[st], st);
  assert.equal(statutCommande("inconnu").label, "inconnu");
});

test("« À traiter » = statuts qui peuvent encore avancer", () => {
  for (const st of STATUTS_A_TRAITER) assert.ok(TRANSITIONS_VALIDES[st].length > 0, st);
  assert.ok(!STATUTS_A_TRAITER.includes("expediee"));
});

test("moyens de paiement lisibles, y compris la caisse", () => {
  assert.equal(libelleMethodePaiement("direct_cod"), "À la livraison");
  assert.equal(libelleMethodePaiement("especes"), "Espèces");
  assert.equal(libelleMethodePaiement("xyz"), "xyz");
});
