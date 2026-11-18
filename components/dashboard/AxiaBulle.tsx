"use client";

import { Check, Clock, AlertTriangle, ArrowRight, Eye } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { sansMarque } from "@/lib/axia/pages";

// Briques AXIA partagées : état des actions d'une réponse (panneau AXIA, agents) et message Pro.
// La bulle flottante d'autrefois est devenue le panneau de droite (components/dashboard/AxiaPanneau.tsx).

export const MESSAGE_PRO = "AXIA, ton associée qui surveille ta boutique et te propose des actions, est disponible à partir du Palier Pro.";

// ─── État d'une action d'AXIA ─────────────────────────────────────────────────
// Le moteur (lib/axia/engine.ts) renvoie le texte brut du résultat de chaque outil, sans son
// drapeau de réussite. On en déduit ce que le marchand doit comprendre : fait, en attente de
// son accord (lib/axia/confirmation.ts : rien n'est exécuté), échec, page ouverte, ou simple
// consultation. Une demande d'accord n'est donc jamais affichée comme une action faite.
// ponytail: déduit du texte ; à remplacer par le champ `succes` le jour où le moteur le transmet.
export type EtatActionAxia = "fait" | "attente" | "echec" | "page" | "consultation";

export function etatActionAxia(brut: string): { etat: EtatActionAxia; texte: string } {
  const page = brut.startsWith("OUVRIR_PAGE:");
  const premiere = sansMarque(brut).trim().split("\n")[0].replace(/^✅\s*/, "");
  const texte = premiere.length > 140 ? premiere.slice(0, 140) + "…" : premiere;
  if (page) return { etat: "page", texte };
  if (/EN ATTENTE DE CONFIRMATION/.test(brut)) {
    return { etat: "attente", texte: /«\s*(.+?)\s*»/.exec(brut)?.[1] ?? texte };
  }
  if (brut.trimStart().startsWith("✅")) return { etat: "fait", texte };
  if (/a échoué|échec|introuvable|non autorisée|indisponible|refusée|rien n'a été modifié|impossible|n'a pas pu|erreur/i.test(brut)) return { etat: "echec", texte };
  return { etat: "consultation", texte };
}

const STYLE_ETAT: Record<EtatActionAxia, { libelle: string; Icone: typeof Check; clair: string; sombre: string }> = {
  fait:         { libelle: "Fait",                      Icone: Check,         clair: "bg-succes-fond text-succes border-succes-bordure",       sombre: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25" },
  attente:      { libelle: "En attente de ton accord",  Icone: Clock,         clair: "bg-attention-fond text-attention border-attention-bordure", sombre: "bg-amber-400/10 text-amber-300 border-amber-400/30" },
  echec:        { libelle: "Non fait",                  Icone: AlertTriangle, clair: "bg-erreur-fond text-erreur border-erreur-bordure",       sombre: "bg-red-500/10 text-red-300 border-red-500/25" },
  page:         { libelle: "Page ouverte",              Icone: ArrowRight,    clair: "bg-info-fond text-info border-info-bordure",             sombre: "bg-sky-400/10 text-sky-300 border-sky-400/25" },
  consultation: { libelle: "Vérifié",                   Icone: Eye,           clair: "bg-carte-2 text-doux border-bordure",                   sombre: "bg-white/5 text-white/60 border-white/10" },
};

/** Liste des actions d'une réponse d'AXIA, chacune avec son état (fait, en attente de ton accord, non fait…). */
export function ActionsAxia({ actions, sombre }: { actions?: string[]; sombre?: boolean }) {
  const t = useT();
  if (!actions?.length) return null;
  const lignes = actions.map(etatActionAxia);
  const attente = lignes.some((l) => l.etat === "attente");
  return (
    <div className="flex flex-col gap-1.5">
      <ul className="flex flex-col gap-1.5" aria-label={t("Actions d'AXIA")}>
        {lignes.map((l, j) => {
          const st = STYLE_ETAT[l.etat];
          return (
            <li key={j} className={`flex items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] leading-snug ${sombre ? st.sombre : st.clair}`}>
              <st.Icone size={13} className="mt-px flex-shrink-0" aria-hidden />
              <span className="min-w-0 [overflow-wrap:anywhere]"><strong className="font-semibold">{t(st.libelle)} :</strong> {l.texte}</span>
            </li>
          );
        })}
      </ul>
      {attente && (
        <p className={`text-[11.5px] ${sombre ? "text-white/60" : "text-doux"}`}>
          {t("Rien n'est encore fait : autorise ou refuse en haut du panneau AXIA.")}
        </p>
      )}
    </div>
  );
}
