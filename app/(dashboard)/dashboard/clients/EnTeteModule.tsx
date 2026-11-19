"use client";
// PageHeader + « Revoir le tutoriel » (une fonction ne passe pas d'une page serveur au client).
import { useT } from "@/components/I18nProvider";
import { PageHeader, type PageHeaderProps } from "@/components/ui/adm";

export function EnTeteModule({ tutoriel, ...props }: PageHeaderProps & { tutoriel?: string }) {
  const t = useT();
  const revoir = tutoriel
    ? [{ content: t("Revoir le tutoriel"), onAction: () => window.dispatchEvent(new CustomEvent("axso:ouvrir-tutoriel", { detail: tutoriel })) }]
    : [];
  return <PageHeader {...props} overflowActions={[...(props.overflowActions ?? []), ...revoir]} />;
}
