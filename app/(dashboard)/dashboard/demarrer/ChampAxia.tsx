"use client";
// Champ « Demandez à AXIA » de l'Accueil (§8.1.3) : Entrée envoie, Maj+Entrée va à la ligne.
// L'envoi ouvre le panneau AXIA avec la question ; le panneau applique lui-même l'accès selon le plan (D13).
import { useState } from "react";
import { useT } from "@/components/I18nProvider";
import { ouvrirAxia } from "@/components/dashboard/AxiaPanneau";
import { IconButton } from "@/components/ui/adm";

export function ChampAxia() {
  const t = useT();
  const [q, setQ] = useState("");
  const envoyer = () => {
    const question = q.trim();
    if (!question) return;
    ouvrirAxia(question);
    setQ("");
  };
  return (
    <form className="mx-auto max-w-[640px] rounded-(--radius-3xl) bg-(--color-surface) shadow-(--shadow-ask) px-3.5 pt-3.5 pb-2.5"
      onSubmit={(e) => { e.preventDefault(); envoyer(); }}>
      <textarea value={q} onChange={(e) => setQ(e.target.value)} rows={2} aria-label={t("Demandez à AXIA")}
        placeholder={t("Demandez à AXIA : « Quels produits relancer cette semaine ? »")}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); envoyer(); } }}
        className="block w-full h-[42px] resize-none border-0 bg-transparent text-[14px] text-(--color-text-strong) outline-none placeholder:text-(--color-text-subdued)" />
      <div className="flex items-center gap-1.5">
        <img src="/axia-icon.png" alt="" className="size-[22px] rounded-full" />
        <span className="flex-1" />
        <IconButton icon="arrowUp" type="submit" aria-label={t("Envoyer à AXIA")} disabled={!q.trim()} />
      </div>
    </form>
  );
}
