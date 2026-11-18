// Alerte dans la page (bandeau). Toujours trois choses : ce qui se passe (titre),
// pourquoi c'est important (texte), ce qu'on peut faire (action).
// Pour un retour bref après une action, préférer une notification (toast de sonner).
// Composant client (libellé traduit) mais utilisable depuis une page serveur ;
// `onFermer` impose un composant client appelant.
"use client";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/components/I18nProvider";
import { TONS } from "./Badge";

export type TonAlerte = "info" | "succes" | "attention" | "erreur";

const STYLE: Record<TonAlerte, { classes: string; Icone: typeof Info }> = {
  info: { classes: TONS.info, Icone: Info },
  succes: { classes: TONS.succes, Icone: CheckCircle2 },
  attention: { classes: TONS.attention, Icone: AlertTriangle },
  erreur: { classes: TONS.erreur, Icone: XCircle },
};

export type AlerteProps = {
  ton?: TonAlerte;
  /** Ce qui se passe, en une phrase courte. */
  titre: React.ReactNode;
  /** Pourquoi c'est important / conséquence. */
  children?: React.ReactNode;
  /** Ce que l'utilisateur peut faire : un Bouton ou un lien. */
  action?: React.ReactNode;
  /** Croix de fermeture ; `libelleFermer` est son nom accessible (défaut : « Fermer », traduit). */
  onFermer?: () => void;
  libelleFermer?: string;
  className?: string;
};

export function Alerte({ ton = "info", titre, children, action, onFermer, libelleFermer, className }: AlerteProps) {
  const t = useT();
  const { classes, Icone } = STYLE[ton];
  const fermer = libelleFermer ?? t("Fermer");
  return (
    <div role={ton === "erreur" || ton === "attention" ? "alert" : "status"} className={cn("flex items-start gap-3 rounded-carte border p-4", classes, className)}>
      <Icone className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-semibold leading-snug">{titre}</p>
        {children && <div className="text-sm leading-relaxed text-encre/80">{children}</div>}
        {action && <div className="flex flex-wrap items-center gap-2 pt-2">{action}</div>}
      </div>
      {onFermer && (
        <button type="button" onClick={onFermer} aria-label={fermer} title={fermer}
          className="-m-2 flex size-10 shrink-0 items-center justify-center rounded-controle opacity-70 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-focus">
          <X className="size-4" aria-hidden />
        </button>
      )}
    </div>
  );
}
