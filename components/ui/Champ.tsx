"use client";
// Champs de formulaire : libellé toujours visible et relié au champ, mention
// « obligatoire » / « facultatif », aide sous le libellé, erreur sous le champ
// (annoncée aux lecteurs d'écran). Les textes passés ici sont déjà traduits.
import { useId } from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/components/I18nProvider";

/** Classe d'un <input>, <select> ou <textarea> natif (à poser soi-même quand on n'utilise pas Saisie / ZoneTexte). */
export const CLASSE_SAISIE = cn(
  "w-full min-h-10 rounded-controle border border-bordure bg-carte px-3 py-2 text-sm text-encre placeholder:text-discret",
  "outline-none transition-[border-color,box-shadow] duration-150 hover:border-bordure-forte",
  "focus:border-primaire focus-visible:ring-3 focus-visible:ring-primaire/25",
  "disabled:bg-carte-2 disabled:text-discret disabled:cursor-not-allowed",
  "aria-[invalid=true]:border-erreur aria-[invalid=true]:focus-visible:ring-erreur/20",
);

type Attributs = { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean };

export type ChampProps = {
  label: React.ReactNode;
  /** Affiche « obligatoire » ou « facultatif » après le libellé. Dans un formulaire, marquer le cas minoritaire suffit. */
  mention?: "obligatoire" | "facultatif";
  /** Ce qui est attendu (format, contrainte), affiché avant la saisie. */
  aide?: React.ReactNode;
  /** Erreur en phrase complète (« Indique un prix supérieur à 0. ») : colore le champ et est annoncée. */
  erreur?: React.ReactNode;
  /** Masque le libellé à l'œil (il reste lu par les lecteurs d'écran). Réservé aux champs de recherche avec loupe. */
  labelMasque?: boolean;
  /** Le champ natif. En fonction : reçoit id / aria-describedby / aria-invalid à poser dessus. */
  children: React.ReactNode | ((attributs: Attributs) => React.ReactNode);
  className?: string;
};

export function Champ({ label, mention, aide, erreur, labelMasque, children, className }: ChampProps) {
  const t = useT();
  const id = useId();
  const decrit = [aide && `${id}-aide`, erreur && `${id}-erreur`].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className={labelMasque ? "sr-only" : "ax-libelle block"}>
        {label}
        {mention && <span className="ml-1.5 text-xs font-normal text-doux">{t(mention === "obligatoire" ? "(obligatoire)" : "(facultatif)")}</span>}
      </label>
      {aide && <p id={`${id}-aide`} className="ax-aide">{aide}</p>}
      {typeof children === "function"
        ? children({ id, "aria-describedby": decrit, "aria-invalid": erreur ? true : undefined })
        : children}
      {erreur && <p id={`${id}-erreur`} role="alert" className="ax-erreur-champ">{erreur}</p>}
    </div>
  );
}

type PropsCommunes = Pick<ChampProps, "label" | "mention" | "aide" | "erreur" | "labelMasque"> & { classeChamp?: string };

export type SaisieProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "className"> & PropsCommunes & {
  /** Texte à droite dans le champ (devise, unité). */
  suffixe?: React.ReactNode;
  /** Classe du bloc entier (libellé + champ). */
  className?: string;
  ref?: React.Ref<HTMLInputElement>;
};

/** Libellé + <input> + aide + erreur. `required` sans `mention` affiche « obligatoire ». */
export function Saisie({ label, mention, aide, erreur, labelMasque, suffixe, className, classeChamp, ref, ...input }: SaisieProps) {
  return (
    <Champ label={label} mention={mention ?? (input.required ? "obligatoire" : undefined)} aide={aide} erreur={erreur} labelMasque={labelMasque} className={className}>
      {(attributs) => (
        <div className="relative">
          <input ref={ref} {...input} {...attributs} className={cn(CLASSE_SAISIE, suffixe ? "pr-14" : undefined, classeChamp)} />
          {suffixe && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-doux">{suffixe}</span>}
        </div>
      )}
    </Champ>
  );
}

export type ZoneTexteProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> & PropsCommunes & {
  className?: string;
  ref?: React.Ref<HTMLTextAreaElement>;
};

/** Libellé + <textarea> + aide + erreur. */
export function ZoneTexte({ label, mention, aide, erreur, labelMasque, className, classeChamp, ref, rows = 4, ...zone }: ZoneTexteProps) {
  return (
    <Champ label={label} mention={mention ?? (zone.required ? "obligatoire" : undefined)} aide={aide} erreur={erreur} labelMasque={labelMasque} className={className}>
      {(attributs) => <textarea ref={ref} rows={rows} {...zone} {...attributs} className={cn(CLASSE_SAISIE, "resize-y leading-relaxed", classeChamp)} />}
    </Champ>
  );
}
