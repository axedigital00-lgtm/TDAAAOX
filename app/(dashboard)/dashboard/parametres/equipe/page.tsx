"use client";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Users, UserPlus, Copy, MessageCircle, Trash2, ChevronDown, Ban, RefreshCw, ShieldCheck, Share2,
} from "lucide-react";
import { ModuleTutorial, BoutonRevoirTutoriel } from "@/components/dashboard/ModuleTutorial";
import { MODULES, ROLE_LABELS, type Niveau, type ModuleKey, type GrillePermissions } from "@/lib/permissions";
import { useT } from "@/components/I18nProvider";
import { Badge, Bouton, BoutonIcone, Champ, CLASSE_SAISIE, EtatErreur, EtatVide, Saisie, SqueletteListe, classesBouton, useConfirmation, type Ton } from "@/components/ui";
import { SectionParametres } from "../ui";
import { buttonClasses } from "@/components/ui/adm";

const EQUIPE_TUTORIAL_STEPS = [
  { Icon: UserPlus,    titre: "Invite ton équipe",              description: "Ajoute un gérant, caissier, comptable ou un accès personnalisé — un lien d'invitation est généré immédiatement." },
  { Icon: ShieldCheck, titre: "Rôles prédéfinis ou sur mesure", description: "Chaque rôle a déjà des accès configurés. Choisis \"Personnalisé\" pour régler précisément l'accès à chaque module." },
  { Icon: Share2,      titre: "Partage le lien",                 description: "Copie le lien d'invitation ou envoie-le directement par WhatsApp — inutile d'attendre l'email." },
  { Icon: Ban,         titre: "Suspends ou retire",               description: "Tu peux suspendre l'accès d'un membre à tout moment, le réactiver plus tard, ou le retirer définitivement." },
];

interface Membre {
  id: string;
  userId: string | null;
  email: string;
  nom: string;
  role: string;
  permissions: Record<string, string> | null;
  statut: "invite" | "actif" | "suspendu";
  inviteToken: string | null;
  createdAt: string;
  lienInvitation: string | null;
}

const ROLE_OPTIONS = ["gerant", "caissier", "comptable", "lecture", "personnalise"] as const;

const MODULE_LABELS: Record<ModuleKey, string> = {
  commandes: "Commandes", produits: "Produits", pos: "Point de vente", clients: "Clients",
  marketing: "Marketing", finance: "Finance", equipe: "Équipe", parametres: "Paramètres", boutique: "Boutique",
};
const NIVEAU_LABELS: Record<Niveau, string> = { aucun: "Aucun", lecture: "Lecture", ecriture: "Écriture" };

const STATUT_CFG: Record<string, { label: string; ton: Ton }> = {
  invite: { label: "Invité", ton: "attention" },
  actif: { label: "Actif", ton: "succes" },
  suspendu: { label: "Suspendu", ton: "erreur" },
};

function permsVides(): GrillePermissions {
  return Object.fromEntries(MODULES.map((m) => [m, "aucun"])) as GrillePermissions;
}
function permsDepuisMembre(m: Membre): GrillePermissions {
  const base = permsVides();
  if (m.permissions && typeof m.permissions === "object") {
    for (const mod of MODULES) {
      const v = (m.permissions as any)[mod];
      if (v === "aucun" || v === "lecture" || v === "ecriture") base[mod] = v;
    }
  }
  return base;
}
function messageInvitation(nom: string, email: string, lien: string) {
  return `Bonjour ${nom || email}, vous êtes invité(e) à rejoindre l'équipe de notre boutique sur AXSO. Cliquez sur ce lien pour l'accepter : ${lien}`;
}

function GrillePermissionsEditor({ value, onChange }: { value: GrillePermissions; onChange: (v: GrillePermissions) => void }) {
  const t = useT();
  return (
    <div className="space-y-1.5">
      {MODULES.map((mod) => (
        <div key={mod} role="radiogroup" aria-label={t(MODULE_LABELS[mod])} className="flex flex-wrap items-center justify-between gap-2 py-1.5 px-3 rounded-controle bg-carte-2">
          <span className="text-sm font-medium text-encre">{t(MODULE_LABELS[mod])}</span>
          <div className="flex items-center gap-1">
            {(["aucun", "lecture", "ecriture"] as Niveau[]).map((niveau) => {
              const actif = value[mod] === niveau;
              return (
                <button
                  key={niveau}
                  type="button"
                  role="radio"
                  aria-checked={actif}
                  onClick={() => onChange({ ...value, [mod]: niveau })}
                  className={`text-xs font-semibold px-2.5 min-h-10 sm:min-h-8 rounded-controle border transition-colors ${actif
                    ? niveau === "ecriture" ? "bg-primaire text-sur-primaire border-primaire" : niveau === "lecture" ? "bg-secondaire text-carte border-secondaire" : "bg-bordure-forte text-encre border-bordure-forte"
                    : "bg-carte text-doux border-bordure hover:text-encre"}`}
                >
                  {t(NIVEAU_LABELS[niveau])}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function EquipePage() {
  const t = useT();
  const [membres, setMembres] = useState<Membre[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({ nom: "", email: "", role: "gerant" as string });
  const [customPerms, setCustomPerms] = useState<GrillePermissions>(permsVides());
  const [saving, setSaving] = useState(false);
  const [lastInvite, setLastInvite] = useState<{ nom: string; email: string; lienInvitation: string } | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<string>("gerant");
  const [editPerms, setEditPerms] = useState<GrillePermissions>(permsVides());
  const [savingEdit, setSavingEdit] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [retiringId, setRetiringId] = useState<string | null>(null);
  const [erreurChargement, setErreurChargement] = useState(false);
  const [erreurEmail, setErreurEmail] = useState("");
  const { confirmer, dialogue } = useConfirmation();

  const charger = useCallback(() => {
    setErreurChargement(false);
    fetch("/api/equipe/liste")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => setMembres(d.membres || []))
      .catch(() => setErreurChargement(true))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { charger(); }, [charger]);

  async function inviter(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email) { setErreurEmail(t("Indique l'email de la personne à inviter.")); return; }
    setSaving(true);
    try {
      const body: any = { email: form.email, nom: form.nom || undefined, role: form.role };
      if (form.role === "personnalise") body.permissions = customPerms;
      const res = await fetch("/api/equipe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "L'invitation n'a pas pu être envoyée. Réessaie dans un instant.");
      toast.success(t("Invitation créée pour {0} : partage le lien ci-dessous.", form.nom || form.email));
      setLastInvite({ nom: form.nom || form.email, email: form.email, lienInvitation: data.lienInvitation });
      setForm({ nom: "", email: "", role: "gerant" });
      setCustomPerms(permsVides());
      charger();
    } catch (err: any) {
      toast.error(t(err.message) || t("L'invitation n'a pas pu être envoyée. Réessaie dans un instant."));
    } finally {
      setSaving(false);
    }
  }

  async function copierLien(lien: string | null) {
    if (!lien) return;
    try {
      await navigator.clipboard.writeText(lien);
      toast.success(t("Lien d'invitation copié."));
    } catch {
      toast.error(t("Copie impossible : sélectionne le lien et copie-le à la main."));
    }
  }

  function ouvrirDetail(m: Membre) {
    if (expandedId === m.id) { setExpandedId(null); return; }
    setExpandedId(m.id);
    setEditRole(m.role);
    setEditPerms(permsDepuisMembre(m));
  }

  async function enregistrerModif(id: string) {
    setSavingEdit(true);
    try {
      const body: any = { role: editRole };
      if (editRole === "personnalise") body.permissions = editPerms;
      const res = await fetch(`/api/equipe/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Les accès n'ont pas pu être enregistrés. Réessaie dans un instant.");
      toast.success(t("Accès du membre enregistrés."));
      setExpandedId(null);
      charger();
    } catch (err: any) {
      toast.error(t(err.message) || t("Les accès n'ont pas pu être enregistrés. Réessaie dans un instant."));
    } finally {
      setSavingEdit(false);
    }
  }

  async function toggleStatut(m: Membre) {
    const nouveau = m.statut === "suspendu" ? "actif" : "suspendu";
    setTogglingId(m.id);
    try {
      const res = await fetch(`/api/equipe/${m.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ statut: nouveau }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Le statut du membre n'a pas pu être changé. Réessaie dans un instant.");
      toast.success(nouveau === "actif" ? t("{0} a de nouveau accès à la boutique.", m.nom || m.email) : t("Accès de {0} suspendu.", m.nom || m.email));
      charger();
    } catch (err: any) {
      toast.error(t(err.message) || t("Le statut du membre n'a pas pu être changé. Réessaie dans un instant."));
    } finally {
      setTogglingId(null);
    }
  }

  async function retirer(m: Membre) {
    if (!(await confirmer({
      titre: m.statut === "invite" ? t("Annuler cette invitation ?") : t("Retirer ce membre de l'équipe ?"),
      objet: `${m.nom || m.email}${m.nom ? ` (${m.email})` : ""}`,
      description: m.statut === "invite" ? t("Le lien d'invitation ne fonctionnera plus.") : t("Cette personne n'aura plus accès à la boutique. Tu pourras l'inviter de nouveau plus tard."),
      libelleConfirmer: m.statut === "invite" ? t("Annuler l'invitation") : t("Retirer le membre"),
    }))) return;
    const id = m.id;
    setRetiringId(id);
    try {
      const res = await fetch(`/api/equipe?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(t("{0} a été retiré(e) de l'équipe.", m.nom || m.email));
      setExpandedId(null);
      charger();
    } catch {
      toast.error(t("Le membre n'a pas pu être retiré. Réessaie dans un instant."));
    } finally {
      setRetiringId(null);
    }
  }

  return (
    <SectionParametres titre={t("Utilisateurs")} description={loading ? undefined : `${membres.length} ${t("membre(s) dans votre équipe")}`}
      actions={<><BoutonRevoirTutoriel moduleKey="equipe" /><a href="#inviter" className={buttonClasses({ variant: "primary" })}>{t("Inviter un membre")}</a></>}>
      <ModuleTutorial moduleKey="equipe" titre={t("Équipe")} sousTitre={t("Rôles et accès de ton équipe")} steps={EQUIPE_TUTORIAL_STEPS} />
      {dialogue}


      {/* Liste membres */}
      <section className="rounded-carte border border-bordure bg-carte shadow-carte overflow-hidden">
        <div className="p-4 border-b border-bordure flex items-center gap-2">
          <Users size={16} className="text-attention" aria-hidden />
          <h2 className="ax-titre-section">{t("Membres de l'équipe")}</h2>
        </div>

        {loading ? (
          <SqueletteListe className="p-4" lignes={3} libelle={t("Chargement de l'équipe…")} />
        ) : erreurChargement ? (
          <EtatErreur className="m-4" compact titre={t("La liste de l'équipe n'a pas pu être chargée.")} texte={t("Vérifie ta connexion puis réessaie.")} onReessayer={charger} />
        ) : membres.length === 0 ? (
          <EtatVide className="m-4" compact icone={<Users />} titre={t("Aucun membre ajouté")}
            texte={t("Invitez des collaborateurs pour gérer votre boutique avec vous : chacun n'a accès qu'à ce que vous choisissez.")}>
            <a href="#inviter" className={classesBouton({ variante: "secondaire" })}><UserPlus size={16} aria-hidden />{t("Inviter un membre")}</a>
          </EtatVide>
        ) : (
          <ul>
            {membres.map((m) => {
              const estInvite = m.statut === "invite";
              const expanded = expandedId === m.id;
              const identite = (
                <>
                  <span className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-primaire-fond text-attention font-bold text-xs" aria-hidden>
                    {(m.nom || m.email).slice(0, 2).toUpperCase()}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-encre truncate">{t(m.nom) || m.email}</span>
                    <span className="block text-xs text-doux truncate">{m.email}</span>
                    <span className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <Badge ton="accent">{t(ROLE_LABELS[m.role]) ?? t(m.role)}</Badge>
                      <Badge ton={STATUT_CFG[m.statut]?.ton ?? "neutre"}>{t(STATUT_CFG[m.statut]?.label) ?? t(m.statut)}</Badge>
                    </span>
                  </span>
                </>
              );
              return (
                <li key={m.id} className="border-b border-bordure last:border-b-0">
                  {estInvite ? (
                    <div className="p-4 flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-[12rem]">{identite}</div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {m.lienInvitation && (
                          <>
                            <Bouton variante="secondaire" taille="compact" onClick={() => copierLien(m.lienInvitation)} icone={<Copy size={14} aria-hidden />}>
                              {t("Copier le lien")}
                            </Bouton>
                            <a href={`https://wa.me/?text=${encodeURIComponent(messageInvitation(m.nom, m.email, m.lienInvitation))}`}
                              target="_blank" rel="noopener noreferrer" className={classesBouton({ variante: "secondaire", taille: "compact" })}>
                              <MessageCircle size={14} className="text-succes" aria-hidden /> {t("Envoyer par WhatsApp")}
                            </a>
                          </>
                        )}
                        <BoutonIcone variante="danger" label={`${t("Annuler l'invitation de")} ${m.nom || m.email}`} onClick={() => retirer(m)} charge={retiringId === m.id}>
                          <Trash2 size={14} aria-hidden />
                        </BoutonIcone>
                      </div>
                    </div>
                  ) : (
                    <button type="button" aria-expanded={expanded} onClick={() => ouvrirDetail(m)}
                      className="w-full p-4 flex items-center gap-3 text-left hover:bg-carte-2 transition-colors">
                      {identite}
                      <span className="flex items-center gap-1 text-xs font-semibold text-doux flex-shrink-0">
                        <span className="hidden sm:inline">{expanded ? t("Fermer") : t("Modifier les accès")}</span>
                        <ChevronDown size={16} className={`transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden />
                      </span>
                    </button>
                  )}

                  {expanded && (
                    <div className="px-4 pb-4 pt-1 space-y-3 bg-carte-2/60">
                      <Champ label={t("Rôle")}>
                        {(a) => (
                          <select {...a} value={editRole} onChange={(e) => setEditRole(e.target.value)} className={CLASSE_SAISIE}>
                            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{t(ROLE_LABELS[r])}</option>)}
                          </select>
                        )}
                      </Champ>

                      {editRole === "personnalise" && (
                        <div className="space-y-1.5">
                          <p className="ax-libelle">{t("Accès par module")}</p>
                          <GrillePermissionsEditor value={editPerms} onChange={setEditPerms} />
                        </div>
                      )}

                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        <Bouton onClick={() => enregistrerModif(m.id)} charge={savingEdit} texteCharge={t("Enregistrement…")}>
                          {t("Enregistrer les accès")}
                        </Bouton>
                        <Bouton variante="secondaire" onClick={() => toggleStatut(m)} charge={togglingId === m.id}
                          icone={m.statut === "suspendu" ? <RefreshCw size={14} aria-hidden /> : <Ban size={14} aria-hidden />}>
                          {m.statut === "suspendu" ? t("Réactiver l'accès") : t("Suspendre l'accès")}
                        </Bouton>
                        <Bouton variante="danger" onClick={() => retirer(m)} charge={retiringId === m.id} icone={<Trash2 size={14} aria-hidden />}>
                          {t("Retirer de l'équipe")}
                        </Bouton>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Formulaire d'invitation */}
      <form id="inviter" onSubmit={inviter} className="scroll-mt-24 rounded-carte border border-bordure bg-carte shadow-carte p-carte space-y-champs">
        <h2 className="ax-titre-section flex items-center gap-2"><UserPlus size={16} className="text-attention" aria-hidden />{t("Inviter un membre")}</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Saisie label={t("Prénom / Nom")} mention="facultatif" value={form.nom} onChange={(e) => setForm((v) => ({ ...v, nom: e.target.value }))} placeholder={t("Ex: Aminata Diallo")} />
          <Saisie type="email" label={t("Email")} required value={form.email} erreur={erreurEmail || undefined}
            onChange={(e) => { setForm((v) => ({ ...v, email: e.target.value })); setErreurEmail(""); }} placeholder="collaborateur@example.com" />
        </div>

        <Champ label={t("Rôle")} aide={<>{t("Rôles disponibles :")} {ROLE_OPTIONS.map((r) => t(ROLE_LABELS[r])).join(", ")}. {t("« Personnalisé » permet de régler chaque module.")}</>}>
          {(a) => (
            <select {...a} value={form.role} onChange={(e) => setForm((v) => ({ ...v, role: e.target.value }))} className={CLASSE_SAISIE}>
              {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{t(ROLE_LABELS[r])}</option>)}
            </select>
          )}
        </Champ>

        {form.role === "personnalise" && (
          <div className="space-y-1.5">
            <p className="ax-libelle">{t("Accès par module")}</p>
            <GrillePermissionsEditor value={customPerms} onChange={setCustomPerms} />
          </div>
        )}

        <Bouton type="submit" charge={saving} texteCharge={t("Envoi…")} icone={<UserPlus size={15} aria-hidden />}>
          {t("Envoyer l'invitation")}
        </Bouton>

        {lastInvite && (
          <div role="status" className="rounded-controle p-4 space-y-2 bg-primaire-fond border border-attention-bordure">
            <p className="text-sm font-semibold text-encre">{t("Invitation envoyée à")}{" "}{t(lastInvite.nom)}{" "}{t("— partage ce lien :")}</p>
            <div className="flex flex-wrap items-center gap-2">
              <input readOnly aria-label={t("Lien d'invitation")} value={lastInvite.lienInvitation} onFocus={(e) => e.target.select()} className={CLASSE_SAISIE + " flex-1 min-w-[12rem] text-xs"} />
              <Bouton variante="secondaire" taille="compact" onClick={() => copierLien(lastInvite.lienInvitation)} icone={<Copy size={14} aria-hidden />}>{t("Copier le lien")}</Bouton>
              <a href={`https://wa.me/?text=${encodeURIComponent(messageInvitation(lastInvite.nom, lastInvite.email, lastInvite.lienInvitation))}`}
                target="_blank" rel="noopener noreferrer" className={classesBouton({ variante: "secondaire", taille: "compact" })}>
                <MessageCircle size={14} className="text-succes" aria-hidden /> {t("Envoyer par WhatsApp")}
              </a>
            </div>
          </div>
        )}
      </form>
    </SectionParametres>
  );
}
