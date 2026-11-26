// Anti-fraude Commande Express : score de risque expliqué, jeton anti-robot signé, empreinte d'IP.
import { test } from "node:test";
import assert from "node:assert/strict";
import { empreinteIp, jetonValide, scoreRisque, signerJeton, type Indices } from "@/lib/commande-express/risque";

const normal: Indices = { telephoneValide: true, nom: "Aïcha Mbarga", quantite: 1, dureeMs: 35_000, jetonValide: true, memeIp24h: 0, historique: { livrees: 0, refusees: 0, fauxNumero: 0, dernieres24h: 0 } };

test("client ordinaire : risque faible, aucun facteur", () => {
  const r = scoreRisque(normal);
  assert.equal(r.score, 0); assert.equal(r.niveau, "faible"); assert.deepEqual(r.facteurs, []);
});

test("robot : formulaire éclair, hors formulaire, nom de test → risque élevé expliqué", () => {
  const r = scoreRisque({ ...normal, dureeMs: 900, jetonValide: false, nom: "test" });
  assert.equal(r.niveau, "eleve");
  assert.deepEqual(r.facteurs.map((f) => f.code), ["remplissage_rapide", "hors_formulaire", "nom_suspect"]);
  assert.equal(r.score, 70);
});

test("historique : faux numéro et refus pèsent lourd, un client livré rassure, score borné", () => {
  assert.equal(scoreRisque({ ...normal, historique: { ...normal.historique, fauxNumero: 1 } }).score, 45);
  assert.equal(scoreRisque({ ...normal, historique: { ...normal.historique, refusees: 3 } }).score, 40);
  assert.equal(scoreRisque({ ...normal, historique: { ...normal.historique, livrees: 2 } }).score, 0);
  const pire = scoreRisque({ ...normal, telephoneValide: false, dureeMs: 1000, jetonValide: false, nom: "aaaa", quantite: 40, memeIp24h: 5, historique: { livrees: 0, refusees: 2, fauxNumero: 1, dernieres24h: 2 } });
  assert.equal(pire.score, 100);
});

test("jeton : valide pour sa boutique seulement, refusé s'il est modifié ou trop vieux", () => {
  const j = signerJeton("boutique-a");
  assert.equal(jetonValide(j, "boutique-a"), true);
  assert.equal(jetonValide(j, "boutique-b"), false);
  assert.equal(jetonValide(j.slice(0, -1) + (j.endsWith("A") ? "B" : "A"), "boutique-a"), false);
  assert.equal(jetonValide(signerJeton("boutique-a", Date.now() - 8 * 86_400_000), "boutique-a"), false);
  assert.equal(jetonValide(undefined, "boutique-a"), false);
});

test("empreinte d'IP : stable, sans l'adresse", () => {
  assert.equal(empreinteIp("41.202.1.7"), empreinteIp("41.202.1.7"));
  assert.notEqual(empreinteIp("41.202.1.7"), empreinteIp("41.202.1.8"));
});
