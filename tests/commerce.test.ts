// Vente aux grossistes (paliers, règles de quantité) et marchés multi-pays (conversion, arrondi).
import { test } from "node:test";
import assert from "node:assert/strict";
import { erreurQuantite, grilleAffichage, lireVenteGros, prixPourQuantite, venteGrosSchema } from "@/lib/commerce/gros";
import { affichageVisiteur, arrondir, convertir, lireMarches, marcheDuPays, marchesSchema, prixMarche } from "@/lib/commerce/marches";

const gros = lireVenteGros({ paliers: [{ min: 10, prix: 4500 }, { min: 50, prix: 4000 }], min: 2, multiple: 2 });

test("gros : le palier le plus haut atteint s'applique, jamais au-dessus du prix de base", () => {
  assert.equal(prixPourQuantite(5000, gros, 4), 5000);
  assert.equal(prixPourQuantite(5000, gros, 10), 4500);
  assert.equal(prixPourQuantite(5000, gros, 120), 4000);
  assert.equal(prixPourQuantite(3000, gros, 120), 3000, "un palier plus cher que le prix de base est ignoré");
  assert.equal(prixPourQuantite(5000, null, 120), 5000);
});

test("gros : minimum, maximum et multiple", () => {
  assert.match(erreurQuantite(gros, 1, "Savon")!, /minimum 2/);
  assert.match(erreurQuantite(gros, 3, "Savon")!, /multiples de 2/);
  assert.equal(erreurQuantite(gros, 4, "Savon"), null);
  assert.match(erreurQuantite(lireVenteGros({ paliers: [], max: 5 }), 6, "Savon")!, /maximum 5/);
  assert.equal(erreurQuantite(null, 999, "Savon"), null);
});

test("gros : validation et grille d'affichage", () => {
  assert.equal(venteGrosSchema.safeParse({ paliers: [], min: 10, max: 5 }).success, false);
  assert.equal(venteGrosSchema.safeParse({ paliers: [{ min: 10, prix: 1 }, { min: 10, prix: 2 }] }).success, false);
  assert.equal(lireVenteGros({ paliers: "x" }), null);
  assert.deepEqual(grilleAffichage(5000, gros), [{ min: 10, prix: 4500, remisePct: 10 }, { min: 50, prix: 4000, remisePct: 20 }]);
});

test("marchés : conversion XAF ↔ XOF à parité, EUR, arrondis", () => {
  assert.equal(convertir(10000, "XAF", "XOF"), 10000);
  assert.equal(Math.round(convertir(655.957, "XAF", "EUR")), 1);
  assert.equal(arrondir(4567, "centaine", "XAF"), 4600);
  assert.equal(arrondir(4567, "99", "XAF"), 4599);
  assert.equal(arrondir(12.3, "99", "EUR"), 12.99);
});

test("marchés : un pays par marché, prix ajusté et converti", () => {
  const ms = lireMarches([
    { id: "uemoa", nom: "Afrique de l'Ouest", pays: ["SN", "CI"], devise: "XOF", ajustementPct: 10, arrondi: "centaine" },
    { id: "ng", nom: "Nigeria", pays: ["NG"], devise: "NGN", taux: 1700, actif: false },
  ]);
  assert.equal(ms.length, 2);
  assert.equal(marcheDuPays(ms, "sn")?.id, "uemoa");
  assert.equal(marcheDuPays(ms, "NG"), null, "marché inactif ignoré");
  assert.deepEqual(prixMarche(10000, "XAF", marcheDuPays(ms, "CI")), { montant: 11000, devise: "XOF" });
  assert.deepEqual(prixMarche(10000, "XAF", null), { montant: 10000, devise: "XAF" });
  assert.equal(marchesSchema.safeParse([
    { id: "a", nom: "A", pays: ["SN"], devise: "XOF" }, { id: "b", nom: "B", pays: ["SN"], devise: "XOF" },
  ]).success, false);
});

test("marchés : l'affichage vitrine suit le marché du visiteur, sans ajustement du prix", () => {
  const marches = lireMarches([{ id: "ng", nom: "Nigeria", pays: ["NG"], devise: "NGN", taux: 1700, ajustementPct: 25, arrondi: "centaine" }]);
  const base = { marches, deviseBoutique: "XAF", deviseParDefaut: "XAF", ratioVers: (d: string) => (d === "XAF" ? 1 : 2) };
  const ng = affichageVisiteur({ ...base, pays: "NG" });
  assert.equal(ng.devise, "NGN");
  assert.equal(ng.arrondi, "centaine");
  assert.ok(Math.abs(ng.ratio - 1700 / 655.957) < 1e-9);
  assert.deepEqual(affichageVisiteur({ ...base, pays: "SN" }), { devise: "XAF", ratio: 1, arrondi: "aucun" });
});
