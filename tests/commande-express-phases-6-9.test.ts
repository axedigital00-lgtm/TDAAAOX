// Releasit COD AXSO, phases 6 à 9 : éditeur de formulaire, abandons, statistiques et test A/B,
// conversions serveur (hachage, déduplication, jetons gardés ou effacés).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lireFormulaire, lireReponses, schemaFormulaire } from "@/lib/commande-express/formulaire";
import { lireRelances, messageRelance, relanceDue } from "@/lib/commande-express/abandons";
import { comparerVariantes, regrouper } from "@/lib/commande-express/statistiques";
import { corpsMeta, corpsTiktok, ecrirePixels, lirePixels } from "@/lib/commande-express/pixels-serveur";

process.env.AUTH_SECRET ||= "secret-de-test-releasit";

test("formulaire : chaque champ de base une fois, nom / téléphone / ville toujours demandés", () => {
  const f = lireFormulaire({ champs: [{ cle: "ville" }, { cle: "nom", visible: false }, { cle: "repere", requis: true }, { cle: "ville" }, { cle: "inconnu" }] });
  assert.deepEqual(f.champs.map((c) => c.cle), ["ville", "nom", "repere", "telephone", "email", "quartier", "position"]);
  assert.equal(f.champs.find((c) => c.cle === "nom")!.visible, true);
  assert.equal(f.champs.find((c) => c.cle === "repere")!.requis, true);
  assert.equal(f.champs.find((c) => c.cle === "email")!.visible, false);
  assert.equal(lireFormulaire(null, true).champs.find((c) => c.cle === "email")!.visible, true);
  assert.equal(lireFormulaire("n'importe quoi").modele, "minimal");
  assert.equal(schemaFormulaire.safeParse({ modele: "inconnu" }).success, false);
});

test("champs personnalisés : obligatoires vérifiés, listes limitées aux choix prévus", () => {
  const f = lireFormulaire({ perso: [{ id: "taille", libelle: "Taille", type: "liste", options: ["S", "M"], requis: true }, { id: "cadeau", libelle: "Paquet cadeau", type: "case" }] });
  assert.deepEqual(lireReponses(f, { taille: "M", cadeau: true }), { ok: true, champs: [{ libelle: "Taille", valeur: "M" }, { libelle: "Paquet cadeau", valeur: "Oui" }] });
  assert.equal(lireReponses(f, { taille: "XXL" }).ok, false);
  assert.equal(lireReponses(f, {}).ok, false);
});

test("abandons : relances aux délais, jamais après la commande ni au-delà de 72 h", () => {
  const cree = new Date("2026-12-01T10:00:00Z");
  const a = { createdAt: cree, relances: 0, recupereeCommandeId: null };
  const etapes = [15, 120, 1440];
  assert.equal(relanceDue(a, etapes, new Date("2026-12-01T10:10:00Z")), false);
  assert.equal(relanceDue(a, etapes, new Date("2026-12-01T10:16:00Z")), true);
  assert.equal(relanceDue({ ...a, relances: 1 }, etapes, new Date("2026-12-01T11:00:00Z")), false);
  assert.equal(relanceDue({ ...a, relances: 1 }, etapes, new Date("2026-12-01T12:01:00Z")), true);
  assert.equal(relanceDue({ ...a, relances: 3 }, etapes, new Date("2026-12-02T12:00:00Z")), false);
  assert.equal(relanceDue({ ...a, recupereeCommandeId: "c1" }, etapes, new Date("2026-12-01T10:30:00Z")), false);
  assert.equal(relanceDue(a, etapes, new Date("2026-12-04T11:00:00Z")), false);
  assert.equal(messageRelance("Bonjour {nom}, {produit} chez {boutique} : {lien}", { nom: "Awa Diallo", produit: "Café", boutique: "Atelier", lien: "https://x" }), "Bonjour Awa, Café chez Atelier : https://x");
  assert.equal(lireRelances(null).actif, false);
});

test("test A/B : pas de gagnant sans assez de visites, gagnant fiable sinon", () => {
  assert.equal(comparerVariantes({ essais: 40, succes: 4 }, { essais: 40, succes: 9 }).gagnant, null);
  const r = comparerVariantes({ essais: 2000, succes: 60 }, { essais: 2000, succes: 110 });
  assert.equal(r.gagnant, "B"); assert.ok(r.confiance >= 95); assert.equal(r.tauxA, 3); assert.equal(r.tauxB, 5.5);
  assert.equal(comparerVariantes({ essais: 500, succes: 20 }, { essais: 500, succes: 21 }).gagnant, null);
});

test("regroupement : taux de confirmation et de livraison par source", () => {
  const g = regrouper([
    { source: { utm_source: "facebook" }, ville: "Douala", statut: "livree", confirmee: true, montant: 10000 },
    { source: { utm_source: "facebook" }, ville: "Douala", statut: "annulee", confirmee: false, montant: 8000 },
    { source: null, ville: "Yaoundé", statut: "livree", confirmee: true, montant: 5000 },
  ], (l) => l.source?.utm_source ?? "");
  assert.deepEqual(g[0], { nom: "facebook", commandes: 2, confirmees: 1, livrees: 1, ca: 10000, tauxConfirmation: 50, tauxLivraison: 50 });
  assert.equal(g[1].nom, "Direct");
});

test("conversions serveur : données hachées, même identifiant que le navigateur, jetons gardés ou effacés", () => {
  const e = { numero: "AX-1", montant: 13000, devise: "XAF", telephone: "677000111", pays: "CM", nom: "Awa Diallo", ville: "Douala", fbclid: "abc", produitIds: ["p1"], quand: new Date("2026-12-01T10:00:00Z") };
  const m = corpsMeta(e, "TEST1").data[0] as any;
  assert.equal(m.event_id, "AX-1"); assert.equal(m.event_name, "Purchase");
  assert.equal(m.user_data.ph[0], createHash("sha256").update("237677000111").digest("hex"));
  assert.equal(m.user_data.fn[0], createHash("sha256").update("awa").digest("hex"));
  assert.ok(m.user_data.fbc.endsWith(".abc"));
  assert.ok(!JSON.stringify(m).includes("677000111"));
  assert.equal(corpsMeta(e, "TEST1").test_event_code, "TEST1");
  const tk = corpsTiktok("PX1", e).data[0] as any;
  assert.equal(tk.event, "CompletePayment"); assert.equal(tk.event_id, "AX-1");
  const v1 = ecrirePixels(null, { metaToken: "EAAB-secret", modePurchase: "confirmation" });
  assert.ok(!JSON.stringify(v1).includes("EAAB-secret"));
  assert.equal(lirePixels(v1).metaToken, "EAAB-secret");
  assert.equal(lirePixels(ecrirePixels(v1, { metaToken: "" })).metaToken, "EAAB-secret");
  assert.equal(lirePixels(ecrirePixels(v1, { metaToken: "-" })).metaToken, undefined);
  assert.equal(lirePixels(v1).modePurchase, "confirmation");
});
