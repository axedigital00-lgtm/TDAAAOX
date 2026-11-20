"use client";
// Barre d'enregistrement contextuelle (MASTERPROMPT §7.10) : visible dès qu'une
// fiche est modifiée. Ctrl/Cmd+S enregistre ; quitter la page demande confirmation.

import { useEffect } from "react";
import { Icon } from "../icons/Icon";

export function ContextualSaveBar({ visible, onSave, onDiscard, saving, message = "Modifications non enregistrées" }: {
  visible: boolean; onSave: () => void; onDiscard: () => void; saving?: boolean; message?: string;
}) {
  useEffect(() => {
    if (!visible) return;
    const avantDepart = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    const raccourci = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); if (!saving) onSave(); } };
    window.addEventListener("beforeunload", avantDepart);
    window.addEventListener("keydown", raccourci);
    return () => { window.removeEventListener("beforeunload", avantDepart); window.removeEventListener("keydown", raccourci); };
  }, [visible, saving, onSave]);

  if (!visible) return null;
  return (
    <div className="axd-savebar" role="region" aria-label={message}>
      <span className="axd-savebar__msg"><Icon name="info" />{message}</span>
      <span style={{ flex: 1 }} />
      <button type="button" className="axd-btn axd-btn--sm axd-savebar__ignore" onClick={onDiscard} disabled={saving}>Ignorer</button>
      <button type="button" className="axd-btn axd-btn--sm axd-savebar__save" onClick={onSave} disabled={saving} aria-busy={saving || undefined}>
        {saving ? "Enregistrement…" : "Enregistrer"}
      </button>
    </div>
  );
}
