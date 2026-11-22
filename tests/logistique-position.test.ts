// Phase 0 : confidentialité des positions et des liens de suivi.
import { test } from "node:test";
import assert from "node:assert/strict";
import { lienSuiviExpire, lirePosition, vueLivreurPlateforme, vueSuiviClient } from "@/lib/logistique/position";

const T = new Date("2026-12-31T10:00:00Z");
const J = 86_400_000;

test("position : types, bornes et absence de signal", () => {
  assert.deepEqual(lirePosition(4.05, 9.7), { lat: 4.05, lng: 9.7 });
  assert.equal(lirePosition("4", 9), null);
  assert.equal(lirePosition(91, 9), null);
  assert.equal(lirePosition(4, -181), null);
  assert.equal(lirePosition(Number.NaN, 9), null);
  assert.equal(lirePosition(0, 0), null);
  assert.deepEqual(lirePosition(0, 9.7), { lat: 0, lng: 9.7 }, "l'équateur reste valide");
});

test("lien client : position visible seulement pendant le trajet", () => {
  const p = { lat: 4, lng: 9 };
  assert.deepEqual(vueSuiviClient({ statut: "expediee", livreurPosition: p }, T).livreurPosition, p);
  for (const statut of ["confirmee", "en_preparation", "tentative_echouee", "livree", "annulee"]) {
    assert.equal(vueSuiviClient({ statut, livreurPosition: p, livreeAt: T }, T).livreurPosition, null, statut);
  }
});

test("lien client : expire 30 jours après la fin, sans données personnelles", () => {
  const fin = new Date(T.getTime() - 31 * J);
  assert.equal(lienSuiviExpire({ statut: "expediee", updatedAt: fin }, T), false, "course en cours : jamais expirée");
  assert.equal(lienSuiviExpire({ statut: "livree", livreeAt: new Date(T.getTime() - 29 * J) }, T), false);
  assert.equal(lienSuiviExpire({ statut: "livree", livreeAt: fin }, T), true);
  const v = vueSuiviClient({ statut: "livree", livreeAt: fin, numero: "A1", clientNom: "Awa", adresseLivraison: "Akwa", latitudeClient: 4, lignes: [{ nom: "Sac" }] }, T);
  assert.equal(v.lienExpire, true);
  assert.equal(v.numero, "A1");
  assert.equal(v.clientNom, null); assert.equal(v.adresseLivraison, null); assert.equal(v.latitudeClient, null);
  assert.deepEqual(v.lignes, []);
});

test("livreur indépendant : ni téléphone ni position sans course pour ce marchand", () => {
  const l = { id: "l1", telephone: "690000000", latitude: 4, longitude: 9, positionAt: T };
  const inconnu = vueLivreurPlateforme(l, new Set(), new Set());
  assert.equal(inconnu.telephone, null); assert.equal(inconnu.latitude, null); assert.equal(inconnu.positionAt, null);
  const assigne = vueLivreurPlateforme(l, new Set(["l1"]), new Set());
  assert.equal(assigne.telephone, "690000000"); assert.equal(assigne.latitude, null);
  const enRoute = vueLivreurPlateforme(l, new Set(["l1"]), new Set(["l1"]));
  assert.equal(enRoute.latitude, 4);
});
