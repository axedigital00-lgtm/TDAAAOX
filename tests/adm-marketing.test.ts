// Charte — pages Croissance : règles pures (actions sur les affiliés, ratios, filtres de listes).
import { test } from "node:test";
import assert from "node:assert/strict";
import { actionAffilie, filtrer, pourcent } from "../app/(dashboard)/dashboard/marketing/regles-marketing";

test("affilié : approuver, suspendre (critique) ou réactiver selon le statut", () => {
  assert.deepEqual(actionAffilie("en_attente"), { statut: "actif", label: "Approuver", critique: false });
  assert.deepEqual(actionAffilie("actif"), { statut: "suspendu", label: "Suspendre", critique: true });
  assert.deepEqual(actionAffilie("suspendu"), { statut: "actif", label: "Réactiver", critique: false });
  assert.equal(actionAffilie("inconnu"), null);
});

test("pourcentage : tiret si dénominateur nul", () => {
  assert.equal(pourcent(5, 200), "2.50 %");
  assert.equal(pourcent(1, 3, 1), "33.3 %");
  assert.equal(pourcent(3, 0), "—");
});

test("filtres de liste : « tous » ou vide = pas de filtre, sinon valeur exacte sur chaque champ", () => {
  const posts = [
    { id: "1", plateforme: "instagram", statut: "planifie" },
    { id: "2", plateforme: "facebook", statut: "publie" },
    { id: "3", plateforme: "instagram", statut: "publie" },
  ];
  assert.equal(filtrer(posts, { plateforme: "tous", statut: "tous" }).length, 3);
  assert.deepEqual(filtrer(posts, { plateforme: "instagram" }).map((p) => p.id), ["1", "3"]);
  assert.deepEqual(filtrer(posts, { plateforme: "instagram", statut: "publie" }).map((p) => p.id), ["3"]);
  assert.equal(filtrer(posts, { statut: "" }).length, 3);
});
