"use client";
import { useEffect, useState } from "react";
import { Loader2, CreditCard, CheckCircle2 } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { PLANS_CATALOGUE } from "@/lib/plans-catalogue";
import { planObtenu } from "@/lib/inscription";
import type { Palier } from "@/lib/plans";

const ACCENT = "#F5A623";
const ACCENT_DARK = "#d4880d";
const ARRIVEE = "/dashboard/builder?bienvenue=1";
export const prixPlan = (prix: number) => `${prix.toLocaleString("fr-FR")} FCFA`;

// Dernière étape du tunnel quand un plan payant a été choisi (?plan=palier1|palier2) : le compte
// existe et la session est ouverte, on paie l'abonnement par le même chemin que /dashboard/abonnement
// (/api/abonnement/paiement → NotchPay → webhook / activerAbonnementPaye). NotchPay renvoie ici
// (?paiement=en_cours) : on relit le paiement avant d'entrer, pour que le palier soit actif à
// l'arrivée (et que l'essai Illimité ne soit pas proposé à quelqu'un qui vient de payer).
export function EcranPaiement({ planInitial, retour }: { planInitial: Palier; retour: boolean }) {
  const t = useT();
  const [plan, setPlan] = useState<Palier>(planInitial);
  const [etat, setEtat] = useState<"choix" | "verif" | "paiement" | "echec" | "ok">(retour ? "verif" : "choix");
  const [erreur, setErreur] = useState("");
  const choisi = PLANS_CATALOGUE.find((p) => p.id === plan)!;

  async function verifier() {
    setEtat("verif"); setErreur("");
    const res = await fetch("/api/abonnement/etat?verifier=1").catch(() => null);
    if (res?.status === 401) { window.location.href = "/connexion"; return; }
    const data = await res?.json().catch(() => null);
    if (planObtenu(data?.planActuel, plan)) {
      setEtat("ok");
      setTimeout(() => { window.location.href = ARRIVEE; }, 1500);
    } else setEtat("echec");
  }
  useEffect(() => { if (retour) verifier(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function payer() {
    setEtat("paiement"); setErreur("");
    try {
      const res = await fetch("/api/abonnement/paiement", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan, retour: "inscription" }) });
      const data = await res.json();
      if (!res.ok || !data.authorizationUrl) throw new Error(data.error || "Erreur d'initialisation du paiement");
      // « Précédent » depuis NotchPay revient sur cet écran, pas au début du tunnel.
      window.history.replaceState(null, "", `/inscription?paiement=en_cours&plan=${plan}`);
      window.location.href = data.authorizationUrl;
    } catch (e: any) {
      setErreur(e.message);
      setEtat("choix");
    }
  }

  const occupe = etat === "verif" || etat === "paiement" || etat === "ok";
  return (
    <div className="rounded-3xl p-6 sm:p-8 border"
      style={{ background: "#ffffff", borderColor: "rgba(245,166,35,0.2)", boxShadow: "0 20px 60px rgba(0,0,0,0.08), 0 0 0 1px rgba(245,166,35,0.06)" }}>
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: "rgba(245,166,35,0.12)", border: "1px solid rgba(245,166,35,0.25)" }}>
        {etat === "ok" ? <CheckCircle2 size={18} style={{ color: "#16A34A" }} /> : <CreditCard size={18} style={{ color: ACCENT }} />}
      </div>
      <h2 className="text-2xl font-bold text-[#111111] mb-1">
        {t(etat === "ok" ? "Paiement confirmé !" : etat === "echec" ? "Paiement non confirmé" : "Active ton abonnement")}
      </h2>
      <p className="text-[#808080] text-sm mb-6">
        {etat === "ok" ? t("Ton plan est actif. Direction ta boutique…")
          : etat === "echec" ? t("Le paiement a échoué, a été abandonné ou n'est pas encore confirmé. Tu peux réessayer, vérifier à nouveau dans un instant, ou continuer en Essentiel (gratuit).")
          : t("Ta boutique est prête. Dernière étape : le paiement de ton plan par Orange Money ou MTN Mobile Money. Il est activé dès que le paiement est confirmé, pour 30 jours.")}
      </p>

      {/* Récapitulatif : plan payant choisi, modifiable */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        {PLANS_CATALOGUE.filter((p) => p.prixXAF > 0).map((p) => {
          const sel = p.id === plan;
          return (
            <button key={p.id} type="button" disabled={occupe} aria-pressed={sel} onClick={() => { setPlan(p.id); if (etat === "echec") setEtat("choix"); }}
              className="rounded-xl p-3 text-left transition-all disabled:opacity-60"
              style={{ border: `1.5px solid ${sel ? ACCENT : "#E5E5E5"}`, background: sel ? "rgba(245,166,35,0.08)" : "#fff" }}>
              <div className="text-sm font-bold text-[#111111]">{t(p.nom)}</div>
              <div className="text-base font-extrabold" style={{ color: ACCENT_DARK }}>{prixPlan(p.prixXAF)}</div>
              <div className="text-xs text-[#808080]">{t("par mois")}</div>
            </button>
          );
        })}
      </div>

      {erreur && (
        <div className="rounded-xl p-3 text-sm text-center mb-4"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#dc2626" }}>
          {t(erreur)}
        </div>
      )}

      {etat !== "ok" && (
        <div className="space-y-3">
          <button type="button" onClick={payer} disabled={occupe}
            className="w-full font-bold py-4 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`, color: "#080808", boxShadow: "0 8px 30px rgba(245,166,35,0.35)" }}>
            {occupe ? <><Loader2 size={16} className="animate-spin" />{" "}{t(etat === "verif" ? "Vérification du paiement…" : "Redirection vers le paiement…")}</>
              : <>{t(etat === "echec" ? "Réessayer le paiement" : "Payer")}{" "}{prixPlan(choisi.prixXAF)}</>}
          </button>
          {etat === "echec" && (
            <button type="button" onClick={verifier}
              className="w-full py-3 rounded-xl text-sm font-semibold border border-[#E5E5E5] text-[#111111]">
              {t("J'ai payé — vérifier à nouveau")}
            </button>
          )}
          <button type="button" disabled={occupe} onClick={() => { window.location.href = ARRIVEE; }}
            className="w-full py-2 text-sm text-[#808080] hover:text-[#111111] disabled:opacity-50">
            {t("Continuer en Essentiel (gratuit)")}
          </button>
        </div>
      )}
    </div>
  );
}
