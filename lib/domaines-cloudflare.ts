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
