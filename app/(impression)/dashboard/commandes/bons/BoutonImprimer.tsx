"use client";
import { useT } from "@/components/I18nProvider";
import { Button } from "@/components/ui/adm";

export function BoutonImprimer() {
  const t = useT();
  return <Button variant="primary" onClick={() => window.print()}>{t("Imprimer")}</Button>;
}
