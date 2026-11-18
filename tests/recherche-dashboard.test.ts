// Recherche du tableau de bord (lib/recherche-dashboard.ts) : synonymes, accents, petites fautes, sections des Réglages.
import { test } from "node:test";
import assert from "node:assert/strict";
import { chercher, distance, scoreRecherche, textesPage, SECTIONS_INDEX } from "@/lib/recherche-dashboard";

const PAGES = [
  { href: "/dashboard/wallet", label: "Mon argent", groupe: "" },
  { href: "/dashboard/boutique?section=livraison", label: "Livraison", groupe: "Ventes" },
  { href: "/dashboard/boutique/politiques", label: "Politiques", groupe: "Boutique" },
  { href: "/dashboard/commandes", label: "Commandes", groupe: "Ventes" },
  { href: "/dashboard/parametres", label: "Réglages", groupe: "Compte" },
];
const premier = (q: string) => chercher(PAGES, q, (p) => textesPage(p))[0]?.href;

test("synonymes : retirer, retrait → Mon argent ; frais de port → Livraison ; CGV → Politiques", () => {
  assert.equal(premier("retirer"), "/dashboard/wallet");
  assert.equal(premier("retrait"), "/dashboard/wallet");
  assert.equal(premier("frais de port"), "/dashboard/boutique?section=livraison");
  assert.equal(premier("cgv"), "/dashboard/boutique/politiques");
  assert.equal(premier("paramètres"), "/dashboard/parametres");
});

test("sans accents ni majuscules", () => {
  assert.equal(premier("EXPEDITION"), "/dashboard/boutique?section=livraison");
  assert.equal(premier("reglages"), "/dashboard/parametres");
});

test("tolère une petite faute", () => {
  assert.equal(distance("livraisn", "livraison"), 1);
  assert.equal(premier("livraisn"), "/dashboard/boutique?section=livraison");
  assert.equal(premier("politqiue"), "/dashboard/boutique/politiques");
});

test("rien d'inventé : requête vide ou sans rapport", () => {
  assert.deepEqual(chercher(PAGES, "  ", (p) => textesPage(p)), []);
  assert.deepEqual(chercher(PAGES, "zzzz", (p) => textesPage(p)), []);
  assert.equal(scoreRecherche("xylophone", "Commandes"), 0);
});

test("sections des Réglages : horaires → Réglages › Coordonnées, domaine → Domaine personnalisé", () => {
  const section = (q: string) => chercher(SECTIONS_INDEX, q, (s) => ({ principal: s.label, secondaires: [s.groupe, s.mots] }))[0];
  assert.equal(section("horaires")?.href, "/dashboard/parametres#coordonnees");
  assert.equal(section("horaires")?.groupe, "Réglages");
  assert.equal(section("nom de domaine")?.label, "Domaine personnalisé");
});
