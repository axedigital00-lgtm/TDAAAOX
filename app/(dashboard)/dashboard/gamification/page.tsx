"use client";

import { useEffect, useState } from "react";
import { Trophy, Sparkles } from "lucide-react";
import { AgentActiveIndicator } from "@/components/dashboard/AgentActiveIndicator";
import { useT } from "@/components/I18nProvider";

interface Badge {
  type: string;
  titre: string;
  description: string;
  emoji: string;
  obtenu: boolean;
  obtenueAt: string | null;
}

export default function GamificationPage() {
  const t = useT();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [nouveaux, setNouveaux] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/badges")
      .then((r) => r.json())
      .then((d) => { setBadges(d.badges ?? []); setNouveaux(d.nouveaux ?? []); })
      .finally(() => setLoading(false));
  }, []);

  const obtenus = badges.filter((b) => b.obtenu);
  const restants = badges.filter((b) => !b.obtenu);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-(--color-primary) border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-bold text-(--color-text-strong) tracking-tight inline-flex items-center gap-2">{t("Trophées & Badges")}{" "}<AgentActiveIndicator label={t("Agent Fidélité actif")} /></h1>
        <p className="text-[12.5px] text-(--color-text-subdued) mt-0.5">{t("Récompenses obtenues et objectifs à atteindre")}</p>
      </div>

      {/* Nouveaux badges */}
      {nouveaux.length > 0 && (
        <div className="bg-(--color-magic-bg) border border-(--color-magic-border) rounded-xl p-5">
          <p className="text-[13px] font-bold text-(--color-text-strong) mb-3 flex items-center gap-1.5"><Sparkles size={14} className="text-(--color-magic-text)" />{" "}{t("Nouveau")}{nouveaux.length > 1 ? "x" : ""} badge{nouveaux.length > 1 ? "s" : ""} obtenu{nouveaux.length > 1 ? "s" : ""} !</p>
          <div className="flex gap-3 flex-wrap">
            {nouveaux.map((b) => (
              <div key={b.type} className="flex items-center gap-2 bg-(--color-surface) rounded-xl px-4 py-2.5 border border-(--color-magic-border)">
                <span className="text-2xl">{t(b.emoji)}</span>
                <div>
                  <p className="text-[13px] font-semibold text-(--color-text-strong)">{t(b.titre)}</p>
                  <p className="text-[10px] text-(--color-text-subdued)">{t(b.description)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progression */}
      <div className="bg-(--color-surface) border border-(--color-border-secondary) rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[13px] font-semibold text-(--color-text-strong)">{t("Progression")}</p>
          <p className="text-[12px] text-(--color-text-subdued)">{obtenus.length} / {badges.length}</p>
        </div>
        <div className="h-2 bg-(--color-surface-tertiary) rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${badges.length > 0 ? (obtenus.length / badges.length) * 100 : 0}%`, background: "var(--color-primary)" }}
          />
        </div>
      </div>

      {/* Badges obtenus */}
      {obtenus.length > 0 && (
        <div>
          <p className="text-[13px] font-semibold text-(--color-text-strong) mb-3">{t("Obtenus (")}{obtenus.length})</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {obtenus.map((b) => (
              <div key={b.type} className="bg-(--color-surface) border border-(--color-border-secondary) rounded-xl p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: "var(--color-magic-bg)" }}>
                  {t(b.emoji)}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-(--color-text-strong)">{t(b.titre)}</p>
                  <p className="text-[11px] text-(--color-text-subdued)">{t(b.description)}</p>
                  {b.obtenueAt && (
                    <p className="text-[10px] text-(--color-text-subdued) mt-0.5">
                      {t("Obtenu le")}{" "}{new Date(b.obtenueAt).toLocaleDateString("fr")}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* À débloquer */}
      {restants.length > 0 && (
        <div>
          <p className="text-[13px] font-semibold text-(--color-text-strong) mb-3">{t("À débloquer (")}{restants.length})</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {restants.map((b) => (
              <div key={b.type} className="bg-(--color-surface-secondary) border border-dashed border-(--color-border) rounded-xl p-4 flex items-center gap-3 opacity-60">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl grayscale" style={{ background: "var(--color-surface-tertiary)" }}>
                  {t(b.emoji)}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-(--color-text)">{t(b.titre)}</p>
                  <p className="text-[11px] text-(--color-text-subdued)">{t(b.description)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {badges.length === 0 && (
        <div className="bg-(--color-surface) border border-dashed border-(--color-border) rounded-xl p-10 text-center">
          <Trophy size={32} className="mx-auto mb-3 text-(--color-text-subdued)" />
          <p className="text-[13px] text-(--color-text-subdued)">{t("Vos badges apparaîtront ici au fur et à mesure de vos performances.")}</p>
        </div>
      )}
    </div>
  );
}
