"use client";
// Rémunération d'un livreur choisie par le marchand (lib/gains-livreur.ts), chargée à l'ouverture.
import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Wallet } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { formatMontant, cn } from "@/lib/utils";
import { Bouton, Saisie, Squelette } from "@/components/ui";

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
    const res = await fetch(`/api/livreurs/${livreurId}/remuneration`).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    if (!res?.ok) { setOuvert(false); toast.error(d?.error ? t(d.error) : t("La rémunération n'a pas pu être chargée. Réessaie.")); return; }
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
      if (!res.ok) throw new Error(d.error || "La rémunération n'a pas pu être enregistrée. Réessaie.");
      toast.success(t("Rémunération enregistrée — elle s'applique aux prochaines courses livrées"));
    } catch (e: any) { toast.error(t(e.message)); } finally { setSaving(false); }
  }

  return (
    <div className="border-t border-bordure pt-3">
      <button type="button" onClick={ouvrir} aria-expanded={ouvert}
        className="flex min-h-10 items-center gap-1.5 text-sm font-semibold text-encre hover:text-attention">
        <Wallet className="size-4" aria-hidden />{t("Rémunération")}
        <ChevronDown className={cn("size-4 transition-transform", ouvert && "rotate-180")} aria-hidden />
      </button>
      {ouvert && !r && <Squelette className="mt-2 h-20 w-full" />}
      {ouvert && r && (
        <div className="mt-3 space-y-3">
          <fieldset>
            <legend className="sr-only">{t("Mode de rémunération")}</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {MODES.map(m => (
                <label key={m.v} className={cn("cursor-pointer rounded-controle border p-3 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus",
                  mode === m.v ? "border-primaire bg-primaire-fond" : "border-bordure hover:border-bordure-forte")}>
                  <input type="radio" name={`remuneration-${livreurId}`} className="sr-only" checked={mode === m.v} onChange={() => setMode(m.v)} />
                  <span className="block font-semibold text-encre">{t(m.label)}</span>
                  <span className="ax-aide">{t(m.aide)}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {mode === "fixe" && (
            <Saisie type="number" min={0} inputMode="decimal" label={t("Montant par course")} suffixe={r.devise}
              value={fixe} onChange={e => setFixe(e.target.value)} className="sm:w-56" />
          )}
          <p className="ax-aide">
            {t("Paiement en ligne : sa part est prise sur ton wallet Axso et créditée à son solde. Paiement à la livraison : il garde sa part sur l'argent encaissé et te remet le reste.")}
          </p>
          <Bouton variante="secondaire" onClick={enregistrer} charge={saving} texteCharge={t("Enregistrement…")}>{t("Enregistrer la rémunération")}</Bouton>
          {r.totaux.length > 0 && (
            <div className="space-y-1 text-sm text-doux">
              {r.totaux.map(x => (
                <p key={`${x.paiement}|${x.devise}`}>
                  {x.paiement === "en_ligne" ? t("Payé depuis ton wallet") : t("Gardé sur les espèces encaissées")}
                  {" : "}<strong className="text-encre">{formatMontant(x.montant, x.devise)}</strong>{" "}· {t("{0} course(s)", x.courses)}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
