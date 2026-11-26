// Conversions envoyées depuis le serveur (Meta Conversions API, TikTok Events API) pour Releasit COD
// AXSO : plus fiables que le navigateur (bloqueurs, iOS), dédupliquées avec le pixel navigateur par le même
// identifiant d'événement (le n° de commande). Données personnelles hachées en SHA-256, jetons chiffrés.
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { chiffrer, dechiffrer } from "@/lib/chiffrement";
import { listePixels } from "@/lib/pixels";
import { normaliserTelephone } from "@/lib/devise-convert";

export type ReglagesPixels = { metaToken?: string; tiktokToken?: string; metaTestCode?: string; modePurchase?: "creation" | "confirmation" };

const sha = (s: string) => createHash("sha256").update(s.trim().toLowerCase()).digest("hex");

/** Réglages lus, jetons déchiffrés (jamais renvoyés au navigateur). */
export function lirePixels(brut: unknown): ReglagesPixels {
  const r = (brut ?? {}) as ReglagesPixels;
  return { ...r, metaToken: r.metaToken ? dechiffrer(r.metaToken) ?? undefined : undefined, tiktokToken: r.tiktokToken ? dechiffrer(r.tiktokToken) ?? undefined : undefined, modePurchase: r.modePurchase === "confirmation" ? "confirmation" : "creation" };
}

/** Enregistrement : un jeton vide garde l'ancien, « - » l'efface. */
export function ecrirePixels(avant: unknown, maj: { metaToken?: string; tiktokToken?: string; metaTestCode?: string; modePurchase?: string }): Prisma.InputJsonValue {
  const a = (avant ?? {}) as ReglagesPixels;
  const jeton = (nouveau: string | undefined, ancien: string | undefined) => nouveau === "-" ? undefined : nouveau?.trim() ? chiffrer(nouveau.trim()) : ancien;
  return JSON.parse(JSON.stringify({
    metaToken: jeton(maj.metaToken, a.metaToken), tiktokToken: jeton(maj.tiktokToken, a.tiktokToken),
    metaTestCode: maj.metaTestCode === undefined ? a.metaTestCode : maj.metaTestCode.trim() || undefined,
    modePurchase: maj.modePurchase === "confirmation" ? "confirmation" : maj.modePurchase === "creation" ? "creation" : a.modePurchase ?? "creation",
  }));
}

type Evenement = {
  numero: string; montant: number; devise: string; telephone: string; pays?: string | null; nom: string; ville?: string | null;
  url?: string; ip?: string | null; userAgent?: string | null; fbclid?: string; ttclid?: string; produitIds: string[]; quand?: Date;
};

/** Corps Meta Conversions API (testé à part, sans réseau). */
export function corpsMeta(e: Evenement, testCode?: string) {
  const tel = normaliserTelephone(e.telephone, e.pays)?.replace(/\D/g, "");
  const [prenom, ...reste] = e.nom.trim().split(/\s+/);
  const quand = Math.floor((e.quand ?? new Date()).getTime() / 1000);
  return {
    data: [{
      event_name: "Purchase", event_time: quand, event_id: e.numero, action_source: "website", ...(e.url && { event_source_url: e.url }),
      user_data: {
        ...(tel && { ph: [sha(tel)] }), ...(prenom && { fn: [sha(prenom)] }), ...(reste.length && { ln: [sha(reste.join(" "))] }),
        ...(e.ville && { ct: [sha(e.ville.replace(/\s+/g, ""))] }), ...(e.pays && { country: [sha(e.pays.slice(0, 2))] }),
        ...(e.fbclid && { fbc: `fb.1.${quand * 1000}.${e.fbclid}` }), ...(e.ip && { client_ip_address: e.ip }), ...(e.userAgent && { client_user_agent: e.userAgent }),
      },
      custom_data: { value: e.montant, currency: e.devise, content_ids: e.produitIds, content_type: "product" },
    }],
    ...(testCode && { test_event_code: testCode }),
  };
}

/** Corps TikTok Events API 1.3. */
export function corpsTiktok(pixel: string, e: Evenement) {
  const tel = normaliserTelephone(e.telephone, e.pays);
  return {
    event_source: "web", event_source_id: pixel,
    data: [{
      event: "CompletePayment", event_time: Math.floor((e.quand ?? new Date()).getTime() / 1000), event_id: e.numero,
      user: { ...(tel && { phone: sha(tel) }), ...(e.ttclid && { ttclid: e.ttclid }), ...(e.ip && { ip: e.ip }), ...(e.userAgent && { user_agent: e.userAgent }) },
      properties: { value: e.montant, currency: e.devise, content_type: "product", contents: e.produitIds.map((id) => ({ content_id: id })) },
      ...(e.url && { page: { url: e.url } }),
    }],
  };
}

async function poster(url: string, corps: unknown, entetes: Record<string, string> = {}) {
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...entetes }, body: JSON.stringify(corps), signal: AbortSignal.timeout(10_000) });
    const texte = (await r.text()).slice(0, 300);
    // TikTok répond 200 avec un code d'erreur dans le corps.
    const ok = r.ok && !/"code":\s*[1-9]/.test(texte);
    return { ok, detail: ok ? undefined : texte };
  } catch (err) { return { ok: false, detail: (err as Error).message.slice(0, 200) }; }
}

/** Envoie l'achat aux plateformes configurées ; renvoie le résultat par plateforme (rien si non configuré). */
export async function envoyerAchat(tenantId: string, e: Evenement) {
  const [tenant, reglages] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { metaPixelId: true, tiktokPixelId: true } }),
    prisma.reglagesCommandeExpress.findUnique({ where: { tenantId }, select: { pixelsServeur: true } }),
  ]);
  const p = lirePixels(reglages?.pixelsServeur);
  const resultats: Record<string, { ok: boolean; detail?: string; at: string }> = {};
  const at = new Date().toISOString();
  if (p.metaToken) for (const pixel of listePixels(tenant?.metaPixelId).slice(0, 3)) {
    resultats[`meta:${pixel}`] = { ...(await poster(`https://graph.facebook.com/v21.0/${encodeURIComponent(pixel)}/events?access_token=${encodeURIComponent(p.metaToken)}`, corpsMeta(e, p.metaTestCode))), at };
  }
  if (p.tiktokToken) for (const pixel of listePixels(tenant?.tiktokPixelId).slice(0, 3)) {
    resultats[`tiktok:${pixel}`] = { ...(await poster("https://business-api.tiktok.com/open_api/v1.3/event/track/", corpsTiktok(pixel, e), { "Access-Token": p.tiktokToken })), at };
  }
  return resultats;
}

/** Achat d'une commande Releasit, à la création ou à la confirmation selon le réglage du marchand. */
export async function envoyerAchatCommande(tenantId: string, ficheId: string, moment: "creation" | "confirmation", contexte: { ip?: string | null; userAgent?: string | null } = {}) {
  const r = await prisma.reglagesCommandeExpress.findUnique({ where: { tenantId }, select: { pixelsServeur: true } });
  const p = lirePixels(r?.pixelsServeur);
  if ((!p.metaToken && !p.tiktokToken) || p.modePurchase !== moment) return null;
  const fiche = await prisma.commandeExpress.findFirst({ where: { id: ficheId, tenantId }, select: { id: true, commandeId: true, source: true, pixels: true } });
  if (!fiche?.commandeId || (fiche.pixels as { envoye?: boolean } | null)?.envoye) return null;
  const c = await prisma.commande.findFirst({ where: { id: fiche.commandeId, tenantId }, select: { numero: true, montantTotal: true, devise: true, clientTelephone: true, clientNom: true, ville: true, pays: true, createdAt: true, lignes: { select: { produitId: true } } } });
  if (!c) return null;
  const s = (fiche.source ?? {}) as Record<string, string>;
  const resultats = await envoyerAchat(tenantId, {
    numero: c.numero, montant: c.montantTotal, devise: c.devise, telephone: c.clientTelephone, pays: c.pays, nom: c.clientNom, ville: c.ville,
    url: s.page, fbclid: s.fbclid, ttclid: s.ttclid, produitIds: c.lignes.map((l) => l.produitId), ip: contexte.ip, userAgent: contexte.userAgent,
  });
  await prisma.commandeExpress.update({ where: { id: fiche.id }, data: { pixels: { envoye: true, moment, resultats } as Prisma.InputJsonValue } });
  return resultats;
}
