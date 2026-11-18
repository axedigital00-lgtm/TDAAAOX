"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Clock, Loader2, X } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { useConfirmation } from "@/components/command-center/Confirmation";

interface RetraitManuel {
  id: string; nomBoutique: string; montant: number; devise: string; methode: string;
  destinataire: string; operateur?: string; notes?: string; createdAt: string;
}

// Retraits des marchands (tous, depuis le 20/10/2026) : l'admin fait le transfert à la main
// (détails dans l'e-mail « Retrait à valider ») puis le marque payé, ou le refuse
// (le marchand est alors recrédité). Le marchand est prévenu dans les deux cas.
// `commissions` : même écran pour les commissions d'affiliés (Admin › Affiliés, /api/admin/affilies).
// `livreurs` : retraits des livreurs (lib/gains-livreur.ts) ; refusé → le livreur est recrédité.
export function AdminRetraitsManuels({ peutTraiter, commissions = false, livreurs = false }: { peutTraiter: boolean; commissions?: boolean; livreurs?: boolean }) {
  const source = commissions ? "/api/admin/affilies" : livreurs ? "/api/admin/livreurs/retraits" : "/api/admin/wallet/retraits";
  const t = useT();
  const { confirmer, dialogue } = useConfirmation();
  const [retraits, setRetraits] = useState<RetraitManuel[]>([]);
  const [etat, setEtat] = useState<"chargement" | "ok" | "erreur">("chargement");
  const [enCours, setEnCours] = useState<string | null>(null);
  const beneficiaire = commissions ? t("l'affilié") : livreurs ? t("le livreur") : t("le marchand");

  async function charger() {
    try {
      const res = await fetch(source);
      if (!res.ok) throw new Error();
      setRetraits((await res.json().catch(() => ({}))).retraits ?? []);
      setEtat("ok");
    } catch { setEtat("erreur"); }
  }
  useEffect(() => { charger(); }, []);

  const methode = (r: RetraitManuel) => (r.methode === "mobile_money" ? `Mobile Money ${r.operateur ?? ""}`.trim() : t("Virement bancaire"));

  async function traiter(r: RetraitManuel, action: "payer" | "refuser") {
    const montant = `${r.montant.toLocaleString(t.loc)} ${r.devise}`;
    const details = [
      { libelle: t("Montant"), valeur: montant },
      { libelle: t("Bénéficiaire"), valeur: r.nomBoutique },
      { libelle: t("Moyen"), valeur: methode(r) },
      { libelle: t("Destinataire"), valeur: r.destinataire },
    ];
    const ok = await confirmer(action === "payer"
      ? { titre: t("Confirmer l'envoi de {0} à {1} ?", montant, r.nomBoutique), message: t("Validez seulement après avoir fait le transfert vous-même. Le retrait sera marqué payé et {0} sera prévenu.", beneficiaire), details, action: t("Marquer le retrait payé") }
      : { titre: t("Refuser le retrait de {0} pour {1} ?", montant, r.nomBoutique), message: commissions ? t("Les commissions redeviennent disponibles pour l'affilié, qui est prévenu.") : t("Le montant est recrédité sur le solde de {0}, qui est prévenu.", beneficiaire), details, action: t("Refuser le retrait"), danger: true });
    if (!ok) return;
    setEnCours(r.id);
    try {
      const res = await fetch(source, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: r.id, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(t(data.error ?? "Le retrait n'a pas pu être mis à jour. Réessayez.")); return; }
      toast.success(action === "payer"
        ? t("Retrait de {0} marqué payé — {1} est prévenu.", montant, r.nomBoutique)
        : t("Retrait de {0} refusé — {1} est recrédité.", montant, r.nomBoutique));
      charger();
    } catch { toast.error(t("Connexion perdue : le retrait n'a pas été mis à jour. Réessayez.")); } finally { setEnCours(null); }
  }

  const titre = commissions ? t("Retraits d'affiliés à verser") : livreurs ? t("Retraits des livreurs à payer") : t("Retraits à traiter à la main");

  if (etat === "erreur") {
    return (
      <section className="cc-card p-4 flex flex-wrap items-center justify-between gap-3" role="alert">
        <p className="text-[13px]"><span className="cc-bad font-medium">{titre} :</span> <span className="cc-muted">{t("la liste n'a pas pu être chargée.")}</span></p>
        <button className="cc-btn cc-btn-sm h-10 sm:h-8" onClick={() => { setEtat("chargement"); charger(); }}>{t("Réessayer")}</button>
      </section>
    );
  }
  if (etat === "chargement" || retraits.length === 0) return null; // rien à traiter : le bloc ne s'affiche pas

  return (
    <section className="cc-card p-4" aria-labelledby={`retraits-${source}`}>
      <h2 id={`retraits-${source}`} className="cc-h2 flex items-center gap-2">
        <Clock size={15} className="cc-warn" aria-hidden />{titre} <span className="cc-badge cc-badge-warn cc-num">{retraits.length}</span>
      </h2>
      <p className="text-[12px] cc-muted mt-1 mb-3">
        {commissions
          ? t("Les commissions sont déjà retenues sur la part des marchands. Faites le transfert à la main (détails dans l'e-mail reçu), puis marquez-le payé — ou refusez-le : les commissions redeviennent disponibles pour l'affilié.")
          : livreurs
          ? t("Le solde du livreur est déjà débité. Faites le transfert à la main (détails dans l'e-mail reçu), puis marquez-le payé — ou refusez-le pour recréditer le livreur.")
          : t("Le solde du marchand est déjà débité. Faites le transfert à la main (détails dans l'e-mail reçu), puis marquez-le payé — ou refusez-le pour recréditer le marchand.")}
      </p>
      <ul className="space-y-2">
        {retraits.map(r => (
          <li key={r.id} className="flex items-center justify-between flex-wrap gap-3 px-3 py-2.5 rounded-lg" style={{ background: "var(--cc-surface-2)" }}>
            <div className="min-w-0">
              <p className="text-[13px] font-medium [overflow-wrap:anywhere]">
                <span className="cc-num">{r.montant.toLocaleString(t.loc)} {r.devise}</span> — {r.nomBoutique}
              </p>
              <p className="text-[12px] cc-muted [overflow-wrap:anywhere]">
                {methode(r)} → {r.destinataire} · {t("demandé le")} {new Date(r.createdAt).toLocaleDateString(t.loc)}
              </p>
              {r.notes && <p className="text-[12px] cc-warn mt-0.5">{r.notes}</p>}
            </div>
            {peutTraiter && (
              <div className="flex gap-2">
                <button onClick={() => traiter(r, "payer")} disabled={enCours === r.id} className="cc-btn cc-btn-sm cc-btn-primary h-10 sm:h-8"
                  aria-label={t("Marquer payé le retrait de {0}", r.nomBoutique)}>
                  {enCours === r.id ? <Loader2 size={12} className="animate-spin" aria-hidden /> : <Check size={12} aria-hidden />}{t("Marquer payé")}
                </button>
                <button onClick={() => traiter(r, "refuser")} disabled={enCours === r.id} className="cc-btn cc-btn-sm cc-bad h-10 sm:h-8"
                  aria-label={t("Refuser le retrait de {0}", r.nomBoutique)}>
                  <X size={12} aria-hidden />{t("Refuser")}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {dialogue}
    </section>
  );
}
