export function texte(fr: string, en = fr) {
  return { fr, en };
}

export const familles = [
  { id: "construire", nom: texte("Créer sa boutique", "Build a store") },
  { id: "vendre", nom: texte("Vendre partout", "Sell across channels") },
  { id: "encaisser", nom: texte("Encaisser", "Get paid") },
  { id: "livrer", nom: texte("Gérer les opérations", "Run operations") },
  { id: "developper", nom: texte("Marketing et analyses", "Marketing and analytics") },
  { id: "axia", nom: texte("Travailler avec Stella", "Work with Stella") },
] as const;

type Texte = ReturnType<typeof texte>;
type Fiche = {
  slug: string;
  famille: typeof familles[number]["id"];
  nom: Texte;
  titre: Texte;
  description: Texte;
  image: string;
  alt: Texte;
};

export const solutions = [
  {
    slug: "domaines", famille: "construire", nom: texte("Domaines", "Domains"),
    titre: texte("Votre boutique à votre adresse", "Your store at your own address"),
    description: texte("Connectez un domaine que vous possédez déjà. AXSO affiche les enregistrements DNS à créer chez votre registraire et vérifie quand votre adresse est prête.", "Connect a domain you already own. AXSO shows which DNS records to add at your registrar and checks when the address is ready."),
    image: "/editorial/vitrine.webp", alt: texte("Façade d’une boutique avec sa propre enseigne", "A storefront with its own sign"),
  },
  {
    slug: "comptes-clients", famille: "construire", nom: texte("Comptes clients", "Customer accounts"),
    titre: texte("Un espace pour retrouver ses achats", "A place for customers to find their purchases"),
    description: texte("Depuis son compte sur votre vitrine, le client retrouve ses commandes, leur statut et les références des factures disponibles.", "From their storefront account, customers can look up previous orders, check order status and find references for available invoices."),
    image: "/editorial/colis.webp", alt: texte("Un achat emballé dans son carton", "A purchase packed in its shipping box"),
  },
  {
    slug: "catalogue", famille: "vendre", nom: texte("Catalogue", "Product catalogue"),
    titre: texte("Chaque article trouve sa place", "Give every item a place in your catalogue"),
    description: texte("Rassemblez photos, prix et variantes dans vos fiches produits. Organisez vos articles par catégorie pour que vos clients puissent parcourir la collection.", "Keep photos, prices and variants together in your product listings. Organise items by category so customers can browse the collection."),
    image: "/editorial/mediatheque.webp", alt: texte("Prise de vue d’une chaussure pour le catalogue", "A shoe being photographed for a catalogue"),
  },
  {
    slug: "automatisations", famille: "developper", nom: texte("Automatisations", "Automations"),
    titre: texte("Préparez le prochain message client", "Plan the next customer message"),
    description: texte("Associez un message de bienvenue ou de suivi à un événement de la boutique. Choisissez son délai et le canal disponible, par e-mail ou WhatsApp.", "Tie a welcome or follow-up message to a store event. Choose a delay and an available channel, by email or WhatsApp."),
    image: "/editorial/affiliation.webp", alt: texte("Une créatrice prépare la photo d’une nouvelle collection", "A creator photographing a new collection"),
  },
  {
    slug: "taxes", famille: "encaisser", nom: texte("Taxes et TVA", "Taxes and VAT"),
    titre: texte("Retrouvez la TVA sur le ticket", "See the VAT breakdown at checkout"),
    description: texte("La caisse utilise le taux de la boutique ou celui de l’article. Configurez des prix hors taxes ou toutes taxes comprises pour calculer les montants du ticket.", "The register uses the store rate or the individual item rate. Set prices inclusive or exclusive of tax to calculate the amounts on the receipt."),
    image: "/editorial/cabas.webp", alt: texte("Sac en cuir utilisé dans l’exemple de ticket de caisse", "Leather bag used in the sample sales receipt"),
  },
  {
    slug: "boutique-en-ligne", famille: "construire", nom: texte("Boutique en ligne", "Online store"),
    titre: texte("Une vitrine à votre image", "A storefront that feels like yours"),
    description: texte("Choisissez un thème, composez vos pages et présentez chaque variante de vos produits dans un catalogue adapté au téléphone.", "Choose a theme, arrange your pages and present each product variant in a mobile-friendly catalogue."),
    image: "/themes-apercu/cartes/noir-atelier-site.jpg", alt: texte("Aperçu du thème AXSO Noir Atelier", "Preview of the AXSO Noir Atelier theme"),
  },
  {
    slug: "whatsapp", famille: "vendre", nom: texte("Vente sur WhatsApp", "WhatsApp sales"),
    titre: texte("Du premier message au suivi de commande", "From the first message to order tracking"),
    description: texte("Retrouvez la commande liée à une conversation WhatsApp Business. Confirmez les articles, préparez une réponse rapide et partagez le suivi avec votre client.", "See the order linked to a WhatsApp Business conversation. Confirm the items, choose a quick reply and share tracking with your customer."),
    image: "/editorial/catalogue-chat.webp", alt: texte("Téléphone à côté d’une enceinte du catalogue", "Phone beside a speaker from the catalogue"),
  },
  {
    slug: "caisse", famille: "vendre", nom: texte("Caisse en magasin", "Point of sale"),
    titre: texte("Le même stock au comptoir et en ligne", "One inventory for your counter and online store"),
    description: texte("Ajoutez les articles au ticket et encaissez la vente au comptoir. La caisse enregistre les quantités vendues dans le stock partagé avec votre boutique.", "Add items to the receipt and take payment at the counter. The register records the quantities sold against the inventory your online store shares."),
    image: "/hero-stand.webp", alt: texte("Présentoir artisanal proposé à la vente", "Handcrafted display stand for sale"),
  },
  {
    slug: "vente-en-gros", famille: "vendre", nom: texte("Vente en gros (B2B)", "Wholesale (B2B)"),
    titre: texte("Un prix adapté à la quantité commandée", "Price each order by the quantity purchased"),
    description: texte("Définissez des paliers de prix pour vos produits physiques. Affichez la grille sur la fiche produit et précisez le minimum ou le multiple de commande pour vos revendeurs.", "Set quantity pricing tiers on physical products. Show the tiers on the product page and specify a minimum order or pack size for resellers."),
    image: "/hero-coffee.webp", alt: texte("Café vendu par lot dans l’exemple de commande en gros", "Coffee sold in packs in the sample wholesale order"),
  },
  {
    slug: "marches", famille: "vendre", nom: texte("Marchés", "Markets"),
    titre: texte("Des prix lisibles dans chaque marché", "Show shoppers prices in a familiar currency"),
    description: texte("La vitrine adapte la devise affichée au pays du visiteur. Le client peut changer de pays, tandis que les ventes restent comptabilisées dans la devise de la boutique.", "The storefront displays prices in the visitor’s local currency. Shoppers can change country while sales are recorded in the store’s currency."),
    image: "/editorial/terre-nuit.webp", alt: texte("Le continent africain vu de nuit", "Africa seen from above at night"),
  },
  {
    slug: "paiements", famille: "encaisser", nom: texte("Paiements", "Payments"),
    titre: texte("Organisez le règlement à la livraison", "Manage payment on delivery"),
    description: texte("Choisissez comment vos clients passent commande et dans quels pays vous acceptez le paiement à la réception. Suivez ensuite les sommes confiées au livreur.", "Choose how customers order and where you accept payment on delivery. Track the amounts your courier collects."),
    image: "/editorial/commande.webp", alt: texte("Un client reçoit sa commande en main propre", "A customer receiving a parcel by hand"),
  },
  {
    slug: "livraison", famille: "livrer", nom: texte("Livraison", "Delivery"),
    titre: texte("Suivez le colis jusqu’à la porte", "Follow the parcel to the customer’s door"),
    description: texte("Définissez vos zones et frais, assignez la course à un livreur et partagez le lien de suivi. Le client peut consulter l’avancement de sa livraison.", "Set delivery zones and fees, assign the trip to a courier and share the tracking link so customers can follow their delivery."),
    image: "/editorial/suivi-course.webp", alt: texte("Un livreur à moto tient le colis à remettre", "A motorcycle courier holding a parcel for delivery"),
  },
  {
    slug: "stock", famille: "livrer", nom: texte("Gestion du stock", "Inventory"),
    titre: texte("Gardez un œil sur chaque variante", "Keep track of every variant"),
    description: texte("Suivez les quantités par article et par variante. Les mouvements de stock permettent de retrouver une entrée, une vente ou une correction d’inventaire.", "Track quantities by item and variant. Stock movements let you trace a delivery, a sale or an inventory adjustment."),
    image: "/editorial/ventes.webp", alt: texte("Boîtes de produits empilées avant expédition", "Product boxes stacked before dispatch"),
  },
  {
    slug: "promotions", famille: "developper", nom: texte("Promotions", "Discounts"),
    titre: texte("Choisissez la remise qui convient", "Choose the right discount for a sale"),
    description: texte("Créez un code en pourcentage ou en montant fixe, limitez son nombre d’utilisations et retrouvez les codes actifs dans votre espace marchand.", "Create a percentage or fixed-amount code, limit how often it can be redeemed and find active codes in your merchant dashboard."),
    image: "/editorial/campagne-mode.webp", alt: texte("Visuel de campagne pour une collection de vêtements", "Campaign photograph for a clothing collection"),
  },
  {
    slug: "analyses", famille: "developper", nom: texte("Analyses", "Analytics"),
    titre: texte("Lisez vos ventes au-delà du total", "See what makes up your sales"),
    description: texte("Choisissez une période et rapprochez chiffre d’affaires, nombre de commandes et panier moyen pour comprendre l’évolution de votre boutique.", "Select a period and compare revenue, order count and average order value to understand how your store is doing."),
    image: "/editorial/conversion.webp", alt: texte("Vase en terre cuite du catalogue utilisé dans l’exemple de ventes", "Catalogue vase used in the sales example"),
  },
  {
    slug: "stella", famille: "axia", nom: texte("Stella"),
    titre: texte("Une première version avec Stella", "Start with a draft from Stella"),
    description: texte("Demandez à votre assistante de rédiger une fiche produit ou de préparer une idée de promotion. Relisez sa proposition avant de l’utiliser dans votre boutique.", "Ask your assistant to draft a product description or suggest a promotion. Review its proposal before using it in your store."),
    image: "/editorial/fiche.webp", alt: texte("Préparation du visuel d’un parfum pour sa fiche produit", "Preparing a perfume photograph for a product listing"),
  },
] as const satisfies readonly Fiche[];

export type Solution = typeof solutions[number];
export const lienSolution = (slug: Solution["slug"]) => `/fonctionnalites/${slug}`;

type Option = { choix: Texte; resultat: Texte; detail: Texte; image?: string };
type Exemple = { question: Texte; options: Option[] };

export const exemples: Record<Solution["slug"], Exemple> = {
  domaines: {
    question: texte("À quelle étape se trouve votre adresse ?", "Which stage has your domain reached?"),
    options: [
      { choix: texte("DNS en attente", "DNS pending"), resultat: texte("shop.example.com"), detail: texte("Copiez les enregistrements indiqués dans les réglages du domaine puis lancez la vérification dans AXSO.", "Copy the records shown in domain settings to your registrar, then run verification in AXSO.") },
      { choix: texte("Domaine actif", "Domain active"), resultat: texte("Votre adresse est prête", "Your address is ready"), detail: texte("Une fois le domaine actif, les anciens liens AXSO mènent à la même page sur votre domaine personnalisé.", "Once the domain is active, existing AXSO links lead to the same page on your custom domain.") },
    ],
  },
  "comptes-clients": {
    question: texte("Quelle commande souhaitez-vous consulter ?", "Which order would you like to inspect?"),
    options: [
      { choix: texte("Nº 1042", "No. 1042"), resultat: texte("En préparation", "Being packed"), detail: texte("Un cabas en cuir, 18 000 FCFA. Le client retrouve sa commande en cours dans son historique.", "One leather tote, 18,000 XAF. The customer can find the current order in their history.") },
      { choix: texte("Nº 1031", "No. 1031"), resultat: texte("Livrée", "Delivered"), detail: texte("Un foulard, 6 000 FCFA. La commande terminée conserve sa référence de facture F-1031.", "One scarf, 6,000 XAF. The completed order retains its invoice reference F-1031.") },
    ],
  },
  catalogue: {
    question: texte("Parcourez les catégories de cette collection", "Browse this collection by category"),
    options: [
      { choix: texte("Maroquinerie", "Leather goods"), resultat: texte("Cabas en cuir", "Leather tote"), detail: texte("La catégorie regroupe les sacs de la collection.", "This category groups the bags in the collection."), image: "/editorial/cabas.webp" },
      { choix: texte("Lunettes", "Eyewear"), resultat: texte("Monture bleue", "Blue frames"), detail: texte("La fiche réunit la photo et les caractéristiques de cette paire.", "The listing brings together the photo and details for this pair."), image: "/editorial/film-board.webp" },
    ],
  },
  automatisations: {
    question: texte("Quel événement déclenche le message ?", "Which event triggers the message?"),
    options: [
      { choix: texte("Nouveau client", "New customer"), resultat: texte("Bienvenue dans notre atelier", "Welcome to our studio"), detail: texte("Exemple de règle : envoyer un message de bienvenue une heure après la création du client.", "Sample rule: send a welcome message one hour after the customer record is created.") },
      { choix: texte("Commande livrée", "Order delivered"), resultat: texte("Comment trouvez-vous votre article ?", "How are you enjoying your purchase?"), detail: texte("Exemple de règle : envoyer un suivi deux jours après la livraison.", "Sample rule: send a follow-up two days after delivery.") },
    ],
  },
  taxes: {
    question: texte("Comment saisir un sac à 12 000 FCFA ?", "How would you enter a 12,000 XAF bag?"),
    options: [
      { choix: texte("TVA incluse", "VAT included"), resultat: texte("Total de 12 000 FCFA", "Total of 12,000 XAF"), detail: texte("Au taux illustratif de 20 %, le prix comprend 10 000 FCFA hors taxes et 2 000 FCFA de TVA.", "At an illustrative 20% rate, the price includes 10,000 XAF before tax and 2,000 XAF in VAT.") },
      { choix: texte("TVA ajoutée", "VAT added"), resultat: texte("Total de 14 400 FCFA", "Total of 14,400 XAF"), detail: texte("Au même taux illustratif de 20 %, la caisse ajoute 2 400 FCFA de TVA au prix hors taxes de 12 000 FCFA.", "At the same illustrative 20% rate, the register adds 2,400 XAF in VAT to the 12,000 XAF price before tax.") },
    ],
  },
  "boutique-en-ligne": {
    question: texte("Essayez un thème pour votre vitrine", "Try a theme for your storefront"),
    options: [
      { choix: texte("Noir Atelier"), resultat: texte("Noir Atelier"), detail: texte("Un fond sombre met la collection au premier plan.", "A dark backdrop brings the collection into focus."), image: "/themes-apercu/cartes/noir-atelier-site.jpg" },
      { choix: texte("Pop"), resultat: texte("Pop"), detail: texte("Comparez la palette et la mise en page de la même vitrine.", "Compare the palette and layout of this storefront."), image: "/themes-apercu/cartes/pop-site.jpg" },
      { choix: texte("Clarté"), resultat: texte("Clarté"), detail: texte("Voyez comment un thème clair présente les articles.", "See how a light theme presents the products."), image: "/themes-apercu/cartes/clarte-site.jpg" },
    ],
  },
  whatsapp: {
    question: texte("Choisissez une réponse rapide", "Choose a quick reply"),
    options: [
      { choix: texte("Confirmer", "Confirm"), resultat: texte("Pouvez-vous confirmer votre commande en répondant OUI ?", "Please reply YES to confirm your order."), detail: texte("Demandez la confirmation avant de préparer le colis.", "Request confirmation before packing the parcel.") },
      { choix: texte("Expédier", "Dispatch"), resultat: texte("Votre commande a été expédiée. Voici votre lien de suivi.", "Your order is on its way. Here is your tracking link."), detail: texte("Ajoutez le suivi de la commande liée à la conversation.", "Include tracking for the order linked to the conversation.") },
    ],
  },
  caisse: {
    question: texte("Combien de présentoirs passent en caisse ?", "How many display stands are at the counter?"),
    options: [1, 2, 3].map(q => ({
      choix: texte(String(q)), resultat: texte(`${12 * q} 000 FCFA`, `${12 * q},000 XAF`),
      detail: texte(`${q} × 12 000 FCFA. Après la vente, il reste ${8 - q} présentoirs sur les 8 en stock.`, `${q} × 12,000 XAF. After the sale, ${8 - q} of the original 8 stands remain in stock.`),
    })),
  },
  marches: {
    question: texte("Depuis quel pays consultez-vous le prix ?", "Where are you viewing the price from?"),
    options: [
      { choix: texte("Cameroun", "Cameroon"), resultat: texte("10 000 XAF", "10,000 XAF"), detail: texte("Le client voit le prix dans la devise de cette boutique camerounaise.", "The shopper sees the price in this Cameroonian store’s currency.") },
      { choix: texte("Sénégal", "Senegal"), resultat: texte("10 000 XOF", "10,000 XOF"), detail: texte("Le prix est affiché en francs CFA d’Afrique de l’Ouest. L’encaissement reste en XAF.", "The price is shown in West African CFA francs. The store still collects XAF.") },
      { choix: texte("Ghana"), resultat: texte("≈ 240 GHS"), detail: texte("Conversion illustrative en cedis pour le client ghanéen. Le prix de base reste de 10 000 XAF.", "Illustrative conversion into cedis for a Ghanaian shopper. The base price stays at 10,000 XAF.") },
    ],
  },
  "vente-en-gros": {
    question: texte("Quelle quantité de café commande le revendeur ?", "How much coffee is the reseller ordering?"),
    options: [
      { choix: texte("6 paquets", "6 packs"), resultat: texte("18 000 FCFA", "18,000 XAF"), detail: texte("Au tarif de base, 6 paquets à 3 000 FCFA coûtent 18 000 FCFA.", "At the base price, 6 packs at 3,000 XAF each cost 18,000 XAF.") },
      { choix: texte("12 paquets", "12 packs"), resultat: texte("30 000 FCFA", "30,000 XAF"), detail: texte("À partir de 12 paquets, le prix unitaire de cet exemple passe à 2 500 FCFA.", "From 12 packs, the unit price in this example drops to 2,500 XAF.") },
    ],
  },
  paiements: {
    question: texte("Comment le client passe-t-il commande ?", "How is the customer placing the order?"),
    options: [
      { choix: texte("Sur la vitrine", "On the storefront"), resultat: texte("À régler à la réception", "Due on delivery"), detail: texte("Le client renseigne ses coordonnées et choisit le paiement à la livraison lorsque sa zone est acceptée.", "The customer enters their details and selects payment on delivery in an eligible area.") },
      { choix: texte("Sur WhatsApp", "On WhatsApp"), resultat: texte("Commande à confirmer", "Awaiting confirmation"), detail: texte("Le panier est repris dans la conversation. Confirmez l’adresse et le montant à percevoir à la livraison.", "The conversation includes the basket. Confirm the address and the amount due on delivery.") },
    ],
  },
  livraison: {
    question: texte("Suivez les étapes d’une course", "Follow a delivery through its stages"),
    options: [
      { choix: texte("Préparation", "Packing"), resultat: texte("Colis à assigner", "Ready for assignment"), detail: texte("La commande est préparée. Le marchand choisit un livreur pour la zone de destination.", "The order is packed. The merchant selects a courier for the destination zone."), image: "/editorial/colis.webp" },
      { choix: texte("En route", "In transit"), resultat: texte("Le livreur est en route", "Courier on the way"), detail: texte("Le client ouvre son lien de suivi pour consulter l’avancement de la course.", "The customer opens their tracking link to see delivery progress."), image: "/editorial/suivi-course.webp" },
      { choix: texte("Réception", "Received"), resultat: texte("Colis remis au client", "Delivered to the customer"), detail: texte("Le livreur confirme la remise du colis et renseigne l’encaissement à rapprocher.", "The courier confirms the handover and records the payment for reconciliation."), image: "/editorial/commande.webp" },
    ],
  },
  stock: {
    question: texte("Appliquez un mouvement à un stock de 12 articles", "Apply a movement to a stock of 12 items"),
    options: [
      { choix: texte("Réception de 6", "Receive 6"), resultat: texte("18 articles disponibles", "18 items available"), detail: texte("Les six articles reçus s’ajoutent aux douze déjà en rayon.", "The six incoming items join the twelve already on the shelf.") },
      { choix: texte("Vente de 2", "Sell 2"), resultat: texte("10 articles disponibles", "10 items available"), detail: texte("Deux unités sortent du stock à l’enregistrement de la vente.", "Recording the sale removes two units from inventory.") },
    ],
  },
  promotions: {
    question: texte("Appliquez une remise à un panier de 20 000 FCFA", "Apply a discount to a 20,000 XAF basket"),
    options: [
      { choix: texte("10 %", "10%"), resultat: texte("18 000 FCFA", "18,000 XAF"), detail: texte("La remise de 2 000 FCFA varie avec la valeur du panier.", "The 2,000 XAF saving changes with the basket value.") },
      { choix: texte("3 000 FCFA", "3,000 XAF"), resultat: texte("17 000 FCFA", "17,000 XAF"), detail: texte("Le code déduit un montant fixe de 3 000 FCFA.", "The code deducts a fixed amount of 3,000 XAF.") },
    ],
  },
  analyses: {
    question: texte("Comparez les ventes de vases par période", "Compare vase sales by period"),
    options: [
      { choix: texte("Aujourd’hui", "Today"), resultat: texte("36 000 FCFA", "36,000 XAF"), detail: texte("3 commandes, soit un panier moyen de 12 000 FCFA.", "3 orders with an average order value of 12,000 XAF.") },
      { choix: texte("Cette semaine", "This week"), resultat: texte("210 000 FCFA", "210,000 XAF"), detail: texte("15 commandes, soit un panier moyen de 14 000 FCFA.", "15 orders with an average order value of 14,000 XAF.") },
    ],
  },
  stella: {
    question: texte("Que souhaitez-vous préparer avec Stella ?", "What would you like to draft with Stella?"),
    options: [
      { choix: texte("Fiche parfum", "Perfume listing"), resultat: texte("Eau de parfum Ambre", "Amber eau de parfum"), detail: texte("« Un accord ambré aux notes boisées, présenté dans un flacon de 50 ml. » Vérifiez les notes et la contenance avant publication.", "“An amber fragrance with woody notes, in a 50 ml bottle.” Check the notes and size before publishing.") },
      { choix: texte("Message de lancement", "Launch message"), resultat: texte("La collection Ambre est arrivée", "The Amber collection has arrived"), detail: texte("« Découvrez notre nouvelle eau de parfum en boutique cette semaine. » Adaptez ce brouillon à votre campagne.", "“Discover our new eau de parfum in store this week.” Adapt this draft to your campaign.") },
    ],
  },
};
