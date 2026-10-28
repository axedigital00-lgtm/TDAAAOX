// Affiliation (lib/affiliation-regles.ts) : taux minimum Axso, base de calcul, disponibilité.
import { test } from "node:test";
import assert from "node:assert/strict";
import { tauxProduit, commissionCommande, etatCommission, estAutoReferencement } from "@/lib/affiliation-regles";

test("taux : minimum 10 % physique, 20 % numérique, le marchand peut monter", () => {
  assert.equal(tauxProduit({ type: "physique" }, null), 0.1);
  assert.equal(tauxProduit({ type: "formation" }, 10), 0.2);
  assert.equal(tauxProduit({ type: "physique" }, 15), 0.15);
  assert.equal(tauxProduit({ type: "physique", tauxCommissionAff: 0.05 }, 30), 0.1); // jamais sous le minimum
  assert.equal(tauxProduit({ type: "digital", tauxCommissionAff: 0.4 }, 10), 0.4);
});

const ligne = (prix: number, type = "physique", affiliationActive = true) => ({ prix, quantite: 1, produit: { affiliationActive, type } });

test("commission sur le prix du vendeur : majoration Axso et livraison exclues", () => {
  // Client paie 11 000 (10 000 vendeur + 10 %) + 2 000 de livraison → 10 % de 10 000.
  assert.equal(commissionCommande({ lignes: [ligne(11000)], montantTotal: 13000, montantLivraison: 2000, tauxCommission: 0.1, devise: "XAF" }), 1000);
  // Numérique : 11 300 = 10 000 + 13 % → 20 % de 10 000.
  assert.equal(commissionCommande({ lignes: [ligne(11300, "digital")], montantTotal: 11300, montantLivraison: 0, tauxCommission: 0.13, devise: "XAF" }), 2000);
});

test("produit non ouvert aux affiliés : rien ; remise : base réduite d'autant", () => {
  assert.equal(commissionCommande({ lignes: [ligne(11000, "physique", false)], montantTotal: 11000, montantLivraison: 0, tauxCommission: 0.1, devise: "XAF" }), 0);
  assert.equal(commissionCommande({ lignes: [ligne(11000)], montantTotal: 5500, montantLivraison: 0, tauxCommission: 0.1, devise: "XAF" }), 500);
});

test("disponible 48 h après la livraison, jamais avant", () => {
  const c = { statut: "pending", retraitId: null };
  const maintenant = new Date("2026-10-27T12:00:00Z");
  assert.equal(etatCommission(c, { statut: "expediee", livreeAt: null }, maintenant), "en_attente");
  assert.equal(etatCommission(c, { statut: "livree", livreeAt: new Date("2026-10-26T12:00:00Z") }, maintenant), "en_attente");
  assert.equal(etatCommission(c, { statut: "livree", livreeAt: new Date("2026-10-25T11:00:00Z") }, maintenant), "disponible");
  assert.equal(etatCommission({ statut: "pending", retraitId: "r1" }, null, maintenant), "versee");
  assert.equal(etatCommission({ statut: "rejetee" }, null, maintenant), "annulee");
});

test("auto-référencement : même e-mail ou même numéro (indicatif ignoré)", () => {
  const aff = { email: "Awa@x.com", telephone: "+237 690 00 00 00" };
  assert.ok(estAutoReferencement(aff, { clientEmail: "awa@x.com ", clientTelephone: "1" }));
  assert.ok(estAutoReferencement(aff, { clientEmail: null, clientTelephone: "690000000" }));
  assert.ok(!estAutoReferencement(aff, { clientEmail: "b@x.com", clientTelephone: "691111111" }));
});
