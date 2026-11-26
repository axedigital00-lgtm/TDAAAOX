// Outils Stella de Releasit COD AXSO — tous préfixés `releasit_`. Lecture : file d'appel, chiffres,
// diagnostic, suggestions d'offres. Écriture : créer une offre de quantité (passe par la confirmation du
// marchand, ./confirmation.ts). Droits : module « commandes » (./droits.ts).
import type { AgentTool, ToolExecutor } from "@/lib/agent-runner";
import { prisma } from "@/lib/prisma";
import { formatMontant } from "@/lib/utils";
import { lireVenteGros } from "@/lib/commerce/gros";
import { lireReglagesLivraison } from "@/lib/livraison-reglages";
import { aTraiter, trierFile } from "@/lib/commande-express/confirmation";
import { appliquerPaliers, schemaOffre } from "@/lib/commande-express/offres";
import { lireRelances } from "@/lib/commande-express/abandons";
import { lirePixels } from "@/lib/commande-express/pixels-serveur";
import { suggererOffres } from "@/lib/commande-express/suggestions";
import { listePixels } from "@/lib/pixels";

const outil = (name: string, description: string, properties: Record<string, any> = {}, required: string[] = []): AgentTool => ({
  name, description, parameters: { type: "object", properties, required },
});
const ok = (resultat: string) => ({ succes: true, resultat });
const ko = (resultat: string) => ({ succes: false, resultat });

export const AXIA_RELEASIT_TOOLS: AgentTool[] = [
  outil("releasit_a_confirmer", "Liste les commandes Releasit COD AXSO à appeler, dans l'ordre d'appel (rappels échus, risque, montant), avec leur score de risque."),
  outil("releasit_statistiques", "Chiffres Releasit COD AXSO sur une période : commandes, taux de confirmation et de livraison, CA commandé et encaissé, panier moyen.", { jours: { type: "number", enum: [7, 30, 90] } }),
  outil("releasit_diagnostic", "Vérifie la configuration Releasit COD AXSO (activation, zones de livraison, offres, relances, conversions serveur) et propose les corrections."),
  outil("releasit_suggestions", "Offres recommandées à partir des ventes réelles de la boutique (quantité, achetés ensemble, après achat, fermeture)."),
  outil("releasit_creer_offre_quantite", "Crée une offre de quantité (paliers « 2 pour… ») sur un produit physique : le prix dégressif s'applique tout seul à la commande.", {
    produit_id: { type: "string" }, titre: { type: "string" },
    paliers: { type: "array", items: { type: "object", properties: { quantite: { type: "number" }, prix: { type: "number", description: "Prix à l'unité pour ce palier" }, badge: { type: "string" } }, required: ["quantite", "prix"] } },
  }, ["produit_id", "paliers"]),
];

export const executerOutilReleasit: ToolExecutor = async (nom, args, tenantId) => {
  try {
    switch (nom) {
      case "releasit_a_confirmer": {
        const fiches = await prisma.commandeExpress.findMany({ where: { tenantId, commandeId: { not: null }, statutConfirmation: { in: ["a_confirmer", "rappeler", "injoignable"] } }, take: 100, orderBy: { createdAt: "desc" } });
        const cmds = await prisma.commande.findMany({ where: { tenantId, id: { in: fiches.map((f) => f.commandeId!) } }, select: { id: true, numero: true, clientNom: true, clientTelephone: true, montantTotal: true, devise: true, ville: true } });
        const par = new Map(cmds.map((c) => [c.id, c]));
        const file = trierFile(fiches.filter(aTraiter).flatMap((f) => { const c = par.get(f.commandeId!); return c ? [{ ...f, montant: c.montantTotal, c }] : []; })).slice(0, 10);
        if (!file.length) return ok("Aucun client à appeler : toutes les commandes Releasit sont traitées.");
        return ok(file.map((f, i) => `${i + 1}. #${f.c.numero} · ${f.c.clientNom} (${f.c.clientTelephone}) · ${f.c.ville} · ${formatMontant(f.c.montantTotal, f.c.devise)} · ${f.statutConfirmation}${f.scoreRisque !== null ? ` · risque ${f.scoreRisque}/100` : ""}`).join("\n") + "\n\nLe centre de confirmation : /dashboard/commande-express/confirmation");
      }
      case "releasit_statistiques": {
        const jours = [7, 30, 90].includes(Number(args.jours)) ? Number(args.jours) : 30;
        const fiches = await prisma.commandeExpress.findMany({ where: { tenantId, commandeId: { not: null }, createdAt: { gte: new Date(Date.now() - jours * 86_400_000) } }, select: { commandeId: true, statutConfirmation: true } });
        const cmds = await prisma.commande.findMany({ where: { tenantId, id: { in: fiches.map((f) => f.commandeId!) } }, select: { statut: true, montantTotal: true, devise: true } });
        if (!cmds.length) return ok(`Aucune commande Releasit sur ${jours} jours.`);
        const devise = cmds[0].devise, valides = cmds.filter((c) => c.statut !== "annulee"), livrees = cmds.filter((c) => c.statut === "livree");
        const tranchees = fiches.filter((f) => ["confirmee", "annulee", "faux_numero"].includes(f.statutConfirmation));
        const conf = fiches.filter((f) => f.statutConfirmation === "confirmee").length;
        const ca = valides.reduce((n, c) => n + c.montantTotal, 0);
        return ok([`Releasit COD AXSO, ${jours} derniers jours :`, `- ${cmds.length} commandes, ${conf} confirmées${tranchees.length ? ` (taux de confirmation ${Math.round((conf / tranchees.length) * 100)} %)` : ""}, ${livrees.length} livrées`,
          `- CA commandé : ${formatMontant(ca, devise)} · encaissé : ${formatMontant(livrees.reduce((n, c) => n + c.montantTotal, 0), devise)}`, `- Panier moyen : ${formatMontant(valides.length ? ca / valides.length : 0, devise)}`].join("\n"));
      }
      case "releasit_diagnostic": {
        const [r, t, offres] = await Promise.all([
          prisma.reglagesCommandeExpress.findUnique({ where: { tenantId } }),
          prisma.tenant.findUnique({ where: { id: tenantId }, select: { parametresLivraison: true, metaPixelId: true, tiktokPixelId: true } }),
          prisma.offreReleasit.groupBy({ by: ["type"], where: { tenantId, actif: true }, _count: { _all: true } }),
        ]);
        const points: string[] = [];
        points.push(r?.actif ? "✅ Releasit COD AXSO est activé sur les fiches produits." : "❌ Releasit COD AXSO est désactivé : activez-le dans Applications → Releasit COD AXSO.");
        points.push(lireReglagesLivraison(t?.parametresLivraison).zones.length ? "✅ Zones de livraison réglées : le client choisit sa ville dans une liste." : "⚠️ Aucune zone de livraison : le client tape sa ville à la main et les frais ne s'ajoutent pas. Réglez Paramètres → Livraison.");
        points.push(offres.length ? `✅ Offres actives : ${offres.map((o) => `${o._count._all} ${o.type}`).join(", ")}.` : "⚠️ Aucune offre : créez au moins une offre de quantité (releasit_suggestions).");
        points.push(lireRelances(r?.relances).actif ? "✅ Relances WhatsApp des formulaires abandonnés actives." : "⚠️ Relances des abandons désactivées : activez-les dans l'onglet Abandons.");
        const p = lirePixels(r?.pixelsServeur);
        const pixels = listePixels(t?.metaPixelId).length + listePixels(t?.tiktokPixelId).length;
        points.push(!pixels ? "⚠️ Aucun pixel Meta ou TikTok : ajoutez-en un dans Marketing → Suivi." : p.metaToken || p.tiktokToken ? "✅ Conversions envoyées aussi depuis le serveur." : "⚠️ Pixels présents mais conversions serveur non configurées (onglet Intégrations) : les publicités perdent une partie des ventes.");
        return ok(points.join("\n"));
      }
      case "releasit_suggestions": {
        const s = await suggererOffres(tenantId);
        if (!s.length) return ok("Pas de suggestion : vos offres couvrent déjà les cas utiles.");
        return ok(s.map((x, i) => `${i + 1}. ${x.titre} — ${x.raison}`).join("\n") + "\n\nPour créer l'offre de quantité proposée : releasit_creer_offre_quantite.");
      }
      case "releasit_creer_offre_quantite": {
        const lu = schemaOffre.safeParse({ type: "quantite", titre: args.titre || "Choisissez votre offre", produitId: args.produit_id, paliers: args.paliers });
        if (!lu.success) return ko(lu.error.issues[0]?.message ?? "Offre invalide");
        const produit = await prisma.produit.findFirst({ where: { id: String(args.produit_id), tenantId, actif: true }, select: { id: true, nom: true, prix: true, venteGros: true } });
        if (!produit) return ko("Produit introuvable dans cette boutique");
        if (lu.data.paliers!.some((p) => p.prix >= produit.prix)) return ko(`Chaque palier doit être moins cher que le prix normal (${produit.prix}).`);
        if (await prisma.offreReleasit.count({ where: { tenantId, type: "quantite", produitId: produit.id } })) return ko("Ce produit a déjà une offre de quantité : modifiez-la dans l'onglet Offres.");
        if (lireVenteGros(produit.venteGros)?.paliers.length) return ko("Ce produit a déjà des prix de gros : modifiez-les plutôt dans sa fiche.");
        await prisma.offreReleasit.create({ data: { tenantId, type: "quantite", titre: lu.data.titre, produitId: produit.id, paliers: lu.data.paliers } });
        await appliquerPaliers(tenantId, produit.id, lu.data.paliers!);
        return ok(`✅ Offre de quantité créée sur « ${produit.nom} » : ${lu.data.paliers!.map((p) => `${p.quantite} × ${p.prix}`).join(", ")}.`);
      }
    }
    return ko(`Outil inconnu : ${nom}`);
  } catch (e) {
    return ko(`Erreur Releasit : ${(e as Error).message.slice(0, 200)}`);
  }
};
