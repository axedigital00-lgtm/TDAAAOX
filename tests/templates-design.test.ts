// Les modèles de design se lisent sans dépendre du chemin, et aucun nom ne sort du dossier.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "fs";
import { MANIFESTE_LIBRAIRIE } from "@/lib/axso-design-manifest";
import { lireTemplate } from "@/lib/templates-design";

test("chaque design du manifeste a son modèle", () => {
  const presents = new Set(readdirSync("Templates"));
  for (const e of MANIFESTE_LIBRAIRIE) assert.ok(presents.has(e.fichier), e.fichier);
  assert.ok(lireTemplate(MANIFESTE_LIBRAIRIE[0].fichier)?.includes("<"));
});

test("noms refusés hors du dossier", () => {
  for (const f of ["../package.json", "a/b.html", "x.js", "..html"]) assert.equal(lireTemplate(f), null, f);
});
