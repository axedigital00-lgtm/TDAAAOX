// Lot 9 (refonte admin) : règles pures de la liste, de la fiche et des segments clients.
import { test } from "node:test";
import assert from "node:assert/strict";
import { lireFiltresClients, pourcent, segmentClient, tauxEchecCod, whereSegment } from "../app/(dashboard)/dashboard/clients/regles";

test("filtres de la liste : tri par défaut sur la dépense, valeurs inconnues ignorées", () => {
  assert.deepEqual(lireFiltresClients({}), { q: undefined, tri: { colonne: "depense", ordre: "desc" }, page: 1 });
  assert.deepEqual(lireFiltresClients({ q: " awa ", tri: "nom:asc", page: "3" }), { q: "awa", tri: { colonne: "nom", ordre: "asc" }, page: 3 });
  assert.equal(lireFiltresClients({ tri: "pirate:asc" }).tri.colonne, "depense");
  assert.equal(lireFiltresClients({ page: "-2" }).page, 1);
});

test("segment d'affichage : VIP, régulier, nouveau", () => {
  assert.equal(segmentClient(5, 0, "XAF").label, "VIP");
  assert.equal(segmentClient(1, 100_000, "XAF").label, "VIP");
  assert.equal(segmentClient(2, 1000, "XAF").label, "Régulier");
  assert.equal(segmentClient(0, 0, "XAF").label, "Nouveau");
});

test("taux d'échec COD : seulement les livraisons COD terminées", () => {
  const d = new Date();
  assert.equal(tauxEchecCod([]), null);
  assert.equal(tauxEchecCod([{ methodePaiement: "notchpay", statut: "annulee", expedieeAt: d }]), null);
  assert.equal(tauxEchecCod([{ methodePaiement: "direct_cod", statut: "annulee", expedieeAt: null }]), null); // annulée avant départ
  assert.deepEqual(tauxEchecCod([
    { methodePaiement: "direct_cod", statut: "livree", expedieeAt: d },
    { methodePaiement: "whatsapp_cod", statut: "tentative_echouee", expedieeAt: d },
    { methodePaiement: "direct_cod", statut: "annulee", expedieeAt: d },
    { methodePaiement: "direct_cod", statut: "expediee", expedieeAt: d }, // en cours : pas compté
  ]), { echecs: 2, total: 3, pourcent: 67 });
});

test("segments des campagnes : mêmes règles que les e-mails", () => {
  const t0 = Date.UTC(2026, 10, 19);
  assert.deepEqual(whereSegment("b1", "tous", 0, t0), { tenantId: "b1" });
  assert.deepEqual(whereSegment("b1", "vip", 5000, t0), { tenantId: "b1", totalDepense: { gte: 10000 } });
  assert.deepEqual(whereSegment("b1", "vip", 0, t0), { tenantId: "b1", totalDepense: { gte: 1 } });
  assert.deepEqual(whereSegment("b1", "nouveaux", 0, t0), { tenantId: "b1", totalCommandes: { lte: 1 } });
  const il30 = new Date(t0 - 30 * 86_400_000);
  assert.deepEqual(whereSegment("b1", "inactifs", 0, t0), { tenantId: "b1", createdAt: { lte: il30 }, commandes: { none: { createdAt: { gte: il30 } } } });
  assert.equal(pourcent(1, 3), 33);
  assert.equal(pourcent(1, 0), 0);
});
