// En-tête de page : fil d'Ariane ou retour (si la page a un parent), titre qui dit
// où l'on est, description courte si elle aide, indicateurs (badges), actions à
// droite (sous le titre sur téléphone). Textes déjà traduits.
// Composant client (libellé du fil d'Ariane traduit), utilisable depuis une page serveur.
"use client";
import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/components/I18nProvider";

export type EnTetePageProps = {
  titre: React.ReactNode;
  description?: React.ReactNode;
  /** Lien vers la page parente : { href: "/dashboard/produits", libelle: "Produits" }. */
  retour?: { href: string; libelle: string };
  /** Fil d'Ariane pour une page profonde (3 niveaux et plus), sans la page courante (c'est le titre).
   *  Remplace `retour` s'il est fourni. */
  filAriane?: { href: string; libelle: string }[];
  /** Badges d'état ou petits contrôles à côté du titre (« Brouillon », « En ligne »). */
  indicateurs?: React.ReactNode;
  /** Actions secondaires puis la principale EN DERNIER (Bouton « primaire », une seule). */
  actions?: React.ReactNode;
  className?: string;
};

const LIEN = "inline-flex min-h-10 items-center gap-1.5 rounded-controle px-1 text-sm font-medium text-doux hover:text-encre focus-visible:outline-2 focus-visible:outline-focus sm:min-h-8";

export function EnTetePage({ titre, description, retour, filAriane, indicateurs, actions, className }: EnTetePageProps) {
  const t = useT();
  return (
    <header className={cn("mb-6 space-y-2", className)}>
      {filAriane?.length ? (
        <nav aria-label={t("Fil d'Ariane")} className="-ml-1">
          <ol className="flex flex-wrap items-center gap-x-0.5">
            {filAriane.map((n, i) => (
              <li key={n.href} className="flex items-center">
                {i > 0 && <ChevronRight className="size-3.5 text-discret" aria-hidden />}
                <Link href={n.href} className={LIEN}>{n.libelle}</Link>
              </li>
            ))}
          </ol>
        </nav>
      ) : retour && (
        <Link href={retour.href} className={cn(LIEN, "-ml-1")}>
          <ArrowLeft className="size-4" aria-hidden />{retour.libelle}
        </Link>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="ax-titre-page">{titre}</h1>
            {indicateurs}
          </div>
          {description && <p className="max-w-2xl ax-texte-secondaire">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 max-sm:[&>*]:flex-1">{actions}</div>}
      </div>
    </header>
  );
}
