// pawaPay : lecture des statuts, page de paiement et versements en API v2.
import { test } from "node:test";
import assert from "node:assert/strict";
import { clientPawapay, lireDepot, paysPawapay } from "@/lib/paiements/pawapay";
import { adaptateurVersement } from "@/lib/logistique/versements";

const reponse = (corps: unknown, status = 200) => new Response(JSON.stringify(corps), { status });

test("dépôt : seul COMPLETED vaut un paiement", () => {
  assert.deepEqual(lireDepot({ status: "FOUND", data: { status: "COMPLETED", amount: "6000.00", currency: "XAF", providerTransactionId: "t1" } }), { etat: "paye", montant: 6000, devise: "XAF", reference: "t1" });
  assert.deepEqual(lireDepot({ status: "FOUND", data: { status: "FAILED", failureReason: { failureCode: "INSUFFICIENT_BALANCE" } } }), { etat: "echoue", motif: "INSUFFICIENT_BALANCE" });
  assert.equal(lireDepot({ status: "FOUND", data: { status: "IN_RECONCILIATION" } }).etat, "en_cours");
  assert.equal(lireDepot({ status: "NOT_FOUND" }).etat, "introuvable");
  assert.equal(lireDepot({ status: "FOUND", data: { status: "NOUVEAU" } }).etat, "inconnu");
  assert.equal(lireDepot(null).etat, "inconnu");
});

test("pays : devise imposée par le pays", () => {
  assert.deepEqual(paysPawapay("cm"), { iso3: "CMR", devise: "XAF" });
  assert.deepEqual(paysPawapay("SN"), { iso3: "SEN", devise: "XOF" });
  assert.deepEqual(paysPawapay("NG"), { iso3: "NGA", devise: "NGN" });
  assert.equal(paysPawapay("FR"), null);
});

test("page de paiement : bac à sable par défaut, montant fixé", async () => {
  assert.equal(clientPawapay({}), null);
  let url = "", corps: any;
  const c = clientPawapay({ PAWAPAY_API_TOKEN: "x" }, (async (u: string, i: RequestInit) => { url = u; corps = JSON.parse(String(i.body)); return reponse({ redirectUrl: "https://paywith.example/1" }); }) as typeof fetch)!;
  assert.equal(await c.creerPage({ depositId: "d", returnUrl: "https://a/r", montant: 6000, devise: "XAF", pays: "CMR", motif: "AXSO Pro", telephone: "+237 690 00 00 00" }), "https://paywith.example/1");
  assert.equal(url, "https://api.sandbox.pawapay.io/v2/paymentpage");
  // Format v2 : montant (chaîne) et devise dans amountDetails, pays ISO3, numéro en chiffres seulement.
  assert.deepEqual([corps.amountDetails, corps.country, corps.phoneNumber, corps.amount], [{ amount: "6000", currency: "XAF" }, "CMR", "237690000000", undefined]);
  assert.match(corps.customerMessage, /^[a-zA-Z0-9 ]{4,22}$/);
});

test("versement v2 : destinataire MMO et statuts", async () => {
  let url = "", corps: any, suite: unknown = { status: "ACCEPTED" };
  const a = adaptateurVersement({ AXSO_VERSEMENTS_AUTO: "1", PAWAPAY_API_TOKEN: "x" }, (async (u: string, i?: RequestInit) => { url = u; if (i?.body) corps = JSON.parse(String(i.body)); return reponse(suite); }) as typeof fetch)!;
  assert.equal((await a.envoyer({ id: "1", montant: 1000, devise: "XAF", correspondant: "MTN_MOMO_CMR", numero: "237690000000" })).etat, "accepte");
  assert.equal(url, "https://api.sandbox.pawapay.io/v2/payouts");
  assert.deepEqual(corps.recipient, { type: "MMO", accountDetails: { phoneNumber: "237690000000", provider: "MTN_MOMO_CMR" } });
  suite = { status: "FOUND", data: { status: "COMPLETED" } };
  assert.equal((await a.statut("1")).etat, "paye");
  suite = { status: "FOUND", data: { status: "ENQUEUED" } };
  assert.equal((await a.statut("1")).etat, "en_cours");
  suite = { status: "NOT_FOUND" };
  assert.deepEqual(await a.statut("1"), { etat: "inconnu", motif: "Versement non reçu" });
});
