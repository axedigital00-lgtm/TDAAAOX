"use client";
// Actions administratives d'une boutique (Super admin) : statut, certification, palier, récompense.
// Chaque action est confirmée en nommant la boutique puis journalisée côté serveur (Audit).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BadgeCheck, Ban, CheckCircle2, Crown, Gift, Loader2, Trash2, RotateCcw, ShieldAlert } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { useConfirmation, type Confirmation } from "@/components/command-center/Confirmation";
import { NOM_PLAN, type PlanId } from "@/lib/command-center/types";

const PLANS: { id: PlanId; label: string }[] = [
  { id: "palier0", label: "Essentiel (gratuit)" },
  { id: "palier1", label: "Pro" },
  { id: "palier2", label: "Illimité" },
];

interface Props {
  tenantId: string;
  nomBoutique: string;
  statut: string;
  planType: string;
  certifie: boolean;
  devise: string;
}

export function BoutiqueActionsPanel({ tenantId, nomBoutique, statut, planType, certifie, devise }: Props) {
  const t = useT();
  const router = useRouter();
  const { confirmer, dialogue } = useConfirmation();
  const [loading, setLoading] = useState<string | null>(null);
  const [plan, setPlan] = useState(planType);
  const [jours, setJours] = useState("30");
  const [bonus, setBonus] = useState({ montant: "", raison: "", titre: "", emoji: "🏆" });
  const [erreurBonus, setErreurBonus] = useState<string | null>(null);
  const [erreurJours, setErreurJours] = useState<string | null>(null);
  const nom = `« ${nomBoutique} »`;

  async function appel(key: string, url: string, body: unknown, msg: string, confirmation: Confirmation) {
    if (!(await confirmer(confirmation))) return false;
    setLoading(key);
    try {
      const res = await fetch(url, { method: url.includes("recompense") ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      toast.success(msg);
      router.refresh();
      return true;
    } catch (e: any) {
      toast.error(t(e.message || "L'action n'a pas abouti. Réessayez dans un instant."));
      return false;
    } finally {
      setLoading(null);
    }
  }

  const statutUrl = `/api/admin/tenants/${tenantId}/statut`;
  const occupe = loading !== null;
  const icone = (k: string, I: typeof Ban) => (loading === k ? <Loader2 size={13} className="animate-spin" /> : <I size={13} />);

  async function appliquerPlan() {
    const n = Number(jours);
    if (plan !== "palier0" && (!Number.isInteger(n) || n < 1)) { setErreurJours(t("Indiquez une durée en jours (1 ou plus).")); return; }
    setErreurJours(null);
    const nomPlan = t(NOM_PLAN[plan as PlanId] ?? plan);
    await appel("plan", `/api/admin/tenants/${tenantId}/plan`, { plan, jours }, t("Palier de {0} : {1}.", nom, nomPlan), {
      titre: t("Passer {0} au palier {1} ?", nom, nomPlan),
      message: plan === "palier0" ? t("Le palier gratuit s'applique sans date de fin.") : t("Le palier est offert sans paiement du marchand et prend fin dans {0} jours.", n),
      action: t("Appliquer le palier"),
    });
  }

  async function envoyerRecompense() {
    const montant = Number(bonus.montant || 0);
    if (bonus.montant && !(montant > 0)) { setErreurBonus(t("Le bonus doit être un montant positif.")); return; }
    if (!montant && !bonus.titre.trim()) { setErreurBonus(t("Indiquez un bonus, un titre de trophée, ou les deux.")); return; }
    setErreurBonus(null);
    const fait = await appel("recompense", `/api/admin/tenants/${tenantId}/recompense`, bonus, t("Récompense envoyée à {0}.", nom), {
      titre: t("Récompenser {0} ?", nom),
      message: montant ? t("Le bonus est prélevé sur le wallet Axso (argent réel) et crédité tout de suite au marchand.") : t("Le trophée est symbolique : aucun argent n'est versé."),
      details: [
        ...(montant ? [{ libelle: t("Bonus"), valeur: `${montant.toLocaleString(t.loc)} ${devise}` }] : []),
        ...(bonus.titre.trim() ? [{ libelle: t("Trophée"), valeur: `${bonus.emoji} ${bonus.titre.trim()}` }] : []),
        ...(bonus.raison.trim() ? [{ libelle: t("Raison"), valeur: bonus.raison.trim() }] : []),
      ],
      action: montant ? t("Verser {0} {1}", montant.toLocaleString(t.loc), devise) : t("Décerner le trophée"),
      danger: !!montant,
    });
    if (fait) setBonus({ montant: "", raison: "", titre: "", emoji: "🏆" });
  }

  return (
    <section className="cc-card p-4 sm:p-5 space-y-5" aria-labelledby="actions-admin" style={{ borderColor: "var(--cc-warn-bg)" }}>
      <div>
        <h2 id="actions-admin" className="cc-h2 flex items-center gap-2"><ShieldAlert size={15} className="cc-warn" aria-hidden />{t("Actions administratives")}</h2>
        <p className="cc-faint text-[12px] mt-0.5">{t("Réservées au Super admin. Chaque action demande une confirmation et est enregistrée dans le journal d'audit.")}</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Statut & certification */}
        <div className="space-y-4">
          <div>
            <h3 className="text-[13px] font-semibold mb-2">{t("Statut de la boutique")}</h3>
            <div className="flex flex-wrap gap-2">
              {statut !== "active" && statut !== "supprime" && (
                <button className="cc-btn cc-good" disabled={occupe} onClick={() => appel("active", statutUrl, { statut: "active" }, t("Boutique {0} activée.", nom), statut === "brouillon"
                  ? { titre: t("Activer {0} sans attendre sa publication ?", nom), message: t("Le marchand n'a pas encore publié sa boutique : l'activer la rend tout de suite visible au public."), action: t("Activer la boutique") }
                  : { titre: t("Réactiver la boutique {0} ?", nom), message: t("Sa vitrine redevient visible et le marchand peut de nouveau vendre et retirer son argent."), action: t("Réactiver la boutique") })}>
                  {icone("active", CheckCircle2)}{statut === "brouillon" ? t("Activer") : t("Réactiver")}
                </button>
              )}
              {statut === "active" && (
                <button className="cc-btn cc-warn" disabled={occupe} onClick={() => appel("suspendu", statutUrl, { statut: "suspendu" }, t("Boutique {0} suspendue.", nom),
                  { titre: t("Suspendre la boutique {0} ?", nom), message: t("Sa vitrine n'est plus accessible aux clients et ses retraits sont bloqués jusqu'à la réactivation."), action: t("Suspendre la boutique"), danger: true })}>
                  {icone("suspendu", Ban)}{t("Suspendre")}
                </button>
              )}
              {statut !== "supprime" ? (
                <button className="cc-btn cc-bad" disabled={occupe} onClick={() => appel("supprime", statutUrl, { statut: "supprime" }, t("Boutique {0} supprimée.", nom),
                  { titre: t("Supprimer la boutique {0} ?", nom), message: t("Elle disparaît de la vitrine publique et des listes marchandes. Les données restent conservées (audit, finances) et une restauration reste possible."), action: t("Supprimer la boutique"), danger: true })}>
                  {icone("supprime", Trash2)}{t("Supprimer")}
                </button>
              ) : (
                <button className="cc-btn" disabled={occupe} onClick={() => appel("restaure", statutUrl, { statut: "active" }, t("Boutique {0} restaurée.", nom),
                  { titre: t("Restaurer la boutique {0} ?", nom), message: t("Elle redevient active et visible au public."), action: t("Restaurer la boutique") })}>
                  {icone("restaure", RotateCcw)}{t("Restaurer")}
                </button>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-[13px] font-semibold mb-2">{t("Certification")}</h3>
            <button className="cc-btn" disabled={occupe} onClick={() => appel("certifie", `/api/admin/tenants/${tenantId}/certifie`, { certifie: !certifie }, certifie ? t("Certification de {0} retirée.", nom) : t("Boutique {0} certifiée.", nom), certifie
              ? { titre: t("Retirer la certification de {0} ?", nom), message: t("Le badge de boutique certifiée n'apparaîtra plus sur sa vitrine."), action: t("Retirer la certification"), danger: true }
              : { titre: t("Certifier la boutique {0} ?", nom), message: t("Un badge de boutique certifiée apparaîtra sur sa vitrine."), action: t("Certifier la boutique") })}>
              {icone("certifie", BadgeCheck)}{certifie ? t("Retirer la certification") : t("Certifier cette boutique")}
            </button>
          </div>
        </div>

        {/* Palier */}
        <div className="space-y-2.5">
          <h3 className="text-[13px] font-semibold flex items-center gap-1.5"><Crown size={13} className="cc-warn" aria-hidden />{t("Changer le palier")}</h3>
          <label className="block text-[12px] cc-muted">{t("Palier")}
            <select value={plan} onChange={(e) => setPlan(e.target.value)} className="cc-select w-full mt-1">
              {PLANS.map((p) => <option key={p.id} value={p.id}>{t(p.label)}{p.id === planType ? ` (${t("actuel")})` : ""}</option>)}
            </select>
          </label>
          {plan !== "palier0" && (
            <label className="block text-[12px] cc-muted">{t("Durée offerte (jours)")}
              <input type="number" min={1} inputMode="numeric" value={jours} onChange={(e) => setJours(e.target.value)} className="cc-input w-full mt-1" aria-invalid={!!erreurJours} aria-describedby={erreurJours ? "err-jours" : undefined} />
              {erreurJours && <span id="err-jours" className="block mt-1 cc-bad">{erreurJours}</span>}
            </label>
          )}
          <button className="cc-btn cc-btn-primary" disabled={occupe} onClick={appliquerPlan}>{icone("plan", Crown)}{t("Appliquer le palier")}</button>
        </div>
      </div>

      {/* Récompense */}
      <div className="space-y-2.5 pt-4 border-t cc-sep">
        <h3 className="text-[13px] font-semibold flex items-center gap-1.5"><Gift size={13} className="cc-warn" aria-hidden />{t("Récompenser ce marchand")}</h3>
        <p className="cc-faint text-[12px]">{t("Le bonus est prélevé sur le wallet Axso (argent réel) et crédité directement au marchand. Le trophée est purement symbolique.")}</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block text-[12px] cc-muted">{t("Bonus ({0}) — facultatif", devise)}
            <input type="number" min={1} inputMode="numeric" value={bonus.montant} onChange={(e) => setBonus((b) => ({ ...b, montant: e.target.value }))} className="cc-input w-full mt-1" />
          </label>
          <label className="block text-[12px] cc-muted">{t("Raison — facultatif")}
            <input value={bonus.raison} onChange={(e) => setBonus((b) => ({ ...b, raison: e.target.value }))} className="cc-input w-full mt-1" placeholder={t("Ex. : 100 commandes livrées")} />
          </label>
          <label className="block text-[12px] cc-muted">{t("Titre du trophée — facultatif")}
            <input value={bonus.titre} onChange={(e) => setBonus((b) => ({ ...b, titre: e.target.value }))} className="cc-input w-full mt-1" />
          </label>
          <label className="block text-[12px] cc-muted">{t("Emoji du trophée")}
            <input value={bonus.emoji} onChange={(e) => setBonus((b) => ({ ...b, emoji: e.target.value }))} className="cc-input w-full mt-1" />
          </label>
        </div>
        {erreurBonus && <p className="text-[12px] cc-bad" role="alert">{erreurBonus}</p>}
        <button className="cc-btn cc-btn-primary" disabled={occupe} onClick={envoyerRecompense}>{icone("recompense", Gift)}{t("Envoyer la récompense")}</button>
      </div>
      {dialogue}
    </section>
  );
}
