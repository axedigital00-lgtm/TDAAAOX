// Parcours de démarrage (lib/demarrage-regles.ts) et politiques (lib/politiques.ts) : états calculés sur des données réelles.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  badgeCompleteVisible, bandeauVisible, calculerEtapes, completude, majCompleteLe, prochaineEtape, progression, relanceDue,
  type DonneesDemarrage,
} from "@/lib/demarrage-regles";
import { politiquePublique, politiqueValidable, statutPolitique } from "@/lib/politiques";

const T0 = new Date("2026-11-17T10:00:00Z");
const j = (n: number) => new Date(T0.getTime() + n * 86400_000).toISOString();
const validee = { contenu: "Texte", valideeLe: j(0) };

const base = (x: Partial<DonneesDemarrage> = {}): DonneesDemarrage => ({
  statut: "brouillon", digital: false, nbProduitsActifs: 0, nbExemples: 0, zones: [], politiques: {},
  adresse: null, horaires: null, email: "a@b.c", domaineActif: false, suivi: {}, ...x,
});
const complet = (x: Partial<DonneesDemarrage> = {}) => base({
  nbProduitsActifs: 1, zones: [{ frais: 1000 }], adresse: "Akwa", horaires: "8h-18h",
  politiques: { livraison: validee, retours: validee, confidentialite: validee, cgv: validee },
  suivi: { constructeurEnregistreLe: j(0), livraisonConfirmeeLe: j(0), lienAffiliesPartageLe: j(0) }, ...x,
});
const etat = (d: DonneesDemarrage, cle: string) => calculerEtapes(d).find((e) => e.cle === cle)?.etat;

test("nouvelle boutique : 0 sur 6, produit à faire, constructeur préparé par Axia", () => {
  const e = calculerEtapes(base());
  assert.deepEqual(progression(e), { faites: 0, total: 6 });
  assert.equal(etat(base(), "produit"), "a_faire");
  assert.equal(etat(base(), "constructeur"), "axia");
  assert.equal(prochaineEtape(e)?.cle, "produit");
});

test("produit : exemples d'Axia = à vérifier ; un vrai produit actif = terminé", () => {
  assert.equal(etat(base({ nbExemples: 3 }), "produit"), "axia");
  assert.equal(etat(base({ nbExemples: 3, nbProduitsActifs: 1 }), "produit"), "termine");
});

test("livraison : masquée en digital, terminée seulement si confirmée avec un tarif", () => {
  assert.equal(etat(base({ digital: true }), "livraison"), undefined);
  assert.equal(progression(calculerEtapes(base({ digital: true }))).total, 5);
  assert.equal(etat(base({ zones: [{ frais: 500 }] }), "livraison"), "axia");
  assert.equal(etat(base({ zones: [{ frais: null }], suivi: { livraisonConfirmeeLe: j(0) } }), "livraison"), "axia");
  assert.equal(etat(base({ zones: [{ frais: 500 }], suivi: { livraisonConfirmeeLe: j(0) } }), "livraison"), "termine");
  // zone supprimée après confirmation : l'étape redevient à faire
  assert.equal(etat(base({ zones: [], suivi: { livraisonConfirmeeLe: j(0) } }), "livraison"), "a_faire");
});

test("politiques : terminé seulement quand les 4 sont validées", () => {
  assert.equal(etat(base({ politiques: { livraison: { contenu: "x" } } }), "politiques"), "axia");
  assert.equal(etat(complet(), "politiques"), "termine");
  assert.equal(etat(complet({ politiques: { livraison: validee, retours: validee, confidentialite: validee } }), "politiques"), "axia");
});

test("coordonnées : adresse, horaires et e-mail requis", () => {
  assert.equal(etat(base({ adresse: "Akwa" }), "coordonnees"), "a_faire");
  assert.equal(etat(base({ adresse: "Akwa", horaires: "8h-18h" }), "coordonnees"), "termine");
});

test("complétude : sur les étapes « Pour bien vendre » uniquement (produit et domaine exclus)", () => {
  assert.equal(completude(calculerEtapes(complet({ nbProduitsActifs: 0 }))).pourcent, 100);
  assert.equal(completude(calculerEtapes(complet({ adresse: "" }))).pourcent, 80);
  assert.equal(completude(calculerEtapes(complet({ adresse: "" }))).manquantes[0].cle, "coordonnees");
});

test("badge « Boutique complète » : 7 jours, et disparaît si une étape redevient incomplète", () => {
  assert.equal(majCompleteLe({}, 100, T0), T0.toISOString());
  assert.equal(majCompleteLe({ completeLe: j(-1) }, 100, T0), undefined);
  assert.equal(majCompleteLe({ completeLe: j(-1) }, 80, T0), null);
  assert.equal(majCompleteLe({}, 80, T0), undefined);
  assert.equal(badgeCompleteVisible({ completeLe: j(-6) }, 100, T0), true);
  assert.equal(badgeCompleteVisible({ completeLe: j(-8) }, 100, T0), false);
  assert.equal(badgeCompleteVisible({ completeLe: j(-1) }, 80, T0), false);
});

test("bandeau : « Plus tard » le réduit 24 h, disparaît à 100 %", () => {
  assert.equal(bandeauVisible({}, 80, T0), true);
  assert.equal(bandeauVisible({ bandeauReduitJusqua: j(1) }, 80, T0), false);
  assert.equal(bandeauVisible({ bandeauReduitJusqua: j(-0.1) }, 80, T0), true);
  assert.equal(bandeauVisible({}, 100, T0), false);
});

test("relances J+1, J+3, J+7 après publication, une seule fois, arrêt à 100 %", () => {
  assert.equal(relanceDue({}, 50, T0), null); // pas publiée
  assert.equal(relanceDue({ publieeLe: j(-0.5) }, 50, T0), null);
  assert.equal(relanceDue({ publieeLe: j(-1) }, 50, T0), "j1");
  assert.equal(relanceDue({ publieeLe: j(-1.5), relances: { j1: j(0) } }, 50, T0), null);
  assert.equal(relanceDue({ publieeLe: j(-3), relances: { j1: j(-2) } }, 50, T0), "j3");
  assert.equal(relanceDue({ publieeLe: j(-10) }, 50, T0), "j7"); // pas de rafale
  assert.equal(relanceDue({ publieeLe: j(-3) }, 100, T0), null);
});

test("politiques : « À compléter » bloque la validation et n'est jamais publié", () => {
  const brouillon = { contenu: "Retours sous [À compléter : délai de retour en jours] jours." };
  assert.equal(statutPolitique(brouillon), "a_completer");
  assert.equal(politiqueValidable(brouillon.contenu), false);
  assert.equal(politiquePublique({ ...brouillon, valideeLe: j(0) }), null);
  assert.equal(statutPolitique({ contenu: "Retours sous 7 jours." }), "brouillon_axia");
  assert.equal(politiquePublique({ contenu: "Retours sous 7 jours.", valideeLe: j(0) }), "Retours sous 7 jours.");
  assert.equal(statutPolitique(undefined), "absente");
});

test("produits d'exemple d'Axia : exclus du compte pour publier, redeviennent de vrais produits une fois activés", async () => {
  const { readFileSync } = await import("node:fs");
  const lire = (f: string) => readFileSync(f, "utf8");
  // Même filtre dans les critères de publication et dans l'étape « Ajouter mon premier produit ».
  for (const f of ["lib/boutique-completion.ts", "lib/demarrage.ts"]) {
    assert.match(lire(f), /produit\.count\(\{ where: \{ tenantId, actif: true, exempleAxia: false \} \}\)/, f);
  }
  // Activer un exemple (fiche produit ou interrupteur) le sort des exemples, sinon il ne compterait jamais.
  assert.match(lire("lib/produits.ts"), /if \(updateData\.actif === true\) updateData\.exempleAxia = false;/);
  assert.match(lire("app/api/produits/[id]/route.ts"), /if \(data\.actif === true\) data\.exempleAxia = false;/);
});
