// Créer une commande physique (paiement à la livraison) + lien WhatsApp + tokens tracking/facture.
// Le dropshipping et le digital se paient en ligne (indisponible pour l'instant) : refusés ici.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatMontant } from "@/lib/utils";
import { emailReel } from "@/lib/email";
import { fraisLivraisonServeur, poidsPanier, verifierZone } from "@/lib/livraison";
import { villeCommande } from "@/lib/livraison-reglages";
import { codePays } from "@/lib/devise-convert";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { reductionPromo } from "@/lib/pricing";
import { RuptureStock } from "@/lib/stock";
import { enregistrerCommandeCod, lignesCod, notifierCommandeCod } from "@/lib/commande-cod";
import { COOKIE_XP, noterConversion } from "@/lib/builder/experiences";
import { lireReglagesPaiement, moyensPhysique } from "@/lib/paiement-pays";
import { etatCarte, limiteCarteCadeau, normaliserCode, LONGUEUR_CODE } from "@/lib/cartes-cadeaux";
import { cookieAttribution, decoderAttribution } from "@/lib/attribution";

// Formulaire public : limite par IP.
const limiteCommande = rateLimit({ windowMs: 60_000, max: 10, keyPrefix: "commande-vitrine" });

export async function POST(req: NextRequest) {
  try {
    const rl = limiteCommande.check(getClientIp(req));
    if (!rl.success) return rateLimitResponse(rl.reset);
    // Prix, total, remise et devise NE viennent JAMAIS du navigateur : recalculés depuis la base.
    const { tenantId, slug, client, items: itemsClient, codePromo: codeSaisi, carteCadeau: carteSaisie, localisation, canal, champPersonnalise, zone, codeAffiliation } = await req.json();
    const viaWhatsapp = canal !== "direct";

    if (!tenantId || !Array.isArray(itemsClient) || !itemsClient.length || itemsClient.length > 50 || !client?.nom || !client?.telephone) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }
    // Ville (ou zone choisie dans la liste) obligatoire : elle dit où livrer et fixe les frais.
    if (!String(zone ?? "").trim() && !String(client.ville ?? "").trim()) {
      return NextResponse.json({ error: "Indiquez votre ville de livraison" }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant || tenant.statut !== "active") {
      return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });
    }

    // Moyen choisi : accepté par la boutique et possible pour le pays du client (le navigateur ne fait que proposer).
    const moyens = moyensPhysique(lireReglagesPaiement(tenant.parametresPaiement), {
      paysClient: codePays(client?.pays), paysBoutique: tenant.pays,
    });
    if (!(viaWhatsapp ? moyens.whatsapp : moyens.livraison)) {
      return NextResponse.json({ error: "Le paiement à la livraison n'est pas proposé pour votre pays" }, { status: 409 });
    }

    const lus = await lignesCod(tenantId, itemsClient);
    if (!lus.ok) return NextResponse.json({ error: lus.error }, { status: 400 });
    const items = lus.items;
    const sousTotal = items.reduce((s, i) => s + i.prix * i.quantite, 0);
    const devise = tenant.devise;

    // Code promo revérifié ici (le panier ne fait qu'afficher une estimation).
    const promo = codeSaisi ? await prisma.codePromo.findFirst({ where: { tenantId, code: String(codeSaisi).toUpperCase(), actif: true } }) : null;
    const reduction = reductionPromo(promo, sousTotal, items);
    const promoValide = promo && reduction > 0;
    const total = sousTotal - reduction;
    const codePromo = promoValide ? promo.code : null;

    let clientRecord = await prisma.client.findFirst({ where: { tenantId, telephone: client.telephone } });
    if (!clientRecord) {
      clientRecord = await prisma.client.create({
        data: {
          tenantId, nom: client.nom,
          email: client.email?.trim() || null, // facultatif : le client se retrouve par son téléphone
          telephone: client.telephone, ville: client.ville || null, pays: client.pays || null,
        },
      });
    }

    // Frais de livraison calculés côté serveur — jamais confiance en un
    // montant envoyé par le client (seuls le pays et le quartier choisis
    // servent à trouver la ReglePort applicable — voir lib/livraison.ts).
    const erreurZone = await verifierZone(tenantId, codePays(client?.pays), zone);
    if (erreurZone) return NextResponse.json({ error: erreurZone }, { status: 400 });
    const poids = await poidsPanier(tenantId, items);
    const montantLivraison = await fraisLivraisonServeur({ tenantId, pays: codePays(client?.pays), zone, poids, montantCommande: total });
    // Carte-cadeau revérifiée ici (essais limités comme la vérification de la vitrine) ; débitée dans la transaction.
    let carte: { id: string; solde: number } | null = null;
    if (carteSaisie) {
      const essai = limiteCarteCadeau.check(`${getClientIp(req)}:${tenantId}`);
      if (!essai.success) return rateLimitResponse(essai.reset);
      const code = normaliserCode(carteSaisie);
      const trouvee = code.length === LONGUEUR_CODE
        ? await prisma.carteCadeau.findUnique({ where: { tenantId_code: { tenantId, code } }, select: { id: true, solde: true, expireLe: true, desactiveeLe: true } })
        : null;
      if (!trouvee || etatCarte(trouvee) !== "active") return NextResponse.json({ error: "Carte-cadeau invalide, épuisée ou expirée" }, { status: 400 });
      carte = { id: trouvee.id, solde: trouvee.solde };
    }

    // Création + sortie du stock dans la même transaction (lib/commande-cod.ts, partagé avec les commandes provisoires).
    const { commande, factureUrl, trackingUrl, trackingToken, mapsLien, montantTotal: montantTotalAvecLivraison, montantCarteCadeau } = await enregistrerCommandeCod({
      tenant,
      clientId: clientRecord.id,
      client: {
        nom: client.nom, telephone: client.telephone, pays: client.pays || null,
        email: client.email?.trim() || (emailReel(clientRecord.email) ? clientRecord.email : null),
      },
      items, sousTotal, reduction,
      promo: promoValide ? promo : null,
      montantLivraison,
      methodePaiement: viaWhatsapp ? "whatsapp_cod" : "direct_cod",
      adresseLivraison: localisation?.adresseExacte || client.adresse || "À préciser",
      ville: villeCommande(zone, client.ville) || "—",
      codeAffiliation,
      localisation,
      adresseExacte: localisation?.adresseExacte || client.adresse || null,
      carteCadeau: carte,
      attribution: decoderAttribution(req.cookies.get(cookieAttribution(tenant.slug))?.value),
    });

    const adresseLivraison = [localisation?.adresseExacte || client.adresse, client.ville, client.pays].filter(Boolean).join(", ");

    const lignesTexte = items.map((i) =>
      `• ${i.nom}${i.variante ? ` (${i.variante})` : ""} × ${i.quantite} — ${formatMontant(i.prix * i.quantite, devise)}`
    ).join("\n");

    // Message WhatsApp marchand (nouvelle commande)
    const messageMarchand = [
      `🛍️ *Nouvelle commande — ${tenant.nomBoutique}*`,
      `📋 N° *${commande.numero}*`,
      ``,
      `👤 *Client :* ${client.nom}`,
      `📞 *Tél :* ${client.telephone}`,
      adresseLivraison ? `📍 *Adresse :* ${adresseLivraison}` : null,
      mapsLien ? `🗺️ *Google Maps :* ${mapsLien}` : null,
      champPersonnalise?.valeur ? `📝 *${champPersonnalise.label} :* ${champPersonnalise.valeur}` : null,
      ``,
      `🛒 *Articles :*`,
      lignesTexte,
      ``,
      montantLivraison > 0 ? `🚚 *Livraison${zone ? ` (${zone})` : ""} :* ${formatMontant(montantLivraison, devise)}` : null,
      `💰 *Total à percevoir :* ${formatMontant(montantTotalAvecLivraison, devise)}`,
      codePromo ? `🏷️ Code promo : ${codePromo} (−${formatMontant(reduction, devise)})` : null,
      montantCarteCadeau > 0 ? `🎁 Carte-cadeau : −${formatMontant(montantCarteCadeau, devise)} (déjà réglé)` : null,
      ``,
      `📄 Facture : ${factureUrl}`,
      `🚚 Tracking : ${trackingUrl}`,
    ].filter(Boolean).join("\n");

    const numero = (tenant.whatsappNumero || (tenant as any).whatsapp || "").replace(/\D/g, "");
    const whatsappUrl = numero ? `https://wa.me/${numero}?text=${encodeURIComponent(messageMarchand)}` : null;

    // Test A/B en cours : commande attribuée à la variante vue par ce visiteur (lib/builder/experiences.ts).
    await noterConversion(tenantId, req.cookies.get(COOKIE_XP)?.value);
    // Notification dashboard — toujours créée, quel que soit le canal choisi par l'acheteur ; e-mails marchand et client.
    // E-mail client : celui saisi à cette commande uniquement (celui d'une fiche ancienne peut être une adresse générée).
    await notifierCommandeCod({
      tenant, commande, items, montantTotal: montantTotalAvecLivraison,
      client: { nom: client.nom, email: client.email || null },
      type: viaWhatsapp ? "commande_whatsapp" : "nouvelle_commande",
      complement: champPersonnalise?.valeur ? ` · ${champPersonnalise.label}: ${champPersonnalise.valeur}` : "",
    });

    // Message WhatsApp client (confirmation automatique)
    const telClient = client.telephone.replace(/\D/g, "");
    const messageClient = [
      `✅ *Commande confirmée — ${tenant.nomBoutique}*`,
      ``,
      `Bonjour ${client.nom} ! 🙏`,
      `Votre commande *#${commande.numero}* a bien été reçue.`,
      ``,
      `📋 *${items.length} article(s)* — Total : *${formatMontant(montantTotalAvecLivraison, devise)}*`,
      montantLivraison > 0 ? `🚚 dont livraison : ${formatMontant(montantLivraison, devise)}` : null,
      montantCarteCadeau > 0 ? `🎁 Carte-cadeau déduite : ${formatMontant(montantCarteCadeau, devise)}` : null,
      `💳 Paiement à la livraison`,
      ``,
      `📄 *Votre facture :*`,
      factureUrl,
      ``,
      `🚚 *Suivre votre livraison :*`,
      trackingUrl,
      ``,
      `Nous vous contacterons pour la livraison. Merci ! 🎉`,
    ].filter(Boolean).join("\n");

    const whatsappClientUrl = telClient ? `https://wa.me/${telClient}?text=${encodeURIComponent(messageClient)}` : null;

    return NextResponse.json({
      commandeId: commande.id,
      numero: commande.numero,
      viaWhatsapp,
      whatsappUrl,
      whatsappClientUrl,
      trackingToken,
      factureUrl,
      trackingUrl,
      montantLivraison,
      montantCarteCadeau,
      montantTotal: montantTotalAvecLivraison,
    });

  } catch (err) {
    if (err instanceof RuptureStock) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[whatsapp-creer]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
