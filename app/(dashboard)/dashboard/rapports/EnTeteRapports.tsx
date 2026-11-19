"use client";
// En-tête du rapport : impression / PDF (window.print) et tutoriel.
import { useT } from "@/components/I18nProvider";
import { EnTeteModule } from "../clients/EnTeteModule";

export function EnTeteRapports({ sousTitre }: { sousTitre: string }) {
  const t = useT();
  return (
    <div className="print:hidden">
      <EnTeteModule icon="bars" title={t("Rapport de productivité")} titleMeta={sousTitre} tutoriel="rapports"
        primaryAction={{ content: t("Imprimer / PDF"), onAction: () => window.print() }}
        secondaryActions={[{ content: t("Analyses de données"), href: "/dashboard/analytics" }]} />
    </div>
  );
}
