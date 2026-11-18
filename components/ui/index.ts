/*
 * Kit d'interface Axso — à importer depuis "@/components/ui" (dashboard, affilié, livreur, admin).
 * La caisse garde son propre kit (components/pos/ui), même logique, mêmes couleurs.
 *
 * JETONS (app/globals.css) — ne plus écrire de couleur en dur (#F5A623, #111111, #666666…) :
 *   bg-primaire / text-sur-primaire / hover:bg-primaire-hover  action principale, marque (jaune Axso)
 *   bg-primaire-fond                                            sélection, mise en avant légère
 *   bg-secondaire (noir)                                        action forte non principale, onglet actif
 *   bg-fond (page) · bg-carte (contenu) · bg-carte-2 (zone secondaire, pied de modale)
 *   border-bordure · border-bordure-forte (survol)
 *   text-encre (texte principal) · text-doux (secondaire, aide) · text-discret (jamais pour un texte utile)
 *   succes / attention / erreur / info : text-X, bg-X-fond, border-X-bordure (états, partout les mêmes)
 *   rounded-controle (bouton, champ) · rounded-carte · rounded-modale · shadow-carte · shadow-flottante
 *   Espacements : px-page · space-y-section · p-carte · space-y-champs
 *   Typo : ax-titre-page · ax-titre-section · ax-sous-titre · ax-texte · ax-libelle
 *          ax-texte-secondaire · ax-aide · ax-erreur-champ (badge et bouton : gérés par leur composant)
 *   Icônes : lucide-react uniquement ; une icône seule n'a de sens que si elle est évidente (BoutonIcone + label).
 *
 * QUAND UTILISER QUOI
 *   EnTetePage   Haut de chaque page : titre (où suis-je), description si utile, retour ou filAriane,
 *                indicateurs, actions (secondaires puis la principale en dernier, une seule « primaire »).
 *   Bouton       Toute action. variante : primaire (1 par écran) · secondaire · fantome (tertiaire, listes)
 *                · danger (ouvre une suppression) · danger-plein (confirme une suppression) · sombre.
 *                charge + texteCharge pendant un appel (bloque le double clic) ; href pour un lien.
 *                Libellé = verbe + objet (« Ajouter un produit »), jamais « OK » / « Valider ».
 *   BoutonIcone  Icône seule au sens évident (fermer, supprimer une ligne) ; `label` obligatoire.
 *   classesBouton  Style bouton sur un autre élément (<label> d'upload, <a> externe).
 *   Saisie / ZoneTexte / Champ  Tout champ : libellé visible (jamais le placeholder seul), mention
 *                « obligatoire »/« facultatif » (marquer le cas minoritaire), aide avant, erreur sous
 *                le champ en phrase qui dit quoi corriger. Champ(children en fonction) pour un <select>
 *                ou un composant maison (composant client seulement : une fonction ne passe pas depuis
 *                une page serveur) ; CLASSE_SAISIE pour le style seul.
 *   Badge        Statut court dans une liste. ton : neutre · accent · succes · attention · erreur · info.
 *                Le texte porte le sens (pas la couleur seule).
 *   Alerte       Bandeau dans la page : titre (ce qui se passe) + texte (pourquoi) + action (quoi faire).
 *                Retour bref après une action : toast (sonner), pas une Alerte.
 *   Modale       Fenêtre (<dialog> natif : Échap, focus piégé puis rendu, téléphone = en bas d'écran).
 *   Confirmation / useConfirmation  Avant une action destructrice ou sensible : titre-question,
 *                `objet` NOMMÉ, conséquence, libellé de bouton explicite. Remplace window.confirm.
 *                Pas de confirmation pour une action anodine ou réversible.
 *   EtatVide     Liste vide : pourquoi c'est vide + l'action pertinente (Bouton).
 *   EtatErreur   Échec de chargement : ce qui a échoué + onReessayer.
 *   EtatChargement / Squelette / SqueletteListe  Chargement (squelette pour une liste ou une carte).
 *
 * RÈGLES : textes passés déjà traduits (t()/getT()) ; chaque nouvelle chaîne → lib/i18n/en/*.json.
 * Utilisable à 360 px, cibles tactiles ≥ 40 px, animations coupées par prefers-reduced-motion
 * (règle globale de globals.css). Ne pas modifier l'apparence d'un composant pour une page :
 * passer className pour la mise en page seulement.
 */
export { Bouton, BoutonIcone, classesBouton, type BoutonProps, type VarianteBouton, type TailleBouton } from "./Bouton";
export { Champ, Saisie, ZoneTexte, CLASSE_SAISIE, type ChampProps, type SaisieProps, type ZoneTexteProps } from "./Champ";
export { Badge, TONS, type Ton } from "./Badge";
export { Alerte, type AlerteProps, type TonAlerte } from "./Alerte";
export { Modale, Confirmation, useConfirmation, type ModaleProps, type ConfirmationProps, type OptionsConfirmation } from "./Modale";
export { EnTetePage, type EnTetePageProps } from "./EnTetePage";
export { EtatVide, EtatErreur, EtatChargement, Squelette, SqueletteListe } from "./Etats";
