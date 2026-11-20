"use client";
// Boutons de la caisse. Cible tactile ≥ 44 px par défaut (48 px en « grand »,
// pour PAYER et les actions d'écran de caisse), focus clavier visible, état de
// chargement qui bloque le double appui.
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FOCUS } from "./tokens";

export type VarianteBouton = "primaire" | "sombre" | "secondaire" | "discret" | "danger";
export type TailleBouton = "normal" | "grand" | "compact";

// Variantes alignées sur les boutons de l'admin : principal noir, secondaire blanc
// à contour, discret gris clair, danger rouge sobre.
const VARIANTES: Record<VarianteBouton, string> = {
  primaire: "bg-[#1a1a1a] text-white hover:bg-[#2b2b2b] shadow-[inset_0_-1px_0_#000,0_1px_0_rgba(0,0,0,.2)]",
  sombre: "bg-[#1a1a1a] text-white hover:bg-[#2b2b2b] shadow-[inset_0_-1px_0_#000,0_1px_0_rgba(0,0,0,.2)]",
  secondaire: "bg-white text-[#1a1a1a] shadow-[inset_0_0_0_1px_#dcdcdc,inset_0_-1px_0_#d4d4d4] hover:bg-[#f7f7f7]",
  discret: "bg-[#f1f1f1] text-[#1a1a1a] hover:bg-[#e3e3e3]",
  danger: "bg-white text-[#8e0b21] shadow-[inset_0_0_0_1px_#fedad9] hover:bg-[#fff4f4]",
};
// « compact » reste à 44 px de haut : seule la largeur et le texte se resserrent.
const TAILLES: Record<TailleBouton, string> = {
  compact: "min-h-11 px-3 text-[12px]",
  normal: "min-h-11 px-4 text-[13px]",
  grand: "min-h-14 px-6 text-[16px]",
};

export type BoutonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  /** Rend un lien (navigation) au lieu d'un bouton. */
  href?: string;
  variante?: VarianteBouton;
  taille?: TailleBouton;
  type?: "button" | "submit";
  disabled?: boolean;
  /** Action en cours : affiche un indicateur et bloque le bouton. */
  charge?: boolean;
  /** Occupe toute la largeur disponible. */
  large?: boolean;
  icone?: React.ReactNode;
  /** Raccourci clavier affiché à droite (« F5 ») et annoncé aux lecteurs d'écran. */
  raccourci?: string;
  className?: string;
  "aria-label"?: string;
};

export function Bouton({ children, onClick, href, variante = "primaire", taille = "normal", type = "button", disabled, charge, large, icone, raccourci, className, ...aria }: BoutonProps) {
  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-[10px] font-semibold transition-colors select-none disabled:opacity-50 disabled:cursor-not-allowed",
    VARIANTES[variante], TAILLES[taille], large && "w-full", FOCUS, className,
  );
  const contenu = (
    <>
      {charge ? <Loader2 size={taille === "grand" ? 18 : 15} className="animate-spin" aria-hidden /> : icone}
      <span className="truncate">{children}</span>
      {raccourci && <kbd className="ml-1 rounded-md bg-black/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide">{raccourci}</kbd>}
    </>
  );
  if (href && !disabled) return <Link href={href} className={classes} aria-label={aria["aria-label"]}>{contenu}</Link>;
  return (
    <button type={type} onClick={onClick} disabled={disabled || charge} aria-busy={charge || undefined} aria-keyshortcuts={raccourci} aria-label={aria["aria-label"]} className={classes}>
      {contenu}
    </button>
  );
}

/** Bouton carré à icône seule (44 × 44 px). `label` est obligatoire : c'est son nom pour les lecteurs d'écran. */
export function BoutonIcone({ label, children, onClick, variante = "secondaire", disabled, className }: {
  label: string; children: React.ReactNode; onClick?: () => void; variante?: VarianteBouton; disabled?: boolean; className?: string;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label}
      className={cn("inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[10px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed", VARIANTES[variante], FOCUS, className)}>
      {children}
    </button>
  );
}
