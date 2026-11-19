"use client";
// Barre d'enregistrement contextuelle (masterprompt §7.10), obligatoire sur les fiches éditables.
// Tant que `dirty` : fermeture/rechargement de l'onglet confirmés par le navigateur, et clic sur un
// lien interne confirmé par une modale. ponytail: le retour arrière du navigateur (popstate) n'est
// pas intercepté ; à ajouter si les fiches perdent des saisies par ce chemin.
import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/I18nProvider";
import { Button } from "./Button";
import { Modal } from "./Overlays";

export type ContextualSaveBarProps = {
  dirty: boolean;
  onSave: () => void | Promise<unknown>;
  onDiscard: () => void;
  saving?: boolean;
  /** Message (déjà traduit) ; par défaut « Modifications non enregistrées ». */
  message?: string;
};

export function ContextualSaveBar({ dirty, onSave, onDiscard, saving, message }: ContextualSaveBarProps) {
  const t = useT();
  const [pending, setPending] = useState<HTMLAnchorElement | null>(null);
  const allow = useRef(false);
  const save = useRef({ onSave, saving });
  save.current = { onSave, saving };

  useEffect(() => {
    if (!dirty) return;
    const unload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    const click = (e: MouseEvent) => {
      if (allow.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download") || a.origin !== location.origin) return;
      if (a.pathname === location.pathname && a.search === location.search) return; // ancre dans la page
      e.preventDefault();
      e.stopPropagation();
      setPending(a);
    };
    // Ctrl/Cmd+S : enregistrer (§11) au lieu d'enregistrer la page HTML.
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!save.current.saving) void save.current.onSave();
      }
    };
    window.addEventListener("beforeunload", unload);
    window.addEventListener("keydown", key);
    document.addEventListener("click", click, true);
    return () => { window.removeEventListener("beforeunload", unload); window.removeEventListener("keydown", key); document.removeEventListener("click", click, true); };
  }, [dirty]);

  const leave = () => {
    const a = pending;
    setPending(null);
    if (!a) return;
    allow.current = true;
    a.click();
    allow.current = false;
  };

  return (
    <>
      {dirty && (
        <div role="region" aria-label={t("Modifications non enregistrées")}
          className="sticky top-0 z-(--z-mobile-top) -mx-(--page-padding-x) mb-2 flex min-h-14 items-center gap-2 bg-(--color-primary) px-(--page-padding-x) py-2.5 text-white max-[820px]:top-[52px]">
          <span className="flex-1 truncate font-[550]">{message ?? t("Modifications non enregistrées")}</span>
          <Button variant="tint" onClick={onDiscard} disabled={saving}>{t("Ignorer")}</Button>
          <Button variant="default" onClick={onSave} loading={saving}>{t("Enregistrer")}</Button>
        </div>
      )}
      <Modal open={!!pending} onClose={() => setPending(null)} size="sm" title={t("Quitter la page sans enregistrer ?")}
        footer={<>
          <Button onClick={() => setPending(null)}>{t("Rester sur la page")}</Button>
          <Button variant="critical" onClick={leave}>{t("Quitter la page")}</Button>
        </>}>
        <p className="m-0">{t("Les modifications non enregistrées seront perdues.")}</p>
      </Modal>
    </>
  );
}
