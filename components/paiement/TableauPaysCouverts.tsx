"use client";
// Tableau des pays couverts et de leurs moyens de paiement Mobile Money (marque AXSO seulement).
// Reçoit la liste (page d'accueil, rendue côté serveur) ou la charge lui-même (/api/paiement/pays).
import { useEffect, useState } from "react";
import { Drapeau } from "@/components/ui/SelectPays";
import { PAYS_OPTIONS } from "@/lib/devise-convert";
import { useT } from "@/components/I18nProvider";
import type { PaysCouvert } from "@/lib/paiements/pays-couverts";
import "./pays.css";

const nomPays = (code: string) => PAYS_OPTIONS.find((p) => p.code === code)?.nom ?? code;

export function TableauPaysCouverts({ pays: initial, repliable = false, titre }: { pays?: PaysCouvert[]; repliable?: boolean; titre?: string }) {
  const t = useT();
  const [pays, setPays] = useState<PaysCouvert[] | null>(initial ?? null);
  useEffect(() => {
    if (initial) return;
    fetch("/api/paiement/pays").then((r) => r.json()).then((d) => setPays(d.pays ?? [])).catch(() => setPays([]));
  }, [initial]);
  if (!pays?.length) return null;
  const liste = [...pays].sort((a, b) => t(nomPays(a.code)).localeCompare(t(nomPays(b.code)), "fr"));
  const tableau = (
    <div className="axp-pays" role="region" aria-label={t("Pays et moyens de paiement couverts")}>
      <table>
        <thead><tr><th>{t("Pays")}</th><th>{t("Moyens de paiement")}</th><th className="axp-pays__dev">{t("Monnaie")}</th></tr></thead>
        <tbody>
          {liste.map((p) => (
            <tr key={p.code}>
              <td><span className="axp-pays__nom"><Drapeau code={p.code} taille={20} />{t(nomPays(p.code))}</span></td>
              <td><span className="axp-pays__ops">{p.operateurs.map((o) => <span key={o}>{o}</span>)}</span></td>
              <td className="axp-pays__dev">{p.devise}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  if (!repliable) return tableau;
  return (
    <details className="axp-pays-repli">
      <summary>{titre ?? t("Pays et moyens de paiement acceptés ({0})", String(liste.length))}</summary>
      {tableau}
    </details>
  );
}
