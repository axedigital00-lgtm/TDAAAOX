"use client";
// MetricsStrip dont le menu de période écrit ?periode= dans l'URL (la page serveur recalcule tout).
// Partagé par Analyses, Rapports et Revenus.
import { usePathname, useRouter } from "next/navigation";
import { MetricsStrip, type MetricsStripProps } from "@/components/ui/adm";

export function BandeauPeriode(props: Omit<MetricsStripProps, "onPeriodChange">) {
  const router = useRouter();
  const chemin = usePathname();
  return <MetricsStrip {...props} onPeriodChange={props.periods ? (id) => router.push(`${chemin}?periode=${id}`) : undefined} />;
}
