import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { DOSSIERS } from "../lib/dossiers-fonctionnalites";
import { solutions, exemples } from "../lib/catalogue-fonctionnalites";
import { ARTICLES, GUIDES } from "../lib/contenu-site";
import { routesIllustrees, visuelEspace } from "../lib/visuels-espaces";

const dossierPublic = join(process.cwd(), "public");
const dossierImages = join(dossierPublic, "visuels");

test("une photographie distincte pour chaque module, chapitre, carte, article, guide et écran de travail", () => {
  const emplacements = [
    ...DOSSIERS.flatMap(d => [d.image, ...d.chapitres.map(c => c.photo)]),
    ...solutions.flatMap(s => [
      `/visuels/annuaire-${s.slug}.webp`,
      `/visuels/apercu-${s.slug}.webp`,
      ...exemples[s.slug].options.flatMap(option => option.image?.startsWith("/visuels/") ? [option.image] : []),
    ]),
    ...ARTICLES.flatMap(a => [a.image, `/visuels/index-${a.slug}.webp`]),
    ...GUIDES.map(g => `/visuels/guide-${g.slug}.webp`),
    ...routesIllustrees.map(route => visuelEspace(route)),
  ];
  const fichiers = new Set(readdirSync(dossierImages).map(f => "/visuels/" + f));
  const vus = new Set<string>();
  for (const url of emplacements) {
    assert.ok(url && fichiers.has(url), `Image absente : ${url}`);
    assert.ok(!vus.has(url), `Image utilisée par deux emplacements : ${url}`);
    vus.add(url);
  }
  for (const s of solutions) assert.equal(s.image, DOSSIERS.find(d => d.slug === s.slug)?.image);
});

test("la collection WebP ne contient aucun fichier identique sous deux noms", () => {
  const empreintes = new Map<string, string>();
  for (const nom of readdirSync(dossierImages).filter(f => f.endsWith(".webp"))) {
    const fichier = readFileSync(join(dossierImages, nom));
    assert.equal(fichier.toString("ascii", 8, 12), "WEBP", nom);
    const empreinte = createHash("sha256").update(fichier).digest("hex");
    assert.ok(!empreintes.has(empreinte), `${nom} et ${empreintes.get(empreinte)} sont identiques`);
    empreintes.set(empreinte, nom);
  }
});

test("les chemins dynamiques utilisent le visuel du type de page", () => {
  assert.equal(visuelEspace("/admin/marchands/exemple"), "/visuels/espace-admin-marchands-id.webp");
  assert.equal(visuelEspace("/connexion/"), "/visuels/espace-connexion.webp");
  assert.equal(visuelEspace("/dashboard/commandes/devis"), "/visuels/espace-dashboard-commandes-devis.webp");
  assert.equal(visuelEspace("/magasin-exemple/panier"), null);
});
