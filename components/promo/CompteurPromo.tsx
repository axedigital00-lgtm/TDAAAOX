"use client";
// Compte à rebours de la promo de lancement (lib/promo.ts), le même partout : la fin vient du
// serveur, et l'écart d'horloge du téléphone est corrigé avec l'heure du serveur.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Gift, ArrowRight } from "lucide-react";
import { useT } from "@/components/I18nProvider";

// `corriger` : seulement quand l'heure du serveur est fraîche (page non mise en cache).
function useReste(finLe: string, maintenantServeur: number, corriger: boolean) {
  const [reste, setReste] = useState(() => new Date(finLe).getTime() - maintenantServeur);
  useEffect(() => {
    const ecart = corriger ? maintenantServeur - Date.now() : 0;
    const tick = () => setReste(new Date(finLe).getTime() - (Date.now() + ecart));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [finLe, maintenantServeur, corriger]);
  return Math.max(0, reste);
}

const decouper = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60];
};

function Cases({ ms, sombre }: { ms: number; sombre?: boolean }) {
  const t = useT();
  const unites = ["jours", "heures", "min", "sec"];
  return (
    <div className="flex items-center gap-1.5 sm:gap-2" aria-live="off">
      {decouper(ms).map((v, i) => (
        <div key={i} className={`flex flex-col items-center justify-center rounded-xl min-w-[52px] sm:min-w-[64px] py-2 ${sombre ? "bg-white/10 border border-white/15" : "bg-white border border-[#F5A623]/30 shadow-sm"}`}>
          <span className={`text-[22px] sm:text-[28px] font-black leading-none tabular-nums ${sombre ? "text-[#F5A623]" : "text-[#111]"}`}>{String(v).padStart(2, "0")}</span>
          <span className={`text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wider mt-1 ${sombre ? "text-white/60" : "text-[#999]"}`}>{t(unites[i])}</span>
        </div>
      ))}
    </div>
  );
}

/** Landing, au-dessus des packs. `onFin` : la section repasse en tarifs normaux. */
export function CompteurPromoLanding({ finLe, maintenant, onFin }: { finLe: string; maintenant: number; onFin: () => void }) {
  const t = useT();
  // Landing régénérée chaque minute : heure du serveur possiblement en retard, on garde celle de l'appareil.
  const reste = useReste(finLe, maintenant, false);
  useEffect(() => { if (reste === 0) onFin(); }, [reste, onFin]);
  if (reste === 0) return null;
  return (
    <div className="max-w-3xl mx-auto mb-12 rounded-3xl p-5 sm:p-7 text-center text-white" style={{ background: "linear-gradient(135deg,#111 0%,#262626 100%)", boxShadow: "0 20px 60px rgba(245,166,35,0.25)" }}>
      <p className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-[#F5A623] mb-2"><Gift size={15} />{t("Promo de lancement")}</p>
      <p className="text-[18px] sm:text-[22px] font-extrabold mb-1">{t("Tout l'Illimité offert : inscris-toi gratuitement")}</p>
      <p className="text-[13px] text-white/60 mb-5">{t("Pendant la promo, le plan gratuit débloque toutes les fonctionnalités. Les packs payants rouvrent à la fin du compteur.")}</p>
      <div className="flex justify-center"><Cases ms={reste} sombre /></div>
    </div>
  );
}

/** Bandeau du tableau de bord : bien visible, en haut de chaque page. */
export function CompteurPromoDashboard({ finLe, maintenant, compact }: { finLe: string; maintenant: number; compact?: boolean }) {
  const t = useT();
  const router = useRouter();
  const reste = useReste(finLe, maintenant, true);
  // Fin du compteur : le serveur recalcule le plan (retour aux droits payés).
  useEffect(() => { if (reste === 0) router.refresh(); }, [reste, router]);
  if (reste === 0) return null;
  if (compact) {
    // Écran d'accueil AXIA (plein écran) : une ligne, sans voler la place de la discussion.
    const [j, h, m, sec] = decouper(reste).map((v) => String(v).padStart(2, "0"));
    return (
      <Link href="/dashboard/abonnement" className="flex items-center justify-center gap-2 px-3 py-2 text-white text-[12px] md:text-[13px] flex-shrink-0" style={{ background: "linear-gradient(90deg,#111,#2a2a2a)", borderBottom: "1px solid rgba(245,166,35,0.4)" }}>
        <Gift size={14} className="text-[#F5A623] flex-shrink-0" />
        <span className="font-bold truncate">{t("Promo : tout l'Illimité offert")}</span>
        <span className="font-black tabular-nums text-[#F5A623] whitespace-nowrap">{j}{t("j")} {h}:{m}:{sec}</span>
      </Link>
    );
  }
  return (
    <div className="rounded-2xl p-4 md:p-5 md:mt-4 mb-4 text-white flex flex-col lg:flex-row lg:items-center gap-4" style={{ background: "linear-gradient(135deg,#111 0%,#2a2a2a 100%)", boxShadow: "0 10px 40px rgba(245,166,35,0.22)", border: "1px solid rgba(245,166,35,0.35)" }}>
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="w-11 h-11 rounded-xl bg-[#F5A623] text-[#111] flex items-center justify-center flex-shrink-0"><Gift size={20} /></div>
        <div className="min-w-0">
          <p className="text-[15px] md:text-[17px] font-extrabold">{t("Promo de lancement : tout l'Illimité est offert")}</p>
          <p className="text-[12px] md:text-[13px] text-white/65 leading-snug">{t("Toutes les fonctionnalités sont débloquées jusqu'à la fin du compteur. Ensuite, ton compte repasse en Essentiel : choisis Pro ou Illimité pour les garder.")}</p>
          <Link href="/dashboard/abonnement" className="inline-flex items-center gap-1 mt-1.5 text-[12px] font-semibold text-[#F5A623]">{t("Voir les packs")}<ArrowRight size={12} /></Link>
        </div>
      </div>
      <Cases ms={reste} sombre />
    </div>
  );
}
