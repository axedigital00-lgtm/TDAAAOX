// Parrainage des abonnements : commission, séquestre, anti-fraude et confidentialité.
import { test } from "node:test";
import assert from "node:assert/strict";
import { codeValide, commissionAbonnement, estAutoParrainage, etatCommissionParrainage, montantPlafonne, nomMasque } from "@/lib/parrainage-regles";

test("commission : 20 % du paiement, sans centimes", () => {
  assert.equal(commissionAbonnement(6000), 1200);
  assert.equal(commissionAbonnement(20000), 4000);
  assert.equal(commissionAbonnement(6001), 1200);
  assert.equal(commissionAbonnement(0), 0);
  assert.equal(commissionAbonnement(-500), 0);
});

test("montant : plafonné au prix du forfait sur la durée", () => {
  assert.equal(montantPlafonne(999999, 6000, 30), 6000);
  assert.equal(montantPlafonne(18000, 6000, 90), 18000);
  assert.equal(montantPlafonne(7000, 6000, 31), 7000, "31 jours = 2 mois entamés");
  assert.equal(montantPlafonne(0, 6000, 30), 0);
});

test("états : en attente, disponible, versée, annulée", () => {
  const t = new Date("2026-12-01T10:00:00Z"), avant = new Date(t.getTime() - 1), apres = new Date(t.getTime() + 1);
  assert.equal(etatCommissionParrainage({ statut: "pending", disponibleLe: apres }, t), "en_attente");
  assert.equal(etatCommissionParrainage({ statut: "pending", disponibleLe: avant }, t), "disponible");
  assert.equal(etatCommissionParrainage({ statut: "payee", disponibleLe: avant }, t), "versee");
  assert.equal(etatCommissionParrainage({ statut: "annulee", disponibleLe: avant }, t), "annulee");
});

test("auto-parrainage : e-mail, alias et téléphone", () => {
  assert.equal(estAutoParrainage({ email: "Awa@Mail.com" }, { email: "awa+shop@mail.com" }), true);
  assert.equal(estAutoParrainage({ telephone: "+237 690 00 00 01" }, { telephone: "690000001" }), true);
  assert.equal(estAutoParrainage({ email: "a@x.com", telephone: "690000001" }, { email: "b@x.com", telephone: "690000002" }), false);
  assert.equal(estAutoParrainage({ email: null, telephone: "" }, { email: null, telephone: "" }), false);
});

test("code et confidentialité", () => {
  assert.equal(codeValide("ABCD2345"), true);
  assert.equal(codeValide("abc"), false);
  assert.equal(codeValide("AB'; DROP"), false);
  assert.equal(nomMasque("Awa Diallo"), "Awa D.");
  assert.equal(nomMasque(""), "Filleul");
});
