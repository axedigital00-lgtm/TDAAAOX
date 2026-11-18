"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Gift, Check, Clock } from "lucide-react";
import { toast } from "sonner";
import { Bouton, Modale } from "@/components/ui";
import { AbonnementOverlay } from "@/components/dashboard/AbonnementOverlay";
import { DUREE_ESSAI_JOURS, tempsRestant } from "@/lib/essai-regles";
import { useT } from "@/components/I18nProvider";

// Essai de 7 jours du plan Illimité (lib/essai.ts), sur toute la plateforme :
// proposition à l'arrivée, compte à rebours pendant l'essai, choix d'un plan à la fin.
// Au-dessus du Constructeur (z-index 9999) : visible partout.

export interface EssaiProps { phase: "disponible" | "en_cours" | "termine"; finLe: string | null; proposer: boolean; montrerFin: boolean }

const AVANTAGES = ["Commandes illimitées (au lieu de 60 par mois)", "Sourcing mondial de produits", "Statistiques avancées et en temps réel", "Plusieurs boutiques sur ton compte"];

async function envoyer(action: "demarrer" | "refuser" | "fin_vue") {
  const res = await fetch("/api/abonnement/essai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Erreur");
}

/** Bouton « Démarrer mon essai » : démarre puis recharge la page (tous les cadenas s'ouvrent). */
export function BoutonEssai({ libelle, onFait }: { libelle?: string; onFait?: () => void }) {
  const t = useT();
  const router = useRouter();
  const [etat, setEtat] = useState<"" | "envoi" | "erreur">("");
  return (
    <Bouton charge={etat === "envoi"} icone={<Gift size={16} aria-hidden />} onClick={async () => {
      setEtat("envoi");
      try { await envoyer("demarrer"); onFait?.(); router.refresh(); }
      catch (e) { setEtat("erreur"); toast.error(e instanceof Error && e.message && e.message !== "Erreur" ? t(e.message) : t("L'essai n'a pas pu démarrer. Vérifie ta connexion et réessaie.")); }
    }}>
      {etat === "erreur" ? t("Réessayer de démarrer l'essai") : t(libelle ?? "Démarrer mon essai")}
    </Bouton>
  );
}

/** Temps restant, mis à jour chaque minute ; la page se recharge à la fin (l'essai s'arrête). */
export function useTempsRestant(finLe: string | null) {
  const router = useRouter();
  const [maintenant, setMaintenant] = useState(() => new Date());
  useEffect(() => {
    if (!finLe) return;
    const id = setInterval(() => {
      const n = new Date();
      setMaintenant(n);
      if (n >= new Date(finLe)) { clearInterval(id); router.refresh(); }
    }, 60_000);
    return () => clearInterval(id);
  }, [finLe, router]);
  if (!finLe) return null;
  const fin = new Date(finLe);
  return { texte: tempsRestant(fin, maintenant), urgent: fin.getTime() - maintenant.getTime() < 48 * 3600 * 1000 };
}

export function EssaiIllimite({ phase, finLe, proposer, montrerFin }: EssaiProps) {
  const t = useT();
  const [proposition, setProposition] = useState(proposer);
  const [fin, setFin] = useState(montrerFin);
  const [plans, setPlans] = useState(false);
  const reste = useTempsRestant(phase === "en_cours" ? finLe : null);
  const [monte, setMonte] = useState(false);
  useEffect(() => setMonte(true), []);
  if (!monte) return null;

  return createPortal(
    <>
      {/* ── Compte à rebours pendant l'essai ── */}
      {reste && !plans && (
        <button onClick={() => setPlans(true)} title={t("Voir les plans")}
          className={`fixed z-[10000] left-1/2 -translate-x-1/2 bottom-24 md:bottom-4 flex items-center gap-2 min-h-10 pl-3 pr-4 rounded-full text-sm font-semibold shadow-flottante border whitespace-nowrap ${reste.urgent ? "bg-attention-fond border-attention-bordure text-attention" : "bg-secondaire border-secondaire text-carte"}`}>
          <Clock size={15} className={reste.urgent ? "" : "text-primaire"} aria-hidden />
          {t("Essai Illimité")} · {t("{0} restants", reste.texte)}
        </button>
      )}

      {/* ── Proposition (première arrivée, ou tant qu'il n'a pas répondu) ── */}
      <Modale ouverte={proposition} verrouillee onFermer={() => {}} taille="md"
        titre={<span className="flex items-center gap-2"><Gift size={20} className="text-attention" aria-hidden />{t("{0} jours d'Illimité offerts", String(DUREE_ESSAI_JOURS))}</span>}
        description={t("Essaie gratuitement tout ce qu'offre le plan Illimité. Sans carte, sans engagement : à la fin, tu choisis un plan ou tu continues en Essentiel (gratuit).")}
        actions={<>
          <Bouton variante="fantome" onClick={() => { setProposition(false); envoyer("refuser").catch(() => {}); }}>
            {t("Non merci, rester en Essentiel")}
          </Bouton>
          <BoutonEssai onFait={() => setProposition(false)} />
        </>}>
        <ul className="space-y-2">
          {AVANTAGES.map((a) => <li key={a} className="flex items-start gap-2 ax-texte"><Check size={16} className="mt-0.5 text-succes flex-shrink-0" aria-hidden />{t(a)}</li>)}
        </ul>
        <p className="mt-4 ax-aide">{t("Un seul essai par compte : il démarre dès que tu cliques.")}</p>
        <p className="mt-1 ax-aide">{t("Tu pourras encore le démarrer plus tard depuis Abonnement.")}</p>
      </Modale>

      {/* ── Fin de l'essai : choisir un plan, ou rester en Essentiel ── */}
      {(fin || plans) && (
        <AbonnementOverlay
          message={fin ? "Ton essai Illimité est terminé — continue avec Pro ou Illimité" : undefined}
          actionSecondaire={fin ? "Continuer en Essentiel" : undefined}
          onClose={() => { if (fin) envoyer("fin_vue").catch(() => {}); setFin(false); setPlans(false); }}
        />
      )}
    </>,
    document.body,
  );
}
