"use client";
// Texte traduit dans la langue du marchand, utilisable depuis un composant serveur.
import { useT } from "@/components/I18nProvider";

export function Traduit({ children, valeurs = [] }: { children: string; valeurs?: unknown[] }) {
  const t = useT();
  return <>{t(children, ...valeurs)}</>;
}

/** Libellé de métrique souligné, avec sa définition au survol. */
export function LibelleDefini({ label, definition }: { label: string; definition?: string }) {
  const t = useT();
  return <span className="axd-dotted" title={definition ? t(definition) : undefined}>{t(label)}</span>;
}
