// Bouton de l'interface (dashboard, affilié, livreur, admin). Même API que le kit
// de la caisse (components/pos/ui) mais sur les jetons de app/globals.css.
// États : survol, appui, focus clavier, désactivé, chargement (bloque le double clic).
// Cible tactile ≥ 40 px sur téléphone, y compris en « compact ».
// Pas de "use client" : utilisable tel quel dans une page serveur (lien, bouton de formulaire).
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type VarianteBouton = "primaire" | "secondaire" | "fantome" | "danger" | "danger-plein" | "sombre";
export type TailleBouton = "compact" | "normal" | "grand";

const VARIANTES: Record<VarianteBouton, string> = {
  /** L'action principale de l'écran (une seule). */
  primaire: "bg-primaire text-sur-primaire hover:bg-primaire-hover shadow-sm",
  /** Action forte mais pas principale (ex. « Aperçu »), ou primaire sur fond ambre. */
  sombre: "bg-secondaire text-carte hover:bg-secondaire-hover shadow-sm",
  /** Actions secondaires : ne concurrence pas la principale. */
  secondaire: "bg-carte text-encre border border-bordure hover:border-bordure-forte hover:bg-carte-2",
  /** Fantôme : action tertiaire, dans une liste ou une barre d'outils (pas de fond ni de bordure). */
  fantome: "bg-transparent text-encre hover:bg-carte-2 active:bg-bordure/60",
  /** Ouvre une action destructrice (le bouton qui mène à la confirmation). */
  danger: "bg-carte text-erreur border border-erreur-bordure hover:bg-erreur-fond",
  /** Confirme une action destructrice (dans la boîte de confirmation). */
  "danger-plein": "bg-erreur text-white hover:brightness-90 shadow-sm",
};

const TAILLES: Record<TailleBouton, string> = {
  compact: "min-h-10 sm:min-h-8 px-3 text-xs gap-1.5",
  normal: "min-h-10 px-4 text-sm gap-2",
  grand: "min-h-12 px-6 text-base gap-2",
};

/** Base commune : utile pour styler un élément qui n'est pas un <button> (ex. <label> d'upload). */
export function classesBouton({ variante = "primaire", taille = "normal", large, className }: { variante?: VarianteBouton; taille?: TailleBouton; large?: boolean; className?: string } = {}) {
  return cn(
    "inline-flex items-center justify-center rounded-controle font-semibold whitespace-nowrap select-none",
    "transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:scale-[0.97]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 aria-disabled:opacity-50 aria-disabled:pointer-events-none",
    "max-sm:whitespace-normal max-sm:text-center [&>svg]:shrink-0",
    VARIANTES[variante], TAILLES[taille], large && "w-full", className,
  );
}

export type BoutonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  variante?: VarianteBouton;
  taille?: TailleBouton;
  type?: "button" | "submit" | "reset";
  /** Action en cours : indicateur + bouton bloqué (anti double clic). */
  charge?: boolean;
  /** Libellé pendant le chargement (« Enregistrement… »). Par défaut : le libellé normal. */
  texteCharge?: React.ReactNode;
  /** Rend un lien (navigation) au lieu d'un bouton. Ignoré si désactivé. */
  href?: string;
  /** Icône lucide à gauche du libellé (remplacée par l'indicateur pendant le chargement). */
  icone?: React.ReactNode;
  /** Occupe toute la largeur. */
  large?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
};

export function Bouton({ variante, taille, type = "button", charge, texteCharge, href, icone, large, className, children, disabled, ...reste }: BoutonProps) {
  const classes = classesBouton({ variante, taille, large, className });
  const contenu = (
    <>
      {charge ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icone}
      {charge && texteCharge ? texteCharge : children}
    </>
  );
  if (href && !disabled && !charge) {
    return <Link href={href} className={classes} aria-label={reste["aria-label"]} title={reste.title}>{contenu}</Link>;
  }
  return (
    <button type={type} disabled={disabled || charge} aria-busy={charge || undefined} className={classes} {...reste}>
      {contenu}
    </button>
  );
}

/** Bouton à icône seule. `label` est obligatoire : c'est son nom pour les lecteurs d'écran et son infobulle.
 *  Réservé aux icônes au sens évident (fermer, supprimer une ligne, menu) ; sinon, un Bouton avec libellé. */
export function BoutonIcone({ label, variante = "fantome", className, children, ...reste }: Omit<BoutonProps, "icone" | "texteCharge" | "large" | "taille" | "aria-label"> & { label: string }) {
  return (
    <Bouton {...reste} variante={variante} aria-label={label} title={label} className={cn("size-10 min-h-10 shrink-0 px-0", className)}>
      {reste.charge ? null : children}
    </Bouton>
  );
}
