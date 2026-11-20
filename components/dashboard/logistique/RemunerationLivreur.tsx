"use client";
// Rémunération d'un livreur choisie par le marchand (lib/gains-livreur.ts), chargée à l'ouverture.
import { useState } from "react";
import { toast } from "sonner";
import {  } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { formatMontant } from "@/lib/utils";

type Resume = { mode: string; montantFixe: number; devise: string; totaux: { paiement: string; devise: string; montant: number; courses: number }[] };

const MODES = [
  { v: "frais_livraison", label: "Frais de livraison", aide: "Il touche les frais de livraison payés par le client sur chaque course livrée." },
  { v: "fixe", label: "Montant fixe par course", aide: "Il touche le montant que tu fixes, sur chaque course livrée." },
  { v: "hors_axso", label: "Payé hors Axso", aide: "Salarié ou payé à part : Axso ne calcule rien." },
];

export function RemunerationLivreur({ livreurId }: { livreurId: string }) {
  const t = useT();
  const [ouvert, setOuvert] = useState(false);
  const [r, setR] = useState<Resume | null>(null);
  const [mode, setMode] = useState("frais_livraison");
  const [fixe, setFixe] = useState("");
  const [saving, setSaving] = useState(false);

  async function ouvrir() {
    setOuvert(!ouvert);
    if (r || ouvert) return;
    const res = await fetch(`/api/livreurs/${livreurId}/remuneration`);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(t(d.error || "Erreur")); return; }
    setR(d); setMode(d.mode); setFixe(d.montantFixe ? String(d.montantFixe) : "");
  }

  async function enregistrer() {
    setSaving(true);
    try {
      const res = await fetch(`/api/livreurs/${livreurId}/remuneration`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, montantFixe: Number(fixe) || 0 }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Erreur");
      toast.success(t("Rémunération enregistrée — elle s'applique aux prochaines courses livrées"));
    } catch (e: any) { toast.error(t(e.message)); } finally { setSaving(false); }
  }

  return (
    <div>
      <button type="button" onClick={ouvrir} className="axd-btn axd-btn--plain axd-btn--sm" aria-expanded={ouvert}>{t("Rémunération")}</button>
      {ouvert && !r && <p className="axd-muted" style={{ fontSize: 12, margin: "8px 0 0" }}>{t("Chargement…")}</p>}
      {ouvert && r && (
        <div style={{ display: "grid", gap: 12, marginTop: 8 }}>
          <div className="axd-grid axd-g3" style={{ gap: 8 }}>
            {MODES.map(m => (
              <button key={m.v} type="button" className="axd-choix axd-choix--ligne" aria-pressed={mode === m.v} onClick={() => setMode(m.v)} style={{ flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                <b>{t(m.label)}</b><span>{t(m.aide)}</span>
              </button>
            ))}
          </div>
          {mode === "fixe" && (
            <label className="axd-field" style={{ maxWidth: 220 }}>
              <span className="axd-field__label">{t("Montant par course")} ({r.devise === "XAF" ? "FCFA" : r.devise})</span>
              <input type="number" min={0} inputMode="decimal" value={fixe} onChange={e => setFixe(e.target.value)} className="axd-input" />
            </label>
          )}
          <p className="axd-muted" style={{ fontSize: 12, margin: 0 }}>
            {t("Paiement en ligne : sa part est prise sur ton wallet Axso et créditée à son solde. Paiement à la livraison : il garde sa part sur l'argent encaissé et te remet le reste.")}
          </p>
          <div><button type="button" onClick={enregistrer} disabled={saving} className="axd-btn axd-btn--primary axd-btn--sm">{saving ? t("Enregistrement…") : t("Enregistrer")}</button></div>
          {r.totaux.length > 0 && (
            <div style={{ display: "grid", gap: 4, fontSize: 12 }}>
              {r.totaux.map(x => (
                <p key={`${x.paiement}|${x.devise}`} style={{ margin: 0 }}>
                  {x.paiement === "en_ligne" ? t("Payé depuis ton wallet") : t("Gardé sur les espèces encaissées")}
                  {" : "}<strong>{formatMontant(x.montant, x.devise)}</strong>{" "}· {t("{0} course(s)", x.courses)}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
