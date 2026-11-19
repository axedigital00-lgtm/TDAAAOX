"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/I18nProvider";
import { Banner, Button, Modal, Spinner, buttonClasses } from "@/components/ui/adm";
import { Icon } from "@/components/ui/icones";

type Resultat = { importes: number; erreurs: { ligne: number; message: string }[] };

/** Fenêtre « Importer des produits » de la page Produits — appelle /api/produits/importer. Ouverte par l'en-tête. */
export function ImportProduitsExcel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [resultat, setResultat] = useState<Resultat | null>(null);

  async function importer(fichier: File) {
    setEnvoi(true); setErreur(""); setResultat(null);
    const form = new FormData();
    form.append("fichier", fichier);
    try {
      const res = await fetch("/api/produits/importer", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) setErreur(data.message ?? t("Import impossible"));
      else { setResultat(data); if (data.importes) router.refresh(); }
    } catch {
      setErreur(t("Connexion perdue. Réessayez."));
    } finally {
      setEnvoi(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function fermer() { onClose(); setErreur(""); setResultat(null); }

  return (
    <Modal open={open} onClose={fermer} locked={envoi} size="sm" title={t("Importer des produits")}
      footer={<Button onClick={fermer} disabled={envoi}>{t("Fermer")}</Button>}>
      <div className="space-y-3">
        <p className="m-0 text-(--color-text-secondary)">{t("Remplissez le modèle Excel (une ligne par produit), puis envoyez-le. Fichiers .xlsx ou .csv acceptés.")}</p>
        <a href="/api/produits/importer" download className={buttonClasses({})}><Icon name="export" />{t("Télécharger le modèle Excel")}</a>
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-(--radius-lg) border border-dashed border-(--color-border-input) px-4 py-8 text-center hover:bg-(--color-surface-secondary)">
          {envoi ? <Spinner /> : <Icon name="import" size={20} />}
          <span className="font-[550] text-(--color-text-strong)">{envoi ? t("Import en cours…") : t("Choisir mon fichier")}</span>
          <span className="text-xs text-(--color-text-secondary)">{t("Colonnes obligatoires : Nom et Prix")}</span>
          <input ref={inputRef} type="file" className="sr-only" disabled={envoi}
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importer(f); }} />
        </label>
        {erreur && <Banner tone="critical">{erreur}</Banner>}
        {resultat && (
          <Banner tone={resultat.erreurs.length ? "warning" : "success"}
            title={`${resultat.importes} ${t(resultat.importes > 1 ? "produits importés" : "produit importé")}`}>
            {resultat.erreurs.length > 0 && (
              <>
                <p className="m-0 font-[550]">{resultat.erreurs.length}{" "}{t("ligne(s) ignorée(s) :")}</p>
                <ul className="m-0 max-h-40 list-none space-y-0.5 overflow-y-auto p-0">
                  {resultat.erreurs.map((e) => <li key={e.ligne}>{t("Ligne")}{" "}{e.ligne} — {t(e.message)}</li>)}
                </ul>
              </>
            )}
          </Banner>
        )}
      </div>
    </Modal>
  );
}
