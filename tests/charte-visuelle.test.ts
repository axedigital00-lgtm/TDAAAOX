// Identité visuelle de l'inscription (lib/charte-visuelle.ts) : couleurs du logo, lisibilité, contrôle du fichier, polices.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  associationsPolices, contraste, couleursDuLogo, lisible, logoTemporaireValide, paletteDepuisPixels, policeConnue,
  themeDepuisCharte, validerLogo,
} from "@/lib/charte-visuelle";

const px = (...couleurs: [number, number, number, number, number][]) =>
  couleurs.flatMap(([r, g, b, a, n]) => Array.from({ length: n }, () => [r, g, b, a]).flat());

test("palette : couleurs dominantes, sans transparent ni blanc du fond, teintes proches regroupées", () => {
  const p = paletteDepuisPixels(px([255, 255, 255, 255, 50], [0, 0, 0, 0, 50], [200, 30, 30, 255, 20], [205, 32, 28, 255, 5], [20, 20, 60, 255, 10]));
  assert.equal(p.length, 2);
  assert.ok(p[0].startsWith("#c"), p[0]); // le rouge, le plus présent
  assert.deepEqual(paletteDepuisPixels(px([255, 255, 255, 255, 10])), []);
});

test("couleurs du logo : principale vive, secondaire la plus foncée, repli si une seule couleur", () => {
  assert.deepEqual(couleursDuLogo(["#111111", "#e63946", "#457b9d"], "#000000"), { principale: "#e63946", secondaire: "#111111" });
  assert.deepEqual(couleursDuLogo(["#e63946"], "#222222"), { principale: "#e63946", secondaire: "#222222" });
  assert.equal(couleursDuLogo([], "#000000"), null);
});

test("lisibilité WCAG", () => {
  assert.equal(Math.round(contraste("#000000", "#ffffff")), 21);
  assert.ok(lisible("#111111", "#ffffff"));
  assert.ok(!lisible("#ffff00", "#ffffff"));
});

test("logo : formats, signature, taille, SVG sans script", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0]);
  assert.deepEqual(validerLogo({ type: "image/png", nom: "logo.PNG", taille: 6, octets: png }), { ok: true, ext: "png", type: "image/png" });
  assert.equal(validerLogo({ type: "image/png", nom: "logo.jpg", taille: 6, octets: png }).ok, false); // extension
  assert.equal(validerLogo({ type: "image/jpeg", nom: "l.jpg", taille: 6, octets: png }).ok, false); // signature
  assert.equal(validerLogo({ type: "image/png", nom: "l.png", taille: 6 * 1024 * 1024, octets: png }).ok, false); // taille
  assert.equal(validerLogo({ type: "application/pdf", nom: "l.pdf", taille: 6, octets: png }).ok, false);
  const svg = (s: string) => validerLogo({ type: "image/svg+xml", nom: "l.svg", taille: s.length, octets: new TextEncoder().encode(s) });
  assert.equal(svg('<svg viewBox="0 0 1 1"><rect fill="red"/></svg>').ok, true);
  assert.equal(svg("<svg><script>alert(1)</script></svg>").ok, false);
  assert.equal(svg('<svg onload="x()"></svg>').ok, false);
  assert.equal(svg('<svg><image href="https://x.y/a.png"/></svg>').ok, false);
});

test("logo temporaire : seul le dossier d'inscription du Blob est rattaché", () => {
  assert.ok(logoTemporaireValide("https://abc.public.blob.vercel-storage.com/inscription/logos/9f1c-2a.png"));
  assert.ok(!logoTemporaireValide("https://abc.public.blob.vercel-storage.com/boutiques/x/logo.png"));
  assert.ok(!logoTemporaireValide("https://evil.com/inscription/logos/a.png"));
  assert.ok(!logoTemporaireValide("http://abc.public.blob.vercel-storage.com/inscription/logos/a.png"));
  assert.ok(!logoTemporaireValide(""));
});

test("polices : 3 associations sans doublon ni police inconnue, celle du design d'abord", () => {
  const r = associationsPolices([
    { titre: "fraunces", corps: "dm-sans" }, { titre: "fraunces", corps: "dm-sans" }, { titre: "comic", corps: "inter" },
    { titre: "sora", corps: "inter" }, { titre: "anton", corps: "inter" }, { titre: "lora", corps: "inter" },
  ]);
  assert.deepEqual(r, [{ titre: "fraunces", corps: "dm-sans" }, { titre: "sora", corps: "inter" }, { titre: "anton", corps: "inter" }]);
  assert.ok(policeConnue("inter") && !policeConnue("comic") && !policeConnue(undefined));
});

test("thème depuis la charte : accent, texte s'il est lisible, polices connues seulement", () => {
  assert.deepEqual(themeDepuisCharte({ couleurs: null, polices: null }), {});
  assert.deepEqual(themeDepuisCharte({ couleurs: { principale: "#e63946", secondaire: "#111111" }, polices: { titre: "sora", corps: "inter" } }, "#ffffff"),
    { colors: { accent: "#e63946", texte: "#111111" }, fonts: { titre: "sora", corps: "inter" } });
  // Design sombre : un texte foncé serait illisible, le texte du design est gardé.
  assert.deepEqual(themeDepuisCharte({ couleurs: { principale: "#e63946", secondaire: "#111111" }, polices: { titre: "x", corps: "inter" } }, "#0a0a0a"),
    { colors: { accent: "#e63946" } });
});
