"use client";
// Toast de l'admin (masterprompt §7.12) sur le sonner déjà installé : fond noir, texte blanc,
// 2,2 s (5 s avec une action « Annuler »). ponytail: la position vient du <Toaster> global
// (app/layout.tsx) ; l'AppShell du lot 5 pourra poser son propre Toaster centré à 76 px du bas.
import { toast } from "sonner";

export const ADM_TOAST_CLASS =
  "flex items-center gap-3 rounded-[10px] bg-[#1a1a1a] px-3.5 py-[9px] text-[13px] font-[550] text-white shadow-(--shadow-popover)";

export function admToast(message: string, action?: { label: string; onClick: () => void }) {
  return toast(message, {
    unstyled: true,
    duration: action ? 5000 : 2200,
    className: ADM_TOAST_CLASS,
    action: action && { label: action.label, onClick: action.onClick },
    classNames: { actionButton: "ml-auto font-[650] underline underline-offset-2" },
  });
}
