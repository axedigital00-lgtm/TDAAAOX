// Une boutique neuve ne dit rien à la place du marchand, et ses compteurs clients suivent ses ventes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { parse } from "node-html-parser";
import { generateStoreConfig } from "@/lib/generate-store-config";
import { extraireVuesLibrairie, personnaliserAccueilLibrairie } from "@/lib/theme-import-clone";
import { compterVentes } from "@/lib/stock";

const PROMESSES = /carat|certifi|garanti|authenti|cliniquement|norme|écrin|sous \d+ ?h/i;

test("fiche produit générée : aucune promesse inventée, quelle que soit la catégorie", () => {
  for (const categorie of ["bijoux", "électronique", "beauté", "enfants", "santé", "sport", "maison", "alimentation", "autre"]) {
    const { themeConfig } = generateStoreConfig({ categorie, nomBoutique: "Awa" });
    const texte = JSON.stringify(themeConfig.productPage.sections);
    assert.doesNotMatch(texte, PROMESSES, categorie);
  }
});

test("accueil des 18 designs : nom, accroche et description du marchand, plus aucun texte de démo", () => {
  const dossier = path.join(process.cwd(), "Templates");
  const fichiers = readdirSync(dossier).filter((f) => f.endsWith(".html"));
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
