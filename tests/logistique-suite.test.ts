// Suite logistique : routage, contrat, versements, autonomie, prédiction et pilotage.
import { test } from "node:test";
import assert from "node:assert/strict";
import { genererContrat, identiteAxso, lireCompte } from "@/lib/logistique/contrat";
import { dansDeploiement } from "@/lib/logistique/dispatch";
import { documentsManquants, etapesTransporteur } from "@/lib/logistique/parcours";
import { prevoirDemande } from "@/lib/logistique/intelligence";
import { construireGraphe, economieParVille } from "@/lib/logistique/pilotage";
import { lireReponseOsrm } from "@/lib/logistique/routage";
import { adaptateurVersement } from "@/lib/logistique/versements";

const AXSO = { raisonSociale: "AXSO Essai", siege: "Douala", registre: "RC/1", droit: "droit d'essai" };
const partie = { type: "societe", nom: "Rapide", telephone: "+237690000000", pays: "CM" };

test("routage : réponse OSRM lue, erreur ignorée", () => {
  assert.deepEqual(lireReponseOsrm({ code: "Ok", routes: [{ distance: 1234.4, duration: 300.6, geometry: { coordinates: [[9.7, 4.05]] } }] }), { distanceM: 1234, dureeS: 301, trace: [[4.05, 9.7]] });
  assert.equal(lireReponseOsrm({ code: "NoRoute" }), null);
});

test("contrat : identité AXSO complète obligatoire, texte reproductible", () => {
  assert.equal(identiteAxso({ AXSO_RAISON_SOCIALE: "A" }), null);
  const a = genererContrat(partie, AXSO, .1), b = genererContrat(partie, AXSO, .1), c = genererContrat(partie, AXSO, .12);
  assert.equal(a.empreinte, b.empreinte);
  assert.notEqual(a.empreinte, c.empreinte);
  assert.ok(a.texte.includes("commission de 10 %"));
});

test("compte de versement : opérateur et indicatif", () => {
  assert.deepEqual(lireCompte("MTN 690 00 00 00", "CM"), { correspondant: "MTN_MOMO_CMR", numero: "237690000000" });
  assert.deepEqual(lireCompte("orange +237 655000000", "CM"), { correspondant: "ORANGE_CMR", numero: "237655000000" });
  assert.equal(lireCompte("690000000", "CM"), null);
  assert.equal(lireCompte("MOOV 690000000", "CM"), null);
});

test("versements : aucun envoi sans jeton et activation explicite", async () => {
  assert.equal(adaptateurVersement({ PAWAPAY_API_TOKEN: "x" }), null);
  assert.equal(adaptateurVersement({ AXSO_VERSEMENTS_AUTO: "1" }), null);
  let url = "";
  const a = adaptateurVersement({ AXSO_VERSEMENTS_AUTO: "1", PAWAPAY_API_TOKEN: "x" }, (async (u: string) => { url = u; return new Response(JSON.stringify({ status: "REJECTED", rejectionReason: { rejectionCode: "INVALID" } })); }) as typeof fetch)!;
  assert.deepEqual(await a.envoyer({ id: "1", montant: 1000, devise: "XAF", correspondant: "MTN_MOMO_CMR", numero: "237690000000" }), { etat: "echec", motif: "INVALID" });
  assert.ok(url.includes("sandbox"));
});

test("autonomie : le groupe de déploiement est stable", () => {
  assert.equal(dansDeploiement("boutique", 100), true);
  assert.equal(dansDeploiement("boutique", 0), false);
  assert.equal(dansDeploiement("boutique", 40), dansDeploiement("boutique", 40));
});

test("prédiction : historique court signalé en faible confiance", () => {
  assert.equal(prevoirDemande([1, 2, 3]).disponible, false);
  const p = prevoirDemande(Array.from({ length: 10 }, () => 4));
  assert.ok(p.disponible && p.confiance === "faible" && p.horizon[0].attendu === 4 && p.horizon[0].bas < 4 && p.horizon[0].haut > 4);
});

test("pilotage : graphe, dépendance et ville déficitaire", () => {
  const courses = [...Array(5).fill({ tenantId: "t", fournisseurId: "f", statut: "livree" }), { tenantId: "t", fournisseurId: "f", statut: "echec" }, { tenantId: "t", fournisseurId: null, statut: "livree" }];
  const g = construireGraphe(courses, { marchands: new Map([["t", "Boutique"]]), fournisseurs: new Map([["f", "Rapide"]]) });
  assert.equal(g.liens[0].reussite, 83);
  assert.equal(g.dependances[0].part, 100);
  const e = economieParVille([{ ville: "Douala", statut: "livree", prixFournisseur: 2000, commission: 200, creditApplique: 500 }]);
  assert.equal(e[0].contribution, -300);
  assert.equal(e[0].deficitaire, true);
});

test("parcours transporteur : prochaine étape et document rejeté à renvoyer", () => {
  const base = { type: "livreur", statutLegal: "en_attente", disponible: false };
  assert.equal(etapesTransporteur({ ...base, documents: [] }).prochaine, "documents");
  assert.deepEqual(documentsManquants({ type: "livreur", documents: [{ type: "piece_identite", statut: "rejete" }] }), ["piece_identite"]);
  assert.equal(etapesTransporteur({ ...base, documents: [{ type: "piece_identite", statut: "en_revue" }] }).prochaine, "validation");
  assert.equal(etapesTransporteur({ ...base, statutLegal: "verifie", documents: [{ type: "piece_identite", statut: "verifie" }] }).prochaine, "disponible");
  assert.equal(etapesTransporteur({ ...base, statutLegal: "verifie", disponible: true, documents: [{ type: "piece_identite", statut: "verifie" }] }).prochaine, null);
});
