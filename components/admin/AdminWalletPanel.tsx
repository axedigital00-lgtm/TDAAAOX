"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Wallet, ArrowUpFromLine, Loader2, Smartphone, Building2, ShieldCheck, X } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { useConfirmation } from "@/components/command-center/Confirmation";
import { Badge, EtatVide, type Ton } from "@/components/command-center/ui";

interface RetraitItem {
  id: string; montant: number; devise: string; methode: string;
  destinataire: string; operateur?: string; statut: string; createdAt: string;
}
interface WalletData {
  solde: number; totalRecu: number; totalRetire: number; devise: string;
  retraits: RetraitItem[];
}

const OPERATEURS = [
  { id: "MTN", label: "MTN Mobile Money" },
  { id: "Orange", label: "Orange Money" },
];

function fmt(n: number, devise = "XAF") {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: devise, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

const STATUT_LABEL: Record<string, { label: string; ton: Ton }> = {
  en_attente: { label: "En attente", ton: "warn" },
  traitement: { label: "En traitement", ton: "info" },
  complete: { label: "Payé", ton: "good" },
  echoue: { label: "Échoué (remboursé)", ton: "bad" },
};

export function AdminWalletPanel({ peutRetirer }: { peutRetirer: boolean }) {
  const t = useT();
  const { confirmer, dialogue } = useConfirmation();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erreurChargement, setErreurChargement] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ montant: "", methode: "mobile_money" as "mobile_money" | "virement_bancaire", operateur: "MTN", destinataire: "" });
  const [erreurs, setErreurs] = useState<{ montant?: string; destinataire?: string }>({});

  async function charger() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/wallet");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error();
      // Un wallet fraîchement créé (aucune commission encaissée pour l'instant)
      // n'a pas encore de ligne en base — on affiche un état à 0, jamais un
      // chargement infini.
      setWallet(data.wallet ?? { solde: 0, totalRecu: 0, totalRetire: 0, devise: "XAF", retraits: [] });
      setErreurChargement(false);
    } catch {
      // Pas de faux solde à 0 en cas d'échec : on le dit.
      setErreurChargement(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { charger(); }, []);

  async function retirer(e: React.FormEvent) {
    e.preventDefault();
    const err: typeof erreurs = {};
    if (!form.montant || Number(form.montant) <= 0) err.montant = t("Saisissez un montant supérieur à 0.");
    else if (wallet && Number(form.montant) > wallet.solde) err.montant = t("Le montant dépasse le solde disponible ({0}).", fmt(wallet.solde, wallet.devise));
    if (!form.destinataire.trim()) err.destinataire = form.methode === "mobile_money" ? t("Saisissez le numéro Mobile Money qui recevra l'argent.") : t("Saisissez l'IBAN ou le numéro de compte qui recevra l'argent.");
    setErreurs(err);
    if (err.montant || err.destinataire) return;
    const montant = fmt(Number(form.montant), wallet?.devise);
    const ok = await confirmer({
      titre: t("Retirer {0} du wallet Axso ?", montant),
      message: t("Le solde est débité tout de suite. Faites ensuite le transfert à la main ; en cas de refus, le montant est recrédité."),
      details: [
        { libelle: t("Montant"), valeur: montant },
        { libelle: t("Moyen"), valeur: form.methode === "mobile_money" ? `Mobile Money ${form.operateur}` : t("Virement bancaire") },
        { libelle: t("Destinataire"), valeur: form.destinataire.trim() },
      ],
      action: t("Retirer {0}", montant),
      danger: true,
    });
    if (!ok) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/wallet/retrait", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      toast.success(t("Retrait de {0} enregistré vers {1}.", montant, form.destinataire.trim()));
      setForm({ montant: "", methode: "mobile_money", operateur: "MTN", destinataire: "" });
      setShowForm(false);
      charger();
    } catch (e: any) {
      toast.error(t(e.message || "Le retrait n'a pas été enregistré. Vérifiez le montant et réessayez."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="cc-card p-4" style={{ borderColor: "var(--cc-accent)" }} aria-labelledby="wallet-axso-titre">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center cc-badge-accent" aria-hidden>
            <Wallet size={18} />
          </div>
          <div>
            <h2 id="wallet-axso-titre" className="cc-h2">{t("Wallet Axso")}</h2>
            <p className="text-[12px] cc-muted">{t("Commission + revenus d'abonnement — argent réellement encaissé")}</p>
          </div>
        </div>
        {peutRetirer && wallet && (
          <button onClick={() => setShowForm(s => !s)} aria-expanded={showForm} className={`cc-btn h-10 sm:h-8 ${showForm ? "" : "cc-btn-primary"}`}>
            {showForm ? <X size={14} aria-hidden /> : <ArrowUpFromLine size={14} aria-hidden />}{showForm ? t("Fermer le formulaire") : t("Retirer des fonds")}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10" role="status" aria-label={t("Chargement…")}><Loader2 size={20} className="animate-spin cc-faint" aria-hidden /></div>
      ) : erreurChargement || !wallet ? (
        <EtatVide titre={t("Le solde du wallet Axso n'a pas pu être chargé.")} explication={t("Vérifiez votre connexion puis réessayez.")} action={<button className="cc-btn cc-btn-sm h-10 sm:h-8" onClick={charger}>{t("Réessayer")}</button>} />
      ) : (
        <>
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <div>
              <dd className="text-2xl font-semibold cc-num" style={{ color: "var(--cc-accent-text)" }}>{fmt(wallet.solde, wallet.devise)}</dd>
              <dt className="text-[12px] cc-muted mt-1">{t("Solde disponible")}</dt>
            </div>
            <div>
              <dd className="text-lg font-semibold cc-num">{fmt(wallet.totalRecu, wallet.devise)}</dd>
              <dt className="text-[12px] cc-muted mt-1">{t("Total encaissé")}</dt>
            </div>
            <div>
              <dd className="text-lg font-semibold cc-num">{fmt(wallet.totalRetire, wallet.devise)}</dd>
              <dt className="text-[12px] cc-muted mt-1">{t("Total retiré")}</dt>
            </div>
          </dl>

          {showForm && peutRetirer && (
            <form onSubmit={retirer} noValidate className="rounded-xl p-4 mb-5 space-y-3" style={{ background: "var(--cc-surface-2)" }}>
              <p className="flex items-center gap-2 text-[12px] cc-good">
                <ShieldCheck size={12} aria-hidden />{t("Débit atomique : transfert fait à la main, recrédité en cas de refus")}
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block text-[12px] space-y-1">
                  <span className="cc-muted">{t("Montant à retirer ({0})", wallet.devise)}</span>
                  <input type="number" inputMode="numeric" min={1} value={form.montant} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))}
                    className="cc-input w-full h-10" aria-invalid={!!erreurs.montant} aria-describedby={erreurs.montant ? "wallet-err-montant" : undefined} />
                  {erreurs.montant && <span id="wallet-err-montant" className="block cc-bad">{erreurs.montant}</span>}
                </label>
                <label className="block text-[12px] space-y-1">
                  <span className="cc-muted">{t("Moyen de versement")}</span>
                  <select value={form.methode} onChange={e => setForm(f => ({ ...f, methode: e.target.value as any }))} className="cc-select w-full h-10">
                    <option value="mobile_money">{t("Mobile Money")}</option>
                    <option value="virement_bancaire">{t("Virement bancaire")}</option>
                  </select>
                </label>
              </div>
              {form.methode === "mobile_money" && (
                <fieldset className="text-[12px] space-y-1">
                  <legend className="cc-muted mb-1">{t("Opérateur")}</legend>
                  <div className="flex flex-wrap gap-2">
                    {OPERATEURS.map(op => (
                      <button key={op.id} type="button" onClick={() => setForm(f => ({ ...f, operateur: op.id }))} aria-pressed={form.operateur === op.id}
                        className="cc-btn h-10 sm:h-8" style={form.operateur === op.id ? { borderColor: "var(--cc-accent)", color: "var(--cc-accent-text)" } : undefined}>
                        <Smartphone size={11} aria-hidden /> {t(op.label)}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}
              <label className="block text-[12px] space-y-1">
                <span className="cc-muted">{form.methode === "mobile_money" ? t("Numéro qui reçoit l'argent") : t("IBAN ou numéro de compte")}</span>
                <input value={form.destinataire} onChange={e => setForm(f => ({ ...f, destinataire: e.target.value }))}
                  placeholder={form.methode === "mobile_money" ? t("+237 6XX XXX XXX") : undefined}
                  className="cc-input w-full h-10" aria-invalid={!!erreurs.destinataire} aria-describedby={erreurs.destinataire ? "wallet-err-dest" : undefined} />
                {erreurs.destinataire && <span id="wallet-err-dest" className="block cc-bad">{erreurs.destinataire}</span>}
              </label>
              <button type="submit" disabled={submitting} className="cc-btn cc-btn-primary w-full justify-center h-10">
                {submitting ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <ArrowUpFromLine size={14} aria-hidden />}
                {submitting ? t("Enregistrement du retrait…") : t("Vérifier et retirer")}
              </button>
            </form>
          )}

          <h3 className="text-[12px] font-medium cc-muted mb-2">{t("Derniers retraits du wallet Axso")}</h3>
          {wallet.retraits.length === 0 ? (
            <p className="text-[12px] cc-faint text-center py-4">{t("Aucun retrait pour l'instant.")}</p>
          ) : (
            <ul className="space-y-2">
              {wallet.retraits.map(r => {
                const s = STATUT_LABEL[r.statut] ?? { label: r.statut, ton: "neutre" as Ton };
                return (
                  <li key={r.id} className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg" style={{ background: "var(--cc-surface-2)" }}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      {r.methode === "mobile_money" ? <Smartphone size={13} className="cc-faint shrink-0" aria-label={t("Mobile Money")} /> : <Building2 size={13} className="cc-faint shrink-0" aria-label={t("Virement bancaire")} />}
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium cc-num">{fmt(r.montant, r.devise)}</p>
                        <p className="text-[11.5px] cc-muted [overflow-wrap:anywhere]">{r.destinataire} · {new Date(r.createdAt).toLocaleDateString(t.loc)}</p>
                      </div>
                    </div>
                    <Badge ton={s.ton}>{t(s.label)}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
      {dialogue}
    </section>
  );
}
