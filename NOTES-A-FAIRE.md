# Notes à faire — parcours création → personnalisation → publication

Test fait le 19/10/2026 en local, en conditions réelles (boutique « Pagne Chic Test », sacs en pagne, Cameroun, design NDOP).
Résultat : le parcours marche de bout en bout, mais il n'est pas encore facile pour un débutant.

Déjà corrigé : Ctrl+A dans un texte du Constructeur effaçait toute la section (titre, paragraphe, bouton).

## À corriger (par ordre d'importance)

### 1. Activer un produit avant de publier : rien ne l'explique
- L'IA crée 4 produits **inactifs**, stock 0, sans photo. Le bouton Publier de la boutique est donc bloqué (« Il manque : au moins un produit actif »).
- Le lien « Ajouter un produit → » mène à `/dashboard/produits` : 4 cartes « Inactif · Épuisé », sans aucune explication.
- Le marchand doit deviner : ouvrir un produit, mettre le stock, cliquer « Publier » sur la fiche, puis « Publier quand même ».
- **Solution proposée** : un bandeau sur la liste des produits (« Axia t'a préparé 4 produits : ajoute une photo et ton stock, puis active-en au moins un ») et/ou un bouton « Activer » directement sur chaque carte. Le lien du Constructeur pourrait aussi pointer vers ces produits plutôt que vers « ajouter ».

### 2. Fiche produit trop chargée pour un débutant
- Pour vendre un sac, on voit : affiliation, codes-barres, SEO, variantes de prix, FAQ, champs à la commande…
- **Solution proposée** : un mode simple (nom, photo, prix, stock, description) et « Plus d'options » repliées.

### 3. Texte du design qui ne parle pas du marchand
- NDOP affiche « Bamiléké, bogolan, kente, adiré — ateliers partenaires que nous nommons ». Un marchand pressé publie ces affirmations, qui ne sont pas les siennes.
- **Solution proposée** : faire réécrire par l'IA les textes du design à partir de la description donnée à l'inscription, ou les signaler « à remplacer » avant de publier.

### 4. Messages qui promettent autre chose
- Page d'inscription : « En ligne en 60 secondes », alors que la boutique reste en brouillon jusqu'à la publication manuelle.
- Pendant les questions : « Une dernière chose avant l'analyse » est suivi de 2 questions (nom, pays) ; le toast « Axia analyse ton projet… » s'affiche avant la question du pays.

### 5. Tour de bienvenue qui ne parle pas de publication
- Il présente Axia, Commandes & Produits, Ma boutique, Équipe, mais jamais « personnalise ta boutique, active un produit, puis publie ».

### 6. Détails
- « Build your empire here » en anglais dans le menu, interface en français.
- Liste produits : compteur « Épuisés : 0 » alors que les 4 cartes affichent « Épuisé » (le compteur ne compte sans doute que les produits actifs).
- Bouton Annuler du Constructeur : si on clique dessus pendant qu'on écrit encore dans un texte, il ne restaure pas (il faut d'abord cliquer ailleurs). La modif est enregistrée automatiquement après 3,5 s.

## Données de test à nettoyer
- Base locale : compte `delivered+parcours1@resend.dev` et boutique `pagne-chic-test` (sa bannière principale est abîmée par le bug Ctrl+A).
