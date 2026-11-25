// Centre de confirmation Commande Express : effet d'un appel, file de priorité, statut de la commande.
import { test } from "node:test";
import assert from "node:assert/strict";
import { aTraiter, apresAppel, schemaAppel, statutCommandePour, trierFile, TENTATIVES_MAX } from "@/lib/commande-express/confirmation";

const neuf = { statutConfirmation: "a_confirmer", tentatives: 0, rappelA: null };

test("appel : injoignable compte les essais, confirmée efface le rappel", () => {
  const un = apresAppel(neuf, { resultat: "injoignable" });
  assert.equal(un.tentatives, 1);
  const deux = apresAppel(un, { resultat: "injoignable" });
  assert.equal(deux.tentatives, 2);
  const rappel = new Date("2026-12-01T09:00:00Z");
  const r = apresAppel(deux, { resultat: "rappeler", rappelA: rappel });
  assert.equal(r.statutConfirmation, "rappeler"); assert.equal(r.rappelA, rappel);
  const ok = apresAppel(r, { resultat: "confirmee" });
  assert.equal(ok.statutConfirmation, "confirmee"); assert.equal(ok.rappelA, null); assert.ok(ok.confirmeeAt);
});

test("file : sort après 3 essais sans réponse", () => {
  assert.equal(aTraiter(neuf), true);
  assert.equal(aTraiter({ ...neuf, statutConfirmation: "injoignable", tentatives: TENTATIVES_MAX - 1 }), true);
  assert.equal(aTraiter({ ...neuf, statutConfirmation: "injoignable", tentatives: TENTATIVES_MAX }), false);
  assert.equal(aTraiter({ ...neuf, statutConfirmation: "confirmee" }), false);
});

test("ordre d'appel : rappel échu, nouvelles (risque, montant, ancienneté), injoignables, rappels à venir", () => {
  const m = new Date("2026-11-30T12:00:00Z");
  const e = (id: string, x: Partial<{ statutConfirmation: string; tentatives: number; rappelA: Date | null; scoreRisque: number | null; montant: number; createdAt: Date }>) =>
    ({ id, ...neuf, scoreRisque: null, montant: 10_000, createdAt: new Date("2026-11-30T08:00:00Z"), ...x });
  const liste = [
    e("futur", { statutConfirmation: "rappeler", rappelA: new Date("2026-11-30T18:00:00Z") }),
    e("injoignable", { statutConfirmation: "injoignable", tentatives: 1 }),
    e("nouvelle-petite", { montant: 5_000 }),
    e("nouvelle-grosse", { montant: 40_000 }),
    e("echu", { statutConfirmation: "rappeler", rappelA: new Date("2026-11-30T11:00:00Z") }),
  ];
  assert.deepEqual(trierFile(liste, m).map((x) => x.id), ["echu", "nouvelle-grosse", "nouvelle-petite", "injoignable", "futur"]);
});

test("commande : confirmée seulement depuis « en attente », annulée tant qu'elle n'est pas partie", () => {
  assert.equal(statutCommandePour("confirmee", "en_attente"), "confirmee");
  assert.equal(statutCommandePour("confirmee", "confirmee"), null);
  assert.equal(statutCommandePour("annulee", "en_preparation"), "annulee");
  assert.equal(statutCommandePour("faux_numero", "expediee"), null);
  assert.equal(statutCommandePour("injoignable", "en_attente"), null);
});

test("saisie : un rappel exige une heure, la note est bornée", () => {
  assert.equal(schemaAppel.safeParse({ resultat: "rappeler" }).success, false);
  assert.equal(schemaAppel.safeParse({ resultat: "rappeler", rappelA: "2026-12-01T09:00:00Z" }).success, true);
  assert.equal(schemaAppel.safeParse({ resultat: "confirmee", note: "x".repeat(501) }).success, false);
  assert.equal(schemaAppel.safeParse({ resultat: "inconnu" }).success, false);
});
