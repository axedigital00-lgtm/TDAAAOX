// Releasit COD AXSO — API publique de la vitrine.
// GET  : configuration du formulaire (bouton, couleur, zones de livraison, moyens acceptés).
// POST : crée la commande, payée à la livraison. Réutilise la création de commande existante
//        (prix, remise, frais de livraison et stock recalculés côté serveur, e-mail et notification au
//        marchand, liens WhatsApp) ; ajoute la clé d'idempotence (un double envoi = une seule commande)
//        et la source de la commande (UTM, identifiants de clic). Anti-fraude : champ piège, liste
//        noire et limite par jour refusent ; le score de risque guide seulement l'appel de confirmation.
import { NextRequest, NextResponse, after } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { lireReglagesLivraison } from "@/lib/livraison-reglages";
import { lireReglagesPaiement } from "@/lib/paiement-pays";
import { cleValide, lireReglages, lireSource } from "@/lib/commande-express/reglages";
import { POST as creerCommandeLivraison } from "@/app/api/commandes/whatsapp-creer/route";
import { normaliserTelephone } from "@/lib/devise-convert";
import { empreinteIp, jetonValide } from "@/lib/commande-express/risque";
import { controlerCommande, evaluerCommande } from "@/lib/commande-express/anti-fraude";
import { compterOffres, jetonAjout } from "@/lib/commande-express/offres";
import { lireFormulaire, lireReponses } from "@/lib/commande-express/formulaire";
import { marquerRecuperee } from "@/lib/commande-express/abandons";
import { envoyerAchatCommande } from "@/lib/commande-express/pixels-serveur";

const limite = rateLimit({ windowMs: 60_000, max: 10, keyPrefix: "commande-express" });

async function boutique(slug: string) {
  return prisma.tenant.findUnique({ where: { slug }, select: { id: true, slug: true, statut: true, devise: true, pays: true, parametresLivraison: true, parametresPaiement: true } });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const t = await boutique((await params).slug);
  if (!t || t.statut !== "active") return NextResponse.json({ actif: false }, { status: 404 });
  const r = await lireReglages(t.id);
  if (!r.actif) return NextResponse.json({ actif: false });
  const paiement = lireReglagesPaiement(t.parametresPaiement);
  return NextResponse.json({
    actif: true, boutonCollant: r.boutonCollant, texteBouton: r.texteBouton, couleur: r.couleur, demanderEmail: r.demanderEmail,
    devise: t.devise, pays: t.pays, zones: lireReglagesLivraison(t.parametresLivraison).zones.map((z) => z.nom),
    canal: paiement.livraison ? "direct" : "whatsapp",
  }, { headers: { "Cache-Control": "public, max-age=60" } });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const l = limite.check(getClientIp(req));
  if (!l.success) return rateLimitResponse(l.reset);
  const t = await boutique((await params).slug);
  if (!t || t.statut !== "active") return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });
  const reglages = await lireReglages(t.id);
  if (!reglages.actif) return NextResponse.json({ error: "Releasit COD AXSO n'est pas activée" }, { status: 409 });
  const b = await req.json().catch(() => null);
  if (!b || !cleValide(b.cle)) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  // Champ piège invisible : seul un robot le remplit.
  if (typeof b.site === "string" && b.site.trim()) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  const telephone = normaliserTelephone(String(b.client?.telephone ?? ""), String(b.client?.pays ?? t.pays ?? ""));
  const ipHash = empreinteIp(getClientIp(req));
  // Champs personnalisés de l'éditeur : seuls ceux configurés, obligatoires vérifiés ici.
  const cfg = await prisma.reglagesCommandeExpress.findUnique({ where: { tenantId: t.id }, select: { formulaire: true } });
  const reponses = lireReponses(lireFormulaire(cfg?.formulaire), b.champs);
  if (!reponses.ok) return NextResponse.json({ error: reponses.erreur }, { status: 400 });
  const dureeMs = typeof b.duree === "number" && Number.isFinite(b.duree) && b.duree >= 0 ? Math.min(Math.round(b.duree), 86_400_000) : null;

  // Verrou d'idempotence posé AVANT la création : deux envois simultanés ne passent jamais tous les deux.
  try {
    await prisma.commandeExpress.create({ data: { tenantId: t.id, cleIdempotence: b.cle, produitId: typeof b.produitId === "string" ? b.produitId : null, source: lireSource(b.source) as Prisma.InputJsonValue, telephone, ipHash, dureeRemplissage: dureeMs,
      ...(reponses.champs.length && { champs: reponses.champs as Prisma.InputJsonValue }), variante: b.variante === "B" ? "B" : b.variante === "A" ? "A" : null } });
  } catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
    const deja = await prisma.commandeExpress.findUnique({ where: { cleIdempotence: b.cle }, select: { tenantId: true, reponse: true } });
    if (deja?.tenantId === t.id && deja.reponse) return NextResponse.json({ ...(deja.reponse as object), rejouee: true });
    return NextResponse.json({ error: "Commande en cours d'enregistrement, patientez un instant" }, { status: 409 });
  }

  const refus = await controlerCommande({ tenantId: t.id, telephone, ipHash, limiteParJour: reglages.limiteParJour });
  if (refus) {
    await prisma.commandeExpress.delete({ where: { cleIdempotence: b.cle } }).catch(() => {});
    return NextResponse.json({ error: refus.message, code: refus.code }, { status: 403 });
  }

  // Création par le parcours existant (même requête que le formulaire de la vitrine).
  const corps = {
    tenantId: t.id, slug: t.slug, canal: b.canal === "whatsapp" ? "whatsapp" : "direct",
    client: { nom: String(b.client?.nom ?? "").slice(0, 120), telephone: String(b.client?.telephone ?? "").slice(0, 30), email: b.client?.email ? String(b.client.email).slice(0, 160) : undefined, ville: String(b.client?.ville ?? "").slice(0, 120), pays: String(b.client?.pays ?? t.pays ?? ""), adresse: [b.quartier, b.repere].filter(Boolean).join(" — ").slice(0, 300) },
    items: Array.isArray(b.items) ? b.items.slice(0, 20) : [],
    zone: typeof b.zone === "string" ? b.zone : undefined,
    codePromo: typeof b.codePromo === "string" ? b.codePromo : undefined,
    codeAffiliation: typeof b.codeAffiliation === "string" ? b.codeAffiliation : undefined,
    localisation: typeof b.position?.lat === "number" && typeof b.position?.lng === "number" ? { lat: b.position.lat, lng: b.position.lng, adresseExacte: [b.quartier, b.repere].filter(Boolean).join(" — ") } : undefined,
  };
  const interne = new NextRequest(new URL("/api/commandes/whatsapp-creer", req.url), {
    method: "POST", body: JSON.stringify(corps),
    headers: { "Content-Type": "application/json", "x-forwarded-for": getClientIp(req), cookie: req.headers.get("cookie") ?? "" },
  });
  const res = await creerCommandeLivraison(interne);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.commandeId) {
    await prisma.commandeExpress.delete({ where: { cleIdempotence: b.cle } }).catch(() => {});
    return NextResponse.json({ error: data.error ?? "Commande impossible pour le moment" }, { status: res.status >= 400 ? res.status : 500 });
  }
  const fiche = await prisma.commandeExpress.findUnique({ where: { cleIdempotence: b.cle }, select: { id: true } });
  const risque = fiche ? await evaluerCommande({
    tenantId: t.id, ficheId: fiche.id, telephone, ipHash, nom: corps.client.nom, dureeMs, jetonValide: jetonValide(b.jeton, t.id),
    quantite: corps.items.reduce((n: number, i: { quantite?: unknown }) => n + (Number(i?.quantite) || 0), 0),
  }).catch(() => null) : null;
  // Offres acceptées dans le formulaire (case à cocher, offre à la fermeture) : pour le taux d'acceptation.
  await compterOffres(t.id, b.offres, "acceptations").catch(() => {});
  const reponse = { jetonAjout: jetonAjout(data.commandeId), numero: data.numero, commandeId: data.commandeId, whatsappUrl: data.whatsappUrl, trackingUrl: data.trackingUrl, factureUrl: data.factureUrl, montantTotal: data.montantTotal, montantLivraison: data.montantLivraison };
  await prisma.commandeExpress.update({
    where: { cleIdempotence: b.cle },
    data: {
      commandeId: data.commandeId, reponse: reponse as Prisma.InputJsonValue,
      quartier: typeof b.quartier === "string" ? b.quartier.slice(0, 120) : null, repere: typeof b.repere === "string" ? b.repere.slice(0, 200) : null,
      latitude: corps.localisation?.lat ?? null, longitude: corps.localisation?.lng ?? null,
      ...(risque && { scoreRisque: risque.score, facteursRisque: risque.facteurs as unknown as Prisma.InputJsonValue }),
    },
  });
  await marquerRecuperee(t.id, b.cle, data.commandeId).catch(() => {});
  // Conversion serveur (Meta, TikTok) après la réponse : l'acheteur n'attend pas.
  if (fiche) after(() => envoyerAchatCommande(t.id, fiche.id, "creation", { ip: getClientIp(req), userAgent: req.headers.get("user-agent") }).catch(() => null));
  return NextResponse.json(reponse);
}
