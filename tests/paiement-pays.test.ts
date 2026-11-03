// Moyens de paiement selon le pays : réglages par défaut, jamais aucun moyen, paiement à la livraison
// réservé au pays de la boutique (sauf réglage hors pays).
import { test } from "node:test";
import assert from "node:assert/strict";
import { lireReglagesPaiement, moyensPhysique } from "@/lib/paiement-pays";
import { operateurCameroun, telCameroun } from "@/lib/wallet";
import { deviseAbonnement } from "@/lib/abonnement-paiement";

test("réglages par défaut et jamais aucun moyen", () => {
  assert.deepEqual(lireReglagesPaiement(null), { livraison: true, whatsapp: true, livraisonHorsPays: false });
  assert.equal(lireReglagesPaiement({ livraison: false, whatsapp: false }).livraison, true);
  assert.equal(lireReglagesPaiement({ livraison: false, whatsapp: true }).livraison, false);
});

test("paiement à la livraison réservé au pays de la boutique", () => {
  const r = lireReglagesPaiement(null);
  assert.deepEqual(moyensPhysique(r, { paysClient: "CM", paysBoutique: "CM" }), { livraison: true, whatsapp: true });
  assert.deepEqual(moyensPhysique(r, { paysClient: "GA", paysBoutique: "CM" }), { livraison: false, whatsapp: false });
  const horsPays = lireReglagesPaiement({ livraisonHorsPays: true });
  assert.equal(moyensPhysique(horsPays, { paysClient: "GA", paysBoutique: "CM" }).livraison, true);
});

test("opérateur camerounais et devise d'abonnement", () => {
  assert.equal(operateurCameroun(telCameroun("677 12 34 56")), "mtn");
  assert.equal(operateurCameroun(telCameroun("+237 652123456")), "mtn");
  assert.equal(operateurCameroun(telCameroun("699123456")), "orange");
  assert.equal(operateurCameroun(telCameroun("656123456")), "orange");
  assert.equal(operateurCameroun(telCameroun("681234567")), null); // préfixe incertain : versement à la main
  assert.equal(operateurCameroun(telCameroun("+221 77 123 45 67")), null);
  assert.equal(deviseAbonnement("XOF"), "XOF");
  assert.equal(deviseAbonnement("NGN"), "XAF");
});
