"use client";
// Rapports : export complet (CSV / Excel multi-feuilles), impression ou export
// automatiques (?imprimer=1, ?export=csv|xlsx), programmation des envois.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Download, FileSpreadsheet, Loader2, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ColonneRapport, LigneRapport } from "@/lib/command-center/rapports";
import type { RapportPlanifie } from "@/lib/command-center/reglages";
import { useT } from "@/components/I18nProvider";
import { useConfirmation } from "@/components/command-center/Confirmation";

export interface BlocExport { titre: string; colonnes: ColonneRapport[]; lignes: LigneRapport[] }

// Valeurs brutes (nombres non formatés) : le tableur garde des chiffres calculables.
const brut = (v: unknown) => (v == null ? "" : String(v));

function telecharger(b: Blob, nom: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(b);
  a.download = nom;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function exporterCSV(nom: string, blocs: BlocExport[]) {
  const esc = (s: string) => (/[";\n,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const lignes = blocs.flatMap((b) => [esc(b.titre), b.colonnes.map((c) => esc(c.nom)).join(";"), ...b.lignes.map((l) => b.colonnes.map((c) => esc(brut(l[c.cle]))).join(";")), ""]);
  telecharger(new Blob(["﻿" + lignes.join("\n")], { type: "text/csv;charset=utf-8" }), `${nom}.csv`);
}

async function exporterExcel(nom: string, blocs: BlocExport[]) {
  const { classeurXlsx, TYPE_XLSX } = await import("@/lib/excel"); // exceljs chargé seulement au clic
  const octets = await classeurXlsx(blocs.map((b) => ({
    nom: b.titre,
    lignes: [b.colonnes.map((c) => c.nom), ...b.lignes.map((l) => b.colonnes.map((c) => (l[c.cle] ?? "") as any))],
  })));
  telecharger(new Blob([octets as BlobPart], { type: TYPE_XLSX }), `${nom}.xlsx`);
}

/** Boutons d'export du rapport complet ; déclenche aussi l'export / l'impression demandés dans l'URL. */
export function ExportRapport({ nom, blocs }: { nom: string; blocs: BlocExport[] }) {
  const t = useT();
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const action = p.get("imprimer") ? "pdf" : p.get("export");
    if (!action) return;
    p.delete("imprimer"); p.delete("export");
    window.history.replaceState(null, "", `${window.location.pathname}${p.size ? `?${p}` : ""}`);
    if (action === "pdf") setTimeout(() => window.print(), 400);
    else if (action === "csv") exporterCSV(nom, blocs);
    else if (action === "xlsx") void exporterExcel(nom, blocs);
  }, [nom, blocs]);
  return (
    <>
      <button className="cc-btn cc-btn-sm" onClick={() => exporterCSV(nom, blocs)} title={t("Tout le rapport en CSV")}><Download size={13} />CSV</button>
      <button className="cc-btn cc-btn-sm" onClick={() => exporterExcel(nom, blocs)} title={t("Tout le rapport en Excel (une feuille par tableau)")}><FileSpreadsheet size={13} />Excel</button>
    </>
  );
}

const FREQ: { id: RapportPlanifie["frequence"]; nom: string }[] = [{ id: "quotidien", nom: "Chaque jour" }, { id: "hebdomadaire", nom: "Chaque lundi" }, { id: "mensuel", nom: "Le 1er du mois" }];

/** Programmation d'un rapport (Super admin et CEO) : enregistrée dans les réglages « rapports », journalisée. */
export function Programmer({ type, planifies, frequenceParDefaut }: { type: RapportPlanifie["type"]; planifies: RapportPlanifie[]; frequenceParDefaut: RapportPlanifie["frequence"] }) {
  const router = useRouter();
  const t = useT();
  const actuel = planifies.find((p) => p.type === type);
  const [ouvert, setOuvert] = useState(false);
  const [frequence, setFrequence] = useState(actuel?.frequence ?? frequenceParDefaut);
  const [emails, setEmails] = useState(actuel?.destinataires.join(", ") ?? "");
  const [actif, setActif] = useState(actuel?.actif ?? true);
  const [charge, setCharge] = useState(false);
  const { confirmer, dialogue } = useConfirmation();

  async function enregistrer(supprimer = false) {
    if (supprimer && actuel && !(await confirmer({ titre: t("Arrêter l'envoi automatique de ce rapport ?"), message: t("Plus aucun e-mail ne partira vers les destinataires. Le rapport reste consultable ici."), details: [{ libelle: t("Destinataires"), valeur: actuel.destinataires.join(", ") }], action: t("Supprimer la programmation"), danger: true }))) return;
    const destinataires = [...new Set(emails.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))];
    if (!supprimer && !destinataires.length) { toast.error(t("Ajoutez au moins une adresse e-mail de destinataire.")); return; }
    const invalides = destinataires.filter((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    if (!supprimer && invalides.length) { toast.error(t("Adresse e-mail invalide : {0}. Corrigez-la puis réessayez.", invalides[0])); return; }
    const valeur = [...planifies.filter((p) => p.type !== type), ...(supprimer ? [] : [{ type, frequence, destinataires, actif }])];
    setCharge(true);
    const r = await fetch("/api/admin/command-center/reglages", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cle: "rapports", valeur }) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setCharge(false);
    if (!r?.ok) { toast.error(t(d?.erreur ?? "Enregistrement impossible")); return; }
    toast.success(t(supprimer ? "Programmation supprimée" : "Programmation enregistrée"));
    setOuvert(false);
    router.refresh();
  }

  return (
    <>
      <button className="cc-btn cc-btn-ghost cc-btn-sm" onClick={() => setOuvert(!ouvert)} aria-expanded={ouvert}><CalendarClock size={13} />{t("Programmer")}</button>
      {ouvert && (
        <div className="basis-full mt-2 p-3 rounded-lg border cc-sep grid gap-2 sm:grid-cols-[auto_1fr_auto] sm:items-end" style={{ background: "var(--cc-surface-2)" }}>
          <label className="text-[12px] cc-muted grid gap-1">{t("Fréquence")}
            <select className="cc-select" value={frequence} onChange={(e) => setFrequence(e.target.value as typeof frequence)}>{FREQ.map((f) => <option key={f.id} value={f.id}>{t(f.nom)}</option>)}</select>
          </label>
          <label className="text-[12px] cc-muted grid gap-1">{t("Destinataires (e-mails séparés par des virgules, 20 max.)")}
            <input className="cc-input w-full" type="text" inputMode="email" value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="ceo@axso.africa, finance@axso.africa" />
          </label>
          <div className="flex items-center gap-2">
            <label className="text-[12px] flex items-center gap-1.5"><input type="checkbox" checked={actif} onChange={(e) => setActif(e.target.checked)} />{t("Actif")}</label>
            <button className="cc-btn cc-btn-primary cc-btn-sm" disabled={charge} onClick={() => enregistrer()}>{charge ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}{t("Enregistrer la programmation")}</button>
            {actuel && <button className="cc-btn cc-btn-ghost cc-btn-sm cc-bad" disabled={charge} onClick={() => enregistrer(true)} aria-label={t("Supprimer la programmation")}><Trash2 size={13} aria-hidden /></button>}
          </div>
          {dialogue}
          <p className="cc-faint text-[11.5px] sm:col-span-3">{t("Envoi vers 7 h (heure de Douala), données réelles uniquement. Hebdomadaire : le lundi ; mensuel : le 1er.")}</p>
        </div>
      )}
    </>
  );
}
