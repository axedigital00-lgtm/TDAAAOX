// Guides de toutes les pages du dashboard : à quoi sert la page, l'action principale à toucher,
// puis la navigation. Lu par components/dashboard/VisitePage.tsx (une visite par page, montrée
// une fois automatiquement, puis à la demande avec le bouton « Guide de la page »).
// Les pages qui ont leur propre visite détaillée (Ma boutique, Thèmes, Constructeur, nouveau
// produit) ne sont pas listées ici.
import type { EtapeGuide } from "@/components/dashboard/VisiteGuidee";

type Guide = { titre: string; but: string; action?: string; astuce?: string };

const G: Record<string, Guide> = {
  "/dashboard/accueil": { titre: "Accueil", but: "Votre point de départ chaque jour : vos chiffres des 30 derniers jours, ce qui attend une action (commandes à traiter, paiements à confirmer) et les conseils pour vendre plus.", astuce: "Posez n'importe quelle question à Stella dans le grand champ : elle peut aussi agir pour vous." },
  "/dashboard": { titre: "Stella", but: "Stella est votre assistante. Écrivez ou parlez-lui comme à une collègue : « crée un produit », « lance une promo de 20 % », « quels clients relancer ? ».", astuce: "Les suggestions sous le champ sont des exemples : touchez-en une pour essayer." },
  "/dashboard/commandes": { titre: "Commandes", but: "Toutes vos commandes : boutique en ligne, WhatsApp et caisse. Touchez une commande pour voir le client, les articles, et la faire avancer (confirmée, expédiée, livrée).", action: "Créez une commande à la main, par exemple pour une vente faite par téléphone.", astuce: "Les onglets en haut de la liste filtrent : non traitées, non payées, ouvertes…" },
  "/dashboard/commande-express": { titre: "Commande Express", but: "Le formulaire de commande en un seul écran, payé à la livraison. Activez-le : un bouton « Commander maintenant » apparaît sur vos fiches produits. Chaque commande arrive ici, avec la source de la visite (publicité, réseau social).", astuce: "Réglez d'abord vos zones de livraison : le client choisit sa ville dans une liste et les frais s'ajoutent tout seuls." },
  "/dashboard/commandes/devis": { titre: "Brouillons et devis", but: "Préparez un devis ou une commande sans la valider tout de suite, puis envoyez-la au client pour qu'il la confirme.", action: "Créez un nouveau devis." },
  "/dashboard/retours": { titre: "Retours", but: "Les retours et échanges demandés par vos clients : acceptez-les, remboursez ou échangez l'article." },
  "/dashboard/clients": { titre: "Clients", but: "Tous vos clients, avec ce qu'ils ont acheté et dépensé. Touchez un client pour voir son historique et le recontacter sur WhatsApp.", action: "Ajoutez un client à la main." },
  "/dashboard/clients/entreprises": { titre: "Entreprises", but: "Vos clients professionnels : leurs comptes, contacts et conditions de paiement." },
  "/dashboard/avis": { titre: "Avis clients", but: "Les avis laissés sur vos produits. Répondez-y et choisissez ceux qui s'affichent sur votre boutique." },
  "/dashboard/whatsapp": { titre: "WhatsApp", but: "Connectez votre WhatsApp pour recevoir les commandes dans AXSO et répondre à vos clients depuis ici." },
  "/dashboard/produits": { titre: "Produits", but: "Votre catalogue. Touchez un produit pour changer son prix, ses photos ou son stock.", action: "Ajoutez un produit : une photo, un nom et un prix suffisent.", astuce: "Un produit « brouillon » n'est pas visible par vos clients tant que vous ne l'activez pas." },
  "/dashboard/produits/categories": { titre: "Collections", but: "Rangez vos produits par collection (ex. « Robes », « Nouveautés ») : vos clients s'y retrouvent plus vite sur la boutique.", action: "Créez une collection." },
  "/dashboard/produits/digital": { titre: "Produits numériques", but: "Formations, fichiers, licences, événements… Vos clients les paient par Mobile Money et reçoivent leur accès tout seuls, par e-mail.", action: "Créez un produit numérique." },
  "/dashboard/pos/stock": { titre: "Stock", but: "Combien il vous reste de chaque article, dans chaque magasin ou entrepôt. Corrigez une quantité si elle est fausse.", astuce: "Un article sous son seuil minimum vous est signalé automatiquement." },
  "/dashboard/pos/inventaire": { titre: "Inventaires", but: "Comptez votre stock réel et corrigez les écarts en une fois.", action: "Lancez un inventaire." },
  "/dashboard/pos/achats": { titre: "Bons de commande", but: "Commandez à vos fournisseurs et réceptionnez la marchandise : le stock se met à jour à la réception.", action: "Créez un bon de commande." },
  "/dashboard/pos/transferts": { titre: "Transferts", but: "Déplacez du stock d'un magasin ou d'un entrepôt à un autre." },
  "/dashboard/medias": { titre: "Médias", but: "Toutes vos images et vidéos, à réutiliser dans vos produits et votre boutique." },
  "/dashboard/fichiers": { titre: "Fichiers", but: "Vos fichiers : documents, fichiers de produits numériques, visuels." },
  "/dashboard/magic-import": { titre: "Import magique", but: "Importez tout un catalogue d'un coup, depuis un lien (autre boutique, page Facebook…) ou un fichier." },
  "/dashboard/logistique": { titre: "Livraisons", but: "Le suivi de toutes vos livraisons : à préparer, en route, livrées. Touchez une livraison pour voir où elle en est.", astuce: "Les livreurs et sociétés de livraison certifiés par AXSO sont dans « Partenaires »." },
  "/dashboard/logistique/reseau": { titre: "Réseau de livraison", but: "Les livreurs et sociétés disponibles autour de vous, avec leur fiabilité. Choisissez ceux à qui confier vos colis." },
  "/dashboard/livreurs": { titre: "Livreurs", but: "Vos livreurs : ajoutez-les, suivez leurs courses et ce que vous leur devez." },
  "/dashboard/transporteurs": { titre: "Partenaires de livraison", but: "Les sociétés de livraison vérifiées par AXSO. Les mieux notées sont en tête." },
  "/dashboard/entrepots": { titre: "Entrepôts", but: "Vos lieux de stockage : magasin, dépôt, entrepôt. Chacun a son propre stock." },
  "/dashboard/livraison": { titre: "Livraison", but: "Vos zones de livraison, vos frais et vos délais : le client voit le total avant de commander." },
  "/dashboard/boutique": { titre: "Informations de la boutique", but: "Le nom, le logo, la description, vos contacts et vos réseaux sociaux : ce que vos clients voient de vous." },
  "/dashboard/marketing": { titre: "Marketing", but: "Faites venir des clients : Stella vous propose des actions (promotions, relances, publications) que vous validez en un geste." },
  "/dashboard/marketing/codes-promo": { titre: "Codes promo", but: "Créez des réductions (ex. -20 %) avec un code à partager à vos clients.", action: "Créez un code promo." },
  "/dashboard/marketing/email": { titre: "E-mails", but: "Envoyez des e-mails à vos clients : nouveautés, promotions, relances." },
  "/dashboard/marketing/tracking": { titre: "Suivi publicitaire", but: "Branchez vos pixels Facebook, TikTok ou Snapchat pour mesurer vos publicités. Vous pouvez en ajouter plusieurs par plateforme." },
  "/dashboard/campagnes": { titre: "Campagnes", but: "Vos campagnes de relance et de promotion, envoyées par WhatsApp, SMS ou e-mail.", action: "Créez une campagne." },
  "/dashboard/publicite": { titre: "Publicité", but: "Créez et suivez vos annonces sur les réseaux sociaux." },
  "/dashboard/sms": { titre: "SMS", but: "Envoyez des SMS à vos clients." },
  "/dashboard/affiliation": { titre: "Affiliation", but: "Des revendeurs partagent vos produits et touchent une commission sur chaque vente qu'ils vous apportent." },
  "/dashboard/analytics": { titre: "Analyses", but: "Vos visites, ventes et taux de conversion, jour par jour. Comparez avec la période précédente." },
  "/dashboard/rapports": { titre: "Rapports", but: "Des rapports détaillés à consulter ou télécharger : ventes, produits, clients." },
  "/dashboard/objectifs": { titre: "Objectifs", but: "Fixez vos objectifs de vente et suivez votre progression." },
  "/dashboard/scheduler": { titre: "Planificateur", but: "Programmez vos publications sur les réseaux sociaux à l'avance." },
  "/dashboard/revenus": { titre: "Revenus", but: "Ce que vous avez vendu et encaissé, par période et par canal." },
  "/dashboard/paiements": { titre: "Paiements", but: "Tous les paiements reçus, avec leur moyen (Mobile Money, à la livraison…) et leur statut." },
  "/dashboard/wallet": { titre: "Portefeuille", but: "L'argent de vos ventes en ligne. Une vente devient retirable 24 h après le paiement.", action: "Retirez votre argent vers votre Mobile Money.", astuce: "Les frais de retrait s'affichent avant que vous confirmiez." },
  "/dashboard/factures": { titre: "Factures", but: "Vos factures clients, à envoyer ou télécharger." },
  "/dashboard/logistique/encaissements": { titre: "Encaissements à la livraison", but: "L'argent encaissé par vos livreurs à la livraison, et ce qu'ils doivent encore vous remettre." },
  "/dashboard/coins": { titre: "Coins IA", but: "Les coins paient les créations premium de Stella : visuels de produits, publicités. Achetez des coins par Mobile Money." },
  "/dashboard/abonnement": { titre: "Abonnement", but: "Votre forfait AXSO. Passez à un forfait supérieur pour débloquer plus de fonctions, et payez par Mobile Money." },
  "/dashboard/parametres": { titre: "Paramètres", but: "Les réglages de votre compte et de votre boutique : équipe, notifications, domaine, paiements." },
  "/dashboard/pos/caisse": { titre: "Caisse", but: "Encaissez en magasin : touchez les articles, puis le moyen de paiement. Le stock se met à jour tout seul." },
  "/dashboard/controle-ia": { titre: "Contrôle IA", but: "Reliez vos assistants IA (ChatGPT, Claude, Gemini) à votre boutique et décidez de ce qu'ils peuvent faire." },
  "/dashboard/messages": { titre: "Réseau AXSO", but: "La communauté des marchands AXSO : partagez, posez vos questions, trouvez des partenaires." },
  "/dashboard/support": { titre: "Assistance", but: "Une question ou un problème ? Écrivez à l'équipe AXSO ici." },
};

/** Guide le plus précis pour une adresse (préfixe le plus long), sinon null. */
export function guidePour(pathname: string): { route: string; guide: Guide } | null {
  const routes = Object.keys(G).filter((r) => pathname === r || (r !== "/dashboard" && pathname.startsWith(r + "/")));
  if (!routes.length) return null;
  const route = routes.sort((a, b) => b.length - a.length)[0];
  return { route, guide: G[route] };
}

const PRIMAIRE = "css:.axd-ph__actions .axd-btn--primary, .axd-content .axd-btn--primary, .axd-content button.bg-\\[\\#F5A623\\], .axd-content a.bg-\\[\\#F5A623\\]";

/** Étapes d'une page : présentation, action principale, filtres, rubriques, navigation, guide. */
export function etapesPage(guide: Guide): EtapeGuide[] {
  return [
    { titre: guide.titre, texte: guide.but },
    ...(guide.action ? [{ cible: PRIMAIRE, facultative: true, titre: "L'action principale", texte: guide.action }] : []),
    { cible: "css:.axd-ix-bar, .axd-ix-tabs", facultative: true, titre: "Filtrer la liste", texte: "Ces onglets et ce champ de recherche trient la liste : touchez-en un pour n'afficher que ce qui vous intéresse." },
    { cible: "css:.axd-rubriques", facultative: true, titre: "Les rubriques de cet espace", texte: "Faites glisser cette rangée pour passer d'une rubrique à l'autre, sans revenir au menu." },
    { cible: "css:.axd-tabbar", facultative: true, titre: "Changer d'espace", texte: "En bas : Accueil, Ventes, Catalogue, Logistique, Boutique, Finances. Le bouton ☰ tout à droite ouvre le menu complet." },
    { cible: "css:.axd-nav", facultative: true, titre: "Le menu", texte: "Toutes les sections du dashboard sont ici, à gauche." },
    ...(guide.astuce ? [{ titre: "Bon à savoir", texte: guide.astuce }] : []),
    { cible: "aide-page", facultative: true, titre: "Revoir ce guide", texte: "Touchez ce bouton à tout moment pour revoir le guide de la page où vous êtes." },
  ];
}
