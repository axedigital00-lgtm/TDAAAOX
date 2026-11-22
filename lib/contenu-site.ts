// Contenu éditorial du site public : guides, articles et détail des fonctionnalités.
// Règle : ne décrire que ce qu'AXSO fait réellement ; ni client, ni chiffre de marché inventés.
import type { TypeScene } from "@/components/marketing/motion/Scenes";

export type Bloc = { h: string; p?: string; etapes?: string[]; points?: string[] };
export type Guide = { slug: string; rubrique: string; titre: string; resume: string; duree: number; scene: TypeScene; blocs: Bloc[]; note?: string };

export const GUIDES: Guide[] = [
  { slug: "creer-sa-boutique", rubrique: "Démarrage", titre: "Créer votre boutique en trois étapes", duree: 4, scene: "vitrine", resume: "De l'inscription à la première adresse à partager.", blocs: [
    { h: "Ouvrir votre compte", etapes: ["Cliquez sur « Démarrer gratuitement » et renseignez vos informations.", "Indiquez le nom de votre boutique, votre pays et votre devise.", "Ajoutez votre numéro WhatsApp : il recevra les commandes à confirmer."] },
    { h: "Donner son style à la vitrine", etapes: ["Ouvrez Boutique en ligne et parcourez les thèmes.", "Appliquez celui qui correspond à votre marque.", "Ouvrez le Constructeur pour changer textes, images et couleurs."] },
    { h: "Publier", p: "Ajoutez au moins un produit, vérifiez la page sur mobile, puis publiez. Votre boutique reçoit une adresse AXSO que vous pouvez partager tout de suite." },
  ], note: "Passez une commande test vous-même avant de partager le lien : c'est le moyen le plus sûr de vérifier tout le parcours." },
  { slug: "ajouter-ses-produits", rubrique: "Démarrage", titre: "Ajouter vos premiers produits", duree: 5, scene: "catalogue", resume: "Une fiche claire, de bonnes photos et un prix juste.", blocs: [
    { h: "Créer la fiche", etapes: ["Ouvrez Produits, puis ajoutez un produit.", "Choisissez son type : physique, numérique ou dropshipping.", "Renseignez le nom, le prix, le stock et la catégorie.", "Ajoutez plusieurs photos nettes, sur un fond simple."] },
    { h: "Rédiger ce qui fait vendre", points: ["La matière, la taille ou le contenu exact.", "Le délai et la zone de livraison.", "Ce qui se passe en cas de problème."] },
    { h: "Aller plus vite avec Stella", p: "Stella peut proposer une description à partir de votre produit. Relisez toujours le texte avant de le publier." },
  ] },
  { slug: "variantes", rubrique: "Boutique et produits", titre: "Gérer tailles, couleurs et variantes", duree: 3, scene: "catalogue", resume: "Un seul produit, plusieurs déclinaisons.", blocs: [
    { h: "Ajouter des variantes", etapes: ["Ouvrez la fiche du produit.", "Dans la section des variantes, ajoutez une option, par exemple Taille.", "Renseignez ses valeurs et un prix si une déclinaison coûte plus cher.", "Enregistrez, puis vérifiez le choix sur la fiche en boutique."] },
    { h: "Bonnes pratiques", points: ["Gardez les mêmes noms d'options sur tout le catalogue.", "Désactivez une variante épuisée plutôt que de la supprimer."] },
  ] },
  { slug: "produits-numeriques", rubrique: "Boutique et produits", titre: "Vendre des produits numériques et des services", duree: 6, scene: "compte", resume: "Fichiers, formations, abonnements, parcours et prestations.", blocs: [
    { h: "Choisir le bon format", points: ["Fichier téléchargeable ou licence.", "Formation avec chapitres, leçons, quiz et certificat.", "Service avec réservation de séances et livrables.", "Abonnement donnant accès à des contenus pour une durée.", "Parcours enchaînant plusieurs formations."] },
    { h: "Créer l'offre", etapes: ["Ouvrez Produits numériques et choisissez un type.", "Donnez un nom et un prix : le produit est créé en brouillon.", "Ajoutez le contenu et réglez ses accès.", "Publiez quand tout est prêt."] },
  ] },
  { slug: "personnaliser-domaine", rubrique: "Boutique et produits", titre: "Connecter votre nom de domaine", duree: 5, scene: "domaine", resume: "Votre boutique à votre propre adresse.", blocs: [
    { h: "Connecter le domaine", etapes: ["Ouvrez Paramètres, puis Domaines.", "Saisissez un domaine que vous possédez déjà, de préférence un sous-domaine comme boutique.mamarque.com.", "Créez chez votre registraire les enregistrements DNS affichés par AXSO.", "Cliquez sur « Vérifier maintenant »."] },
    { h: "Combien de temps ?", p: "La propagation DNS prend de quelques minutes à 48 heures. Le certificat HTTPS est ensuite créé automatiquement." },
  ], note: "Votre adresse AXSO reste disponible, même une fois votre domaine connecté." },
  { slug: "paiement-livraison", rubrique: "Paiements", titre: "Le paiement à la livraison", duree: 4, scene: "paiement", resume: "Encaisser sans commission AXSO, en réduisant les refus.", blocs: [
    { h: "Activer le mode de paiement", etapes: ["Ouvrez Paramètres, section Moyens de paiement.", "Activez le paiement à la livraison.", "Choisissez les pays où vous le proposez."] },
    { h: "Limiter les colis refusés", points: ["Confirmez chaque commande sur WhatsApp avant l'expédition.", "Annoncez le montant exact et les frais de livraison.", "Partagez le lien de suivi au départ du colis."] },
    { h: "Ce qui se passe à la livraison", p: "Le livreur saisit le code à quatre chiffres reçu par le client. La commande passe alors en livrée et payée." },
  ] },
  { slug: "mobile-money", rubrique: "Paiements", titre: "Accepter le Mobile Money à la livraison", duree: 3, scene: "paiement", resume: "Orange Money et MTN MoMo au moment de la remise.", blocs: [
    { h: "Comment ça marche", p: "Le client règle votre numéro marchand au moment de la remise du colis. L'argent arrive directement chez vous : AXSO ne le détient jamais." },
    { h: "Organiser vos livreurs", points: ["Donnez-leur le numéro à utiliser pour chaque réseau.", "Demandez une capture du paiement avant la remise.", "Rapprochez chaque jour les montants encaissés."] },
  ] },
  { slug: "remboursements-retours", rubrique: "Paiements", titre: "Gérer retours et remboursements", duree: 4, scene: "compte", resume: "Du retour demandé par le client à votre décision.", blocs: [
    { h: "Côté client", p: "Depuis Mon compte, le client peut demander un retour dans les 14 jours suivant la livraison, en indiquant le motif et la solution souhaitée." },
    { h: "Côté boutique", etapes: ["Ouvrez Commandes, puis Retours.", "Lisez la demande et son motif.", "Acceptez ou refusez. Rien n'est remboursé tant que vous n'avez pas accepté."] },
  ] },
  { slug: "zones-livraison", rubrique: "Livraison", titre: "Zones et tarifs de livraison", duree: 4, scene: "livraison", resume: "Le bon prix pour chaque quartier ou ville.", blocs: [
    { h: "Configurer vos zones", etapes: ["Ouvrez Paramètres, puis Expédition et livraison.", "Créez une zone par pays, ville ou quartier.", "Définissez un tarif et, si besoin, un seuil de livraison offerte.", "Passez une commande test pour vérifier le calcul."] },
    { h: "Un conseil", p: "Peu de zones bien nommées valent mieux qu'une longue liste : votre client doit reconnaître la sienne en quelques secondes." },
  ] },
  { slug: "gerer-livreurs", rubrique: "Livraison", titre: "Gérer vos livreurs", duree: 3, scene: "livraison", resume: "Assigner, suivre et rémunérer chaque course.", blocs: [
    { h: "Organiser les courses", etapes: ["Ajoutez vos livreurs dans Commandes, Livreurs.", "Assignez-leur une commande prête.", "Le livreur suit sa course depuis son espace.", "Il confirme la remise avec le code du client."] },
  ] },
  { slug: "suivi-commande", rubrique: "Livraison", titre: "Le suivi de commande", duree: 2, scene: "livraison", resume: "Un lien clair pour chaque client.", blocs: [
    { h: "Ce que voit le client", points: ["Le statut de sa commande à chaque étape.", "Sa facture.", "Le code à donner au livreur."] },
    { h: "Le partager", p: "Le lien de suivi est créé avec la commande. Envoyez-le sur WhatsApp pour éviter les appels « où est mon colis ? »." },
  ] },
  { slug: "configurer-whatsapp", rubrique: "Vente et clients", titre: "Vendre avec WhatsApp", duree: 5, scene: "whatsapp", resume: "De la conversation à la commande enregistrée.", blocs: [
    { h: "Recevoir les commandes", etapes: ["Renseignez votre numéro dans Paramètres.", "Sur la vitrine, le client choisit de commander par WhatsApp.", "Son récapitulatif arrive dans votre conversation.", "La commande est déjà enregistrée dans AXSO."] },
    { h: "Pour aller plus loin", p: "Avec l'API WhatsApp Cloud de Meta, les messages de statut peuvent partir automatiquement. Sinon, AXSO prépare le message à envoyer en un clic." },
  ] },
  { slug: "devis-entreprises", rubrique: "Vente et clients", titre: "Devis et comptes entreprises", duree: 6, scene: "gros", resume: "Vendre aux professionnels avec leurs conditions.", blocs: [
    { h: "Créer un compte entreprise", etapes: ["Ouvrez Clients, puis Entreprises.", "Renseignez la société, ses conditions de paiement, sa remise et son plafond.", "Copiez son lien privé de commande rapide et envoyez-le."] },
    { h: "Envoyer un devis", etapes: ["Ouvrez Commandes, puis Brouillons et devis.", "Ajoutez le client et les produits.", "Envoyez le lien par e-mail ou WhatsApp.", "Dès qu'il accepte, la commande est créée et le stock sort."] },
    { h: "Paiement à terme", p: "Une commande à 15, 30 ou 60 jours n'est pas comptée comme payée à la livraison. Marquez-la payée quand vous recevez le règlement." },
  ] },
  { slug: "vente-en-gros", rubrique: "Vente et clients", titre: "Prix de gros et quantités", duree: 3, scene: "gros", resume: "Des paliers appliqués automatiquement au panier.", blocs: [
    { h: "Configurer un produit", etapes: ["Ouvrez la fiche du produit, puis « Vente en gros ».", "Ajoutez des paliers : à partir de 10 unités, tel prix.", "Fixez si besoin un minimum, un maximum ou un multiple, par exemple par carton de 6."] },
  ] },
  { slug: "presentation-stella", rubrique: "Stella", titre: "Bien démarrer avec Stella", duree: 4, scene: "stella", resume: "Votre assistante, et vous gardez la décision.", blocs: [
    { h: "Ce qu'elle sait faire", points: ["Analyser vos ventes et votre stock.", "Rédiger fiches produits et messages.", "Préparer promotions et campagnes.", "Vous signaler ce qui demande votre attention."] },
    { h: "Bien lui demander", p: "Soyez précis : le produit, la période, l'objectif. « Prépare un message pour relancer mes clients du café cette semaine » donne un meilleur résultat que « aide-moi à vendre »." },
  ], note: "Relisez toujours ce qu'elle propose avant de l'envoyer à vos clients." },
  { slug: "workflows-lancements", rubrique: "Stella", titre: "Workflows et lancements planifiés", duree: 5, scene: "flux", resume: "Automatisez le répétitif, préparez vos opérations.", blocs: [
    { h: "Créer un workflow", etapes: ["Ouvrez Stella, puis Workflows.", "Choisissez quand il se lance : commande créée, payée, livrée, stock bas.", "Ajoutez des conditions, par exemple un montant minimum.", "Choisissez les actions : notification, e-mail, segment, masquage du produit."] },
    { h: "Planifier un lancement", etapes: ["Préparez vos changements dans le Constructeur.", "Ouvrez Lancements, donnez un nom, une date de début et, si besoin, de fin.", "La boutique passe en ligne à l'heure dite, puis revient à sa version d'avant."] },
  ] },
];

export const RUBRIQUES = ["Démarrage", "Boutique et produits", "Paiements", "Livraison", "Vente et clients", "Stella"];

export type Article = { slug: string; tag: string; titre: string; chapo: string; duree: number; image: string; blocs: Bloc[] };
export const ARTICLES: Article[] = [
  { slug: "lancer-une-boutique-rentable", tag: "Stratégie", titre: "Lancer une boutique rentable : la méthode en six décisions", duree: 7, image: "/visuels/article-lancer-une-boutique-rentable.webp", chapo: "Avant de penser publicité, posez les chiffres et l'offre. C'est là que se joue la rentabilité.", blocs: [
    { h: "1. Choisir un problème, pas un produit", p: "Un produit se copie. Une promesse claire, pour un client précis, se défend bien mieux. Décrivez en une phrase pour qui vous vendez et ce que vous lui évitez." },
    { h: "2. Calculer son vrai coût", p: "Additionnez l'achat, l'emballage, la livraison, la publicité par vente et les retours. Beaucoup de boutiques perdent de l'argent parce qu'elles ne comptent que le prix d'achat. Notre calculateur gratuit fait ce travail en une minute." },
    { h: "3. Fixer un prix qui tient", p: "Partez de la marge dont vous avez besoin, pas du prix du voisin. Si le marché refuse ce prix, changez l'offre ou le fournisseur plutôt que de vendre à perte." },
    { h: "4. Commencer petit", p: "Quelques références bien présentées valent mieux qu'un grand catalogue. Vous apprenez plus vite, immobilisez moins d'argent et vos photos restent soignées." },
    { h: "5. Vendre d'abord à son réseau", p: "Vos premiers clients sont souvent dans vos contacts WhatsApp. Leurs retours valent mieux que n'importe quelle étude et coûtent zéro franc." },
    { h: "6. Mesurer chaque semaine", p: "Suivez trois chiffres : les commandes, le taux de livraison réussie et la marge. Ils disent presque tout de la santé de votre activité." },
  ] },
  { slug: "mobile-money-a-la-livraison", tag: "Paiement", titre: "Mobile Money à la livraison : rassurer sans perdre de ventes", duree: 5, image: "/visuels/article-mobile-money-a-la-livraison.webp", chapo: "Payer à la réception lève la peur de l'arnaque. Bien organisé, c'est un vrai avantage.", blocs: [
    { h: "Pourquoi vos clients y tiennent", p: "Acheter à quelqu'un qu'on ne connaît pas demande de la confiance. Payer après avoir vu le produit retire l'essentiel du risque perçu." },
    { h: "Le vrai risque : le colis refusé", p: "Chaque refus coûte un aller-retour. Confirmez la commande par message, annoncez le total exact et prévenez le client le jour du passage." },
    { h: "Une routine pour vos livreurs", p: "Un numéro par réseau, une preuve de paiement avant la remise et un point quotidien sur les encaissements suffisent à éviter la plupart des écarts." },
  ] },
  { slug: "ia-pour-commercants", tag: "IA", titre: "L'IA pour les commerçants : ce qu'elle fait vraiment bien", duree: 5, image: "/visuels/article-ia-pour-commercants.webp", chapo: "Pas de magie : un gain de temps réel sur les tâches répétitives, à condition de garder la main.", blocs: [
    { h: "Là où elle aide tout de suite", points: ["Rédiger une première version de fiche produit.", "Décliner un message pour WhatsApp, e-mail et réseaux.", "Résumer vos ventes de la semaine en quelques lignes."] },
    { h: "Là où vous restez indispensable", p: "Le prix, la promesse, la relation avec un client mécontent : ces décisions engagent votre marque. L'IA propose, vous décidez." },
    { h: "Une règle simple", p: "Relisez tout ce qui part vers un client. Une erreur sur une matière ou un délai coûte plus cher que le temps gagné." },
  ] },
  { slug: "reussir-sa-livraison", tag: "Livraison", titre: "Livraison : les détails qui font revenir vos clients", duree: 6, image: "/visuels/article-reussir-sa-livraison.webp", chapo: "Une adresse imprécise, un livreur sans nouvelles : ces petits détails décident de la deuxième commande.", blocs: [
    { h: "Capter une vraie adresse", p: "Là où les adresses postales sont rares, demandez un quartier, un point de repère et si possible une position GPS." },
    { h: "Prévenir avant de partir", p: "Un message le matin de la livraison évite la plupart des absences. Le lien de suivi fait le reste." },
    { h: "Regrouper les courses", p: "Organisez vos tournées par zone. Vous réduisez le coût par colis et vos livreurs gagnent du temps." },
    { h: "Soigner le moment de la remise", p: "Un emballage propre et un mot de remerciement coûtent peu et restent en mémoire. C'est aussi le meilleur moment pour demander un avis." },
  ] },
  { slug: "dropshipping-sans-pieges", tag: "Marketing", titre: "Dropshipping : les pièges à éviter avant de commencer", duree: 6, image: "/visuels/article-dropshipping-sans-pieges.webp", chapo: "Vendre sans stock attire. Mais le client vous tient responsable de tout, y compris du fournisseur.", blocs: [
    { h: "Tester le fournisseur soi-même", p: "Commandez toujours un échantillon. Vous vérifiez la qualité, le délai et l'emballage que recevra votre client." },
    { h: "Annoncer un délai honnête", p: "Un long délai annoncé se pardonne. Un délai court non tenu se transforme en refus de colis et en mauvais avis." },
    { h: "Compter toute la marge", p: "Ajoutez transport, douane éventuelle, publicité et retours. Si la marge ne survit pas à ce calcul, le produit n'est pas viable." },
  ] },
  { slug: "whatsapp-premier-canal", tag: "Vente", titre: "Faire de WhatsApp votre premier canal de vente", duree: 5, image: "/visuels/article-whatsapp-premier-canal.webp", chapo: "Vos clients y sont déjà. L'enjeu est de passer de la discussion à la commande sans rien perdre.", blocs: [
    { h: "Répondre vite, mais avec méthode", p: "Préparez vos réponses aux questions fréquentes : prix, tailles, livraison. Vous gardez un ton humain sans tout retaper." },
    { h: "Ne pas laisser la vente dans le chat", p: "Une commande notée de mémoire finit par se perdre. Envoyez le lien du produit : le client commande, et tout est enregistré." },
    { h: "Respecter vos contacts", p: "Envoyez peu de messages, utiles, à des personnes qui ont accepté d'en recevoir. C'est la condition pour rester lu, et pour ne pas être signalé." },
  ] },
];

export type DetailSolution = { scene: TypeScene; atouts: string[]; etapes: [string, string][]; guide?: string };
export const DETAILS: Record<string, DetailSolution> = {
  domaines: { scene: "domaine", guide: "personnaliser-domaine", atouts: ["Enregistrements DNS affichés, prêts à copier", "Vérification de la propriété du domaine", "Certificat HTTPS créé automatiquement", "Votre adresse AXSO reste toujours disponible"], etapes: [["Saisissez votre domaine", "Un domaine ou sous-domaine que vous possédez déjà."], ["Créez les enregistrements", "Copiez-les chez votre registraire."], ["Vérifiez", "AXSO confirme quand tout est actif."]] },
  "comptes-clients": { scene: "compte", guide: "remboursements-retours", atouts: ["Historique des commandes et statuts", "Lien de suivi pour chaque achat", "Retour demandé en ligne sous 14 jours", "Accès aux achats numériques"], etapes: [["Le client s'identifie", "Un code par e-mail, sans mot de passe à retenir."], ["Il retrouve ses achats", "Commandes, statuts et factures au même endroit."], ["Il agit seul", "Suivi et demande de retour, sans vous appeler."]] },
  catalogue: { scene: "catalogue", guide: "ajouter-ses-produits", atouts: ["Produits physiques, numériques et dropshipping", "Variantes de taille, couleur et prix", "Catégories et collections", "Descriptions préparées avec Stella"], etapes: [["Ajoutez vos articles", "Photos, prix, stock et variantes."], ["Organisez", "Catégories et collections claires."], ["Publiez", "Ils apparaissent sur votre vitrine."]] },
  automatisations: { scene: "flux", guide: "workflows-lancements", atouts: ["Éditeur quand, si, alors, sans code", "Relances de panier et messages après achat", "Modèles prêts à utiliser", "Historique de chaque exécution"], etapes: [["Choisissez un événement", "Commande payée, livrée, stock bas…"], ["Posez vos conditions", "Montant, ville, nombre d'achats."], ["Laissez agir", "Notification, e-mail, segment, masquage."]] },
  taxes: { scene: "taxes", atouts: ["Factures numérotées pour vos commandes", "TVA calculée selon vos réglages", "Prix affichés hors taxes ou taxes comprises en caisse", "Export pour votre comptabilité"], etapes: [["Indiquez votre pays", "Il détermine votre juridiction."], ["Réglez vos taux", "Selon vos produits et votre activité."], ["Retrouvez vos factures", "Prêtes à partager ou exporter."]] },
  "boutique-en-ligne": { scene: "vitrine", guide: "creer-sa-boutique", atouts: ["Bibliothèque de thèmes prêts à vendre", "Constructeur visuel, sans code", "Versions et retour en arrière", "Lancements planifiés avec retour automatique"], etapes: [["Choisissez un thème", "Selon votre univers."], ["Personnalisez", "Textes, images, couleurs, sections."], ["Publiez", "Votre boutique est en ligne."]] },
  whatsapp: { scene: "whatsapp", guide: "configurer-whatsapp", atouts: ["Commande transmise avec son récapitulatif", "Commande enregistrée dans votre tableau de bord", "Messages de statut et lien de suivi", "Relances préparées pour vos clients"], etapes: [["Le client choisit", "Il commande depuis votre vitrine."], ["Vous confirmez", "Le récapitulatif arrive sur WhatsApp."], ["Vous livrez", "Le suivi est déjà partagé."]] },
  caisse: { scene: "caisse", atouts: ["Vente au scanner ou par recherche", "Stock commun avec la boutique en ligne", "Sessions de caisse et mouvements", "Retours, fidélité et crédit client"], etapes: [["Ouvrez la caisse", "Sur ordinateur, tablette ou téléphone."], ["Encaissez", "Scannez, ajoutez, validez."], ["Clôturez", "Le rapprochement est prêt."]] },
  "vente-en-gros": { scene: "gros", guide: "devis-entreprises", atouts: ["Prix dégressifs par quantité", "Minimum, maximum et vente par multiples", "Devis avec lien d'acceptation", "Comptes entreprises, paiement à terme, plafond"], etapes: [["Définissez vos paliers", "Produit par produit."], ["Invitez vos pros", "Chacun reçoit son lien privé."], ["Validez", "La demande devient une commande."]] },
  marches: { scene: "marches", atouts: ["Pays regroupés en marchés", "Devise affichée par marché", "Taux personnalisable et arrondi local", "Encaissement dans la devise de la boutique"], etapes: [["Créez un marché", "Partez d'un modèle régional."], ["Réglez l'affichage", "Devise, taux, arrondi."], ["Vendez", "Chaque visiteur voit ses prix."]] },
  paiements: { scene: "paiement", guide: "paiement-livraison", atouts: ["Paiement à la livraison sans commission AXSO", "Mobile Money au moment de la remise", "Paiement à terme pour les entreprises", "Réglages par pays"], etapes: [["Activez vos modes", "Selon vos pays."], ["Le client commande", "Il sait ce qu'il paiera."], ["Vous encaissez", "L'argent arrive directement chez vous."]] },
  livraison: { scene: "livraison", guide: "zones-livraison", atouts: ["Zones et tarifs par ville ou quartier", "Assignation à vos livreurs", "Lien de suivi pour le client", "Code à quatre chiffres à la remise"], etapes: [["Préparez", "Le colis est prêt à partir."], ["Assignez", "Le livreur reçoit sa course."], ["Remettez", "Le code confirme la livraison."]] },
  stock: { scene: "stock", atouts: ["Un seul stock pour tous vos canaux", "Plusieurs entrepôts et transferts", "Bons de commande et réceptions", "Inventaires, lots et alertes de seuil"], etapes: [["Recevez", "Vos arrivages entrent en stock."], ["Vendez", "Chaque vente met le total à jour."], ["Anticipez", "Une alerte avant la rupture."]] },
  promotions: { scene: "promo", atouts: ["Codes en pourcentage ou en montant", "Limites d'usage et date de fin", "Codes réservés à certains produits", "Offres avancées en caisse"], etapes: [["Créez une offre", "Montant, durée, conditions."], ["Partagez", "Sur WhatsApp, e-mail et réseaux."], ["Mesurez", "Voyez ce qu'elle rapporte."]] },
  analyses: { scene: "analyses", atouts: ["Ventes, commandes et clients", "Produits les plus performants", "Rapports par période", "Résumés préparés par Stella"], etapes: [["Choisissez la période", "Aujourd'hui, semaine, mois."], ["Comparez", "Voyez ce qui progresse."], ["Décidez", "Réassort, promo ou relance."]] },
  stella: { scene: "stella", guide: "presentation-stella", atouts: ["Analyse de vos ventes et de votre stock", "Rédaction de fiches et de messages", "Préparation de promotions", "Vous validez chaque action sensible"], etapes: [["Posez votre question", "Comme à une collègue."], ["Relisez sa proposition", "Elle prépare, vous ajustez."], ["Validez", "Vous gardez la décision."]] },
};
