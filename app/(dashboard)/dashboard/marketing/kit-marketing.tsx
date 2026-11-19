"use client";
// Petits motifs communs aux pages Croissance (affiliation, campagnes, e-mail, SMS, publicité…),
// construits sur le kit adm : confirmation, erreur de chargement, chargement, tuiles de chiffres.
import { useCallback, useRef, useState } from "react";
import { useT } from "@/components/I18nProvider";
import { Banner, Button, Modal, SkeletonCard } from "@/components/ui/adm";
import type { OptionsConfirmation } from "@/components/ui/Modale";

/** Même API que l'ancien useConfirmation : `await confirmer({ titre, objet, description, libelleConfirmer })`. */
export function useConfirmationAdm() {
  const t = useT();
  const [o, setO] = useState<OptionsConfirmation | null>(null);
  const resoudre = useRef<((ok: boolean) => void) | null>(null);
  const confirmer = useCallback((opts: OptionsConfirmation) => new Promise<boolean>((res) => {
    resoudre.current?.(false);
    resoudre.current = res;
    setO(opts);
  }), []);
  const fermer = (ok: boolean) => { resoudre.current?.(ok); resoudre.current = null; setO(null); };
  const dialogue = (
    <Modal open={!!o} onClose={() => fermer(false)} title={o?.titre} size="sm"
      footer={<>
        <Button onClick={() => fermer(false)}>{t("Annuler")}</Button>
        <Button variant={o?.destructive === false ? "primary" : "critical"} onClick={() => fermer(true)}>{o?.libelleConfirmer}</Button>
      </>}>
      <p className="font-semibold text-(--color-text-strong)">{o?.objet}</p>
      {o?.description && <p className="mt-1 text-(--color-text-secondary)">{o.description}</p>}
    </Modal>
  );
  return { confirmer, dialogue };
}

/** Échec de chargement : ce qui a échoué + « Réessayer ». */
export function ErreurChargement({ titre, onReessayer }: { titre: string; onReessayer: () => void }) {
  const t = useT();
  return (
    <Banner tone="critical" title={titre} action={{ content: t("Réessayer"), onAction: onReessayer }}>
      {t("Vérifiez votre connexion et réessayez.")}
    </Banner>
  );
}

export function Chargement({ cartes = 2 }: { cartes?: number }) {
  const t = useT();
  return (
    <div role="status" aria-label={t("Chargement…")}>
      {Array.from({ length: cartes }, (_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

/** Tuiles de chiffres simples (sans période ni variation). */
export function Chiffres({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-(--radius-xl) bg-(--color-border-secondary) shadow-(--shadow-card) sm:grid-cols-[repeat(auto-fit,minmax(140px,1fr))]">
      {items.map((s) => (
        <div key={s.label} className="bg-(--color-surface) px-4 py-3">
          <p className="text-xs text-(--color-text-secondary)">{s.label}</p>
          <p className="mt-1 text-[15px] font-semibold text-(--color-text-strong) tabular-nums break-words">{s.value}</p>
        </div>
      ))}
    </div>
  );
}
