import { createHmac } from "node:crypto";
import type { EtatDomaine } from "./domaines";

export const surWorkers = () => process.env.AXSO_RUNTIME === "workers";
export const domainesCloudflareConfigures = () => Boolean(process.env.CF_SAAS_ZONE_ID && process.env.CF_SAAS_READ_TOKEN && process.env.CF_SAAS_TARGET && process.env.AUTH_SECRET);

// Un jeton en lecture seule permet de contrôler le TLS sans créer de hostname facturable.
export async function etatDomaineCloudflare(domaine: string, tenantId: string): Promise<EtatDomaine> {
  const preuve = createHmac("sha256", process.env.AUTH_SECRET!).update(JSON.stringify(["domaine", tenantId, domaine])).digest("hex");
  const nom = `_axso.${domaine}`;
  const dns = new URL("https://cloudflare-dns.com/dns-query");
  dns.search = new URLSearchParams({ name: nom, type: "TXT" }).toString();
  const api = new URL(`https://api.cloudflare.com/client/v4/zones/${process.env.CF_SAAS_ZONE_ID}/custom_hostnames`);
  api.searchParams.set("hostname", domaine);
  const [records, hosts] = await Promise.all([
    fetch(dns, { headers: { accept: "application/dns-json" }, cache: "no-store", signal: AbortSignal.timeout(10000) }),
    fetch(api, { headers: { Authorization: `Bearer ${process.env.CF_SAAS_READ_TOKEN}` }, cache: "no-store", signal: AbortSignal.timeout(10000) }),
  ]);
  if (!records.ok || !hosts.ok) throw new Error("Vérification Cloudflare temporairement indisponible");
  const rr = await records.json() as { Status: number; Answer?: { type: number; data: string }[] };
  const hostnames = await hosts.json() as { success: boolean; result?: { hostname: string; status: string; ssl?: { status: string } }[] };
  if (![0, 3].includes(rr.Status) || !hostnames.success) throw new Error("Vérification de domaine indisponible");
  const verifie = rr.Answer?.some(r => r.type === 16 && r.data === `"${preuve}"`) ?? false;
  const dnsOk = hostnames.result?.some(h => h.hostname === domaine && h.status === "active" && h.ssl?.status === "active") ?? false;
  return { domaine, actif: verifie && dnsOk, verifie, dnsOk, enregistrements: [
    { type: "CNAME", nom: domaine, valeur: process.env.CF_SAAS_TARGET!, raison: "Dirige le trafic vers AXSO" },
    { type: "TXT", nom, valeur: preuve, raison: "Associe le domaine à votre boutique" },
  ], ...(!dnsOk && { message: "Le domaine doit être enregistré et son certificat activé dans Cloudflare for SaaS." }) };
}

// ── Enregistrement automatique (facultatif) ─────────────────────────────────
// Avec un jeton « Custom Hostnames : Edit » (CF_SAAS_EDIT_TOKEN), AXSO enregistre et retire lui-même
// le domaine dans Cloudflare for SaaS ; sans lui, l'opérateur le fait à la main (jeton lecture seule).
export const enregistrementAutomatique = () => Boolean(process.env.CF_SAAS_ZONE_ID && process.env.CF_SAAS_EDIT_TOKEN);

async function cfSaas(chemin: string, init: RequestInit = {}) {
  const r = await fetch(`https://api.cloudflare.com/client/v4/zones/${process.env.CF_SAAS_ZONE_ID}/custom_hostnames${chemin}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.CF_SAAS_EDIT_TOKEN}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    cache: "no-store", signal: AbortSignal.timeout(15000),
  });
  const corps = await r.json().catch(() => ({})) as { success?: boolean; errors?: { code: number; message: string }[]; result?: unknown };
  return { ok: r.ok && corps.success !== false, corps };
}

async function idHostname(domaine: string): Promise<string | null> {
  const r = await cfSaas(`?hostname=${encodeURIComponent(domaine)}`);
  const liste = (r.corps.result as { id: string; hostname: string }[] | undefined) ?? [];
  return liste.find((h) => h.hostname === domaine)?.id ?? null;
}

/** Enregistre le domaine (certificat DV validé par HTTP). Déjà présent : succès. */
export async function ajouterHostnameCloudflare(domaine: string): Promise<{ ok: boolean; erreur?: string }> {
  if (!enregistrementAutomatique()) return { ok: true };
  if (await idHostname(domaine)) return { ok: true };
  const r = await cfSaas("", { method: "POST", body: JSON.stringify({ hostname: domaine, ssl: { method: "http", type: "dv" } }) });
  if (r.ok) return { ok: true };
  const deja = r.corps.errors?.some((e) => e.code === 1406 || /already exists/i.test(e.message));
  return deja ? { ok: true } : { ok: false, erreur: r.corps.errors?.[0]?.message ?? "Cloudflare a refusé le domaine" };
}

/** Retire le domaine de Cloudflare for SaaS (libère la place du quota). Silencieux si absent. */
export async function retirerHostnameCloudflare(domaine: string) {
  if (!enregistrementAutomatique()) return;
  const id = await idHostname(domaine).catch(() => null);
  if (id) await cfSaas(`/${id}`, { method: "DELETE" }).catch(() => {});
}
