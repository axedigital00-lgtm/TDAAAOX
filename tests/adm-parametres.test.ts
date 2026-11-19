// Paramètres (lot 11) : détection des modifications et liens de recherche vers les sections.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { modifie } from "@/app/(dashboard)/dashboard/parametres/ui";
import { SECTIONS_INDEX } from "@/lib/recherche-dashboard";

test("modifie : rien avant chargement, puis tout écart de valeur", () => {
  assert.equal(modifie({ a: 1 }, null), false);
  assert.equal(modifie({ a: 1 }, { a: 1 }), false);
  assert.equal(modifie({ a: 2 }, { a: 1 }), true);
});

test("recherche : chaque section des Paramètres mène à une page existante", () => {
  for (const { href } of SECTIONS_INDEX.filter((e) => e.href.startsWith("/dashboard/parametres"))) {
    const chemin = href.split(/[?#]/)[0].replace("/dashboard", "app/(dashboard)/dashboard");
    assert.ok(existsSync(`${chemin}/page.tsx`), href);
  }
});
