// Client pawaPay API v2 : dépôts (page de paiement), versements (payouts), opérateur d'un numéro
// et configuration active du compte. Sans PAWAPAY_API_TOKEN, aucun paiement ; l'URL par défaut
// est le bac à sable (production : PAWAPAY_API_URL=https://api.pawapay.io).

// Pays couverts par pawaPay : code ISO3 et monnaie Mobile Money. Le compte n'en ouvre qu'une partie :
// la configuration active (configuration()) dit lesquels sont réellement disponibles.
const PAYS: Record<string, { iso3: string; devise: string }> = {
  CM: { iso3: "CMR", devise: "XAF" }, CG: { iso3: "COG", devise: "XAF" }, GA: { iso3: "GAB", devise: "XAF" },
  CI: { iso3: "CIV", devise: "XOF" }, SN: { iso3: "SEN", devise: "XOF" }, BJ: { iso3: "BEN", devise: "XOF" }, BF: { iso3: "BFA", devise: "XOF" },
  CD: { iso3: "COD", devise: "CDF" }, GH: { iso3: "GHA", devise: "GHS" }, NG: { iso3: "NGA", devise: "NGN" },
  KE: { iso3: "KEN", devise: "KES" }, RW: { iso3: "RWA", devise: "RWF" }, UG: { iso3: "UGA", devise: "UGX" },
  TZ: { iso3: "TZA", devise: "TZS" }, ZM: { iso3: "ZMB", devise: "ZMW" }, MW: { iso3: "MWI", devise: "MWK" },
  MZ: { iso3: "MOZ", devise: "MZN" }, SL: { iso3: "SLE", devise: "SLE" }, LS: { iso3: "LSO", devise: "LSL" },
  ET: { iso3: "ETH", devise: "ETB" }, ZW: { iso3: "ZWE", devise: "USD" },
};
export const paysPawapay = (code: string | null | undefined) => (code ? PAYS[code.toUpperCase()] ?? null : null);
export const PAYS_PAWAPAY = Object.keys(PAYS);
/** Monnaie Mobile Money d'un pays pawaPay donné en ISO3 (« CMR » → « XAF »). */
export const deviseIso3 = (iso3: string) => Object.values(PAYS).find((p) => p.iso3 === iso3)?.devise ?? null;

export type EtatDepot = { etat: "paye" | "echoue" | "en_cours" | "introuvable" | "inconnu"; montant?: number; devise?: string; motif?: string; reference?: string; lienAutorisation?: string };
export type EtatVersement = { etat: "paye" | "echoue" | "en_cours" | "introuvable" | "inconnu"; motif?: string; reference?: string };

const EN_COURS = ["ACCEPTED", "SUBMITTED", "ENQUEUED", "PROCESSING", "IN_RECONCILIATION"];

/** Réponse de GET /v2/deposits/{id}. Un statut non reconnu ne vaut jamais un paiement. */
export function lireDepot(d: any): EtatDepot {
  if (d?.status === "NOT_FOUND") return { etat: "introuvable" };
  if (d?.status !== "FOUND" || !d.data) return { etat: "inconnu" };
  const x = d.data;
  if (x.status === "COMPLETED") return { etat: "paye", montant: Number(x.amount), devise: x.currency, reference: x.providerTransactionId };
  if (x.status === "FAILED") return { etat: "echoue", motif: String(x.failureReason?.failureCode ?? "Paiement refusé") };
  // Opérateurs à validation dans leur application (Wave) : lien à ouvrir par le client.
  const lien = typeof x.authorizationUrl === "string" && /^https:\/\//.test(x.authorizationUrl) ? x.authorizationUrl : undefined;
  return EN_COURS.includes(x.status) ? { etat: "en_cours", ...(lien ? { lienAutorisation: lien } : {}) } : { etat: "inconnu" };
}

/** Réponse de GET /v2/payouts/{id}. Seul COMPLETED vaut un versement effectué. */
export function lireVersement(d: any): EtatVersement {
  if (d?.status === "NOT_FOUND") return { etat: "introuvable" };
  if (d?.status !== "FOUND" || !d.data) return { etat: "inconnu" };
  const x = d.data;
  if (x.status === "COMPLETED") return { etat: "paye", reference: x.providerTransactionId };
  if (x.status === "FAILED") return { etat: "echoue", motif: String(x.failureReason?.failureCode ?? "Versement refusé") };
  return EN_COURS.includes(x.status) ? { etat: "en_cours" } : { etat: "inconnu" };
}

/** Pays ouverts sur le compte (GET /v2/active-conf) : opérateurs et limites, pour les dépôts ou les versements. */
export type PaysActif = { pays: string; nom: string; devise: string; operateurs: { code: string; nom: string; min?: number; max?: number; ouvert: boolean; validation?: string }[] };
// operationTypes : objet indexé par type (doc v2) ; certains exemples le montrent en tableau (format v1) : les deux sont lus.
function operation(m: any, sens: string) {
  const o = m?.operationTypes;
  const x = Array.isArray(o) ? o.find((e: any) => e?.operationType === sens) : o?.[sens];
  if (!x) return null;
  return {
    min: Number(x.minAmount ?? x.minTransactionLimit) || undefined, max: Number(x.maxAmount ?? x.maxTransactionLimit) || undefined,
    ouvert: (x.status ?? "OPERATIONAL") !== "CLOSED", ...(x.authType ? { validation: String(x.authType) } : {}),
  };
}
/** Nom commercial de l'opérateur (« MTN », « Orange Money »…), déduit de son code : jamais celui du prestataire. */
export function nomOperateur(code: string, affiche?: unknown): string {
  const c = code.toUpperCase();
  if (c.startsWith("MTN")) return "MTN Mobile Money";
  if (c.startsWith("ORANGE")) return "Orange Money";
  if (c.startsWith("AIRTEL")) return "Airtel Money";
  if (c.startsWith("MOOV")) return "Moov Money";
  if (c.startsWith("WAVE")) return "Wave";
  if (c.startsWith("FREE")) return "Free Money";
  if (c.includes("MPESA")) return "M-Pesa";
  if (c.startsWith("VODACOM")) return "Vodacom M-Pesa";
  if (c.startsWith("ZAMTEL")) return "Zamtel Kwacha";
  if (c.startsWith("ECOCASH")) return "EcoCash";
  if (c.startsWith("TIGO")) return "Tigo Pesa";
  const a = typeof affiche === "string" ? affiche : "";
  return a && !/pawa|kerry|quidex/i.test(a) ? a : "Mobile Money";
}

export function lireConfiguration(d: any, sens: "DEPOSIT" | "PAYOUT"): PaysActif[] {
  return (Array.isArray(d?.countries) ? d.countries : []).map((c: any) => {
    const lignes = (Array.isArray(c.providers) ? c.providers : []).flatMap((p: any) => (Array.isArray(p.currencies) ? p.currencies : [])
      .map((m: any) => ({ m, op: operation(m, sens) })).filter((x: any) => x.op)
      .map(({ m, op }: any) => ({ code: String(p.provider), nom: nomOperateur(String(p.provider), p.displayName), devise: String(m.currency), ...op })));
    const nom = typeof c.displayName === "object" ? String(c.displayName?.fr ?? c.displayName?.en ?? c.country) : String(c.displayName ?? c.country);
    return { pays: String(c.country), nom, devise: lignes[0]?.devise ?? "", operateurs: lignes.map(({ devise: _d, ...o }: any) => o) };
  }).filter((c: PaysActif) => c.operateurs.some((o) => o.ouvert));
}

/** Corps d'un rappel pawaPay : l'objet dépôt ou versement lui-même (jamais cru : on relit toujours le statut). */
export function idRappel(b: any): { depot?: string; versement?: string } {
  const uuid = (v: unknown) => (typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v) ? v : undefined);
  const x = b?.data && typeof b.data === "object" ? b.data : b;
  return { depot: uuid(x?.depositId), versement: uuid(x?.payoutId) };
}

/** customerMessage : 4 à 22 caractères, lettres, chiffres et espaces seulement (accents retirés). */
export const messageClient = (texte: string) => {
  const m = texte.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9 ]/g, " ").replace(/\s+/g, " ").trim().slice(0, 22).trim();
  return m.length >= 4 ? m : "AXSO";
};

export function clientPawapay(env: Record<string, string | undefined> = process.env, f: typeof fetch = fetch) {
  if (!env.PAWAPAY_API_TOKEN) return null;
  const base = (env.PAWAPAY_API_URL || "https://api.sandbox.pawapay.io").replace(/\/$/, "");
  const entetes = { Authorization: `Bearer ${env.PAWAPAY_API_TOKEN}`, "Content-Type": "application/json" };
  let conf: { le: number; d: any } | null = null;
  return {
    /** Page de paiement pawaPay : montant fixe, donc pays (ISO3) et devise obligatoires. */
    async creerPage(p: { depositId: string; returnUrl: string; montant: number; devise: string; pays: string; motif: string; telephone?: string; reference?: string }) {
      const corps: Record<string, unknown> = {
        depositId: p.depositId, returnUrl: p.returnUrl, country: p.pays, language: "FR",
        amountDetails: { amount: String(p.montant), currency: p.devise },
        reason: p.motif.slice(0, 50), customerMessage: messageClient(p.motif),
      };
      if (p.telephone) corps.phoneNumber = p.telephone.replace(/\D/g, "");
      if (p.reference) corps.metadata = [{ reference: p.reference }];
      const r = await f(`${base}/v2/paymentpage`, { method: "POST", headers: entetes, signal: AbortSignal.timeout(15_000), body: JSON.stringify(corps) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || typeof d.redirectUrl !== "string") throw new Error(`pawaPay ${r.status}`);
      return d.redirectUrl as string;
    },
    /**
     * Paiement direct (POST /v2/deposits) : le client valide sur son téléphone, le message affiché
     * est celui d'AXSO. `accepte: null` : réponse perdue ou erreur 5xx, le statut doit être relu.
     */
    async deposer(p: { depositId: string; telephone: string; operateur: string; montant: number; devise: string; message: string; retourOk?: string; retourKo?: string; reference?: string }) {
      const corps: Record<string, unknown> = {
        depositId: p.depositId, amount: String(p.montant), currency: p.devise, customerMessage: messageClient(p.message),
        payer: { type: "MMO", accountDetails: { phoneNumber: p.telephone.replace(/\D/g, ""), provider: p.operateur } },
      };
      if (p.retourOk) corps.successfulUrl = p.retourOk;
      if (p.retourKo) corps.failedUrl = p.retourKo;
      if (p.reference) { corps.clientReferenceId = p.reference; corps.metadata = [{ reference: p.reference }]; }
      const r = await f(`${base}/v2/deposits`, { method: "POST", headers: entetes, signal: AbortSignal.timeout(15_000), body: JSON.stringify(corps) }).catch(() => null);
      if (!r || r.status >= 500) return { accepte: null };
      const d = await r.json().catch(() => ({}));
      if (r.ok && (d.status === "ACCEPTED" || d.status === "DUPLICATE_IGNORED")) return { accepte: true as const, application: d.nextStep === "GET_AUTH_URL" || d.nextStep === "REDIRECT_TO_AUTH_URL" };
      return { accepte: false as const, code: String(d.failureReason?.failureCode ?? ""), motif: String(d.failureReason?.failureMessage ?? d.failureReason?.failureCode ?? `Erreur ${r.status}`) };
    },
    async depot(id: string): Promise<EtatDepot> {
      const r = await f(`${base}/v2/deposits/${id}`, { headers: entetes, signal: AbortSignal.timeout(10_000) });
      return r.ok ? lireDepot(await r.json().catch(() => null)) : { etat: "inconnu" };
    },
    /** Opérateur et numéro au bon format d'après le numéro saisi (POST /v2/predict-provider). */
    async operateur(telephone: string): Promise<{ pays: string; operateur: string; telephone: string } | null> {
      const r = await f(`${base}/v2/predict-provider`, { method: "POST", headers: entetes, signal: AbortSignal.timeout(10_000), body: JSON.stringify({ phoneNumber: telephone }) });
      const d = await r.json().catch(() => null);
      return r.ok && d?.provider ? { pays: String(d.country), operateur: String(d.provider), telephone: String(d.phoneNumber) } : null;
    },
    /** Lance un versement. « accepte » : pawaPay l'a pris en charge ; l'issue arrive ensuite (rappel ou versement()). */
    async verser(p: { payoutId: string; telephone: string; operateur: string; montant: number; devise: string; message: string }) {
      const r = await f(`${base}/v2/payouts`, {
        method: "POST", headers: entetes, signal: AbortSignal.timeout(15_000),
        body: JSON.stringify({
          payoutId: p.payoutId, amount: String(p.montant), currency: p.devise,
          recipient: { type: "MMO", accountDetails: { phoneNumber: p.telephone.replace(/\D/g, ""), provider: p.operateur } },
          customerMessage: messageClient(p.message),
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && (d.status === "ACCEPTED" || d.status === "DUPLICATE_IGNORED")) return { accepte: true as const };
      return { accepte: false as const, motif: String(d.failureReason?.failureMessage ?? d.failureReason?.failureCode ?? `pawaPay ${r.status}`) };
    },
    async versement(id: string): Promise<EtatVersement> {
      const r = await f(`${base}/v2/payouts/${id}`, { headers: entetes, signal: AbortSignal.timeout(10_000) });
      return r.ok ? lireVersement(await r.json().catch(() => null)) : { etat: "inconnu" };
    },
    /** Configuration active du compte, gardée 10 minutes. */
    async configuration(sens: "DEPOSIT" | "PAYOUT"): Promise<PaysActif[]> {
      if (!conf || Date.now() - conf.le > 600_000) {
        const r = await f(`${base}/v2/active-conf`, { headers: entetes, signal: AbortSignal.timeout(10_000) });
        conf = { le: Date.now(), d: r.ok ? await r.json().catch(() => null) : null };
      }
      return lireConfiguration(conf.d, sens);
    },
  };
}
export type ClientPawapay = NonNullable<ReturnType<typeof clientPawapay>>;
