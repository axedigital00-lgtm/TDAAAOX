"use client";
// Accueil (MASTERPROMPT §8.1) : champ Stella et fil de recommandations masquables.

import Link from "next/link";
import { useEffect, useState } from "react";
import { useT } from "@/components/I18nProvider";
import { Icon, AxiaMark } from "@/components/dashboard/design-system/icons/Icon";
import { ouvrirAxia } from "@/components/dashboard/design-system/layout/AxiaDock";

/** Champ « Demandez à Stella » : Entrée envoie, Maj+Entrée va à la ligne ; ouvre le panneau Stella. */
export function HomeAsk() {
  const t = useT();
  const [q, setQ] = useState("");
  const envoyer = () => { if (!q.trim()) return ouvrirAxia(); ouvrirAxia(q.trim()); setQ(""); };
  return (
    <form className="axd-ask" onSubmit={(e) => { e.preventDefault(); envoyer(); }}>
      <label htmlFor="axd-ask" className="sr-only">{t("Demandez à Stella")}</label>
      <textarea id="axd-ask" value={q} onChange={(e) => setQ(e.target.value)} maxLength={1000}
        placeholder={t("Demandez à Stella : « Quels produits relancer cette semaine ? »")}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); envoyer(); } }} />
      <div className="axd-ask__bar">
        <AxiaMark />
        <span style={{ flex: 1 }} />
        <Link href="/dashboard" className="axd-btn axd-btn--ghost axd-btn--sm"><Icon name="history" />{t("Récents")}</Link>
        <span className="axd-sep" />
        <button type="button" className="axd-icon-btn" aria-label={t("Joindre")} title={t("Joindre")} onClick={() => ouvrirAxia()}><Icon name="plus" /></button>
        <button type="button" className="axd-icon-btn" aria-label={t("Dicter")} title={t("Dicter")} onClick={() => ouvrirAxia()}><Icon name="mic" /></button>
        <button type="submit" className="axd-icon-btn" aria-label={t("Envoyer")} title={t("Envoyer")}><Icon name="wave" /></button>
      </div>
    </form>
  );
}

export type FeedItem = {
  id: string;
  art: React.ReactNode;
  /** Carte de type tâche : pastille « N/M tâches terminées ». */
  task?: { done: number; total: number };
  title: string;
  text: string;
  action: { label: string; href: string };
};

const CLE = "axso:accueil:masquees";

export function HomeFeed({ items }: { items: FeedItem[] }) {
  const t = useT();
  const [masquees, setMasquees] = useState<string[]>([]);
  useEffect(() => { try { setMasquees(JSON.parse(localStorage.getItem(CLE) || "[]")); } catch { /* stockage indisponible */ } }, []);
  const masquer = (id: string) => {
    const liste = [...masquees, id];
    setMasquees(liste);
    try { localStorage.setItem(CLE, JSON.stringify(liste)); } catch { /* stockage indisponible */ }
  };
  return (
    <div className="axd-feed">
      {items.filter((i) => !masquees.includes(i.id)).map((i) => (
        <article key={i.id} className="axd-fc">
          <div className="axd-fc__art">
            {i.art}
            {i.task && (
              <span className="axd-fc__pill"><i />{i.task.done === 0 ? t("0 tâche terminée") : t("{0}/{1} tâches terminées", i.task.done, i.task.total)}</span>
            )}
          </div>
          <button type="button" className="axd-icon-btn axd-fc__x" onClick={() => masquer(i.id)} aria-label={t("Masquer la recommandation")}><Icon name="x" /></button>
          <div className="axd-fc__bd">
            <h4>{t(i.title)}</h4>
            <p>{t(i.text)}</p>
            <div className="axd-fc__go"><Link href={i.action.href} className="axd-btn axd-btn--sm">{t(i.action.label)}</Link></div>
          </div>
        </article>
      ))}
    </div>
  );
}
