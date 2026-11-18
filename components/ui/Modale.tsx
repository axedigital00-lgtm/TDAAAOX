"use client";
// Fenêtre modale et confirmation d'action destructrice, sur <dialog> natif :
// piège à focus, Échap, fond inerte et retour du focus sont fournis par le navigateur.
// Sur téléphone, la fenêtre s'ouvre en bas de l'écran (pouce). Textes passés déjà traduits.
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/components/I18nProvider";
import { Bouton, BoutonIcone } from "./Bouton";

const LARGEURS = { sm: "sm:max-w-sm", md: "sm:max-w-lg", lg: "sm:max-w-2xl", xl: "sm:max-w-4xl" } as const;

export type ModaleProps = {
  ouverte: boolean;
  /** Demande de fermeture : croix, Échap, clic sur le fond. */
  onFermer: () => void;
  titre: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  /** Pied : boutons (secondaire à gauche, principal à droite). */
  actions?: React.ReactNode;
  /** Bloque Échap, clic extérieur et croix (opération en cours). */
  verrouillee?: boolean;
  taille?: keyof typeof LARGEURS;
};

export function Modale({ ouverte, onFermer, titre, description, children, actions, verrouillee, taille = "md" }: ModaleProps) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (ouverte && !d.open) d.showModal();
    else if (!ouverte && d.open) d.close();
  }, [ouverte]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-titre`}
      aria-describedby={description ? `${id}-description` : undefined}
      onCancel={(e) => { e.preventDefault(); if (!verrouillee) onFermer(); }}
      onClick={(e) => { if (e.target === ref.current && !verrouillee) onFermer(); }}
      className={cn(
        "bg-transparent p-0 text-encre backdrop:bg-black/50 open:flex",
        "m-0 mt-auto max-h-[92dvh] w-full max-w-full sm:m-auto sm:max-h-[86dvh]", LARGEURS[taille],
      )}
    >
      {ouverte && (
        <div className="flex max-h-full w-full flex-col overflow-hidden rounded-t-modale bg-carte shadow-flottante sm:rounded-modale">
          <header className="flex items-start gap-3 border-b border-bordure px-5 py-4">
            <div className="min-w-0 flex-1">
              <h2 id={`${id}-titre`} className="ax-sous-titre">{titre}</h2>
              {description && <div id={`${id}-description`} className="mt-1 ax-texte-secondaire">{description}</div>}
            </div>
            {!verrouillee && <BoutonIcone label={t("Fermer")} onClick={onFermer} className="-mr-2 -mt-2"><X className="size-5" aria-hidden /></BoutonIcone>}
          </header>
          {children && <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>}
          {actions && <footer className="flex flex-col-reverse gap-2 border-t border-bordure bg-carte-2 px-5 py-3 sm:flex-row sm:justify-end">{actions}</footer>}
        </div>
      )}
    </dialog>
  );
}

export type OptionsConfirmation = {
  /** Question qui nomme l'action : « Supprimer ce produit ? ». */
  titre: React.ReactNode;
  /** L'objet concerné, nommé : « Robe wax taille M ». Obligatoire : on ne confirme jamais à l'aveugle. */
  objet: React.ReactNode;
  /** Conséquence réelle : « Il disparaît de ta boutique. Les commandes passées restent visibles. » */
  description?: React.ReactNode;
  /** Libellé du bouton qui exécute : « Supprimer le produit » (jamais « OK »). */
  libelleConfirmer: string;
  /** false pour une action sensible mais non destructrice (bouton primaire au lieu de rouge). */
  destructive?: boolean;
  /** Libellé du bouton qui renonce (« Garder la commande »). Par défaut « Annuler »,
   *  ou « Ne pas annuler » quand l'action elle-même est une annulation. */
  libelleAnnuler?: string;
};

export type ConfirmationProps = OptionsConfirmation & {
  ouverte: boolean;
  onFermer: () => void;
  /** Exécute l'action. Promesse : le bouton affiche le chargement et la fenêtre se ferme au succès
   *  (en cas d'erreur elle reste ouverte : à l'appelant d'afficher le message). */
  onConfirmer: () => void | Promise<unknown>;
};

/** Confirmation d'une action destructrice ou sensible, qui nomme l'objet. Pas pour les actions anodines. */
export function Confirmation({ ouverte, onFermer, onConfirmer, titre, objet, description, libelleConfirmer, destructive = true, libelleAnnuler }: ConfirmationProps) {
  const t = useT();
  const [enCours, setEnCours] = useState(false);
  const confirmer = async () => {
    setEnCours(true);
    try { await onConfirmer(); onFermer(); } catch { /* l'appelant signale l'erreur ; la fenêtre reste ouverte */ } finally { setEnCours(false); }
  };
  return (
    <Modale ouverte={ouverte} onFermer={onFermer} verrouillee={enCours} taille="sm" titre={titre}
      actions={<>
        <Bouton variante="secondaire" onClick={onFermer} disabled={enCours}>{libelleAnnuler ?? (/^(annuler|cancel)\b/i.test(libelleConfirmer.trim()) ? t("Ne pas annuler") : t("Annuler"))}</Bouton>
        <Bouton variante={destructive ? "danger-plein" : "primaire"} onClick={confirmer} charge={enCours} autoFocus={!destructive}>{libelleConfirmer}</Bouton>
      </>}>
      <div className="space-y-3">
        <p className={cn("flex items-start gap-2 rounded-controle border px-3 py-2.5 text-sm font-semibold",
          destructive ? "border-erreur-bordure bg-erreur-fond text-erreur" : "border-bordure bg-carte-2 text-encre")}>
          {destructive && <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />}
          <span className="min-w-0 break-words">{objet}</span>
        </p>
        {description && <div className="ax-texte-secondaire">{description}</div>}
      </div>
    </Modale>
  );
}

/**
 * Remplace `window.confirm` sans changer la logique de l'appelant :
 *   const { confirmer, dialogue } = useConfirmation();
 *   if (!(await confirmer({ titre, objet, libelleConfirmer }))) return;
 *   … et rendre {dialogue} dans le JSX.
 */
export function useConfirmation() {
  const [options, setOptions] = useState<OptionsConfirmation | null>(null);
  const resoudre = useRef<((ok: boolean) => void) | null>(null);
  const confirmer = useCallback((o: OptionsConfirmation) => new Promise<boolean>((res) => {
    resoudre.current?.(false);
    resoudre.current = res;
    setOptions(o);
  }), []);
  const fermer = (ok: boolean) => { resoudre.current?.(ok); resoudre.current = null; setOptions(null); };
  const dialogue = options && (
    <Confirmation {...options} ouverte onFermer={() => fermer(false)} onConfirmer={() => fermer(true)} />
  );
  return { confirmer, dialogue };
}
