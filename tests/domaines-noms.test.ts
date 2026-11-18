// Noms de domaine candidats (lib/domaines-noms.ts) : dérivés du nom de la boutique, sans accents, dédoublonnés.
import { test } from "node:test";
import assert from "node:assert/strict";
import { nomsCandidats, lienAchatDomaine } from "@/lib/domaines-noms";

test(".com d'abord, puis extension du pays, .shop, .store", () => {
  const n = nomsCandidats("Élégance Mode", "CM");
  assert.deepEqual(n.slice(0, 4), ["elegancemode.com", "elegancemode.cm", "elegancemode.shop", "elegancemode.store"]);
  assert.ok(n.includes("elegance-mode.com"));
  assert.ok(n.length <= 8 && new Set(n).size === n.length);
});

test("pays inconnu : pas d'extension pays", () => {
  const n = nomsCandidats("Chez Awa", null);
  assert.ok(n.every((d) => !d.endsWith(".cm")));
  assert.equal(n[0], "chezawa.com");
});

test("caractères spéciaux et nom trop court", () => {
  assert.equal(nomsCandidats("L'Atelier & Co", null)[0], "latelieretco.com");
  assert.deepEqual(nomsCandidats("!", "CM"), []);
  assert.deepEqual(nomsCandidats("A", "CM"), []);
});

test("lien d'achat encodé", () => {
  assert.equal(lienAchatDomaine("a b.com"), "https://vercel.com/domains/search?q=a%20b.com");
});
