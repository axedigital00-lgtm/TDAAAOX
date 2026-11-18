// États d'une zone de données : vide, erreur, chargement (indicateur ou squelette).
// Même gabarit partout pour que ces moments se ressemblent. Textes déjà traduits.
// Composant client (libellés par défaut traduits) utilisable depuis une page serveur,
// sauf `onReessayer`, qui impose un appelant client.
"use client";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/components/I18nProvider";
import { Bouton } from "./Bouton";

type EtatProps = {
  /** Icône lucide (taille gérée ici). */
  icone?: React.ReactNode;
  titre: React.ReactNode;
  /** Pourquoi c'est vide / ce qui a échoué, et ce que ça change. */
  texte?: React.ReactNode;
  /** L'action pertinente (Bouton). */
  children?: React.ReactNode;
  /** Version resserrée, dans une carte ou une colonne. */
  compact?: boolean;
  className?: string;
};

function Gabarit({ icone, titre, texte, children, compact, className, ton, role }: EtatProps & { ton: string; role: "status" | "alert" }) {
  return (
    <div role={role} className={cn("flex flex-col items-center rounded-carte border border-dashed border-bordure bg-carte text-center", compact ? "px-4 py-6" : "px-6 py-10 sm:py-12", className)}>
      <span className={cn("flex items-center justify-center rounded-full [&>svg]:size-5", compact ? "size-10" : "size-12", ton)} aria-hidden>{icone}</span>
      <p className="mt-3 ax-sous-titre">{titre}</p>
      {texte && <p className="mt-1.5 max-w-md ax-texte-secondaire">{texte}</p>}
      {children && <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{children}</div>}
    </div>
  );
}

/** Rien à afficher. Dire pourquoi et proposer l'action : « Tu n'as pas encore de produit. » + « Ajouter un produit ». */
export function EtatVide({ icone = <Inbox />, ...p }: EtatProps) {
  return <Gabarit icone={icone} ton="bg-carte-2 text-doux" role="status" {...p} />;
}

/** Le chargement a échoué. `onReessayer` + `libelleReessayer` ajoutent le bouton de relance. */
export function EtatErreur({ icone = <AlertTriangle />, onReessayer, libelleReessayer, children, ...p }: EtatProps & { onReessayer?: () => void; libelleReessayer?: string }) {
  const t = useT();
  return (
    <Gabarit icone={icone} ton="bg-erreur-fond text-erreur" role="alert" {...p}>
      {onReessayer && <Bouton variante="secondaire" onClick={onReessayer}>{libelleReessayer ?? t("Réessayer")}</Bouton>}
      {children}
    </Gabarit>
  );
}

/** Chargement court ou d'une action. `texte` dit ce qui se charge (lu aussi par les lecteurs d'écran ; défaut « Chargement… »). */
export function EtatChargement({ texte, compact, className }: { texte?: React.ReactNode; compact?: boolean; className?: string }) {
  const t = useT();
  return (
    <div role="status" aria-live="polite" className={cn("flex flex-col items-center justify-center gap-2 text-doux", compact ? "py-6" : "py-16", className)}>
      <Loader2 className="size-5 animate-spin text-primaire" aria-hidden />
      <span className="text-sm">{texte ?? t("Chargement…")}</span>
    </div>
  );
}

/** Bloc gris animé à la forme du contenu attendu (préférable à un indicateur pour une liste ou une carte). */
export function Squelette({ className }: { className?: string }) {
  return <div aria-hidden className={cn("ax-skeleton rounded-controle", className)} />;
}

/** Liste en chargement : `lignes` lignes de la hauteur d'une ligne de tableau. `libelle` est lu par les lecteurs d'écran. */
export function SqueletteListe({ lignes = 5, libelle, className }: { lignes?: number; libelle: string; className?: string }) {
  return (
    <div role="status" aria-busy="true" className={cn("space-y-2", className)}>
      <span className="sr-only">{libelle}</span>
      {Array.from({ length: lignes }, (_, i) => <Squelette key={i} className="h-14 w-full" />)}
    </div>
  );
}
