// Mise en page d'une section des Paramètres (masterprompt §9.1) : conteneur « thin » de 720 px,
// titre 20 px/650 (36 px au-dessus, 18 px en dessous), sous-sections titre + description + carte.
import { cn } from "@/lib/utils";

export function SectionParametres({ titre, description, actions, children }: { titre: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[720px] px-(--page-padding-x) pb-16">
      <div className="mt-9 mb-[18px] flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-[650] text-(--color-text-strong)">{titre}</h1>
          {description && <p className="mt-1 text-(--color-text-secondary)">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      <div className="flex flex-col gap-6">{children}</div>
    </div>
  );
}

/** Sous-section : titre 13 px/650 + description grise, puis le contenu (cartes). */
export function SousSection({ id, titre, description, children, className }: { id?: string; titre: React.ReactNode; description?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={cn("scroll-mt-24", className)}>
      <h2 className="font-[650] text-(--color-text-strong)">{titre}</h2>
      {description && <p className="mb-3 text-(--color-text-secondary)">{description}</p>}
      <div className={cn("flex flex-col gap-4", !description && "mt-3")}>{children}</div>
    </section>
  );
}

/** Deux états sont-ils différents ? (barre d'enregistrement : formulaire modifié). */
export const modifie = (a: unknown, b: unknown) => b !== null && JSON.stringify(a) !== JSON.stringify(b);
