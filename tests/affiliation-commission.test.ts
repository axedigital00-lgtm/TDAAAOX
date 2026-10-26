// Commission d'affilié par ligne : seuls les produits ouverts aux affiliés rapportent,
// taux du produit > 50 % pour le numérique > taux du programme.
import { test } from "node:test";
import assert from "node:assert/strict";
import { calculerCommissionLigne } from "@/lib/affiliation";

const programme = {
  typeCommission: "pourcentage", valeurCommission: 10, tiersActifs: false,
  tier1Max: 10, tier1Commission: 5, tier2Max: 50, tier2Commission: 8, tier3Commission: 12,
  tousLesProduits: true, produitIds: [] as string[],
};
const ligne = (produit: any, prog = programme) =>
  calculerCommissionLigne({ montantLigne: 10000, produitId: "p1", produit, programme: prog, conversionsActuelles: 0 });

test("produit non ouvert aux affiliés : aucune commission", () => {
  assert.equal(ligne({ affiliationActive: false, tauxCommissionAff: null, type: "physique" }), 0);
  assert.equal(ligne({ affiliationActive: false, tauxCommissionAff: 0.3, type: "digital" }), 0);
  assert.equal(ligne(null), 0);
});

test("produit ouvert : taux du produit, sinon 50 % numérique, sinon taux du programme", () => {
  assert.equal(ligne({ affiliationActive: true, tauxCommissionAff: 0.2, type: "physique" }), 2000);
  assert.equal(ligne({ affiliationActive: true, tauxCommissionAff: null, type: "digital" }), 5000);
  assert.equal(ligne({ affiliationActive: true, tauxCommissionAff: null, type: "physique" }), 1000);
});

test("programme limité à certains produits", () => {
  const prog = { ...programme, tousLesProduits: false, produitIds: ["autre"] };
  assert.equal(ligne({ affiliationActive: true, tauxCommissionAff: 0.2, type: "physique" }, prog), 0);
});

test("commission fixe", () => {
  const prog = { ...programme, typeCommission: "fixe", valeurCommission: 500 };
  assert.equal(ligne({ affiliationActive: true, tauxCommissionAff: null, type: "physique" }, prog), 500);
  assert.equal(ligne({ affiliationActive: false, tauxCommissionAff: null, type: "physique" }, prog), 0);
});
