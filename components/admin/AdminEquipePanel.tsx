"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserPlus, Trash2, Loader2, ShieldCheck, Eye } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { ROLES_ADMIN, NOM_ROLE, estRoleAdmin } from "@/lib/command-center/rbac";
import { useConfirmation } from "@/components/command-center/Confirmation";
import { EtatVide } from "@/components/command-center/ui";

// Rôles attribuables depuis l'équipe (le Super admin ne se crée ni ne se révoque ici).
const ROLES_INVITABLES = ROLES_ADMIN.filter((r) => r !== "admin");
const nomRole = (r: string) => (estRoleAdmin(r) ? NOM_ROLE[r] : r);

interface Membre { id: string; email: string; name: string | null; role: string; createdAt: string }

export function AdminEquipePanel({ peutInviter, monId }: { peutInviter: boolean; monId: string }) {
  const t = useT();
  const { confirmer, dialogue } = useConfirmation();
  const [membres, setMembres] = useState<Membre[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreurChargement, setErreurChargement] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", name: "", role: "admin_lecteur" });
  const [erreurs, setErreurs] = useState<{ email?: string; password?: string }>({});

  async function charger() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/equipe");
      if (!res.ok) throw new Error();
      const data = await res.json().catch(() => ({}));
      setMembres(data.membres ?? []);
      setErreurChargement(false);
    } catch {
      setErreurChargement(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { charger(); }, []);

  async function inviter(e: React.FormEvent) {
    e.preventDefault();
    const err: typeof erreurs = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) err.email = t("Saisissez une adresse e-mail valide, par exemple nom@axso.africa.");
    if (form.password.length < 6) err.password = t("Le mot de passe doit contenir au moins 6 caractères.");
    setErreurs(err);
    if (err.email || err.password) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/equipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      toast.success(t("{0} a rejoint l'équipe avec le rôle {1}.", form.email.trim(), t(nomRole(form.role))));
      setForm({ email: "", password: "", name: "", role: "admin_lecteur" });
      charger();
    } catch (e: any) {
      toast.error(t(e.message || "L'invitation n'a pas abouti. Vérifiez l'e-mail et réessayez."));
    } finally {
      setSubmitting(false);
    }
  }

  async function changerRole(m: Membre, role: string) {
    const ok = await confirmer({
      titre: t("Donner le rôle {0} à {1} ?", t(nomRole(role)), m.name || m.email),
      message: t("Les pages visibles par ce membre changent dès sa prochaine action."),
      details: [{ libelle: t("Rôle actuel"), valeur: t(nomRole(m.role)) }, { libelle: t("Nouveau rôle"), valeur: t(nomRole(role)) }],
      action: t("Changer le rôle"),
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/equipe/${m.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      toast.success(t("{0} a maintenant le rôle {1}.", m.name || m.email, t(nomRole(role))));
      charger();
    } catch (e: any) {
      toast.error(t(e.message || "Le rôle n'a pas été modifié. Réessayez."));
    }
  }

  async function revoquer(m: Membre) {
    const ok = await confirmer({
      titre: t("Révoquer l'accès de {0} ?", m.name || m.email),
      message: t("Ce membre ne pourra plus ouvrir le panneau d'administration. Vous pourrez l'inviter de nouveau plus tard."),
      details: [{ libelle: t("E-mail"), valeur: m.email }, { libelle: t("Rôle"), valeur: t(nomRole(m.role)) }],
      action: t("Révoquer l'accès"),
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/equipe/${m.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      toast.success(t("Accès de {0} révoqué.", m.name || m.email));
      charger();
    } catch (e: any) {
      toast.error(t(e.message || "L'accès n'a pas été révoqué. Réessayez."));
    }
  }

  const champ = "cc-input w-full h-10";

  return (
    <div className="space-y-5">
      {peutInviter && (
        <form onSubmit={inviter} noValidate className="cc-card p-4 space-y-3">
          <h2 className="cc-h2 flex items-center gap-2"><UserPlus size={15} className="cc-warn" aria-hidden />{t("Inviter un membre")}</h2>
          <p className="text-[12px] cc-muted">
            {t("Le rôle détermine les pages visibles (ex. Finance : revenus, paiements, finances). Aucun rôle d'équipe ne peut suspendre une boutique, retirer des fonds ou inviter d'autres membres : ces actions restent réservées au Super admin.")}
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <label className="block text-[12px] space-y-1">
              <span className="cc-muted">{t("Nom")} <span className="cc-faint">({t("facultatif")})</span></span>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={champ} autoComplete="off" />
            </label>
            <label className="block text-[12px] space-y-1">
              <span className="cc-muted">{t("E-mail")}</span>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={champ} aria-invalid={!!erreurs.email} aria-describedby={erreurs.email ? "equipe-err-email" : undefined} autoComplete="off" />
              {erreurs.email && <span id="equipe-err-email" className="block cc-bad">{erreurs.email}</span>}
            </label>
            <label className="block text-[12px] space-y-1">
              <span className="cc-muted">{t("Mot de passe provisoire")}</span>
              <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className={champ} aria-invalid={!!erreurs.password} aria-describedby={erreurs.password ? "equipe-err-mdp" : "equipe-aide-mdp"} autoComplete="new-password" />
              {erreurs.password ? <span id="equipe-err-mdp" className="block cc-bad">{erreurs.password}</span> : <span id="equipe-aide-mdp" className="block cc-faint">{t("6 caractères minimum.")}</span>}
            </label>
            <label className="block text-[12px] space-y-1">
              <span className="cc-muted">{t("Rôle")}</span>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className={`cc-select w-full h-10`}>
                {ROLES_INVITABLES.map(r => <option key={r} value={r}>{t(NOM_ROLE[r])}</option>)}
              </select>
            </label>
          </div>
          <button type="submit" disabled={submitting} className="cc-btn cc-btn-primary h-10">
            {submitting ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <UserPlus size={14} aria-hidden />}{submitting ? t("Invitation…") : t("Inviter le membre")}
          </button>
        </form>
      )}

      <section className="cc-card overflow-hidden">
        <h2 className="cc-h2 px-4 pt-3.5 pb-2">{t("Membres du panneau admin")}</h2>
        {loading ? (
          <div className="flex justify-center py-10" role="status" aria-label={t("Chargement…")}><Loader2 size={18} className="animate-spin cc-faint" aria-hidden /></div>
        ) : erreurChargement ? (
          <EtatVide titre={t("La liste des membres n'a pas pu être chargée.")} explication={t("Vérifiez votre connexion puis réessayez.")} action={<button className="cc-btn cc-btn-sm h-10 sm:h-8" onClick={charger}>{t("Réessayer")}</button>} />
        ) : !membres.length ? (
          <EtatVide titre={t("Aucun membre pour l'instant.")} explication={peutInviter ? t("Invitez un membre avec le formulaire ci-dessus.") : undefined} />
        ) : (
          <ul className="divide-y cc-sep border-t cc-sep">
            {membres.map(m => {
              const modifiable = peutInviter && m.role !== "admin" && m.id !== monId;
              return (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 cc-badge-accent" aria-hidden>
                      {(m.name || m.email).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium [overflow-wrap:anywhere]">{m.name || m.email}{m.id === monId && <span className="cc-faint font-normal"> ({t("vous")})</span>}</p>
                      <p className="text-[12px] cc-muted [overflow-wrap:anywhere]">{m.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`cc-badge ${m.role === "admin" ? "cc-badge-good" : "cc-badge-accent"}`}>
                      {m.role === "admin" ? <ShieldCheck size={10} aria-hidden /> : <Eye size={10} aria-hidden />}
                      {t(nomRole(m.role))}
                    </span>
                    {modifiable && (
                      <select aria-label={t("Rôle de {0}", m.name || m.email)} value={m.role} onChange={e => changerRole(m, e.target.value)} className="cc-select h-10 sm:h-8">
                        {ROLES_INVITABLES.map(r => <option key={r} value={r}>{t(NOM_ROLE[r])}</option>)}
                      </select>
                    )}
                    {modifiable && (
                      <button onClick={() => revoquer(m)} aria-label={t("Révoquer l'accès de {0}", m.name || m.email)} className="cc-btn cc-btn-ghost cc-btn-sm cc-bad h-10 w-10 sm:h-8 sm:w-8 justify-center">
                        <Trash2 size={14} aria-hidden />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {dialogue}
    </div>
  );
}
