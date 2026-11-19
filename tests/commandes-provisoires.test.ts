import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BADGES_BROUILLON, BADGES_PANIER, etatBrouillon, etatPanier, lienWhatsapp, messageBrouillon, repartirTransition, totauxBrouillon,
} from "@/lib/commandes-provisoires";

test("totaux : remise bornée au sous-total, livraison jamais négative", () => {
  assert.deepEqual(totauxBrouillon([{ prix: 5000, quantite: 2 }, { prix: 1000, quantite: 1 }], 1000, 1500), { sousTotal: 11000, remise: 1000, livraison: 1500, total: 11500 });
  assert.equal(totauxBrouillon([{ prix: 1000, quantite: 1 }], 5000, 0).total, 0);
  assert.equal(totauxBrouillon([{ prix: 1000, quantite: 1 }], -50, -10).total, 1000);
  assert.equal(totauxBrouillon([], 0, 2000).total, 2000);
});

test("état d'une commande provisoire : Ouverte → Facture envoyée → Terminée", () => {
  assert.equal(etatBrouillon({ commandeId: null, factureEnvoyeeLe: null }), "ouvert");
  assert.equal(etatBrouillon({ commandeId: null, factureEnvoyeeLe: new Date() }), "facture_envoyee");
  assert.equal(etatBrouillon({ commandeId: "c1", factureEnvoyeeLe: null }), "convertie");
  assert.equal(BADGES_BROUILLON.convertie.label, "Terminée");
});

test("état d'un panier : badges du §7.2", () => {
  assert.equal(etatPanier({ recupereLe: null, relanceLe: null }), "non_recupere");
  assert.equal(etatPanier({ recupereLe: null, relanceLe: new Date() }), "relance");
  assert.equal(etatPanier({ recupereLe: new Date(), relanceLe: new Date() }), "recupere");
  assert.deepEqual([BADGES_PANIER.non_recupere.tone, BADGES_PANIER.relance.tone, BADGES_PANIER.recupere.tone], ["warning", "info", "success"]);
});

test("actions groupées : seules les transitions valides passent", () => {
  const r = repartirTransition([
    { id: "a", statut: "en_attente" }, { id: "b", statut: "confirmee" }, { id: "c", statut: "livree" }, { id: "d", statut: "inconnu" },
  ], "confirmee");
  assert.deepEqual(r, { possibles: ["a"], ignorees: ["b", "c", "d"] });
  assert.deepEqual(repartirTransition([{ id: "b", statut: "confirmee" }], "en_preparation").possibles, ["b"]);
});

test("lien et récapitulatif WhatsApp", () => {
  assert.equal(lienWhatsapp("+237 6 99 00 11 22", "x"), "https://wa.me/237699001122?text=x");
  assert.equal(lienWhatsapp("—", "x"), null);
  const m = messageBrouillon({ boutique: "B", client: "Awa", devise: "XAF", lignes: [{ nom: "Robe", variante: "Taille: M", prix: 5000, quantite: 2 }], remise: 0, livraison: 1000, total: 11000 });
  assert.match(m, /Robe \(Taille: M\) × 2/);
  assert.match(m, /Paiement à la livraison/);
  assert.doesNotMatch(m, /Remise/);
});
