"use client";
// Confirmation des actions sensibles du Command Center (suspension, retrait, rôle…) :
// fenêtre qui nomme l'objet et la conséquence, bouton au libellé précis, Échap = annuler.
// Remplace window.confirm (boutons « OK / Annuler » génériques, non traduits, peu lisibles sur mobile).
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useT } from "@/components/I18nProvider";

export interface Confirmation {
  /** Question qui nomme l'objet : « Suspendre la boutique « Kmer Shop » ? » (déjà traduite). */
  titre: string;
  /** Conséquence concrète de l'action (déjà traduite). */
  message?: ReactNode;
  /** Détails à relire avant de valider (montant, destinataire…). */
  details?: { libelle: string; valeur: ReactNode }[];
  /** Libellé du bouton de validation : « Suspendre la boutique » (déjà traduit). */
  action: string;
  /** Action destructrice ou irréversible : bouton rouge. */
  danger?: boolean;
}

/** `const { confirmer, dialogue } = useConfirmation()` ; `if (await confirmer({...})) …` ; rendre `{dialogue}`. */
export function useConfirmation() {
  const t = useT();
  const dlg = useRef<HTMLDialogElement>(null);
  const resoudre = useRef<((ok: boolean) => void) | null>(null);
  const [c, setC] = useState<Confirmation | null>(null);

  const confirmer = useCallback((o: Confirmation) => new Promise<boolean>((r) => { resoudre.current?.(false); resoudre.current = r; setC(o); }), []);
  useEffect(() => { if (c && !dlg.current?.open) dlg.current?.showModal(); }, [c]);
  const fermer = (ok: boolean) => { const r = resoudre.current; resoudre.current = null; r?.(ok); if (dlg.current?.open) dlg.current.close(); setC(null); };

  const dialogue = (
    <dialog ref={dlg} onClose={() => fermer(false)} aria-labelledby="cc-confirmation-titre" className="cc-card p-0 backdrop:bg-black/60 w-[min(440px,92vw)]" style={{ color: "var(--cc-text)" }}>
      {c && (
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-2.5">
            {c.danger && <AlertTriangle size={17} className="cc-bad shrink-0 mt-0.5" aria-hidden />}
            <h2 id="cc-confirmation-titre" className="cc-h2 [overflow-wrap:anywhere]">{c.titre}</h2>
          </div>
          {c.message && <p className="cc-muted text-[13px]">{c.message}</p>}
          {c.details?.length ? (
            <dl className="rounded-lg px-3 py-2 text-[13px] space-y-1" style={{ background: "var(--cc-surface-2)" }}>
              {c.details.map((d) => (
                <div key={d.libelle} className="flex justify-between gap-3">
                  <dt className="cc-faint shrink-0">{d.libelle}</dt>
                  <dd className="font-medium text-right [overflow-wrap:anywhere]">{d.valeur}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <button type="button" className="cc-btn justify-center h-10 sm:h-8" onClick={() => fermer(false)} autoFocus>{t("Annuler")}</button>
            <button type="button" className="cc-btn cc-btn-primary justify-center h-10 sm:h-8" onClick={() => fermer(true)}
              style={c.danger ? { background: "var(--cc-bad)", borderColor: "var(--cc-bad)", color: "#fff" } : undefined}>{c.action}</button>
          </div>
        </div>
      )}
    </dialog>
  );
  return { confirmer, dialogue };
}

/** Bouton d'envoi d'un formulaire (action serveur) précédé d'une confirmation ; désactivé pendant l'envoi. */
export function BoutonConfirme({ confirmation, className, style, children }: { confirmation: Confirmation; className?: string; style?: React.CSSProperties; children: ReactNode }) {
  const { confirmer, dialogue } = useConfirmation();
  const { pending } = useFormStatus();
  return (
    <>
      <button type="button" className={className} style={style} disabled={pending} aria-busy={pending}
        onClick={async (e) => { const f = e.currentTarget.form; if (await confirmer(confirmation)) f?.requestSubmit(); }}>
        {pending && <Loader2 size={12} className="animate-spin" aria-hidden />}{children}
      </button>
      {dialogue}
    </>
  );
}
