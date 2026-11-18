// Une boutique neuve ne dit rien à la place du marchand, et ses compteurs clients suivent ses ventes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { parse } from "node-html-parser";
import { generateStoreConfig } from "@/lib/generate-store-config";
import { extraireVuesLibrairie, personnaliserAccueilLibrairie } from "@/lib/theme-import-clone";
import { MANIFESTE_LIBRAIRIE } from "@/lib/axso-design-manifest";
import { compterVentes } from "@/lib/stock";

const PROMESSES = /carat|certifi|garanti|authenti|cliniquement|norme|écrin|sous \d+ ?h/i;

test("fiche produit générée : aucune promesse inventée, quelle que soit la catégorie", () => {
  for (const categorie of ["bijoux", "électronique", "beauté", "enfants", "santé", "sport", "maison", "alimentation", "autre"]) {
    const { themeConfig } = generateStoreConfig({ categorie, nomBoutique: "Awa" });
    const texte = JSON.stringify(themeConfig.productPage.sections);
    assert.doesNotMatch(texte, PROMESSES, categorie);
  }
});

test("boutique générée : accueil, À propos et Contact sans promesse, paiement vrai, coordonnées du marchand", () => {
  const INVENTE = /\d+ ?%|\d+ ?h\b|\d+ ?(jours?|days?)|7j\/7|24\/7|retour|return|rembours|refund|offert|gratuit|free (delivery|shipping|gift)|garanti|guarante|certifi|authenti|cliniquement|écrin|XOF|code promo|promo code/i;
  for (const categorie of ["mode", "bijoux", "électronique", "beauté", "enfants", "santé", "sport", "maison", "alimentation", "formation", "autre"]) {
    for (const pays of ["CM", "NG", "Sénégal"]) {
      for (const modeBoutique of ["catalogue", "digital"] as const) {
        const { themeConfig: c } = generateStoreConfig({ categorie, nomBoutique: "Awa Store", pays, modeBoutique, whatsapp: "+237 6 99 00 00 00", email: "awa@exemple.com" });
        const cas = `${categorie} ${pays} ${modeBoutique}`;
        assert.doesNotMatch(JSON.stringify(c), INVENTE, cas);
        const accueil = JSON.stringify(c.sections);
        assert.match(accueil, /Bientôt disponible|Coming soon/, cas); // Mobile Money pas encore encaissé
        assert.equal(/Paiement à la livraison|Cash on delivery/.test(accueil), modeBoutique === "catalogue", cas);
        assert.ok(c.sections.annonce.texte.includes("+237 6 99 00 00 00"), cas); // en-tête
        assert.ok(c.sections.faq.items.some((i: any) => i.reponse.includes("awa@exemple.com")), cas);
      }
    }
  }
  const { themeConfig: cm } = generateStoreConfig({ categorie: "mode", nomBoutique: "Awa", pays: "CM" });
  assert.match(JSON.stringify(cm.sections.confiance), /MTN Mobile Money, Orange Money/); // moyens locaux annoncés
  assert.match(cm.contactPage.intro, /Cameroun/);
  assert.equal(generateStoreConfig({ categorie: "mode", nomBoutique: "Awa", pays: "NG" }).themeConfig.sections.hero.ctaTexte, "Shop the Collection");
});

test("accueil des 18 designs : nom, accroche et description du marchand, plus aucun texte de démo", () => {
  const dossier = path.join(process.cwd(), "Templates");
  const premium = new Set(MANIFESTE_LIBRAIRIE.filter((e) => e.accueilComplet).map((e) => e.fichier));
  const fichiers = readdirSync(dossier).filter((f) => f.endsWith(".html") && !premium.has(f));
  assert.ok(fichiers.length >= 18);
  for (const f of fichiers) {
    const vues = extraireVuesLibrairie({ htmlBrut: readFileSync(path.join(dossier, f), "utf8"), slug: "awa" })!;
    const html = personnaliserAccueilLibrairie(vues.home, { nom: "Awa <Store>", accroche: "Bijoux", description: "Perles faites main." });
    const racine = parse(html);
    racine.querySelectorAll("style,script").forEach((e) => e.remove());
    assert.equal(racine.querySelector("h1")?.text, "Awa <Store>", f); // échappé, jamais interprété
    assert.equal(racine.text.replace(/\s+/g, ""), "BijouxAwa<Store>Perlesfaitesmain.VoirlaboutiqueNosproduits", f);
    assert.equal(racine.querySelector("#homeGrid")?.childNodes.length, 0, f); // cartes de démo retirées
  }
});

test("thèmes premium : toutes les sections gardées, bannière au nom du marchand, aucun chiffre ni promesse", () => {
  const premium = MANIFESTE_LIBRAIRIE.filter((e) => e.accueilComplet);
  assert.equal(premium.length, 8);
  for (const e of premium) {
    const brut = readFileSync(path.join(process.cwd(), "Templates", e.fichier), "utf8");
    const vues = extraireVuesLibrairie({ htmlBrut: brut, slug: "awa" })!;
    assert.ok(vues, e.fichier);
    const avant = parse(vues.home).querySelectorAll("section").length;
    const racine = parse(personnaliserAccueilLibrairie(vues.home, { nom: "Awa <Store>", accroche: "Bijoux", description: "Perles faites main." }, true));
    assert.equal(racine.querySelector("h1")?.text, "Awa <Store>", e.fichier);
    assert.ok(racine.text.includes("Perles faites main."), e.fichier);
    assert.equal(racine.querySelectorAll("section").length, avant, e.fichier);
    // Textes hors cartes de démonstration : ni statistique, délai, durée ou remise chiffrés, ni promesse, ni avis
    // (les numéros d'étapes « 01 », « en 3 étapes » restent permis).
    racine.querySelectorAll("style,script,svg,#homeGrid").forEach((x) => x.remove());
    assert.doesNotMatch(racine.text, /\d{3,}|\d+\s*(%|h\b|heures?|jours?|ans?\b|mois|clients?|avis|ventes?|produits?|étoiles?)|★|témoign|garanti|certifi|authenti|cliniquement|écrin/i, e.fichier);
    // Carte du manifeste = carte du fichier (même gabarit en vitrine, aperçu et Constructeur).
    for (const jeton of ["{{LIEN}}", "{{IMAGE}}", "{{NOM}}", "{{PRIX}}"]) assert.ok(e.carteTemplate.includes(jeton), `${e.fichier} ${jeton}`);
  }
});

test("compteurs client : +1 commande et +total à la vente, l'inverse au remboursement", async () => {
  const client = { totalCommandes: 0, totalDepense: 0 };
  const tx: any = {
    ligneCommande: { findMany: async () => [{ produitId: "p1", quantite: 2 }] },
    produit: { update: async () => ({}) },
    commande: { findUnique: async () => ({ clientId: "c1", montantTotal: 13000 }) },
    client: { update: async ({ data }: any) => {
      client.totalCommandes += data.totalCommandes.increment;
      client.totalDepense += data.totalDepense.increment;
    } },
  };
  await compterVentes(tx, "cmd", 1);
  assert.deepEqual(client, { totalCommandes: 1, totalDepense: 13000 });
  await compterVentes(tx, "cmd", -1);
  assert.deepEqual(client, { totalCommandes: 0, totalDepense: 0 });
});
