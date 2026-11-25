// Politique de prix (lib/pricing.ts) : numérique au prix du marchand, 10 % prélevés par Axso (frais
// pawaPay compris) ; dropshipping en ligne +10 % ; à la livraison 0 %.
import { test } from "node:test";
import assert from "node:assert/strict";
import { partVendeur, prixClient, tauxCommande, repartitionNumerique } from "@/lib/pricing";

test("prix payé par le client selon le type", () => {
  // Numérique : prix du marchand, sans majoration (10 % prélevés sur la vente).
  assert.equal(prixClient(10000, 0.1, "fichier"), 10000);
  assert.equal(prixClient(10000, 0.1, "formation"), 10000);
  assert.equal(prixClient(10000, 0.1, "en_ligne"), 11000);
  assert.equal(prixClient(10000, 0.1, "dropshipping"), 11000);
  assert.equal(prixClient(10000, 0.1, "physique"), 10000);
});

test("le vendeur reçoit son prix, livraison en entier, même dans une commande mixte", () => {
  const lignes = [{ prix: prixClient(10000, 0.1, "fichier"), quantite: 1, type: "fichier" }, { prix: prixClient(5000, 0.1, "dropshipping"), quantite: 2, type: "dropshipping" }];
  const taux = tauxCommande(lignes, 0.1);
  const brut = 10000 + 2 * 5500 + 1500; // + livraison non majorée
  const { montantNet, montantCommission } = partVendeur(brut, 1500, taux, "XAF");
  assert.equal(montantNet, 10000 + 2 * 5000 + 1500);
  assert.equal(montantCommission, 1000);
  assert.ok(Math.abs(tauxCommande([{ prix: 10000, quantite: 1, type: "licence" }], 0.1)) < 1e-9);
});

test("vente numérique : Axso garde 10 % (frais pawaPay compris), le marchand 90 %", () => {
  assert.deepEqual(repartitionNumerique(10000, "XAF"), { axso: 1000, vendeur: 9000 });
  assert.deepEqual(repartitionNumerique(999, "XAF"), { axso: 100, vendeur: 899 });
  assert.deepEqual(repartitionNumerique(19.99, "USD"), { axso: 2, vendeur: 17.99 });
});
