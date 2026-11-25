// pawaPay v2 : versements, rappels, configuration du compte, conversion des dépôts et frais de retrait.
import { test } from "node:test";
import assert from "node:assert/strict";
import { clientPawapay, deviseIso3, idRappel, lireConfiguration, lireVersement, messageClient, paysPawapay } from "@/lib/paiements/pawapay";
import { fraisRetrait, tauxFraisRetrait } from "@/lib/paiements/versements-marchands";
import { convertir } from "@/lib/paiements/commande-numerique";

const reponse = (corps: unknown, status = 200) => new Response(JSON.stringify(corps), { status });

test("plusieurs pays africains, chacun dans sa monnaie", () => {
  assert.deepEqual(paysPawapay("GH"), { iso3: "GHA", devise: "GHS" });
  assert.deepEqual(paysPawapay("cd"), { iso3: "COD", devise: "CDF" });
  assert.equal(deviseIso3("KEN"), "KES");
  assert.equal(deviseIso3("CMR"), "XAF");
  assert.equal(deviseIso3("FRA"), null);
});

test("versement : seul COMPLETED est un versement effectué", () => {
  assert.deepEqual(lireVersement({ status: "FOUND", data: { status: "COMPLETED", providerTransactionId: "T1" } }), { etat: "paye", reference: "T1" });
  assert.equal(lireVersement({ status: "FOUND", data: { status: "FAILED", failureReason: { failureCode: "RECIPIENT_NOT_FOUND" } } }).etat, "echoue");
  assert.equal(lireVersement({ status: "FOUND", data: { status: "ENQUEUED" } }).etat, "en_cours");
  assert.equal(lireVersement({ status: "NOT_FOUND" }).etat, "introuvable");
  assert.equal(lireVersement({ status: "FOUND", data: { status: "BIZARRE" } }).etat, "inconnu");
});

test("rappel : identifiant de dépôt ou de versement, jamais autre chose", () => {
  const id = "5fcea42c-3f2b-4a8e-9f1c-2b7d4e6a8c10";
  assert.deepEqual(idRappel({ depositId: id, status: "COMPLETED" }), { depot: id, versement: undefined });
  assert.deepEqual(idRappel({ payoutId: id }), { depot: undefined, versement: id });
  assert.deepEqual(idRappel({ data: { depositId: id } }), { depot: id, versement: undefined });
  assert.deepEqual(idRappel({ depositId: "pas-un-uuid" }), { depot: undefined, versement: undefined });
  assert.deepEqual(idRappel(null), { depot: undefined, versement: undefined });
});

test("message client : 4 à 22 caractères, lettres, chiffres et espaces", () => {
  assert.equal(messageClient("Boutique Éclat — Formation"), "Boutique Eclat Formati");
  assert.match(messageClient("Café & Co!"), /^[a-zA-Z0-9 ]{4,22}$/);
  assert.equal(messageClient("à"), "AXSO");
});

test("configuration active : objet indexé par opération (v2) ou tableau (v1), pays fermés exclus", () => {
  const conf = { countries: [
    { country: "CMR", displayName: { fr: "Cameroun", en: "Cameroon" }, providers: [
      { provider: "MTN_MOMO_CMR", displayName: "MTN", currencies: [{ currency: "XAF", operationTypes: { DEPOSIT: { minAmount: "100", maxAmount: "1000000", status: "OPERATIONAL" }, PAYOUT: { minAmount: "500", maxAmount: "500000" } } }] },
      { provider: "ORANGE_CMR", displayName: "Orange", currencies: [{ currency: "XAF", operationTypes: [{ operationType: "DEPOSIT", minTransactionLimit: "100", maxTransactionLimit: "500000" }] }] },
    ] },
    { country: "GHA", displayName: { en: "Ghana" }, providers: [{ provider: "MTN_MOMO_GHA", displayName: "MTN", currencies: [{ currency: "GHS", operationTypes: { DEPOSIT: { minAmount: "1", maxAmount: "5000", status: "CLOSED" } } }] }] },
  ] };
  const depots = lireConfiguration(conf, "DEPOSIT");
  assert.deepEqual(depots.map((p) => [p.pays, p.nom, p.devise, p.operateurs.length]), [["CMR", "Cameroun", "XAF", 2]]);
  assert.deepEqual(depots[0].operateurs[0], { code: "MTN_MOMO_CMR", nom: "MTN Mobile Money", min: 100, max: 1000000, ouvert: true });
  assert.deepEqual(lireConfiguration(conf, "PAYOUT").map((p) => p.operateurs.map((o) => o.code)), [["MTN_MOMO_CMR"]]);
});

test("versement : destinataire MMO, montant en chaîne, message conforme ; refus lu", async () => {
  let corps: any, url = "";
  let suite: unknown = { payoutId: "p", status: "ACCEPTED" };
  const c = clientPawapay({ PAWAPAY_API_TOKEN: "x", PAWAPAY_API_URL: "https://api.pawapay.io" }, (async (u: string, i?: RequestInit) => { url = u; corps = i?.body ? JSON.parse(String(i.body)) : null; return reponse(suite); }) as typeof fetch)!;
  assert.deepEqual(await c.verser({ payoutId: "p", telephone: "+237 690 00 00 00", operateur: "MTN_MOMO_CMR", montant: 9500, devise: "XAF", message: "AXSO retrait" }), { accepte: true });
  assert.equal(url, "https://api.pawapay.io/v2/payouts");
  assert.deepEqual([corps.amount, corps.currency, corps.recipient], ["9500", "XAF", { type: "MMO", accountDetails: { phoneNumber: "237690000000", provider: "MTN_MOMO_CMR" } }]);
  assert.match(corps.customerMessage, /^[a-zA-Z0-9 ]{4,22}$/);
  suite = { status: "REJECTED", failureReason: { failureCode: "PAWAPAY_WALLET_OUT_OF_FUNDS", failureMessage: "Solde pawaPay insuffisant" } };
  assert.deepEqual(await c.verser({ payoutId: "p", telephone: "237690000000", operateur: "MTN_MOMO_CMR", montant: 1, devise: "XAF", message: "x" }), { accepte: false, motif: "Solde pawaPay insuffisant" });
  suite = { status: "DUPLICATE_IGNORED" };
  assert.deepEqual(await c.verser({ payoutId: "p", telephone: "237690000000", operateur: "MTN_MOMO_CMR", montant: 1, devise: "XAF", message: "x" }), { accepte: true });
});

test("opérateur d'un numéro (predict-provider)", async () => {
  const c = clientPawapay({ PAWAPAY_API_TOKEN: "x" }, (async () => reponse({ country: "CMR", provider: "ORANGE_CMR", phoneNumber: "237699000000" })) as unknown as typeof fetch)!;
  assert.deepEqual(await c.operateur("+237 699 00 00 00"), { pays: "CMR", operateur: "ORANGE_CMR", telephone: "237699000000" });
  const ko = clientPawapay({ PAWAPAY_API_TOKEN: "x" }, (async () => reponse({ failureReason: { failureCode: "INVALID_PHONE_NUMBER" } }, 400)) as unknown as typeof fetch)!;
  assert.equal(await ko.operateur("123"), null);
});

test("frais de retrait payés par le marchand : déduits de la somme envoyée, arrondis au-dessus", () => {
  assert.deepEqual(fraisRetrait(10000, 0.015), { frais: 150, envoye: 9850 });
  assert.deepEqual(fraisRetrait(999, 0.015), { frais: 15, envoye: 984 });
  assert.deepEqual(fraisRetrait(5000, 0), { frais: 0, envoye: 5000 });
  assert.equal(tauxFraisRetrait({ AXSO_FRAIS_RETRAIT_POURCENT: "1.5" }), 0.015);
  assert.equal(tauxFraisRetrait({ AXSO_FRAIS_RETRAIT_POURCENT: "abc" }), 0);
  assert.equal(tauxFraisRetrait({ AXSO_FRAIS_RETRAIT_POURCENT: "50" }), 0); // jamais un taux absurde
});

test("dépôt dans la monnaie du pays du client", () => {
  assert.equal(convertir(10000, "XAF", "XAF", {}), 10000);
  assert.equal(convertir(10000, "XAF", "XOF", {}), 10000); // FCFA : parité
  assert.equal(convertir(10000, "XAF", "GHS", { GHS: 0.0245 }), 245);
  assert.throws(() => convertir(10000, "XAF", "ZZZ", {}));
});

test("paiement direct : payeur MMO, montant en chaîne, message AXSO ; refus et réponse perdue", async () => {
  let corps: any, url = "", suite: unknown = { depositId: "d", status: "ACCEPTED", nextStep: "FINAL_STATUS" }, code = 200;
  const c = clientPawapay({ PAWAPAY_API_TOKEN: "x" }, (async (u: string, i?: RequestInit) => { url = u; corps = i?.body ? JSON.parse(String(i.body)) : null; return reponse(suite, code); }) as typeof fetch)!;
  assert.deepEqual(await c.deposer({ depositId: "d", telephone: "+237 690 00 00 00", operateur: "MTN_MOMO_CMR", montant: 5000, devise: "XAF", message: "AXSO Boutique Éclat" }), { accepte: true, application: false });
  assert.equal(url, "https://api.sandbox.pawapay.io/v2/deposits");
  assert.deepEqual([corps.amount, corps.currency, corps.payer], ["5000", "XAF", { type: "MMO", accountDetails: { phoneNumber: "237690000000", provider: "MTN_MOMO_CMR" } }]);
  assert.equal(corps.customerMessage, "AXSO Boutique Eclat");
  suite = { depositId: "d", status: "ACCEPTED", nextStep: "GET_AUTH_URL" };
  assert.deepEqual(await c.deposer({ depositId: "d", telephone: "221770000000", operateur: "WAVE_SEN", montant: 5000, devise: "XOF", message: "AXSO", retourOk: "https://a/ok" }), { accepte: true, application: true });
  assert.equal(corps.successfulUrl, "https://a/ok");
  suite = { status: "REJECTED", failureReason: { failureCode: "INVALID_PHONE_NUMBER", failureMessage: "x" } };
  assert.deepEqual(await c.deposer({ depositId: "d", telephone: "1", operateur: "X", montant: 1, devise: "XAF", message: "AXSO" }), { accepte: false, code: "INVALID_PHONE_NUMBER", motif: "x" });
  code = 500; suite = { failureReason: { failureCode: "UNKNOWN_ERROR" } };
  assert.deepEqual(await c.deposer({ depositId: "d", telephone: "1", operateur: "X", montant: 1, devise: "XAF", message: "AXSO" }), { accepte: null });
});

test("dépôt en attente : lien de validation dans l'application (Wave), seulement en https", async () => {
  const { lireDepot } = await import("@/lib/paiements/pawapay");
  assert.deepEqual(lireDepot({ status: "FOUND", data: { status: "PROCESSING", authorizationUrl: "https://pay.wave.com/x" } }), { etat: "en_cours", lienAutorisation: "https://pay.wave.com/x" });
  assert.deepEqual(lireDepot({ status: "FOUND", data: { status: "PROCESSING", authorizationUrl: "javascript:alert(1)" } }), { etat: "en_cours" });
});

test("préparation : opérateur fermé ou à code préalable refusé, avec un message clair", async () => {
  const { preparerDepot } = await import("@/lib/paiements/depot-direct");
  const conf = { countries: [{ country: "BFA", providers: [{ provider: "ORANGE_BFA", currencies: [{ currency: "XOF", operationTypes: { DEPOSIT: { minAmount: "100", maxAmount: "500000", authType: "PREAUTH" } } }] }] }] };
  const c = clientPawapay({ PAWAPAY_API_TOKEN: "x" }, (async (u: string) => reponse(u.endsWith("/predict-provider") ? { country: "BFA", provider: "ORANGE_BFA", phoneNumber: "22670000000" } : conf)) as unknown as typeof fetch)!;
  await assert.rejects(preparerDepot(c, "22670000000"), /code préalable/);
  await assert.rejects(preparerDepot(c, "12"), /numéro Mobile Money/);
});
