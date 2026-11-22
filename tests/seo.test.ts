// Référencement : titres et descriptions uniques, à la bonne longueur, adresses canoniques en www.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PAGES_SEO, seoPage } from "@/lib/seo";

test("titres et descriptions exploitables par Google", () => {
  const pages = Object.entries(PAGES_SEO);
  for (const [chemin, p] of pages) {
    assert.ok(p.titre.length <= 62, `${chemin} : titre de ${p.titre.length} caractères`);
    assert.ok(p.description.length >= 90 && p.description.length <= 165, `${chemin} : description de ${p.description.length} caractères`);
  }
  assert.equal(new Set(pages.map(([, p]) => p.titre)).size, pages.length);
  assert.equal(new Set(pages.map(([, p]) => p.description)).size, pages.length);
});

test("adresse canonique unique en www", () => {
  assert.equal(seoPage("/").alternates?.canonical, "https://www.axsoafrica.com/");
  assert.equal(seoPage("/tarifs").alternates?.canonical, "https://www.axsoafrica.com/tarifs");
});
