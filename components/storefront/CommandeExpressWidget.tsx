// Releasit COD AXSO sur la fiche produit : configuration publique compilée côté serveur
// (aucun appel au dashboard depuis la vitrine), puis le script léger /commande-express.js.
// Rien n'est rendu si le marchand n'a pas activé Releasit COD AXSO ou si le produit est numérique.
import { getT } from "@/lib/i18n/serveur";
import { lireReglages } from "@/lib/commande-express/reglages";
import { lireReglagesLivraison } from "@/lib/livraison-reglages";
import { lireReglagesPaiement } from "@/lib/paiement-pays";
import { exempleTelephone } from "@/lib/devise-convert";
import { TYPES_NUMERIQUES } from "@/lib/pricing";
import { signerJeton } from "@/lib/commande-express/risque";
import { offresPourProduit } from "@/lib/commande-express/offres";
import { lireFormulaire, LIBELLES_DEFAUT, MODELES, type ChampBase } from "@/lib/commande-express/formulaire";
import { prisma } from "@/lib/prisma";

type Props = {
  tenant: { id: string; slug: string; devise: string; pays?: string | null; parametresLivraison: unknown; parametresPaiement: unknown };
  produit: { id: string; nom: string; type: string; prix: number; images: string[]; variantes?: { nom: string; valeur: string; prix: number | null }[] };
};

export async function CommandeExpressWidget({ tenant, produit }: Props) {
  if (TYPES_NUMERIQUES.has(produit.type)) return null;
  const r = await lireReglages(tenant.id);
  if (!r.actif) return null;
  const t = await getT();
  const offres = await offresPourProduit(tenant.id, produit.id).catch(() => null);
  const brut = await prisma.reglagesCommandeExpress.findUnique({ where: { tenantId: tenant.id }, select: { formulaire: true, abTest: true, pixelsServeur: true } }).catch(() => null);
  const f = lireFormulaire(brut?.formulaire, r.demanderEmail);
  const ab = brut?.abTest as { actif?: boolean; texteB?: string } | null;
  const modePurchase = (brut?.pixelsServeur as { modePurchase?: string } | null)?.modePurchase === "confirmation" ? "confirmation" : "creation";
  const T = (s: string) => t(s);
  const config = {
    slug: tenant.slug, devise: tenant.devise, pays: tenant.pays ?? "", couleur: r.couleur, boutonCollant: r.boutonCollant, demanderEmail: r.demanderEmail,
    texteBouton: T(r.texteBouton), canal: lireReglagesPaiement(tenant.parametresPaiement).livraison ? "direct" : "whatsapp",
    zones: lireReglagesLivraison(tenant.parametresLivraison).zones.map((z) => z.nom),
    exempleTelephone: exempleTelephone(tenant.pays), jeton: signerJeton(tenant.id),
    form: {
      modele: MODELES[f.modele], animation: f.animation, titre: f.titre && T(f.titre), sousTitre: f.sousTitre && T(f.sousTitre), succes: f.succes && T(f.succes), boutonEnvoi: f.boutonEnvoi && T(f.boutonEnvoi),
      champs: f.champs.map((c) => ({ cle: c.cle, libelle: T(c.libelle || LIBELLES_DEFAUT[c.cle as ChampBase]), visible: c.visible, requis: c.requis })),
      perso: f.perso.map((c) => ({ ...c, libelle: T(c.libelle), options: c.options?.map(T) })),
    },
    ab: ab?.actif && ab.texteB ? { texteB: T(ab.texteB) } : null, modePurchase,
    offres: offres && { ...offres, quantite: offres.quantite && { ...offres.quantite, titre: T(offres.quantite.titre), paliers: offres.quantite.paliers.map((p) => ({ ...p, libelle: p.libelle && T(p.libelle), badge: p.badge && T(p.badge) })) } },
    produit: { id: produit.id, nom: produit.nom, prix: produit.prix, image: produit.images[0] ?? null, variantes: (produit.variantes ?? []).map((v) => ({ nom: v.nom, valeur: v.valeur, prix: v.prix })) },
    textes: Object.fromEntries(Object.entries({
      commander: "Commander maintenant", titre: "Commander", fermer: "Fermer", option: "Option", quantite: "Quantité", nom: "Nom complet",
      telephone: "Téléphone (WhatsApp de préférence)", email: "E-mail (facultatif)", zone: "Ville ou zone de livraison", choisir: "Choisir…", ville: "Ville",
      quartier: "Quartier", repere: "Repère (facultatif)", repereEx: "Ex. face pharmacie", position: "Partager ma position (facultatif)",
      positionEnCours: "Localisation…", positionOk: "Position partagée", positionKo: "Position refusée : indiquez un repère", total: "Total",
      note: "Paiement à la livraison. Frais de livraison selon votre zone.", valider: "Commander · paiement à la livraison", envoi: "Envoi de la commande…",
      errNom: "Indiquez votre nom.", errTel: "Indiquez un numéro de téléphone valide.", errZone: "Indiquez votre ville ou zone de livraison.",
      errServeur: "Commande impossible pour le moment.", errReseau: "Connexion interrompue. Vérifiez votre réseau et touchez à nouveau « Commander » : vous ne serez pas débité deux fois.",
      merci: "Commande reçue !", merciTexte: "Commande n° {0}. La boutique vous contacte pour la livraison. Total à payer à la réception : {1}.",
      whatsapp: "Envoyer ma commande sur WhatsApp", suivi: "Suivre ma commande",
      unite: "l'unité", pour: "Pour {0}", ajouter: "Ajouter", ajoutOk: "Ajouté à votre commande. Nouveau total : {0}.", attendre: "Attendez !",
      consentement: "En indiquant votre numéro, vous acceptez que la boutique vous recontacte au sujet de cette commande.", errChamp: "Champ obligatoire : {0}", hors: "Pas de réseau : votre commande partira dès que la connexion revient.", envoyeeApres: "Votre commande en attente a bien été envoyée.",
      profiter: "Profiter de l'offre", nonMerci: "Non merci", codeApplique: "Code {0} appliqué à votre commande.", ajoutUnClic: "Ajouter en 1 clic", economie: "Économisez {0}",
    }).map(([k, v]) => [k, T(v)])),
  };
  // JSON dans une balise script : « < » échappé pour qu'aucun texte ne puisse fermer la balise.
  const json = JSON.stringify(config).replace(/</g, "\\u003c");
  return (
    <>
      <script id="axso-ce" type="application/json" dangerouslySetInnerHTML={{ __html: json }} />
      <script src="/commande-express.js" defer />
    </>
  );
}
