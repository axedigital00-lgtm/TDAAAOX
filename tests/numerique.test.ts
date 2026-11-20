// Produits numériques avancés — règles pures : créneaux de réservation (fuseaux, préavis,
// pause, congés, maximum par jour), brief, abonnements, parcours, grilles d'évaluation.
import { test } from "node:test";
import assert from "node:assert/strict";
import { creneauxLibres, creneauValide, decalageFuseau, instantLocal, jourLocal } from "@/lib/numerique/creneaux";
import {
  adhesionActive, echeanceLivrable, etapesOuvertes, finAccesFormation, integrationAutorisee, noteGrille, parcoursTermine,
  peutDemanderRevision, peutModifierSeance, prolongerAdhesion, rappelAbonnementDu, serviceSchema, statutInitialService, validerBrief,
} from "@/lib/numerique/regles";

const J = 86_400_000;
// Lundi 7 décembre 2026, 08:00 UTC = 09:00 à Douala (UTC+1).
const LUNDI = new Date("2026-12-07T08:00:00Z");

test("fuseaux : Douala UTC+1, Dakar UTC+0, conversion date locale ↔ instant", () => {
  assert.equal(decalageFuseau(LUNDI, "Africa/Douala"), 60);
  assert.equal(decalageFuseau(LUNDI, "Africa/Dakar"), 0);
  assert.equal(instantLocal("2026-12-07", 9 * 60, "Africa/Douala").toISOString(), "2026-12-07T08:00:00.000Z");
  assert.deepEqual(jourLocal(new Date("2026-12-06T23:30:00Z"), "Africa/Douala"), { date: "2026-12-07", jour: 1 }, "23h30 UTC dimanche = lundi 00h30 à Douala");
});

const REGLES = {
  disponibilites: [{ jour: 1, debut: "09:00", fin: "12:00" }],
  dureeMin: 60, tamponMin: 0, preavisHeures: 0, horizonJours: 7, fuseau: "Africa/Douala", pasMin: 60,
};

test("créneaux : plage de 3 h, séance d'1 h → 3 créneaux, en heure de Douala", () => {
  const c = creneauxLibres(REGLES, [], new Date("2026-12-07T00:00:00Z"));
  assert.deepEqual(c.map((x) => x.debut.toISOString()), ["2026-12-07T08:00:00.000Z", "2026-12-07T09:00:00.000Z", "2026-12-07T10:00:00.000Z"]);
  assert.equal(c[0].fin.toISOString(), "2026-12-07T09:00:00.000Z");
});

test("créneaux : préavis, séance prise + pause, congés et maximum par jour", () => {
  const avantPreavis = creneauxLibres({ ...REGLES, preavisHeures: 2 }, [], new Date("2026-12-07T07:00:00Z"));
  assert.equal(avantPreavis[0].debut.toISOString(), "2026-12-07T09:00:00.000Z", "le créneau de 09h (dans 1 h) tombe sous le préavis de 2 h");
  const prise = [{ debut: new Date("2026-12-07T09:00:00Z"), fin: new Date("2026-12-07T10:00:00Z") }];
  assert.deepEqual(creneauxLibres(REGLES, prise, new Date("2026-12-07T00:00:00Z")).map((x) => x.debut.getUTCHours()), [8, 10]);
  assert.deepEqual(creneauxLibres({ ...REGLES, tamponMin: 15 }, prise, new Date("2026-12-07T00:00:00Z")).length, 0, "la pause de 15 min bloque les créneaux collés");
  assert.equal(creneauxLibres({ ...REGLES, indisponibilites: [{ du: "2026-12-07", au: "2026-12-07" }] }, [], new Date("2026-12-07T00:00:00Z")).length, 0);
  assert.equal(creneauxLibres({ ...REGLES, maxParJour: 1 }, prise, new Date("2026-12-07T00:00:00Z")).length, 0, "un rendez-vous déjà pris ce jour-là");
  assert.equal(creneauValide(REGLES, prise, new Date("2026-12-07T10:00:00Z"), new Date("2026-12-07T00:00:00Z")), true);
  assert.equal(creneauValide(REGLES, prise, new Date("2026-12-07T09:00:00Z"), new Date("2026-12-07T00:00:00Z")), false);
  assert.equal(creneauValide(REGLES, [], new Date("2026-12-07T09:30:00Z"), new Date("2026-12-07T00:00:00Z")), false, "hors grille");
});

test("service : validation des réglages (disponibilités, délai, adresse)", () => {
  assert.equal(serviceSchema.safeParse({ mode: "rendez_vous", disponibilites: [] }).success, false);
  assert.equal(serviceSchema.safeParse({ mode: "rendez_vous", disponibilites: [{ jour: 1, debut: "12:00", fin: "09:00" }] }).success, false);
  assert.equal(serviceSchema.safeParse({ mode: "livrable" }).success, false, "délai de livraison obligatoire");
  assert.equal(serviceSchema.safeParse({ mode: "livrable", delaiLivraisonJours: 5 }).success, true);
  assert.equal(serviceSchema.safeParse({ mode: "rendez_vous", lieu: "presentiel", disponibilites: [{ jour: 2, debut: "09:00", fin: "17:00" }] }).success, false, "adresse requise en présentiel");
});

test("service : brief, statut initial, échéance, révisions, modification de séance", () => {
  const qs = [{ id: "a", label: "Nom de la marque", type: "texte" as const, requis: true }, { id: "b", label: "Style", type: "choix" as const, requis: false, options: ["Moderne", "Classique"] }];
  assert.equal(validerBrief(qs, {}).ok, false);
  assert.equal(validerBrief(qs, { a: "Kora", b: "Rétro" }).ok, false);
  const ok = validerBrief(qs, { a: "  Kora ", b: "Moderne", inconnu: "x" });
  assert.deepEqual(ok, { ok: true, propres: { a: "Kora", b: "Moderne" } });
  assert.equal(statutInitialService("rendez_vous", 0), "a_planifier");
  assert.equal(statutInitialService("livrable", 2), "brief_attendu");
  assert.equal(echeanceLivrable(LUNDI, 3)!.getTime() - LUNDI.getTime(), 3 * J);
  assert.equal(peutDemanderRevision("livre", 1, 2), true);
  assert.equal(peutDemanderRevision("livre", 2, 2), false);
  assert.equal(peutDemanderRevision("en_cours", 0, 2), false);
  assert.equal(peutModifierSeance(new Date(LUNDI.getTime() + 25 * 3_600_000), 24, LUNDI), true);
  assert.equal(peutModifierSeance(new Date(LUNDI.getTime() + 3 * 3_600_000), 24, LUNDI), false);
});

test("abonnement : prolongation sans perte de jours, essai au premier achat, grâce, rappel unique", () => {
  const fin = new Date(LUNDI.getTime() + 10 * J);
  assert.equal(prolongerAdhesion({ finActuelle: fin, periodeJours: 30, essaiJours: 7, premierAchat: false }, LUNDI).getTime(), fin.getTime() + 30 * J);
  assert.equal(prolongerAdhesion({ finActuelle: null, periodeJours: 30, essaiJours: 7, premierAchat: true }, LUNDI).getTime(), LUNDI.getTime() + 37 * J);
  assert.equal(prolongerAdhesion({ finActuelle: new Date(LUNDI.getTime() - J), periodeJours: 30, essaiJours: 0, premierAchat: false }, LUNDI).getTime(), LUNDI.getTime() + 30 * J, "expirée : repart d'aujourd'hui");
  const echue = { statut: "active", fin: new Date(LUNDI.getTime() - J) };
  assert.equal(adhesionActive(echue, 0, LUNDI), false);
  assert.equal(adhesionActive(echue, 3, LUNDI), true);
  const a = { statut: "active", fin: new Date(LUNDI.getTime() + 2 * J), rappelEnvoyeAt: null };
  assert.equal(rappelAbonnementDu(a, 3, LUNDI), true);
  assert.equal(rappelAbonnementDu({ ...a, rappelEnvoyeAt: LUNDI }, 3, LUNDI), false);
  assert.equal(rappelAbonnementDu({ ...a, fin: new Date(LUNDI.getTime() + 10 * J) }, 3, LUNDI), false, "trop tôt");
});

test("parcours : ordre imposé, étapes facultatives, certificat final", () => {
  const e = [
    { formationProduitId: "f1", ordre: 0, obligatoire: true, certifiee: true },
    { formationProduitId: "f2", ordre: 1, obligatoire: true, certifiee: false },
    { formationProduitId: "f3", ordre: 2, obligatoire: true, certifiee: false },
  ];
  assert.deepEqual([...etapesOuvertes(e, true)], ["f1", "f2"]);
  assert.deepEqual([...etapesOuvertes(e, false)], ["f1", "f2", "f3"]);
  assert.equal(parcoursTermine(e), false);
  assert.equal(parcoursTermine(e.map((x) => ({ ...x, certifiee: x.formationProduitId !== "f3" ? true : x.certifiee, obligatoire: x.formationProduitId !== "f3" }))), true, "f3 facultative");
  assert.equal(parcoursTermine([]), false);
});

test("projet : note par grille plafonnée, complétude, accès à durée, intégrations autorisées", () => {
  const g = [{ id: "a", critere: "Clarté", points: 10 }, { id: "b", critere: "Rigueur", points: 30 }];
  assert.deepEqual(noteGrille(g, [{ critereId: "a", points: 10 }, { critereId: "b", points: 15 }]), { note: 63, complete: true });
  assert.deepEqual(noteGrille(g, [{ critereId: "a", points: 99 }]), { note: 25, complete: false }, "points plafonnés au barème");
  assert.equal(finAccesFormation({ accesDureeJours: null }), null);
  const fs = new Date(LUNDI.getTime() + 5 * J);
  assert.equal(finAccesFormation({ accesDureeJours: 30, finSession: fs }, LUNDI)!.getTime(), fs.getTime(), "borné par la fin de cohorte");
  assert.equal(integrationAutorisee("https://www.canva.com/design/abc/view"), true);
  assert.equal(integrationAutorisee("http://www.canva.com/x"), false);
  assert.equal(integrationAutorisee("https://pirate.example/embed"), false);
});
