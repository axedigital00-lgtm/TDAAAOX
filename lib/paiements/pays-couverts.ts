// Pays où l'on peut payer par Mobile Money sur AXSO, lus en direct sur la configuration du compte
// du prestataire (gardée 10 minutes), avec les moyens de paiement ouverts. Aucune marque de
// prestataire : seuls les noms des opérateurs (MTN Mobile Money, Orange Money…).
import { clientPawapay, PAYS_PAWAPAY, paysPawapay, type ClientPawapay } from "./pawapay";

export type PaysCouvert = { code: string; devise: string; operateurs: string[]; versements: boolean };

export async function paysCouverts(client: ClientPawapay | null = clientPawapay()): Promise<PaysCouvert[]> {
  if (!client) return [];
  const [depots, versements] = await Promise.all([client.configuration("DEPOSIT").catch(() => []), client.configuration("PAYOUT").catch(() => [])]);
  if (!depots.length) return [];
  return PAYS_PAWAPAY.flatMap((code) => {
    const iso3 = paysPawapay(code)!.iso3;
    const conf = depots.find((d) => d.pays === iso3);
    if (!conf) return [];
    return [{
      code, devise: paysPawapay(code)!.devise,
      operateurs: [...new Set(conf.operateurs.filter((o) => o.ouvert).map((o) => o.nom))],
      versements: versements.some((v) => v.pays === iso3 && v.operateurs.some((o) => o.ouvert)),
    }];
  }).filter((p) => p.operateurs.length);
}
