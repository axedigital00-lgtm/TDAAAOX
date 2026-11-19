// Lot 8 — liste des produits : URL → filtre Prisma, tri, badges de statut et de stock.
import { test } from "node:test";
import assert from "node:assert/strict";
import { lireFiltres, whereProduits, orderByProduits, badgeProduit, badgeStock, VUES } from "../app/(dashboard)/dashboard/produits/filtres";

test("lireFiltres : valeurs par défaut et valeurs inconnues ignorées", () => {
  assert.deepEqual(lireFiltres({}), { vue: "tous", type: undefined, q: undefined, tri: { colonne: "date", ordre: "desc" }, page: 1 });
  const f = lireFiltres({ vue: "pirate", type: "x", tri: "marge:asc", page: "0" });
  assert.equal(f.vue, "tous");
  assert.equal(f.type, undefined);
  assert.deepEqual(f.tri, { colonne: "date", ordre: "asc" });
  assert.equal(f.page, 1);
});

test("les vues reprennent les anciens ?filtre= (liens du tableau de bord)", () => {
  for (const id of ["actif", "inactif", "faible", "epuise"]) assert.ok(VUES.some((v) => v.id === id), id);
});

test("whereProduits : limité à la boutique, vue + type + recherche combinés", () => {
  assert.deepEqual(whereProduits("t1", lireFiltres({})), { tenantId: "t1" });
  const w = whereProduits("t1", lireFiltres({ vue: "epuise", type: "physique", q: " robe " })) as any;
  assert.equal(w.tenantId, "t1");
  assert.deepEqual(w.AND[0], { actif: true, type: "physique", stock: 0 });
  assert.deepEqual(w.AND[1], { type: "physique" });
  assert.equal(w.AND[2].OR[0].nom.contains, "robe");
  const n = whereProduits("t1", lireFiltres({ vue: "numeriques" })) as any;
  assert.ok(n.AND[0].type.in.includes("formation"));
  assert.ok(!n.AND[0].type.in.includes("physique"));
});

test("orderByProduits : colonne demandée puis id (pagination stable)", () => {
  assert.deepEqual(orderByProduits({ colonne: "prix", ordre: "asc" }), [{ prix: "asc" }, { id: "desc" }]);
  assert.deepEqual(orderByProduits({ colonne: "date", ordre: "desc" }), [{ createdAt: "desc" }, { id: "desc" }]);
});

test("badges : statut réel (pas d'« Archivé ») et stock des seuls produits physiques", () => {
  assert.equal(badgeProduit({ actif: true, exempleAxia: false }).tone, "success");
  assert.equal(badgeProduit({ actif: false, exempleAxia: false }).label, "Hors ligne");
  assert.equal(badgeProduit({ actif: false, exempleAxia: true }).label, "Exemple");
  assert.equal(badgeStock({ type: "physique", stock: 0, exempleAxia: false })?.tone, "critical");
  assert.equal(badgeStock({ type: "physique", stock: 5, exempleAxia: false })?.tone, "attention");
  assert.equal(badgeStock({ type: "physique", stock: 6, exempleAxia: false }), null);
  assert.equal(badgeStock({ type: "digital", stock: 0, exempleAxia: false }), null);
  assert.equal(badgeStock({ type: "physique", stock: 0, exempleAxia: true }), null);
});
