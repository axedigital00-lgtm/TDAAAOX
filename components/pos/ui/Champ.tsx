"use client";
// Champs de saisie de la caisse : libellé relié au champ, aide et erreur
// annoncées aux lecteurs d'écran, hauteur tactile de 44 px.
import { useId } from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/components/I18nProvider";

/** Classe d'un <input>, <select> ou <textarea> du kit (à poser sur un champ natif). */
export const CLASSE_SAISIE =
  "w-full min-h-11 rounded-[10px] border border-[#8a8a8a] bg-white px-3 py-2 text-[14px] text-[#1a1a1a] placeholder:text-[#8a8a8a] outline-none transition-colors focus:border-[#1a1a1a] focus:shadow-[0_0_0_1px_#1a1a1a] disabled:bg-[#f7f7f7] disabled:text-[#8a8a8a] aria-[invalid=true]:border-[#8e0b21]";

export type ChampProps = {
  label: string;
  aide?: string;
  /** Message d'erreur (phrase complète) : colore le champ et est annoncé. */
  erreur?: string | null;
  /** Masque visuellement le libellé (il reste lu par les lecteurs d'écran). */
  labelMasque?: boolean;
  /**
   * Le champ lui-même. Fonction : reçoit les attributs à poser sur l'élément
   * natif (id, aria-describedby, aria-invalid) pour le relier au libellé.
   */
  children: React.ReactNode | ((attributs: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => React.ReactNode);
  className?: string;
};

export function Champ({ label, aide, erreur, labelMasque, children, className }: ChampProps) {
  const t = useT();
  const id = useId();
  const decrit = erreur ? `${id}-erreur` : aide ? `${id}-aide` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className={labelMasque ? "sr-only" : "block text-[13px] font-medium text-[#303030]"}>{t(label)}</label>
      <div className={labelMasque ? undefined : "mt-1"}>
        {typeof children === "function" ? children({ id, "aria-describedby": decrit, "aria-invalid": erreur ? true : undefined }) : children}
      </div>
      {erreur
        ? <p id={`${id}-erreur`} role="alert" className="mt-1 text-[12px] leading-snug text-[#8e0b21]">{t(erreur)}</p>
        : aide && <p id={`${id}-aide`} className="mt-1 text-[12px] leading-snug text-[#616161]">{t(aide)}</p>}
    </div>
  );
}

export type SaisieProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "className"> & Pick<ChampProps, "label" | "aide" | "erreur" | "labelMasque"> & {
  /** Texte ou icône à droite du champ (devise, unité, « kg »). */
  suffixe?: React.ReactNode;
  className?: string;
  ref?: React.Ref<HTMLInputElement>;
};

/** Champ texte ou numérique complet : libellé + <input> + aide / erreur. */
export function Saisie({ label, aide, erreur, labelMasque, suffixe, className, ref, ...input }: SaisieProps) {
  return (
    <Champ label={label} aide={aide} erreur={erreur} labelMasque={labelMasque} className={className}>
      {(attributs) => (
        <div className="relative">
          <input ref={ref} {...input} {...attributs} className={cn(CLASSE_SAISIE, suffixe ? "pr-14" : undefined)} />
          {suffixe && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[12px] font-medium text-[#616161]">{suffixe}</span>}
        </div>
      )}
    </Champ>
  );
}
