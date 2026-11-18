// Mode d'achat (lib/mode-achat.ts) : panier par défaut, panier transmis à la page de commande.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ajouterLigne, decoderPanier, encoderPanier, MAX_LIGNES_PANIER, modeAchat, panierActif, type LignePanier } from "@/lib/mode-achat";

test("modeAchat : panier par défaut, direct seulement si choisi", () => {
  assert.equal(modeAchat(null), "panier");
  assert.equal(modeAchat({ demanderEmail: true }), "panier");
  assert.equal(modeAchat({ modeAchat: "direct" }), "direct");
  assert.equal(modeAchat({ modeAchat: "n'importe quoi" }), "panier");
});

test("panierActif : jamais en mode direct ni pour une boutique digitale", () => {
  assert.equal(panierActif({}, false), true);
  assert.equal(panierActif({ modeAchat: "direct" }, false), false);
  assert.equal(panierActif({}, true), false);
});

test("encoder puis décoder rend les mêmes lignes", () => {
  const lignes = [{ produitId: "p1", quantite: 2 }, { produitId: "p2", quantite: 1, variante: "Taille: M" }];
  assert.deepEqual(decoderPanier(encoderPanier(lignes)), lignes);
});

test("decoderPanier rejette le malformé et borne les quantités", () => {
  assert.deepEqual(decoderPanier(null), []);
  assert.deepEqual(decoderPanier("pas du json"), []);
  assert.deepEqual(decoderPanier('{"a":1}'), []);
  assert.deepEqual(decoderPanier('[["../x",1],[5,1],["ok",0],["ok2",5000]]'), [{ produitId: "ok", quantite: 1 }, { produitId: "ok2", quantite: 999 }]);
  const trop = JSON.stringify(Array.from({ length: 80 }, (_, i) => [`p${i}`, 1]));
  assert.equal(decoderPanier(trop).length, MAX_LIGNES_PANIER);
});

test("ajouterLigne cumule même produit + même variante, plafonne au stock", () => {
  let l = ajouterLigne<LignePanier>([], { produitId: "p1", quantite: 2 }, 3);
  l = ajouterLigne(l, { produitId: "p1", quantite: 2 }, 3);
  assert.deepEqual(l, [{ produitId: "p1", quantite: 3 }]);
  l = ajouterLigne(l, { produitId: "p1", quantite: 1, variante: "Taille: M" });
  assert.equal(l.length, 2);
});
