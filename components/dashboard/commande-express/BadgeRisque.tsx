"use client";
// Pastille du score de risque Releasit COD AXSO (0–100) : faible, moyen, élevé.
import { Badge } from "@/components/dashboard/design-system";
import { useT } from "@/components/I18nProvider";

export function BadgeRisque({ score }: { score: number | null }) {
  const t = useT();
  if (score === null) return null;
  const ton = score >= 60 ? "critical" : score >= 30 ? "warning" : "success";
  return <Badge tone={ton}>{t(score >= 60 ? "Risque élevé" : score >= 30 ? "Risque moyen" : "Risque faible")} · {score}</Badge>;
}
