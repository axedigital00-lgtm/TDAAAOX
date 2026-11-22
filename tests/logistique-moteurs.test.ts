// Moteurs du réseau logistique : vérification, score, classement, tarifs, dispatch, course, crédits, suivi.
import { test } from "node:test";
import assert from "node:assert/strict";
import { documentsBientotExpires, statutDossier, transitionPermise } from "@/lib/logistique/verification";
import { calculerScore, compteePourFournisseur, niveauDuScore, tauxLisse } from "@/lib/logistique/score";
import { classer, motifsInegibilite, phraseRecommandation } from "@/lib/logistique/classement";
import { calculerDevis, devisEncoreValable } from "@/lib/logistique/tarifs";
import { decider, exclusionsApresRefus, POLITIQUE_DEFAUT } from "@/lib/logistique/dispatch";
import { courseAnnulable, preuveSuffisante, statutCommandeDe, transitionCourse } from "@/lib/logistique/course";
import { annulerConsommation, consommer, liberer, reserver, soldes, type Ecriture } from "@/lib/logistique/credits";
import { detecterAnomalies, distanceM, estimerArrivee, ETAT_INITIAL, evaluerGeozone, fraicheur } from "@/lib/logistique/suivi";
import { arretsDeTournee, tensionZones } from "@/lib/logistique/jumeau";
import type { Candidat, IndicateursScore, ResultatCourse } from "@/lib/logistique/types";

const T = Date.parse("2026-12-01T10:00:00Z"), J = 86_400_000, D = new Date(T);
const series = (n: number, r: Partial<ResultatCourse> = {}): ResultatCourse[] => Array.from({ length: n }, (_, i) => ({ date: T - i * J / 4, issue: "livree", responsable: "fournisseur", aTemps: true, note: 5, ...r }));
const score = (x: Partial<IndicateursScore> = {}): IndicateursScore => ({ legal: 100, operationnel: 80, fiabilite: 90, satisfaction: 90, global: 85, niveau: "premium", confiance: "moyenne", probation: false, volume: 60, tauxReussite: .97, tauxATemps: .9, badges: [], ...x });
const cand = (id: string, x: Partial<Candidat> = {}): Candidat => ({ id, type: "societe", nom: `Société ${id}`, statutLegal: "verifie", documentsObligatoiresValides: true, suspendu: false, couvreZone: true, disponible: true, capaciteRestante: 5, chargeActive: 1, vehicules: ["moto"], score: score(), prix: 2000, etaMinutes: 40, distanceKm: 5, ...x });

test("vérification : jamais vérifié sans pièce valide", () => {
  assert.equal(transitionPermise("en_attente", "verifie"), false);
  assert.equal(transitionPermise("en_revue", "verifie"), true);
  const ob = ["rccm", "niu"], ok = { type: "rccm", statut: "verifie" as const }, ok2 = { type: "niu", statut: "verifie" as const };
  assert.equal(statutDossier(ob, [ok], D), "en_attente");
  assert.equal(statutDossier(ob, [ok, ok2], D), "verifie");
  assert.equal(statutDossier(ob, [ok, { ...ok2, expireLe: new Date(T - 1) }], D), "expire");
  assert.equal(statutDossier(ob, [ok, ok2, { type: "x", statut: "suspendu" }], D), "suspendu");
  assert.equal(documentsBientotExpires([{ ...ok, expireLe: new Date(T + 5 * J) }, ok2], D).length, 1);
});

test("score : un petit échantillon n'a ni niveau ni badge de performance", () => {
  const s = calculerScore({ resultats: series(3), maintenant: T, legal: { verifie: true } });
  assert.equal(s.probation, true); assert.equal(s.niveau, null); assert.equal(s.confiance, "insuffisante");
  assert.ok(!s.badges.includes("haute_performance")); assert.ok(s.badges.includes("legal"));
  assert.ok(tauxLisse(1, 1, .8, 10) < 1, "une seule réussite ne vaut pas 100 %");
});

test("score : annulation marchand non imputée, légal ne compense pas l'échec", () => {
  assert.equal(compteePourFournisseur({ date: T, issue: "annulee", responsable: "marchand" }), false);
  assert.equal(compteePourFournisseur({ date: T, issue: "echec", responsable: "inconnu" }), false);
  const base = calculerScore({ resultats: series(40), maintenant: T, legal: { verifie: true } });
  const plus = calculerScore({ resultats: [...series(40), ...series(20, { issue: "annulee", responsable: "marchand" })], maintenant: T, legal: { verifie: true } });
  assert.equal(plus.global, base.global);
  const mauvais = calculerScore({ resultats: [...series(10), ...series(60, { issue: "echec", aTemps: false, note: 1, incident: true })], maintenant: T, legal: { verifie: true, assurance: true, identite: true } });
  assert.ok(mauvais.global <= 64); assert.equal(mauvais.niveau, "standard");
  assert.equal(niveauDuScore(90), "elite"); assert.equal(niveauDuScore(64), "standard");
});

test("classement : éligibilité stricte, pas seulement le prix, explication réelle", () => {
  assert.ok(motifsInegibilite(cand("a", { documentsObligatoiresValides: false })).length);
  assert.ok(motifsInegibilite(cand("a", { vehicules: ["velo"] }), { vehiculeRequis: "camion" }).length);
  const r = classer([cand("cher", { prix: 2500 }), cand("douteux", { prix: 1000, score: score({ fiabilite: 35 }), statutLegal: "en_attente" }), cand("exclu", { suspendu: true })]);
  assert.equal(r.classes[0].candidat.id, "cher");
  assert.equal(r.categories.meilleur_prix, "douteux");
  assert.equal(r.ecartes[0].id, "exclu");
  assert.match(phraseRecommandation(r.classes[0]), /documents légaux vérifiés.*97 %/);
});

test("tarifs : détail, distance jamais inventée, expiration et recalcul", () => {
  const regle = { modele: "hybride" as const, devise: "XAF", base: 1000, parKm: 100, kmInclus: 2, parKg: 50, kgInclus: 5, enlevement: 200, expressPct: 50 };
  assert.deepEqual(calculerDevis(regle, { poidsKg: 1 }, { maintenant: D }), { eligible: false, motif: "Distance indisponible" });
  const d = { distanceKm: 7, poidsKg: 9, express: true };
  const q = calculerDevis(regle, d, { maintenant: D, tauxCommission: .1, creditDisponible: 500 });
  assert.ok(q.eligible);
  if (!q.eligible) return;
  assert.equal(q.prixFournisseur, 2850); assert.equal(q.commission, 285); assert.equal(q.versementFournisseur, 2565); assert.equal(q.prixMarchand, 2350);
  assert.equal(devisEncoreValable(q, d, D), true);
  assert.equal(devisEncoreValable(q, { ...d, poidsKg: 10 }, D), false);
  assert.equal(devisEncoreValable(q, d, new Date(T + 16 * 60_000)), false);
  assert.deepEqual(calculerDevis({ modele: "zone", devise: "XAF", base: 0, zones: { Akwa: 1500 } }, { zone: "Bali" }, { maintenant: D }), { eligible: false, motif: "Zone non tarifée" });
});

test("dispatch : modes, approbation, repli et escalade", () => {
  const c = [cand("a"), cand("b", { prix: 2200 })];
  assert.equal(decider({ candidats: c }).action, "proposer");
  const semi = { ...POLITIQUE_DEFAUT, mode: "semi_automatique" as const };
  assert.equal(decider({ candidats: c, politique: semi }).action, "assigner");
  assert.equal(decider({ candidats: c, politique: semi, valeurCommande: 500_000 }).action, "approbation");
  assert.equal(decider({ candidats: c, politique: { ...semi, pause: true } }).action, "proposer");
  assert.equal(decider({ candidats: [cand("n", { score: score({ probation: true }) })], politique: { ...semi, mode: "autonome" } }).action, "approbation");
  assert.equal(decider({ candidats: c, politique: semi, tentatives: 3 }).action, "escalader");
  assert.equal(decider({ candidats: [cand("x", { disponible: false })], politique: semi }).fournisseurId, null);
  const liv = cand("l", { type: "livreur", societeParenteId: "a" });
  const ex = exclusionsApresRefus(["a"], [cand("a"), liv]);
  assert.ok(ex.includes("l"));
  assert.equal(decider({ candidats: [cand("a"), liv], besoin: { exclus: ex }, politique: semi }).action, "escalader");
});

test("course : transitions et preuve", () => {
  assert.equal(transitionCourse("en_transit", "livree"), true);
  assert.equal(transitionCourse("attente_fournisseur", "livree"), false);
  assert.equal(courseAnnulable("en_transit"), false);
  assert.equal(preuveSuffisante(["otp"], { geozoneConfirmee: true }), false, "le géorepérage ne prouve rien seul");
  assert.equal(preuveSuffisante([], { otpValide: true }), true);
  assert.equal(preuveSuffisante(["otp", "photo"], { otpValide: true }), false);
  assert.equal(statutCommandeDe("en_transit"), "expediee");
});

test("crédits : ni double consommation, ni solde négatif", () => {
  const e: Ecriture[] = [{ type: "attribution", montant: 1000, reference: "plan" }];
  const pousse = (r: ReturnType<typeof reserver>) => { assert.ok(r.ok); if (r.ok && r.ecriture) e.push(r.ecriture); };
  pousse(reserver(e, "c1", 700));
  assert.equal(soldes(e).disponible, 300);
  const r2 = reserver(e, "c1", 700); assert.ok(r2.ok && r2.ecriture === null, "idempotent");
  assert.equal(reserver(e, "c2", 301).ok, false);
  pousse(consommer(e, "c1"));
  assert.ok((() => { const r = consommer(e, "c1"); return r.ok && r.ecriture === null; })());
  assert.equal(liberer(e, "c1").ok, false);
  assert.deepEqual([soldes(e).consomme, soldes(e).reserve, soldes(e).disponible], [700, 0, 300]);
  pousse(annulerConsommation(e, "c1"));
  assert.equal(soldes(e).disponible, 1000);
  pousse(reserver(e, "c3", 200)); pousse(liberer(e, "c3"));
  assert.equal(soldes(e).disponible, 1000);
  assert.equal(consommer(e, "c3").ok, false);
});

test("suivi : fraîcheur, ETA honnête, géorepérage et anomalies", () => {
  assert.equal(fraicheur(T - 10_000, T), "direct"); assert.equal(fraicheur(T - 10 * 60_000, T), "perime"); assert.equal(fraicheur(null, T), "inconnu");
  assert.equal(estimerArrivee({ maintenant: T, signal: "direct" }), null, "aucune donnée = aucune ETA");
  assert.equal(estimerArrivee({ maintenant: T, dureeRoutageS: 600, signal: "perime" }), null);
  const eta = estimerArrivee({ maintenant: T, dureeRoutageS: 1200, distanceRestanteM: 5000, signal: "direct" })!;
  assert.ok(eta.fin > eta.debut); assert.equal(eta.debut % 300_000, 0); assert.equal(eta.source, "routage");
  const z = { centre: { lat: 4, lng: 9 }, rayonM: 100, hysteresisM: 30, presenceMs: 30_000, precisionMaxM: 50 };
  let g = evaluerGeozone(z, ETAT_INITIAL, { lat: 4, lng: 9, t: T, precisionM: 10 });
  assert.equal(g.evenement, null);
  g = evaluerGeozone(z, g.etat, { lat: 4, lng: 9, t: T + 31_000 }); assert.equal(g.evenement, "arrivee");
  g = evaluerGeozone(z, g.etat, { lat: 4, lng: 9, t: T + 60_000 }); assert.equal(g.evenement, null, "un seul événement");
  assert.equal(evaluerGeozone(z, ETAT_INITIAL, { lat: 4, lng: 9, t: T, precisionM: 200 }).etat.dedans, false);
  assert.ok(Math.abs(distanceM({ lat: 4.05, lng: 9.7 }, { lat: 3.87, lng: 11.52 }) - 202_000) < 8_000);
  const a = detecterAnomalies({ maintenant: T, points: [{ lat: 4, lng: 9, t: T - 20 * 60_000 }, { lat: 5, lng: 10, t: T - 19.5 * 60_000 }], finPrevue: T - 70 * 60_000 });
  assert.deepEqual(a.map((x) => x.type), ["saut_impossible", "signal_perdu", "retard"]);
  assert.equal(a[2].severite, "CRITICAL");
});

test("tournée : un colis à bord n'a qu'une livraison et occupe une place", () => {
  const base = { express: false, finPrevue: null, latDepart: 4.05, lngDepart: 9.7, latArrivee: 4.06, lngArrivee: 9.71 };
  const r = arretsDeTournee([{ ...base, id: "a", statut: "acceptee" }, { ...base, id: "b", statut: "en_transit" }, { ...base, id: "c", statut: "acceptee", latArrivee: null }]);
  assert.deepEqual(r.arrets.map((x) => x.id), ["a:enlevement", "a:livraison", "b:livraison"]);
  assert.equal(r.embarques, 1);
  assert.deepEqual(r.sansCoordonnees, ["c"]);
});

test("jumeau : la tension d'une zone vient des courses et de la capacité réelles", () => {
  const z = tensionZones([{ ville: "Douala" }, { ville: "Douala" }, { ville: "Kribi" }, { ville: null }], [{ capaciteMax: 2, villes: ["Douala", "Douala"] }, { capaciteMax: 5, villes: ["Yaoundé"] }]);
  assert.equal(z.find((x) => x.ville === "Douala")?.niveau, "sature");
  assert.equal(z.find((x) => x.ville === "Kribi")?.niveau, "sans_capacite");
  assert.equal(z.find((x) => x.ville === "Yaoundé")?.niveau, "calme");
});
