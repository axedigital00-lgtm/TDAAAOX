"use client";
// EmptyState (masterprompt §7.7) : carte centrée, illustration 200×150, titre, texte, actions (secondaire puis primaire),
// et sous la carte « En savoir plus sur les {sujet} ». Illustrations : @/components/ui/illustrations.
import Link from "next/link";
import { useT } from "@/components/I18nProvider";

export type EmptyStateProps = {
  title: string;
  children?: React.ReactNode;
  image?: React.ReactNode;
  /** Boutons, dans l'ordre : secondaire puis primaire. */
  actions?: React.ReactNode;
  /** Sujet déjà traduit (« commandes provisoires ») et lien vers l'aide. */
  learnMore?: { topic: string; href: string };
};

export function EmptyState({ title, children, image, actions, learnMore }: EmptyStateProps) {
  const t = useT();
  return (
    <div>
      <div className="rounded-(--radius-xl) bg-(--color-surface) px-6 pt-12 pb-14 text-center shadow-(--shadow-card) max-[820px]:px-4 max-[820px]:pt-8 max-[820px]:pb-10">
        {image && <div className="mx-auto mb-5 h-[150px] w-[200px] [&>svg]:size-full">{image}</div>}
        <h3 className="text-sm font-[650] text-(--color-text-strong)">{title}</h3>
        {children && <div className="mx-auto mt-1 mb-4 max-w-[460px] text-(--color-text-secondary)">{children}</div>}
        {actions && <div className="flex flex-wrap items-center justify-center gap-2">{actions}</div>}
      </div>
      {learnMore && (
        <p className="mt-4 text-center text-(--color-text-secondary)">
          {t("En savoir plus sur les")}{" "}
          <Link href={learnMore.href} className="text-(--color-link) hover:underline">{learnMore.topic}</Link>
        </p>
      )}
    </div>
  );
}
