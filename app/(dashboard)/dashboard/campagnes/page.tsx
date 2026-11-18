"use client";
import { useEffect, useState } from "react";
import { Trash2, Eye, MousePointer, Megaphone, Zap, Mail, MessageSquare, Phone, Trophy, ShoppingCart, Smile, Package, Clock, Sparkles, Plus } from "lucide-react";
import { ModuleTutorial, BoutonRevoirTutoriel } from "@/components/dashboard/ModuleTutorial";
import { useT } from "@/components/I18nProvider";
import { toast } from "sonner";
import { Alerte, Badge, Bouton, BoutonIcone, Champ, CLASSE_SAISIE, EnTetePage, EtatErreur, EtatVide, Saisie, SqueletteListe, ZoneTexte, useConfirmation } from "@/components/ui";

const CAMPAGNES_TUTORIAL_STEPS = [
  { Icon: Megaphone,   titre: "Créez des popups",              description: "Popup centré, bandeau ou slide-in : affichez une offre au bon moment (délai, exit intent, scroll, 1ère visite)." },
  { Icon: ShoppingCart, titre: "Automatisez vos relances",       description: "Panier abandonné, bienvenue, après achat, anniversaire, client inactif — un message envoyé automatiquement par email, SMS ou WhatsApp." },
  { Icon: Trophy,       titre: "Débloquez des badges",           description: "Gagnez des badges au fil de vos performances pour suivre votre progression de marchand." },
];

const TABS = [
  { id: "popups", label: "Popups" },
  { id: "automation", label: "Relances automatiques" },
  { id: "badges", label: "Badges" },
];

/** Interrupteur actif / inactif : cible tactile de 40 px, état lu par les lecteurs d'écran. */
function Interrupteur({ actif, onClick, label }: { actif: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={actif} aria-label={label} title={label} onClick={onClick}
      className="flex h-10 w-12 shrink-0 items-center justify-center rounded-controle focus-visible:outline-2 focus-visible:outline-focus">
      <span className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${actif ? "bg-primaire" : "bg-bordure-forte"}`}>
        <span className={`inline-block h-4 w-4 m-0.5 rounded-full bg-carte shadow transition-transform ${actif ? "translate-x-4" : ""}`} />
      </span>
    </button>
  );
}

// ─── Onglet Popups ────────────────────────────────────────────────────────────
const TYPE_LABELS: Record<string, string> = { popup: "Popup centré", bandeau: "Bandeau haut", slide_in: "Slide-in coin" };
const DECL_LABELS: Record<string, string> = { delai: "Après un délai", exit_intent: "Au départ du visiteur", scroll: "À mi-page", premiere_visite: "Première visite" };
const POPUP_VIDE = { nom:"", type:"popup", declencheur:"delai", delaiSec:5, titre:"", message:"", ctaTexte:"", ctaUrl:"", codePromo:"" };

function OngletPopups() {
  const t = useT();
  const { confirmer, dialogue } = useConfirmation();
  const [popups, setPopups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(POPUP_VIDE);

  const charger = () => {
    setErreur(false);
    return fetch("/api/popups").then(r=>r.ok?r.json():Promise.reject()).then(d=>setPopups(d.popups??[])).catch(()=>setErreur(true)).finally(()=>setLoading(false));
  };
  useEffect(()=>{charger();},[]);

  async function creer(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/popups",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)}).catch(()=>null);
    setSaving(false);
    if (!res?.ok) { toast.error(t("Le popup n'a pas été créé. Vérifie les champs et réessaie.")); return; }
    toast.success(t("Popup « {0} » créé.", form.nom));
    await charger(); setShowForm(false);
    setForm(POPUP_VIDE);
  }

  async function supprimer(p: any) {
    if (!(await confirmer({ titre: t("Supprimer ce popup ?"), objet: p.nom, description: t("Il ne s'affichera plus sur ta boutique et ses statistiques seront perdues."), libelleConfirmer: t("Supprimer le popup") }))) return;
    const res = await fetch(`/api/popups?id=${p.id}`,{method:"DELETE"}).catch(()=>null);
    if (!res?.ok) { toast.error(t("Le popup n'a pas été supprimé. Réessaie.")); return; }
    toast.success(t("Popup « {0} » supprimé.", p.nom));
    setPopups(x=>x.filter(y=>y.id!==p.id));
  }

  async function toggle(id: string, actif: boolean) {
    const res = await fetch("/api/popups",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,actif:!actif})}).catch(()=>null);
    if (!res?.ok) { toast.error(t("Le changement n'a pas été enregistré. Réessaie.")); return; }
    setPopups(p=>p.map(x=>x.id===id?{...x,actif:!actif}:x));
  }

  if (loading) return <SqueletteListe lignes={3} libelle={t("Chargement des popups…")} />;
  if (erreur) return <EtatErreur titre={t("Les popups n'ont pas pu être chargés")} texte={t("Vérifie ta connexion et réessaie.")} onReessayer={charger} />;

  return (
    <div className="space-y-3">
      {dialogue}
      {!showForm && popups.length > 0 && (
        <Bouton variante="secondaire" icone={<Plus className="size-4" aria-hidden />} onClick={()=>setShowForm(true)}>{t("Créer un popup")}</Bouton>
      )}

      {showForm && (
        <form onSubmit={creer} className="ax-card p-carte space-y-champs">
          <h2 className="ax-sous-titre">{t("Nouveau popup")}</h2>
          <Saisie label={t("Nom interne")} required aide={t("Visible par toi seul, pour le retrouver.")} value={form.nom} onChange={e=>setForm(v=>({...v,nom:e.target.value}))} />
          <div className="grid sm:grid-cols-2 gap-3">
            <Champ label={t("Format")}>
              {(a)=> <select {...a} value={form.type} onChange={e=>setForm(v=>({...v,type:e.target.value}))} className={CLASSE_SAISIE}>
                {Object.entries(TYPE_LABELS).map(([k,v])=><option key={k} value={k}>{t(v)}</option>)}
              </select>}
            </Champ>
            <Champ label={t("Moment d'affichage")}>
              {(a)=> <select {...a} value={form.declencheur} onChange={e=>setForm(v=>({...v,declencheur:e.target.value}))} className={CLASSE_SAISIE}>
                {Object.entries(DECL_LABELS).map(([k,v])=><option key={k} value={k}>{t(v)}</option>)}
              </select>}
            </Champ>
          </div>
          {form.declencheur==="delai" && (
            <Saisie label={t("Afficher après")} type="number" min={0} max={300} suffixe={t("secondes")} value={form.delaiSec}
              onChange={e=>setForm(v=>({...v,delaiSec:Math.max(0,Number(e.target.value)||0)}))} />
          )}
          <Saisie label={t("Titre")} required value={form.titre} onChange={e=>setForm(v=>({...v,titre:e.target.value}))} />
          <ZoneTexte label={t("Message")} required rows={2} value={form.message} onChange={e=>setForm(v=>({...v,message:e.target.value}))} />
          <div className="grid sm:grid-cols-2 gap-3">
            <Saisie label={t("Texte du bouton")} mention="facultatif" value={form.ctaTexte} onChange={e=>setForm(v=>({...v,ctaTexte:e.target.value}))} />
            {/* Sans lien, le bouton fermait seulement la popup. */}
            <Saisie label={t("Lien du bouton")} mention="facultatif" placeholder={t("produits, https://…")} aide={t("Sans lien, le bouton ferme simplement le popup.")} value={form.ctaUrl} onChange={e=>setForm(v=>({...v,ctaUrl:e.target.value}))} />
          </div>
          <Saisie label={t("Code promo")} mention="facultatif" value={form.codePromo} onChange={e=>setForm(v=>({...v,codePromo:e.target.value}))} />
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Bouton variante="secondaire" onClick={()=>setShowForm(false)} disabled={saving}>{t("Annuler")}</Bouton>
            <Bouton type="submit" charge={saving} texteCharge={t("Création…")} disabled={!form.nom||!form.titre||!form.message}>{t("Créer le popup")}</Bouton>
          </div>
        </form>
      )}

      {popups.length === 0 && !showForm && (
        <EtatVide icone={<Megaphone />} titre={t("Aucun popup pour l'instant")}
          texte={t("Un popup affiche une offre ou un code promo aux visiteurs de ta boutique, au moment que tu choisis.")}>
          <Bouton icone={<Plus className="size-4" aria-hidden />} onClick={()=>setShowForm(true)}>{t("Créer un popup")}</Bouton>
        </EtatVide>
      )}
      {popups.map(p => (
        <div key={p.id} className="ax-card p-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <Megaphone className="size-4 text-attention shrink-0" aria-hidden />
          <div className="flex-1 min-w-[10rem]">
            <p className="text-sm font-semibold text-encre truncate">{t(p.nom)}</p>
            <p className="ax-aide">{t(TYPE_LABELS[p.type])} · {t(DECL_LABELS[p.declencheur])}</p>
          </div>
          <Badge ton={p.actif ? "succes" : "neutre"}>{p.actif ? t("Actif") : t("Inactif")}</Badge>
          <span className="ax-aide flex items-center gap-1" title={t("Affichages")}><Eye className="size-3" aria-hidden /> {p.affichages} <span className="sr-only">{t("affichages")}</span></span>
          <span className="ax-aide flex items-center gap-1" title={t("Clics")}><MousePointer className="size-3" aria-hidden /> {p.clics} <span className="sr-only">{t("clics")}</span></span>
          <Interrupteur actif={p.actif} onClick={()=>toggle(p.id,p.actif)} label={p.actif ? t("Désactiver « {0} »", p.nom) : t("Activer « {0} »", p.nom)} />
          <BoutonIcone label={t("Supprimer « {0} »", p.nom)} onClick={()=>supprimer(p)} className="text-erreur"><Trash2 className="size-4" aria-hidden /></BoutonIcone>
        </div>
      ))}
    </div>
  );
}

// ─── Onglet Automation ────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string,{label:string;icon:any}> = {
  panier_abandonne:{label:"Panier abandonné",icon:ShoppingCart},
  bienvenue:{label:"Bienvenue",icon:Smile},
  apres_achat:{label:"Après achat",icon:Package},
  inactif:{label:"Client inactif",icon:Clock},
};
const CANAL_ICONS: Record<string,any> = { email:Mail, sms:Phone, whatsapp:MessageSquare };
const WORKFLOW_VIDE = { nom:"", type:"panier_abandonne", delaiHeures:1, canal:"email", sujet:"", message:"" };

function OngletAutomation() {
  const t = useT();
  const { confirmer, dialogue } = useConfirmation();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(WORKFLOW_VIDE);

  const charger = () => {
    setErreur(false);
    return fetch("/api/automation").then(r=>r.ok?r.json():Promise.reject()).then(d=>setWorkflows(d.workflows??[])).catch(()=>setErreur(true)).finally(()=>setLoading(false));
  };
  useEffect(()=>{charger();},[]);

  async function creer(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/automation",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)}).catch(()=>null);
    setSaving(false);
    if (!res?.ok) { toast.error(t("La relance n'a pas été créée. Vérifie les champs et réessaie.")); return; }
    toast.success(t("Relance « {0} » créée.", form.nom));
    await charger(); setShowForm(false);
    setForm(WORKFLOW_VIDE);
  }

  async function toggle(id: string, actif: boolean) {
    const res = await fetch("/api/automation",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,actif:!actif})}).catch(()=>null);
    if (!res?.ok) { toast.error(t("Le changement n'a pas été enregistré. Réessaie.")); return; }
    setWorkflows(w=>w.map(x=>x.id===id?{...x,actif:!actif}:x));
  }

  async function supprimer(w: any) {
    if (!(await confirmer({ titre: t("Supprimer cette relance ?"), objet: w.nom, description: t("Plus aucun message ne sera envoyé par cette relance. Les messages déjà envoyés ne sont pas concernés."), libelleConfirmer: t("Supprimer la relance") }))) return;
    const res = await fetch(`/api/automation?id=${w.id}`,{method:"DELETE"}).catch(()=>null);
    if (!res?.ok) { toast.error(t("La relance n'a pas été supprimée. Réessaie.")); return; }
    toast.success(t("Relance « {0} » supprimée.", w.nom));
    setWorkflows(x=>x.filter(y=>y.id!==w.id));
  }

  if (loading) return <SqueletteListe lignes={3} libelle={t("Chargement des relances…")} />;
  if (erreur) return <EtatErreur titre={t("Les relances n'ont pas pu être chargées")} texte={t("Vérifie ta connexion et réessaie.")} onReessayer={charger} />;

  return (
    <div className="space-y-3">
      {dialogue}
      {!showForm && workflows.length > 0 && (
        <Bouton variante="secondaire" icone={<Plus className="size-4" aria-hidden />} onClick={()=>setShowForm(true)}>{t("Créer une relance")}</Bouton>
      )}

      {showForm && (
        <form onSubmit={creer} className="ax-card p-carte space-y-champs">
          <h2 className="ax-sous-titre">{t("Nouvelle relance automatique")}</h2>
          <Saisie label={t("Nom de la relance")} required value={form.nom} onChange={e=>setForm(v=>({...v,nom:e.target.value}))} />
          <div className="grid sm:grid-cols-3 gap-3">
            <Champ label={t("Déclencheur")}>
              {(a)=> <select {...a} value={form.type} onChange={e=>setForm(v=>({...v,type:e.target.value}))} className={CLASSE_SAISIE}>
                {Object.entries(TYPE_CONFIG).map(([k,v])=><option key={k} value={k}>{t(v.label)}</option>)}
              </select>}
            </Champ>
            <Champ label={t("Canal")}>
              {(a)=> <select {...a} value={form.canal} onChange={e=>setForm(v=>({...v,canal:e.target.value}))} className={CLASSE_SAISIE}>
                {[["email","Email"],["whatsapp","WhatsApp"]].map(([c,l])=><option key={c} value={c}>{t(l)}</option>)}
              </select>}
            </Champ>
            <Saisie label={t("Délai")} type="number" suffixe={t("heures")} value={form.delaiHeures} onChange={e=>setForm(v=>({...v,delaiHeures:+e.target.value}))} />
          </div>
          {form.type==="panier_abandonne" && <p className="ax-aide">{t("Panier abandonné : paiement en ligne commencé mais pas finalisé.")}</p>}
          {form.type==="inactif" && <p className="ax-aide">{t("Client inactif : aucune commande depuis le délai choisi (ex. 720 h = 30 jours).")}</p>}
          {form.canal==="email" && <Saisie label={t("Sujet de l'email")} value={form.sujet} onChange={e=>setForm(v=>({...v,sujet:e.target.value}))} />}
          <ZoneTexte label={t("Message")} required rows={3} value={form.message} onChange={e=>setForm(v=>({...v,message:e.target.value}))}
            aide={t("Variables : {{nom}} (prénom du client), {{boutique}}, {{lien}} (lien de ta boutique). Un lien de désinscription est ajouté à chaque message.")} />
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Bouton variante="secondaire" onClick={()=>setShowForm(false)} disabled={saving}>{t("Annuler")}</Bouton>
            <Bouton type="submit" charge={saving} texteCharge={t("Création…")} disabled={!form.nom||!form.message}>{t("Créer la relance")}</Bouton>
          </div>
        </form>
      )}

      {workflows.length === 0 && !showForm && (
        <EtatVide icone={<Zap />} titre={t("Aucune relance automatique")}
          texte={t("Une relance envoie un message à tes clients au bon moment (panier abandonné, après un achat…), sans que tu aies à y penser.")}>
          <Bouton icone={<Plus className="size-4" aria-hidden />} onClick={()=>setShowForm(true)}>{t("Créer une relance")}</Bouton>
        </EtatVide>
      )}
      {workflows.map(w => {
        const tc = TYPE_CONFIG[w.type]??{label:w.type,icon:Zap};
        const CanalIcon = CANAL_ICONS[w.canal]??Zap;
        const TcIcon = tc.icon;
        return (
          <div key={w.id} className="ax-card p-4 flex flex-wrap items-center gap-x-3 gap-y-2">
            <TcIcon className="size-4 text-attention shrink-0" aria-hidden />
            <div className="flex-1 min-w-[10rem]">
              <p className="text-sm font-semibold text-encre truncate">{t(w.nom)}</p>
              <p className="ax-aide flex flex-wrap items-center gap-1">
                <CanalIcon className="size-3" aria-hidden /> {t(tc.label)} · {w.delaiHeures}{t("h ·")}{" "}{w.declenchements}{" "}{t("message(s) envoyé(s)")}
              </p>
              {/* Anciens workflows (anniversaire, SMS) : le moteur ne peut pas les envoyer — on le dit. */}
              {(!TYPE_CONFIG[w.type] || w.canal === "sms") && (
                <p className="text-xs font-medium text-erreur mt-0.5">{w.canal === "sms" ? t("Non envoyé : aucun service SMS n'est branché. Recrée-le en email ou WhatsApp.") : t("Non envoyé : aucune date de naissance n'est enregistrée pour tes clients.")}</p>
              )}
            </div>
            <Badge ton={w.actif ? "succes" : "neutre"}>{w.actif ? t("Actif") : t("Inactif")}</Badge>
            <Interrupteur actif={w.actif} onClick={()=>toggle(w.id,w.actif)} label={w.actif ? t("Désactiver « {0} »", w.nom) : t("Activer « {0} »", w.nom)} />
            <BoutonIcone label={t("Supprimer « {0} »", w.nom)} onClick={()=>supprimer(w)} className="text-erreur"><Trash2 className="size-4" aria-hidden /></BoutonIcone>
          </div>
        );
      })}
    </div>
  );
}

// ─── Onglet Badges ────────────────────────────────────────────────────────────
function OngletBadges() {
  const t = useT();
  const [badges, setBadges] = useState<any[]>([]);
  const [nouveaux, setNouveaux] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(false);

  const charger = () => {
    setErreur(false); setLoading(true);
    fetch("/api/badges").then(r=>r.ok?r.json():Promise.reject()).then(d=>{setBadges(d.badges??[]);setNouveaux(d.nouveaux??[]);}).catch(()=>setErreur(true)).finally(()=>setLoading(false));
  };
  useEffect(charger, []);

  if (loading) return <SqueletteListe lignes={4} libelle={t("Chargement des badges…")} />;
  if (erreur) return <EtatErreur titre={t("Les badges n'ont pas pu être chargés")} texte={t("Vérifie ta connexion et réessaie.")} onReessayer={charger} />;

  const obtenus = badges.filter(b=>b.obtenu);
  const restants = badges.filter(b=>!b.obtenu);

  return (
    <div className="space-y-5">
      {nouveaux.length > 0 && (
        <Alerte ton="succes" titre={<span className="inline-flex items-center gap-1.5"><Sparkles className="size-4" aria-hidden />{t("Nouveaux badges !")}</span>}>
          <div className="mt-2 flex gap-2 flex-wrap">
            {nouveaux.map(b=>(
              <div key={b.type} className="bg-carte rounded-controle px-3 py-2 flex items-center gap-2 shadow-sm">
                <span className="text-xl" aria-hidden>{t(b.emoji)}</span>
                <p className="text-sm font-bold text-encre">{t(b.titre)}</p>
              </div>
            ))}
          </div>
        </Alerte>
      )}

      {obtenus.length > 0 && (
        <section>
          <h2 className="ax-label mb-2">{t("Obtenus (")}{obtenus.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {obtenus.map(b=>(
              <div key={b.type} className="ax-card p-3 flex items-center gap-3">
                <span className="text-2xl" aria-hidden>{t(b.emoji)}</span>
                <div><p className="text-sm font-semibold text-encre">{t(b.titre)}</p><p className="ax-aide">{t(b.description)}</p></div>
              </div>
            ))}
          </div>
        </section>
      )}

      {restants.length > 0 && (
        <section>
          <h2 className="ax-label mb-2">{t("À obtenir (")}{restants.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {restants.map(b=>(
              <div key={b.type} className="bg-carte-2 border border-bordure rounded-carte p-3 flex items-center gap-3">
                <span className="text-2xl grayscale opacity-60" aria-hidden>{t(b.emoji)}</span>
                <div><p className="text-sm font-semibold text-doux">{t(b.titre)}</p><p className="ax-aide">{t(b.description)}</p></div>
              </div>
            ))}
          </div>
        </section>
      )}

      {badges.length === 0 && <EtatVide icone={<Trophy />} titre={t("Aucun badge disponible")} texte={t("Les badges se débloquent au fil de tes ventes et de ton activité.")} />}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function CampagnesPage() {
  const t = useT();
  const [onglet, setOnglet] = useState("popups");

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <ModuleTutorial moduleKey="campagnes" titre={t("Campagnes")} sousTitre={t("Notifications & relances")} steps={CAMPAGNES_TUTORIAL_STEPS} />
      <EnTetePage className="mb-0"
        titre={t("Campagnes")}
        description={t("Popups sur ta boutique, relances automatiques de tes clients et badges marchands")}
        indicateurs={<BoutonRevoirTutoriel moduleKey="campagnes" />} />

      <div className="flex gap-1 bg-carte-2 border border-bordure rounded-controle p-1 overflow-x-auto" role="tablist" aria-label={t("Sections des campagnes")}>
        {TABS.map(({id,label})=>(
          <button key={id} type="button" role="tab" aria-selected={onglet===id} onClick={()=>setOnglet(id)}
            className={`flex-1 min-h-10 px-3 whitespace-nowrap rounded-controle text-sm font-semibold transition-colors ${onglet===id?"bg-carte shadow-sm text-encre":"text-doux hover:text-encre"}`}>
            {t(label)}
          </button>
        ))}
      </div>

      {onglet==="popups" && <OngletPopups/>}
      {onglet==="automation" && <OngletAutomation/>}
      {onglet==="badges" && <OngletBadges/>}
    </div>
  );
}
