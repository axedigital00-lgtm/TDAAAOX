// Devis, entreprises, retours en libre-service, workflows et lancements : règles pures.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  actionLancement, clientPeutRepondre, devisSchema, echeancePaiement, lancementSchema, marchandPeutConvertir, methodeDePaiement,
  prixEntreprise, refusRetour, remplirModele, sousPlafond, totauxDevis, workflowSchema,
} from "@/lib/commerce/regles";
import { payeeALaLivraison } from "@/lib/commandes";

const J = 86_400_000;
const T = new Date("2026-12-01T10:00:00Z");

test("devis : totaux, remise plafonnée, validation", () => {
  assert.deepEqual(totauxDevis([{ prix: 1000, quantite: 3 }], 500, 200), { sousTotal: 3000, reduction: 500, livraison: 200, total: 2700 });
  assert.equal(totauxDevis([{ prix: 1000, quantite: 1 }], 5000, 0).total, 0, "la remise ne dépasse pas le sous-total");
  assert.equal(devisSchema.safeParse({ clientNom: "A", clientTelephone: "690000000", lignes: [] }).success, false);
});

test("devis : réponse du client et conversion selon le statut", () => {
  assert.equal(clientPeutRepondre({ statut: "envoye", expireAt: new Date(T.getTime() + J) }, T), true);
  assert.equal(clientPeutRepondre({ statut: "envoye", expireAt: new Date(T.getTime() - 1) }, T), false, "expiré");
  assert.equal(clientPeutRepondre({ statut: "soumis" }, T), false, "une demande pro est validée par le marchand");
  assert.equal(marchandPeutConvertir("soumis"), true);
  assert.equal(marchandPeutConvertir("accepte"), false, "jamais deux commandes pour un devis");
});

test("paiement à terme : la livraison ne vaut pas encaissement", () => {
  assert.equal(methodeDePaiement("comptant"), "direct_cod");
  assert.equal(methodeDePaiement("net30"), "facture_terme");
  assert.equal(payeeALaLivraison({ methodePaiement: "facture_terme", paiementStatut: "pending" }), false);
  assert.equal(payeeALaLivraison({ methodePaiement: "direct_cod", paiementStatut: "pending" }), true);
  assert.equal(echeancePaiement("comptant", T), null);
  assert.equal(echeancePaiement("net30", T)!.getTime(), T.getTime() + 30 * J);
});

test("entreprises : plafond et remise", () => {
  assert.equal(sousPlafond(null, 999, 999), true);
  assert.equal(sousPlafond(1000, 600, 400), true);
  assert.equal(sousPlafond(1000, 600, 401), false);
  assert.equal(prixEntreprise(10000, 15), 8500);
  assert.equal(prixEntreprise(10000, 500), 1000, "remise bornée à 90 %");
});

test("retours : livrée, dans le délai, un seul retour actif", () => {
  const livree = { statut: "livree", livreeAt: new Date(T.getTime() - 3 * J), retours: [] };
  assert.equal(refusRetour(livree, T), null);
  assert.match(refusRetour({ ...livree, statut: "expediee" }, T)!, /livrée/);
  assert.match(refusRetour({ ...livree, livreeAt: new Date(T.getTime() - 15 * J) }, T)!, /délai/);
  assert.match(refusRetour({ ...livree, retours: [{ statut: "ouvert" }] }, T)!, /existe/);
  assert.equal(refusRetour({ ...livree, retours: [{ statut: "rejete" }] }, T), null, "un retour rejeté n'empêche pas d'en rouvrir un");
});

test("workflows : cohérence déclencheur / condition / action et modèles", () => {
  const base = { nom: "VIP", declencheur: "order.paid" as const, conditions: [{ champ: "total", op: ">=" as const, valeur: 100000 }], actions: [{ type: "segment_client" as const, segment: "vip" }] };
  assert.equal(workflowSchema.safeParse(base).success, true);
  assert.equal(workflowSchema.safeParse({ ...base, conditions: [{ champ: "stock", op: "<", valeur: 2 }] }).success, false);
  assert.equal(workflowSchema.safeParse({ ...base, actions: [{ type: "masquer_produit" }] }).success, false);
  assert.equal(workflowSchema.safeParse({ ...base, declencheur: "inventory.low", conditions: [] }).success, false);
  assert.equal(remplirModele("Bonjour {{client}}, {{__proto__}}#{{numero}}", { client: "Awa", numero: 12 }), "Bonjour Awa, #12");
});

test("lancements : publication puis retour arrière à l'heure dite", () => {
  const debut = new Date(T.getTime() - 1000), fin = new Date(T.getTime() + 1000);
  assert.equal(actionLancement({ statut: "planifie", debut: new Date(T.getTime() + 1), fin: null }, T), null);
  assert.equal(actionLancement({ statut: "planifie", debut, fin }, T), "publier");
  assert.equal(actionLancement({ statut: "planifie", debut, fin: new Date(T.getTime() - 1) }, T), null, "fenêtre déjà passée : on ne publie pas");
  assert.equal(actionLancement({ statut: "en_ligne", debut, fin }, T), null);
  assert.equal(actionLancement({ statut: "en_ligne", debut, fin: debut }, T), "retablir");
  assert.equal(actionLancement({ statut: "en_ligne", debut, fin: null }, T), null);
  assert.equal(lancementSchema.safeParse({ nom: "Noël", debut: T, fin: T }).success, false);
});
