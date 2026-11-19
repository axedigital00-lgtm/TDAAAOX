"use client";
import { exempleTelephone } from "@/lib/devise-convert";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Store, Palette, Globe, Link2, Truck, Save, Loader2,
  ExternalLink, Copy, Check, Camera, Users, Music, MessageCircle,
  Mail, Phone, MapPin, CheckCircle2, Plus, X, Sparkles,
  Sliders, Power, Pause, ArrowUpRight, Package, ShoppingBag, Calendar,
  Layers, Lock,
} from "lucide-react";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { PlanBadge } from "@/components/dashboard/PlanBadge";
import { NouvelleBoutiqueModal } from "@/components/dashboard/NouvelleBoutiqueModal";
import { ModuleTutorial } from "@/components/dashboard/ModuleTutorial";
import { urlBoutique } from "@/lib/utils";
import { PAYS_DEVISES } from "@/lib/ai-agent";
import { SelectPays } from "@/components/ui/SelectPays";
import { aAcces, NOMS_PALIERS, type Palier } from "@/lib/plans";
import { useT } from "@/components/I18nProvider";
import { lireReglagesLivraison, normaliserZone, type ZoneLivraison } from "@/lib/livraison-reglages";
import { BannierePub } from "@/components/dashboard/BannierePub";
import { CarteAffilies } from "@/components/dashboard/CarteAffilies";
import { Badge as AdmBadge, Button, Card, CardSection, IconButton, PageHeader, Thumbnail } from "@/components/ui/adm";
import { Badge, Bouton, BoutonIcone, classesBouton, Champ, Confirmation, EtatErreur, SqueletteListe, Saisie, ZoneTexte, CLASSE_SAISIE } from "@/components/ui";

const CARTE = "rounded-carte border border-bordure bg-carte shadow-carte p-carte space-y-champs";
const classesBoutonSombre = classesBouton({ variante: "sombre" });

const BOUTIQUE_TUTORIAL_STEPS = [
  { Icon: Store,   titre: "Complétez votre profil",        description: "Nom, description, contacts, pays... Chaque champ rempli fait grimper votre score de complétion vers 100%." },
  { Icon: Palette, titre: "Personnalisez l'apparence",      description: "Logo, bannière et thème visuel : choisissez l'ambiance qui reflète votre marque, avec un aperçu en direct." },
  { Icon: Truck,   titre: "Configurez la livraison",        description: "Frais fixes, minimum pour la livraison gratuite et zones desservies — tout est ajustable à tout moment." },
  { Icon: Layers,  titre: "Gérez plusieurs boutiques",       description: "Basculez d'une boutique à l'autre en un clic ou créez-en une nouvelle si votre palier le permet." },
];



type Section = "infos" | "apparence" | "seo" | "reseaux" | "livraison" | "boutiques" | "avance";

const SECTIONS: { id: Section; label: string; desc: string; Icon: any }[] = [
  { id: "infos",     label: "Informations",  desc: "Identité & contact",    Icon: Store   },
  { id: "apparence", label: "Apparence",     desc: "Logo, bannière, thème", Icon: Palette },
  { id: "seo",       label: "Référencement", desc: "Visibilité Google",     Icon: Globe   },
  { id: "reseaux",   label: "Réseaux",       desc: "Réseaux sociaux",       Icon: Link2   },
  { id: "livraison", label: "Livraison",     desc: "Frais & zones",         Icon: Truck   },
  { id: "boutiques", label: "Mes boutiques", desc: "Multi-boutique",        Icon: Layers  },
  { id: "avance",    label: "Avancé",        desc: "Statut & domaine",      Icon: Sliders },
];

interface AutreBoutique {
  id: string;
  slug: string;
  nomBoutique: string;
  logoUrl: string | null;
  planType: string;
  active: boolean;
  _count: { produits: number; commandes: number };
}

function palierDe(planType: string): Palier {
  return (["palier0", "palier1", "palier2"].includes(planType) ? planType : "palier0") as Palier;
}

const CHAMPS_INFOS = [
  { key: "nomBoutique", label: "Nom de la boutique", placeholder: "Mode Aminata",           Icon: Store },
  { key: "email",       label: "Email professionnel",  placeholder: "contact@maboutique.com", type: "email", Icon: Mail },
  { key: "whatsapp",    label: "WhatsApp Business",    placeholder: "",      Icon: MessageCircle },
  { key: "telephone",   label: "Téléphone",            placeholder: "",      Icon: Phone },
  { key: "adresse",     label: "Adresse physique",     placeholder: "Rue 10, Dakar",           Icon: MapPin },
];

const CHAMPS_RESEAUX = [
  { key: "instagram", label: "Instagram",   placeholder: "https://instagram.com/votre_boutique", Icon: Camera },
  { key: "facebook",  label: "Facebook",    placeholder: "https://facebook.com/votre_boutique",  Icon: Users },
  { key: "tiktok",    label: "TikTok",      placeholder: "https://tiktok.com/@votre_boutique",   Icon: Music },
  { key: "twitter",   label: "X / Twitter", placeholder: "https://twitter.com/votre_boutique",   Icon: MessageCircle },
];

export default function BoutiquePage() {
  const tr = useT();
  const router = useRouter();
  const [section, setSection] = useState<Section>("infos");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  // Hôte lu côté client (évite un décalage d'hydratation) : la vitrine est servie en /<slug>.
  const [hote, setHote] = useState("");
  useEffect(() => setHote(window.location.host), []);
  // Lien direct vers une section (?section=livraison : étape « zones de livraison » du démarrage).
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("section");
    if (s && SECTIONS.some(x => x.id === s)) setSection(s as Section);
  }, []);
  const [tenant, setTenant] = useState<any>(null);
  const [statutLocal, setStatutLocal] = useState<string>("active");
  const [savingStatut, setSavingStatut] = useState(false);
  const [autresBoutiques, setAutresBoutiques] = useState<AutreBoutique[]>([]);
  const [loadingBoutiques, setLoadingBoutiques] = useState(true);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [modalNouvelleBoutique, setModalNouvelleBoutique] = useState(false);
  const [form, setForm] = useState({
    nomBoutique: "", description: "", pays: "", whatsapp: "", email: "", telephone: "", adresse: "",
    logoUrl: "", bannerUrl: "", themeId: "terre-et-or",
    metaTitle: "", metaDescription: "",
    facebook: "", instagram: "", tiktok: "", twitter: "",
    livraisonGratuite: false, fraisLivraison: "0", livraisonMin: "0", delaiLivraison: "", zones: [] as ZoneLivraison[],
  });
  // Règles avancées (Logistique → Livraison) : rappelées ici pour que les deux réglages se voient.
  const [regles, setRegles] = useState<{ zone: string; actif: boolean }[]>([]);
  const [savedForm, setSavedForm] = useState<typeof form | null>(null);

  const [erreurChargement, setErreurChargement] = useState(false);
  const [erreurNom, setErreurNom] = useState("");
  function chargerTenant() {
    setErreurChargement(false);
    fetch("/api/tenants/moi").then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(d => {
      if (d.tenant) {
        const t = d.tenant;
        setTenant(t);
        setStatutLocal(t.statut || "active");
        const social = t.socialLinks || {};
        const livraison = lireReglagesLivraison(t.parametresLivraison);
        const loaded = {
          nomBoutique: t.nomBoutique || "", description: t.description || "",
          pays: t.pays || "", whatsapp: t.whatsapp || "", email: t.email || "",
          telephone: t.telephone || "", adresse: t.adresse || "",
          logoUrl: t.logoUrl || "", bannerUrl: t.bannerUrl || "", themeId: t.themeId || "terre-et-or",
          metaTitle: t.metaTitle || "", metaDescription: t.metaDescription || "",
          facebook: social.facebook || "", instagram: social.instagram || "",
          tiktok: social.tiktok || "", twitter: social.twitter || "",
          livraisonGratuite: livraison.gratuite,
          fraisLivraison: String(livraison.frais), livraisonMin: String(livraison.minimum),
          delaiLivraison: livraison.delai, zones: livraison.zones,
        };
        setForm(loaded);
        setSavedForm(loaded);
      }
    }).catch(() => setErreurChargement(true));
  }
  useEffect(() => {
    chargerTenant();
    chargerBoutiques();
    fetch("/api/livraison/regles").then(r => r.json()).then(d => setRegles(d.regles ?? [])).catch(() => {});
  }, []);

  function chargerBoutiques() {
    setLoadingBoutiques(true);
    fetch("/api/boutiques").then(r => r.json()).then(d => {
      setAutresBoutiques(d.boutiques ?? []);
      setLoadingBoutiques(false);
    }).catch(() => setLoadingBoutiques(false));
  }

  async function switchBoutique(id: string) {
    // b peut être introuvable juste après une création (état local pas
    // encore rafraîchi) — on tente quand même le switch dans ce cas.
    if (switchingId || autresBoutiques.find(x => x.id === id)?.active) return;
    setSwitchingId(id);
    try {
      const res = await fetch("/api/boutiques/switch", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenantId: id }),
      });
      if (!res.ok) throw new Error();
      window.location.assign("/dashboard/boutique");
    } catch {
      toast.error(tr("Le changement de boutique n'a pas abouti. Vérifiez votre connexion et réessayez."));
      setSwitchingId(null);
    }
  }

  function set(field: string, value: any) { setForm(f => ({ ...f, [field]: value })); }

  async function sauvegarder() {
    if (!form.nomBoutique.trim()) {
      setErreurNom(tr("Indiquez le nom de votre boutique : il s'affiche en haut de votre vitrine."));
      setSection("infos");
      setTimeout(() => document.querySelector<HTMLInputElement>('[data-champ="nomBoutique"]')?.focus(), 50);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomBoutique: form.nomBoutique, description: form.description,
          pays: form.pays, whatsapp: form.whatsapp, email: form.email,
          telephone: form.telephone, adresse: form.adresse,
          logoUrl: form.logoUrl, bannerUrl: form.bannerUrl, themeId: form.themeId,
          metaTitle: form.metaTitle, metaDescription: form.metaDescription,
          // Fusion avec l'existant : ces objets JSON portent d'autres clés que ce formulaire ne gère pas
          socialLinks: { ...(tenant?.socialLinks || {}), facebook: form.facebook, instagram: form.instagram, tiktok: form.tiktok, twitter: form.twitter },
          parametresLivraison: {
            ...(tenant?.parametresLivraison || {}),
            gratuite: form.livraisonGratuite,
            frais: parseFloat(form.fraisLivraison) || 0,
            minimum: parseFloat(form.livraisonMin) || 0,
            delai: form.delaiLivraison.trim(),
            zones: lireReglagesLivraison({ zones: form.zones }).zones,
          },
          // Zones enregistrées depuis l'onglet Livraison : le marchand les a vues (étape du démarrage, lib/demarrage.ts).
          ...(section === "livraison" ? { confirmerLivraison: true } : {}),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(tr("Modifications de la boutique enregistrées."));
      setSavedForm(form);
      router.refresh();
    } catch { toast.error(tr("Les modifications n'ont pas pu être enregistrées. Vérifiez votre connexion et réessayez.")); }
    finally { setSaving(false); }
  }

  async function toggleStatut() {
    const next = statutLocal === "active" ? "pause" : "active";
    setSavingStatut(true);
    try {
      const res = await fetch("/api/tenants", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: next }),
      });
      if (!res.ok) throw new Error();
      setStatutLocal(next);
      toast.success(next === "active" ? tr("Boutique réactivée : elle est de nouveau visible.") : tr("Boutique mise en pause : elle n'est plus visible pour vos clients."));
      router.refresh();
    } catch { toast.error(tr("Le statut de la boutique n'a pas pu être changé. Réessayez dans un instant.")); }
    finally { setSavingStatut(false); }
  }

  function copierLien() {
    navigator.clipboard.writeText(urlBoutique(tenant!, "", window.location.origin));
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  function partager() {
    const url = urlBoutique(tenant!, "", window.location.origin);
    if (navigator.share) navigator.share({ title: form.nomBoutique || "Ma Boutique", url }).catch(() => {});
    else copierLien();
  }

  const urlProd = tenant && hote ? urlBoutique(tenant, "", hote).replace(/^https?:\/\//, "") : "";
  // Aperçu décoratif — palette AXSO jaune & noir (jamais bleu ni marron).
  // Le choix du design réel de la boutique se fait dans Theme Studio
  // (voir bannière ci-dessous).
  const theme = { fond: "#ffffff", surface: "#FAFAFA", accent: "#F5A623", texte: "#111111", texteMuted: "#888888", bordure: "#F0F0F0" };
  const dirty = !!savedForm && JSON.stringify(form) !== JSON.stringify(savedForm);
  const enLigne = statutLocal === "active";

  const completion = useMemo(() => {
    const checks = [
      !!form.nomBoutique,
      !!form.description && form.description.length > 20,
      !!form.logoUrl,
      !!form.bannerUrl,
      !!(form.whatsapp || form.telephone),
      !!form.pays,
      !!(form.facebook || form.instagram || form.tiktok || form.twitter),
      !!(form.metaTitle && form.metaDescription),
      form.zones.length > 0,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [form]);

  const sectionDone: Record<Section, boolean> = {
    infos: !!form.nomBoutique && !!form.description,
    apparence: !!form.logoUrl && !!form.bannerUrl,
    seo: !!form.metaTitle && !!form.metaDescription,
    reseaux: !!(form.facebook || form.instagram || form.tiktok || form.twitter),
    livraison: form.zones.length > 0,
    boutiques: autresBoutiques.length > 1,
    avance: true,
  };

  const peutCreerBoutique = autresBoutiques.some(b => aAcces(palierDe(b.planType), "multi_boutique"));

  return (
    <div className="space-y-section pb-24">
      <ModuleTutorial moduleKey="boutique" titre={tr("Ma boutique")} sousTitre={tr("Vue d'ensemble du module Boutique")} steps={BOUTIQUE_TUTORIAL_STEPS} />
      {erreurChargement && (
        <EtatErreur titre={tr("Les informations de votre boutique n'ont pas pu être chargées.")} texte={tr("Vérifiez votre connexion puis réessayez. Rien n'a été modifié.")} onReessayer={chargerTenant} />
      )}

      {/* ── En-tête Boutique en ligne (§8.20) ── */}
      <PageHeader icon="store" title={tr("Boutique en ligne")}
        titleMeta={<span className="flex items-center gap-2">
          <button onClick={() => setSection("avance")} title={tr("Changer le statut de la boutique")} className="rounded-(--radius-md)">
            <AdmBadge tone={enLigne ? "success" : "attention"}>{enLigne ? tr("En ligne") : tr("En pause")}</AdmBadge>
          </button>
          {tenant && <PlanBadge plan={tenant.planType} size="sm" />}
        </span>}
        primaryAction={{ content: tr("Personnaliser"), icon: "pen", href: "/dashboard/builder" }}
        secondaryActions={tenant ? [{ content: tr("Voir la boutique"), icon: "external", onAction: () => window.open(urlBoutique(tenant), "_blank", "noopener") }] : []}
        overflowActions={[
          { content: copied ? tr("Lien copié") : tr("Partager le lien de la boutique"), onAction: partager },
          ...(!loadingBoutiques ? [peutCreerBoutique
            ? { content: tr("Créer une nouvelle boutique"), onAction: () => setModalNouvelleBoutique(true) }
            : { content: tr("Nouvelle boutique · Palier 2"), href: "/dashboard/abonnement" }] : []),
          { content: tr("Revoir le tutoriel"), onAction: () => window.dispatchEvent(new CustomEvent("axso:ouvrir-tutoriel", { detail: "boutique" })) },
        ]} />

      {/* Thème actuel : aperçu + accès constructeur, thèmes, politiques. */}
      <Card padding="none">
        <div className="relative h-28 sm:h-36" style={{ background: form.bannerUrl ? undefined : "var(--color-surface-tertiary)" }}>
          {form.bannerUrl && <img src={form.bannerUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        </div>
        <CardSection>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Thumbnail src={form.logoUrl || null} alt={form.nomBoutique || tr("Ma Boutique")} size={40} />
            <div className="min-w-0 flex-1">
              <p className="m-0 truncate font-semibold text-(--color-text-strong)">{tr(form.nomBoutique) || tr("Ma Boutique")}</p>
              <p className="m-0 flex items-center gap-1 truncate text-xs text-(--color-text-secondary)">
                {tr(urlProd) || "votre-boutique.axsoafrica.com"}
                {tenant && <IconButton icon={copied ? "checkCircle" : "link"} aria-label={copied ? tr("Lien copié") : tr("Copier le lien de la boutique")} onClick={copierLien} />}
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <ProgressRing pct={completion} />
              <div className="leading-tight">
                <p className="m-0 text-xs font-semibold text-(--color-text-strong)">{tr("Profil")}{" "}{tr(completion)}%</p>
                <p className="m-0 text-xs text-(--color-text-secondary)">{completion === 100 ? tr("Boutique complète") : tr("à compléter")}</p>
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="primary" icon="pen" href="/dashboard/builder">{tr("Personnaliser")}</Button>
            <Button icon="grid" href="/dashboard/themes">{tr("Bibliothèque de thèmes")}</Button>
            <Button icon="doc" href="/dashboard/boutique/politiques">{tr("Politiques")}</Button>
          </div>
        </CardSection>
        {tenant?._count && (
          <CardSection>
            <div className="grid grid-cols-3 gap-2.5">
              <StatCard Icon={Package} label={tr("Produits")} value={tenant._count.produits ?? 0} />
              <StatCard Icon={ShoppingBag} label={tr("Commandes")} value={tenant._count.commandes ?? 0} />
              <StatCard Icon={Users} label={tr("Clients")} value={tenant._count.clients ?? 0} />
            </div>
          </CardSection>
        )}
      </Card>

      {/* Rappel : téléphone et adresse affichés aux clients (pied de page, page Contact). */}
      {savedForm && (!savedForm.telephone.trim() || !savedForm.adresse.trim()) && (
        <div className="rounded-carte p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 border border-attention-bordure bg-attention-fond">
          <div className="w-10 h-10 rounded-controle bg-carte flex items-center justify-center flex-shrink-0" aria-hidden><MapPin size={18} className="text-attention" /></div>
          <div className="flex-1 min-w-0">
            <p className="ax-sous-titre">{tr("Complétez vos coordonnées")}</p>
            <p className="ax-texte-secondaire">
              {tr("Ajoutez votre {0} : il s'affiche en bas de votre boutique et sur votre page Contact. Les clients font plus confiance à une boutique qu'ils peuvent appeler ou trouver.",
                [!savedForm.telephone.trim() && tr("numéro de téléphone"), !savedForm.adresse.trim() && tr("adresse physique")].filter(Boolean).join(tr(" et ")))}
            </p>
          </div>
          <button onClick={() => { const champ = !savedForm.telephone.trim() ? "telephone" : "adresse"; setSection("infos"); setTimeout(() => { const el = document.querySelector<HTMLInputElement>(`[data-champ="${champ}"]`); el?.scrollIntoView({ block: "center", behavior: "smooth" }); el?.focus({ preventScroll: true }); }, 50); }}
            className={"self-start sm:self-center flex-shrink-0 " + (classesBoutonSombre)}>
            {tr("Compléter mes coordonnées")}
          </button>
        </div>
      )}

      <CarteAffilies />

      <BannierePub />

      {/* ── Corps : nav + contenu + preview ── */}
      <div className="grid lg:grid-cols-[220px_1fr] xl:grid-cols-[220px_1fr_340px] gap-5 items-start">

        {/* Nav rail */}
        <nav aria-label={tr("Sections de la boutique")} className="rounded-carte border border-bordure bg-carte shadow-carte p-2 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible lg:sticky lg:top-5" style={{ scrollbarWidth: "none" }}>
          {SECTIONS.map(s => {
            const Icon = s.Icon;
            const active = section === s.id;
            const done = sectionDone[s.id];
            return (
              <button key={s.id} onClick={() => setSection(s.id)} aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2.5 px-3 py-2 min-h-10 rounded-controle transition-all text-left flex-shrink-0 ${active ? "bg-secondaire text-carte" : "text-encre hover:bg-carte-2"}`}>
                <span className={`w-8 h-8 rounded-controle flex items-center justify-center flex-shrink-0 ${active ? "bg-primaire/20 text-primaire" : "bg-carte-2 text-doux"}`} aria-hidden>
                  <Icon size={14} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-tight truncate">{tr(s.label)}</span>
                  <span className={`hidden lg:block text-xs leading-tight truncate mt-0.5 ${active ? "text-carte/60" : "text-doux"}`}>{tr(s.desc)}</span>
                </span>
                {done
                  ? <CheckCircle2 size={14} className={`ml-auto flex-shrink-0 hidden lg:block ${active ? "text-green-300" : "text-succes"}`} aria-label={tr("Complété")} />
                  : <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0 hidden lg:block bg-bordure" aria-hidden />}
              </button>
            );
          })}
        </nav>

        {/* Contenu de la section */}
        <div className="min-w-0 space-y-4">
          {section === "infos" && (
            <div className={CARTE}>
              <div>
                <h2 className="ax-titre-section">{tr("Informations générales")}</h2>
                <p className="ax-texte-secondaire mt-0.5">{tr("L'identité et les coordonnées de votre boutique")}</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {CHAMPS_INFOS.map(f => (
                  // data-champ : visé par le bouton « Compléter mes coordonnées » et la vérification du nom.
                  <Champ key={f.key} label={tr(f.label)} mention={f.key === "nomBoutique" ? "obligatoire" : undefined}
                    erreur={f.key === "nomBoutique" && erreurNom ? erreurNom : undefined}>
                    {(a) => (
                      <input {...a} data-champ={f.key} type={f.type || (f.key === "whatsapp" || f.key === "telephone" ? "tel" : "text")}
                        value={(form as any)[f.key]} className={CLASSE_SAISIE}
                        placeholder={f.key === "whatsapp" || f.key === "telephone" ? exempleTelephone(form.pays) : f.placeholder}
                        onChange={e => { set(f.key, e.target.value); if (f.key === "nomBoutique") setErreurNom(""); }} />
                    )}
                  </Champ>
                ))}
                <div className="space-y-1.5">
                  <span className="ax-libelle block">{tr("Pays")}</span>
                  <SelectPays ariaLabel={tr("Pays")} value={form.pays} onChange={code => set("pays", code)} />
                  {form.pays && PAYS_DEVISES[form.pays] && (
                    <p className="ax-aide">{tr("Devise de la boutique :")}{" "}<strong>{tr(PAYS_DEVISES[form.pays])}</strong>{" "}{tr("(définie par le pays)")}</p>
                  )}
                </div>
              </div>
              <ZoneTexte label={tr("Description de la boutique")} value={form.description} onChange={e => set("description", e.target.value)} rows={4}
                placeholder={tr("Décrivez votre boutique, vos produits, votre histoire…")}
                aide={`${form.description.length} ${tr("caractères — visible sur votre page d'accueil")}`} />
            </div>
          )}

          {section === "apparence" && (
            <div className="space-y-4">
              <div className={CARTE}>
                <div>
                  <h2 className="ax-titre-section">{tr("Médias de la boutique")}</h2>
                  <p className="ax-texte-secondaire mt-0.5">{tr("Le logo et la bannière apparaissent sur votre vitrine")}</p>
                </div>
                <div className="grid sm:grid-cols-[160px_1fr] gap-6">
                  <ImageUpload label={tr("Logo")} value={form.logoUrl} aspectRatio="circle"
                    onChange={url => set("logoUrl", url)} onRemove={() => set("logoUrl", "")}
                    hint={tr("Carré, PNG transparent")} />
                  <ImageUpload label={tr("Bannière d'accueil")} value={form.bannerUrl} aspectRatio="banner"
                    onChange={url => set("bannerUrl", url)} onRemove={() => set("bannerUrl", "")}
                    hint={tr("Format large — 1200×400px recommandé")} />
                </div>
              </div>
              <Link href="/dashboard/themes"
                className="w-full rounded-carte border border-bordure bg-carte shadow-carte p-carte flex items-center justify-between gap-3 text-left hover:border-bordure-forte transition-all group">
                <span>
                  <span className="flex items-center gap-1.5">
                    <Sparkles size={14} className="text-attention" aria-hidden />
                    <span className="ax-sous-titre">{tr("Changer de thème visuel")}</span>
                  </span>
                  <span className="block ax-texte-secondaire mt-1">{tr("Des designs prêts à l'emploi, vos vrais produits déjà branchés, ou importez le vôtre")}</span>
                </span>
                <ArrowUpRight size={16} className="text-doux group-hover:text-encre transition-colors flex-shrink-0" aria-hidden />
              </Link>
            </div>
          )}

          {section === "seo" && (
            <div className={CARTE}>
              <div>
                <h2 className="ax-titre-section">{tr("Référencement naturel (SEO)")}</h2>
                <p className="ax-texte-secondaire mt-0.5">{tr("Comment votre boutique apparaît sur Google")}</p>
              </div>
              <Saisie label={<span className="flex flex-wrap items-center justify-between gap-2">{tr("Titre affiché sur Google")}<LongueurBadge n={form.metaTitle.length} min={30} max={60} /></span>}
                aide={tr("Idéal : 30 à 60 caractères.")} value={form.metaTitle} onChange={e => set("metaTitle", e.target.value)} maxLength={70}
                placeholder={tr("Ex: Mode Aminata - Prêt-à-porter africain")} />
              <ZoneTexte label={<span className="flex flex-wrap items-center justify-between gap-2">{tr("Description affichée sur Google")}<LongueurBadge n={form.metaDescription.length} min={120} max={160} /></span>}
                aide={tr("Idéal : 120 à 160 caractères.")} value={form.metaDescription} onChange={e => set("metaDescription", e.target.value)} rows={3} maxLength={180}
                placeholder={tr("Description visible dans les résultats Google…")} />
              <div className="border border-bordure rounded-controle p-4 bg-carte-2 space-y-1.5">
                <p className="ax-aide mb-2 flex items-center gap-1.5"><Sparkles size={12} aria-hidden />{" "}{tr("Aperçu Google")}</p>
                <p className="text-[15px] font-semibold text-encre leading-tight">{tr(form.metaTitle) || tr(form.nomBoutique) || tr("Ma Boutique")}</p>
                <p className="text-succes text-xs leading-tight">{tr(urlProd) || "votre-boutique.axsoafrica.com"}</p>
                <p className="text-doux text-xs leading-relaxed">{tr(form.metaDescription) || form.description?.slice(0, 160) || tr("Ajoutez une description pour améliorer votre visibilité sur Google.")}</p>
              </div>
            </div>
          )}

          {section === "reseaux" && (
            <div className={CARTE}>
              <div>
                <h2 className="ax-titre-section">{tr("Vos liens sociaux")}</h2>
                <p className="ax-texte-secondaire mt-0.5">{tr("Affichés dans le pied de page de votre boutique. Collez l'adresse complète de chaque page.")}</p>
              </div>
              <div className="space-y-champs">
                {CHAMPS_RESEAUX.map(s => {
                  const valeur = (form as any)[s.key] as string;
                  return (
                    <div key={s.key} className="flex items-end gap-2">
                      <Saisie type="url" className="flex-1 min-w-0" label={<span className="inline-flex items-center gap-1.5"><s.Icon size={14} aria-hidden />{s.label}</span>}
                        value={valeur} onChange={e => set(s.key, e.target.value)} placeholder={s.placeholder} />
                      {valeur && (
                        <a href={valeur} target="_blank" rel="noopener noreferrer" aria-label={`${tr("Ouvrir")} ${s.label}`} title={`${tr("Ouvrir")} ${s.label}`}
                          className={classesBouton({ variante: "secondaire", className: "size-10 px-0 shrink-0" })}>
                          <ExternalLink size={14} aria-hidden />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {section === "livraison" && (
            <div className={CARTE}>
              <div>
                <h2 className="ax-titre-section">{tr("Paramètres de livraison")}</h2>
                <p className="ax-texte-secondaire mt-0.5">{tr("Frais et zones desservies par votre boutique")}</p>
              </div>
              <label className="flex items-center justify-between p-4 bg-carte-2 border border-bordure rounded-controle gap-3 cursor-pointer">
                <span className="min-w-0">
                  <span className="block ax-libelle">{tr("Livraison gratuite pour tous")}</span>
                  <span className="block ax-aide mt-0.5">{tr("Offrir la livraison à tous vos clients")}</span>
                </span>
                <button type="button" role="switch" aria-checked={form.livraisonGratuite} aria-label={tr("Livraison gratuite pour tous")}
                  onClick={() => set("livraisonGratuite", !form.livraisonGratuite)}
                  className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 focus-visible:outline-2 focus-visible:outline-focus ${form.livraisonGratuite ? "bg-primaire" : "bg-bordure-forte"}`}>
                  <span className="absolute top-0.5 w-5 h-5 bg-carte rounded-full shadow-sm transition-all"
                    style={{ left: form.livraisonGratuite ? "calc(100% - 22px)" : "2px" }} />
                </button>
              </label>
              {!form.livraisonGratuite && (
                <div className="grid sm:grid-cols-3 gap-4">
                  <Saisie type="number" label={tr("Tarif standard")} suffixe={tenant?.devise || undefined}
                    value={form.fraisLivraison} onChange={e => set("fraisLivraison", e.target.value)} min="0" inputMode="decimal" />
                  <Saisie label={tr("Délai standard")} value={form.delaiLivraison} onChange={e => set("delaiLivraison", e.target.value)}
                    placeholder={tr("Ex : 24 à 48 h")} maxLength={40} />
                  <Saisie type="number" label={tr("Gratuite à partir de")} aide={tr("Montant de commande ; 0 = jamais gratuite.")} suffixe={tenant?.devise || undefined}
                    value={form.livraisonMin} onChange={e => set("livraisonMin", e.target.value)} min="0" inputMode="decimal" />
                </div>
              )}
              <div className="space-y-1.5">
                <h3 className="ax-libelle">{tr("Zones de livraison")}</h3>
                <p className="ax-aide">
                  {tr("Le client choisit sa zone au moment de commander (livraisons dans votre pays). Frais vides = tarif standard.")}
                </p>
                <ZonesEditor zones={form.zones} onChange={v => set("zones", v)} gratuite={form.livraisonGratuite}
                  zonesAvancees={new Set(regles.filter(r => r.actif && r.zone.trim()).map(r => normaliserZone(r.zone)))} />
              </div>
              <div className="ax-texte-secondaire bg-carte-2 border border-bordure rounded-controle p-3.5 space-y-1">
                <p>
                  {form.livraisonGratuite
                    ? tr("Livraison gratuite pour tous vos clients, quelles que soient la zone et les règles avancées.")
                    : `${tr("Vos clients paient le tarif de leur zone, sinon")} ${form.fraisLivraison || 0}${form.delaiLivraison.trim() ? ` (${form.delaiLivraison.trim()})` : ""}${parseFloat(form.livraisonMin) > 0 ? ` — ${tr("offerte dès")} ${form.livraisonMin}, ${tr("zones et règles avancées comprises")}` : ""}.`}
                </p>
                {!form.livraisonGratuite && regles.some(r => r.actif && !r.zone.trim()) && (
                  <p>
                    {tr("Vos règles avancées par pays, poids ou montant remplacent le tarif standard quand elles s'appliquent.")}{" "}
                    <Link href="/dashboard/logistique?tab=livraison" className="font-semibold text-encre underline underline-offset-2">{tr("Voir les règles")}</Link>
                  </p>
                )}
              </div>
            </div>
          )}

          {section === "boutiques" && (
            <div className={CARTE}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="ax-titre-section">{tr("Mes boutiques")}</h2>
                  <p className="ax-texte-secondaire mt-0.5">{tr("Gérez toutes vos boutiques Axso. Touchez une boutique pour passer dessus.")}</p>
                </div>
                {peutCreerBoutique && (
                  <Bouton variante="sombre" taille="compact" onClick={() => setModalNouvelleBoutique(true)} icone={<Plus size={14} aria-hidden />}>
                    {tr("Créer une boutique")}
                  </Bouton>
                )}
              </div>

              {loadingBoutiques ? (
                <SqueletteListe lignes={2} libelle={tr("Chargement de vos boutiques…")} />
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {autresBoutiques.map(b => {
                    const busy = switchingId === b.id;
                    return (
                      <button key={b.id} onClick={() => switchBoutique(b.id)} disabled={busy} aria-current={b.active ? "true" : undefined}
                        aria-label={b.active ? `${b.nomBoutique} — ${tr("boutique actuelle")}` : `${tr("Passer sur la boutique")} ${b.nomBoutique}`}
                        className={`relative flex items-center gap-3 p-3.5 rounded-controle border text-left transition-all ${b.active ? "border-attention-bordure bg-primaire-fond cursor-default" : "border-bordure bg-carte-2 hover:border-bordure-forte"}`}>
                        <div className="w-10 h-10 rounded-controle flex items-center justify-center flex-shrink-0 overflow-hidden text-sm font-black text-carte bg-secondaire">
                          {b.logoUrl ? <img src={b.logoUrl} alt="" className="w-full h-full object-cover" /> : b.nomBoutique.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-encre leading-tight truncate">{tr(b.nomBoutique)}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge ton="accent">{tr(NOMS_PALIERS[palierDe(b.planType)])}</Badge>
                            <span className="text-xs text-doux">{b._count.produits} {tr("produits")}</span>
                          </div>
                        </div>
                        {busy ? (
                          <Loader2 size={16} className="animate-spin text-attention flex-shrink-0" aria-label={tr("Changement de boutique…")} />
                        ) : b.active ? (
                          <Badge ton="succes">{tr("Boutique actuelle")}</Badge>
                        ) : null}
                      </button>
                    );
                  })}

                  {peutCreerBoutique ? (
                    <button onClick={() => setModalNouvelleBoutique(true)}
                      className="flex items-center justify-center gap-2 rounded-controle border-2 border-dashed border-bordure p-3.5 min-h-[76px] transition-all hover:border-primaire hover:bg-primaire-fond">
                      <Plus size={16} className="text-attention" aria-hidden />
                      <span className="text-sm font-semibold text-doux">{tr("Créer une boutique")}</span>
                    </button>
                  ) : (
                    <Link href="/dashboard/abonnement"
                      className="flex flex-col items-center justify-center gap-1 rounded-controle border border-bordure bg-carte-2 p-3.5 min-h-[76px] text-center transition-all hover:border-bordure-forte">
                      <span className="flex items-center gap-2 text-sm font-semibold text-encre"><Lock size={14} className="text-attention" aria-hidden />{tr("Plusieurs boutiques — Palier 2")}</span>
                      <span className="text-xs text-doux">{tr("Voir les abonnements")}</span>
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {section === "avance" && (
            <div className="space-y-4">
              <div className={CARTE}>
                <div>
                  <h2 className="ax-titre-section">{tr("Statut de la boutique")}</h2>
                  <p className="ax-texte-secondaire mt-0.5">{tr("Mettez votre boutique en pause pendant vos fermetures")}</p>
                </div>
                <div className={`flex items-center justify-between gap-3 p-4 rounded-controle border flex-wrap ${enLigne ? "border-succes-bordure bg-succes-fond" : "border-attention-bordure bg-attention-fond"}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-controle flex items-center justify-center flex-shrink-0 bg-carte" aria-hidden>
                      {enLigne ? <Power size={16} className="text-succes" /> : <Pause size={16} className="text-attention" />}
                    </div>
                    <div className="min-w-0">
                      <p className="ax-libelle">{enLigne ? tr("Boutique en ligne") : tr("Boutique en pause")}</p>
                      <p className="ax-aide mt-0.5">
                        {enLigne ? tr("Visible et accessible par tous vos clients") : tr("Page indisponible pour vos clients")}
                      </p>
                    </div>
                  </div>
                  <StatutToggle actif={enLigne} nom={form.nomBoutique || tr("Ma boutique")} onConfirm={toggleStatut} loading={savingStatut} />
                </div>
              </div>

              <div className={CARTE}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="ax-titre-section">{tr("Domaine personnalisé")}</h2>
                    <p className="ax-texte-secondaire mt-0.5">{tr("Connectez votre propre nom de domaine")}</p>
                  </div>
                  <Bouton variante="secondaire" taille="compact" href="/dashboard/parametres/domaine" icone={<ArrowUpRight size={14} aria-hidden />}>
                    {tr("Configurer le domaine")}
                  </Bouton>
                </div>
                <div className="flex items-center justify-between gap-3 p-4 rounded-controle bg-carte-2 border border-bordure flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <Globe size={14} className="text-doux flex-shrink-0" aria-hidden />
                    <span className="text-sm font-medium text-encre truncate">{tr(tenant?.customDomain) || tr(urlProd) || "votre-boutique.axsoafrica.com"}</span>
                  </div>
                  <Badge ton={tenant?.customDomain ? "succes" : "neutre"}>{tenant?.customDomain ? tr("Domaine personnalisé") : tr("Adresse AXSO")}</Badge>
                </div>
              </div>

              <div className={CARTE}>
                <h2 className="ax-titre-section">{tr("Informations du compte")}</h2>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-controle bg-carte-2 border border-bordure">
                    <p className="ax-aide mb-1.5">{tr("Plan actuel")}</p>
                    {tenant && <PlanBadge plan={tenant.planType} size="sm" />}
                  </div>
                  <div className="p-3.5 rounded-controle bg-carte-2 border border-bordure">
                    <p className="ax-aide mb-1.5 flex items-center gap-1"><Calendar size={12} aria-hidden />{" "}{tr("Membre depuis")}</p>
                    <p className="text-sm font-semibold text-encre leading-tight">
                      {tenant?.createdAt ? new Date(tenant.createdAt).toLocaleDateString(tr.loc, { month: "long", year: "numeric" }) : "—"}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-controle bg-carte-2 border border-bordure">
                    <p className="ax-aide mb-1.5">{tr("Identifiant boutique")}</p>
                    <p className="text-sm font-semibold text-encre leading-tight font-mono truncate">{tenant?.id ? `${tenant.id.slice(0, 10)}…` : "—"}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Aperçu en direct */}
        <aside className="hidden xl:block xl:sticky xl:top-5">
          <LivePreview form={form} theme={theme} url={urlProd} />
        </aside>
      </div>

      {/* ── Barre de sauvegarde flottante ── */}
      {dirty && (
        <div role="status" className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2rem)] max-w-md flex items-center justify-between gap-3 bg-secondaire text-carte pl-4 pr-2 py-2 rounded-carte shadow-flottante">
          <span className="text-sm font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primaire animate-pulse shrink-0" aria-hidden />{tr("Modifications non enregistrées")}
          </span>
          <Bouton onClick={sauvegarder} charge={saving} texteCharge={tr("Enregistrement…")} icone={<Save size={14} aria-hidden />} className="shrink-0">
            {tr("Enregistrer")}
          </Bouton>
        </div>
      )}

      {modalNouvelleBoutique && (
        <NouvelleBoutiqueModal
          onClose={() => setModalNouvelleBoutique(false)}
          onCree={(tenantId) => { setModalNouvelleBoutique(false); switchBoutique(tenantId); }}
        />
      )}
    </div>
  );
}

// ─── Anneau de progression ──────────────────────────────────────────────────
function ProgressRing({ pct }: { pct: number }) {
  const r = 20, c = 2 * Math.PI * r;
  return (
    <div className="relative w-12 h-12 flex-shrink-0" aria-hidden>
      <svg viewBox="0 0 48 48" className="w-12 h-12 -rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="#EFEFEF" strokeWidth="4" />
        <circle cx="24" cy="24" r={r} fill="none" stroke="#F5A623" strokeWidth="4" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c} style={{ transition: "stroke-dashoffset .6s ease" }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold leading-none text-encre">{pct}%</span>
      </div>
    </div>
  );
}

// ─── Carte de statistique rapide ─────────────────────────────────────────────
function StatCard({ Icon, label, value }: { Icon: any; label: string; value: number }) {
  const tr = useT();
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-controle bg-carte-2 border border-bordure">
      <div className="w-8 h-8 rounded-controle bg-carte border border-bordure hidden sm:flex items-center justify-center flex-shrink-0" aria-hidden>
        <Icon size={14} className="text-attention" />
      </div>
      <div className="min-w-0 leading-tight">
        <p className="text-sm font-bold text-encre leading-tight">{tr(value)}</p>
        <p className="text-xs text-doux leading-tight truncate">{tr(label)}</p>
      </div>
    </div>
  );
}

// ─── Bascule statut avec confirmation ────────────────────────────────────────
function StatutToggle({ actif, nom, onConfirm, loading }: { actif: boolean; nom: string; onConfirm: () => Promise<void>; loading: boolean }) {
  const tr = useT();
  const [ouverte, setOuverte] = useState(false);
  return (
    <>
      {actif
        ? <Bouton variante="danger" onClick={() => setOuverte(true)} charge={loading} icone={<Pause size={14} aria-hidden />}>{tr("Mettre en pause")}</Bouton>
        : <Bouton onClick={() => setOuverte(true)} charge={loading} icone={<Power size={14} aria-hidden />}>{tr("Réactiver la boutique")}</Bouton>}
      <Confirmation ouverte={ouverte} onFermer={() => setOuverte(false)} onConfirmer={onConfirm} objet={nom}
        destructive={actif}
        titre={actif ? tr("Mettre la boutique en pause ?") : tr("Réactiver la boutique ?")}
        description={actif
          ? tr("Vos clients ne pourront plus voir ni commander dans votre boutique. Produits, commandes et réglages sont conservés ; vous pouvez la réactiver à tout moment.")
          : tr("Votre boutique redevient visible et vos clients peuvent de nouveau commander.")}
        libelleConfirmer={actif ? tr("Mettre en pause") : tr("Réactiver la boutique")} />
    </>
  );
}

// ─── Badge de longueur (SEO) ────────────────────────────────────────────────
function LongueurBadge({ n, min, max }: { n: number; min: number; max: number }) {
  const tr = useT();
  const ok = n >= min && n <= max;
  const empty = n === 0;
  return (
    <Badge ton={empty ? "neutre" : ok ? "succes" : "attention"}>{n} / {tr(max)} car.</Badge>
  );
}

// ─── Zones de livraison : une ligne par zone (nom, frais, délai) ─────────────
function ZonesEditor({ zones, onChange, gratuite, zonesAvancees }: { zones: ZoneLivraison[]; onChange: (v: ZoneLivraison[]) => void; gratuite: boolean; zonesAvancees: Set<string> }) {
  const tr = useT();
  const [draft, setDraft] = useState("");

  function ajouter() {
    const nom = draft.trim();
    if (nom && !zones.some(z => normaliserZone(z.nom) === normaliserZone(nom))) onChange([...zones, { nom, frais: null, delai: "" }]);
    setDraft("");
  }
  const modifier = (i: number, maj: Partial<ZoneLivraison>) => onChange(zones.map((z, j) => (j === i ? { ...z, ...maj } : z)));

  return (
    <div className="space-y-2">
      {zones.map((z, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2 p-2 rounded-controle border border-bordure bg-carte-2">
          <div className="flex-1 min-w-[8rem] pl-2">
            <p className="text-sm font-semibold text-encre truncate leading-tight">{z.nom}</p>
            {zonesAvancees.has(normaliserZone(z.nom)) && (
              <p className="text-xs text-attention leading-tight mt-0.5">{tr("Tarif fixé par une règle avancée (Logistique)")}</p>
            )}
          </div>
          {!gratuite && (
            <>
              <input type="number" min="0" value={z.frais ?? ""} aria-label={tr("Frais de la zone")}
                onChange={e => modifier(i, { frais: e.target.value === "" ? null : Math.max(0, parseFloat(e.target.value) || 0) })}
                placeholder={tr("Frais standard")} title={tr("Frais de la zone")} className={CLASSE_SAISIE + " w-28"} />
              <input value={z.delai} maxLength={40} aria-label={tr("Délai de la zone")}
                onChange={e => modifier(i, { delai: e.target.value })}
                placeholder={tr("Délai")} title={tr("Délai de la zone")} className={CLASSE_SAISIE + " w-28"} />
            </>
          )}
          <BoutonIcone label={`${tr("Retirer la zone")} ${z.nom}`} onClick={() => onChange(zones.filter((_, j) => j !== i))}>
            <X size={15} aria-hidden />
          </BoutonIcone>
        </div>
      ))}
      {!zones.length && <p className="ax-aide py-1">{tr("Aucune zone : le client tape simplement sa ville")}</p>}
      <div className="flex gap-2">
        <input value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); ajouter(); } }}
          aria-label={tr("Nom de la zone à ajouter")} placeholder={tr("Ajouter une zone : Akwa, Bonapriso…")} maxLength={60} className={CLASSE_SAISIE} />
        <Bouton variante="sombre" onClick={ajouter} disabled={!draft.trim()} icone={<Plus size={14} aria-hidden />} className="shrink-0">
          {tr("Ajouter")}
        </Bouton>
      </div>
    </div>
  );
}

// ─── Aperçu en direct de la vitrine ──────────────────────────────────────────
function LivePreview({ form, theme, url }: { form: any; theme: { fond: string; accent: string; texte: string }; url: string }) {
  const tr = useT();
  return (
    <div className="ax-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[#F0F0F0] flex items-center gap-2 bg-[#FAFAFA]">
        <div className="flex gap-1 flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-[#F3B3AC]" />
          <div className="w-2 h-2 rounded-full bg-[#F5D28A]" />
          <div className="w-2 h-2 rounded-full bg-[#A9DFB0]" />
        </div>
        <div className="flex-1 min-w-0 bg-white border border-[#EFEFEF] rounded-full px-3 py-1 text-[9.5px] leading-tight text-[#AAAAAA] text-center truncate">
          {url || "votre-boutique.axsoafrica.com"}
        </div>
      </div>
      <div style={{ backgroundColor: theme.fond }}>
        <div className="h-20 relative flex items-end px-4 pb-3" style={{ background: form.bannerUrl ? undefined : `linear-gradient(135deg, ${theme.accent}30, transparent)` }}>
          {form.bannerUrl && <img src={form.bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.45), transparent)" }} />
          <div className="relative z-10 w-10 h-10 rounded-2xl overflow-hidden ring-2 flex items-center justify-center flex-shrink-0"
            style={{ background: form.logoUrl ? "#fff" : theme.accent, borderColor: theme.fond }}>
            {form.logoUrl
              ? <img src={form.logoUrl} alt="" className="w-full h-full object-cover" />
              : <Store size={16} color="#fff" />}
          </div>
        </div>
        <div className="px-4 pt-3 pb-4">
          <p style={{ color: theme.texte, fontWeight: 800, fontSize: 14, lineHeight: 1.2 }} className="truncate">{tr(form.nomBoutique) || tr("Ma Boutique")}</p>
          <p style={{ color: theme.texte, opacity: 0.6, fontSize: 10.5, lineHeight: 1.4 }} className="mt-1 line-clamp-2">
            {tr(form.description) || tr("Votre description apparaîtra ici, sur la page d'accueil de votre boutique.")}
          </p>
          <div className="grid grid-cols-3 gap-1.5 mt-3.5">
            {[0, 1, 2].map(i => (
              <div key={i} className="rounded-xl overflow-hidden" style={{ background: `${theme.texte}0A` }}>
                <div className="aspect-square" style={{ background: `${theme.accent}22` }} />
                <div className="h-1.5 w-3/4 mx-auto my-1.5 rounded-full" style={{ background: `${theme.texte}18` }} />
              </div>
            ))}
          </div>
          <div className="mt-3.5 h-8 rounded-xl flex items-center justify-center text-[10.5px] font-bold leading-none"
            style={{ background: theme.accent, color: "#fff" }}>
            {tr("Découvrir la boutique")}
          </div>
        </div>
      </div>
      <div className="px-4 py-2.5 border-t border-[#F0F0F0] flex items-center gap-1.5">
        <Sparkles size={10} className="text-[#F5A623] flex-shrink-0" />
        <p className="text-xs leading-tight text-doux">{tr("Aperçu mis à jour en direct")}</p>
      </div>
    </div>
  );
}
