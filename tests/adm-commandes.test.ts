// Lot 7 — liste des commandes : URL → filtre Prisma, tri, variation, badges.
import { test } from "node:test";
import assert from "node:assert/strict";
import { lireFiltres, whereCommandes, orderByCommandes, variation, VUES } from "../app/(dashboard)/dashboard/commandes/filtres";
import { badgeCommande, badgePaiement } from "../components/ui/adm/statuts";

test("lireFiltres : valeurs par défaut et valeurs inconnues ignorées", () => {
  const f = lireFiltres({});
  assert.deepEqual(f, { statuts: [], paiement: undefined, methode: undefined, q: undefined, tri: { colonne: "date", ordre: "desc" }, page: 1 });
  const g = lireFiltres({ vue: "livree,pirate", paiement: "bidon", methode: "x", tri: "prix:asc", page: "-3" });
  assert.deepEqual(g.statuts, ["livree"]);
  assert.equal(g.paiement, undefined);
  assert.equal(g.methode, undefined);
  assert.deepEqual(g.tri, { colonne: "date", ordre: "asc" });
  assert.equal(g.page, 1);
});

test("whereCommandes : toujours limité à la boutique, filtres combinés", () => {
  assert.deepEqual(whereCommandes("t1", lireFiltres({})), { tenantId: "t1" });
  const w = whereCommandes("t1", lireFiltres({ vue: VUES[1].id, paiement: "pending", methode: "livraison", q: " Awa " })) as any;
  assert.equal(w.tenantId, "t1");
  assert.deepEqual(w.AND[0], { statut: { in: ["en_attente", "confirmee", "en_preparation", "tentative_echouee"] } });
  assert.deepEqual(w.AND[1], { paiementStatut: "pending" });
  assert.deepEqual(w.AND[2], { methodePaiement: { in: ["whatsapp_cod", "direct_cod"] } });
  assert.equal(w.AND[3].OR[1].clientNom.contains, "Awa");
  assert.deepEqual((whereCommandes("t1", lireFiltres({ methode: "caisse" })) as any).AND, [{ canal: "pos" }]);
});

test("orderByCommandes et variation", () => {
  assert.deepEqual(orderByCommandes({ colonne: "total", ordre: "asc" }), [{ montantTotal: "asc" }, { id: "desc" }]);
  assert.equal(variation(15, 10), 50);
  assert.equal(variation(5, 0), null); // pas de comparaison inventée
});

test("badges : COD non payée = Paiement à la livraison, statuts réels", () => {
  assert.equal(badgePaiement("pending", "whatsapp_cod").label, "Paiement à la livraison");
  assert.equal(badgePaiement("pending", "notchpay").label, "Non payé");
  assert.equal(badgeCommande("tentative_echouee").tone, "critical");
  assert.equal(badgeCommande("livree").progress, "complete");
});
