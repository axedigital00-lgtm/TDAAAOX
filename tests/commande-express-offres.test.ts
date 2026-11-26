// Offres Releasit COD AXSO : validation des offres, remise d'un palier, jeton d'ajout après achat.
import { test } from "node:test";
import assert from "node:assert/strict";
import { jetonAjout, jetonAjoutValide, remisePalier, schemaOffre } from "@/lib/commande-express/offres";
import { prixPourQuantite } from "@/lib/commerce/gros";

test("offre de quantité : produit et paliers obligatoires, quantités distinctes", () => {
  assert.equal(schemaOffre.safeParse({ type: "quantite", titre: "Choisissez", produitId: "p1", paliers: [{ quantite: 2, prix: 6000 }, { quantite: 3, prix: 5500 }] }).success, true);
  assert.equal(schemaOffre.safeParse({ type: "quantite", titre: "Choisissez", paliers: [{ quantite: 2, prix: 6000 }] }).success, false);
  assert.equal(schemaOffre.safeParse({ type: "quantite", titre: "Choisissez", produitId: "p1", paliers: [] }).success, false);
  assert.equal(schemaOffre.safeParse({ type: "quantite", titre: "Choisissez", produitId: "p1", paliers: [{ quantite: 2, prix: 6000 }, { quantite: 2, prix: 5000 }] }).success, false);
  assert.equal(schemaOffre.safeParse({ type: "quantite", titre: "Choisissez", produitId: "p1", paliers: [{ quantite: 1, prix: 6000 }] }).success, false);
});

test("case, après achat et sortie : la cible est obligatoire", () => {
  assert.equal(schemaOffre.safeParse({ type: "case", titre: "Emballage cadeau" }).success, false);
  assert.equal(schemaOffre.safeParse({ type: "case", titre: "Emballage cadeau", produitOffertId: "p2" }).success, true);
  assert.equal(schemaOffre.safeParse({ type: "apres_achat", titre: "Complétez", produitOffertId: "p2" }).success, true);
  assert.equal(schemaOffre.safeParse({ type: "sortie", titre: "−10 %" }).success, false);
  assert.equal(schemaOffre.safeParse({ type: "sortie", titre: "−10 %", codePromoId: "c1" }).success, true);
  assert.equal(schemaOffre.safeParse({ type: "autre", titre: "x" }).success, false);
});

test("palier : remise affichée et prix appliqué par le serveur", () => {
  assert.equal(remisePalier(6500, 5525), 15);
  assert.equal(remisePalier(6500, 7000), 0);
  const regles = { paliers: [{ min: 2, prix: 6000 }, { min: 3, prix: 5500 }] };
  assert.equal(prixPourQuantite(6500, regles, 1), 6500);
  assert.equal(prixPourQuantite(6500, regles, 2), 6000);
  assert.equal(prixPourQuantite(6500, regles, 5), 5500);
});

test("jeton d'ajout : lié à la commande, valable 30 minutes", () => {
  const j = jetonAjout("cmd-1");
  assert.equal(jetonAjoutValide(j, "cmd-1"), true);
  assert.equal(jetonAjoutValide(j, "cmd-2"), false);
  assert.equal(jetonAjoutValide(jetonAjout("cmd-1", Date.now() - 31 * 60_000), "cmd-1"), false);
  assert.equal(jetonAjoutValide("n'importe.quoi", "cmd-1"), false);
});
