"use client";
import { useEffect, useRef, useState } from "react";
import { televerser } from "@/lib/televerser";
import { useParams, useRouter } from "next/navigation";
import {
  Save, Trash2, X, Plus, Sparkles, Loader2,
  Package, Image as ImageIcon, Tag, BarChart2, Globe,
  Upload, Video, FileText, Truck, Download, ExternalLink, Info, Zap,
  HelpCircle, ListOrdered, Eye, EyeOff, ShoppingCart, ScanLine, RefreshCw,
} from "lucide-react";
import { VariantesPrixManager } from "@/components/dashboard/VariantesPrixManager";
import ClesLicenceManager from "@/components/dashboard/ClesLicenceManager";
import FormationManager from "@/components/dashboard/FormationManager";
import { FichiersLivres, NouvelleVersion, PrevenirAcheteurs } from "@/components/dashboard/FichiersLivresManager";
import FaqManager, { type FaqItem } from "@/components/dashboard/FaqManager";
import ChampsCommandeManager, { type ChampCommande } from "@/components/dashboard/ChampsCommandeManager";
import PublicationAssistant from "@/components/dashboard/PublicationAssistant";
import { BarcodeCaptureModal } from "@/components/dashboard/BarcodeCaptureModal";
import { useCategoriesBoutique, optionsVariantes } from "@/components/dashboard/CategoriesProduit";
import { BarcodeLabelPreview } from "@/components/dashboard/produits/BarcodeLabelPreview";
import { genererEAN13 } from "@/lib/barcode";
import Link from "next/link";
import { toast } from "sonner";
import { envoyerImagesCarrees, dimensions, estCarre, MESSAGE_REFUS } from "@/lib/images-carrees";

import { useDevise } from "@/components/dashboard/DeviseProvider";
import { useT } from "@/components/I18nProvider";
import { PolitiquePrix } from "@/components/dashboard/PolitiquePrix";
import { urlBoutique } from "@/lib/utils";
import { Bouton, EtatErreur, useConfirmation } from "@/components/ui";
import { Badge, ContextualSaveBar, PageHeader, SkeletonPage, Toggle } from "@/components/ui/adm";
import { CARTE, CHAMP } from "../styles";

const TYPES_PRODUIT = [
  { id: "physique",     icon: Package,  label: "Physique",      desc: "Stock, livraison, poids" },
  { id: "digital",      icon: Download, label: "Digital",       desc: "PDF, vidéo, logiciel — livré par email" },
  { id: "dropshipping", icon: Truck,    label: "Dropshipping",  desc: "Fournisseur externe, envoi direct" },
] as const;

function formatTaille(octets: number) {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(1)} Ko`;
  return `${(octets / 1024 / 1024).toFixed(1)} Mo`;
}

type FormState = {
  nom: string; slug: string; description: string;
  prix: string; prixCompare: string; cout: string; stock: string; sku: string; codeBarres: string;
  categorie: string; tags: string[]; images: string[]; videos: string[];
  actif: boolean; featured: boolean; poids: string;
  metaTitle: string; metaDesc: string; ogImage: string;
  masquerVentes: boolean; visibleListage: boolean; texteBoutonAchat: string;
  faq: FaqItem[]; champsCommande: ChampCommande[];
  type: "physique" | "digital" | "dropshipping" | "fichier" | "licence" | "bundle" | "formation";
  fichierUrl: string; fichierNom: string; fichierTaille: number; instructionsTelechargement: string;
  prixFournisseur: string; urlFournisseur: string; nomFournisseur: string;
  affiliationActive: boolean; tauxCommissionAff: string;
};

export default function EditProduitPage() {
  const tr = useT();
  const { devise, fmt } = useDevise();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [erreurChargement, setErreurChargement] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [genIA, setGenIA] = useState(false);
  const [genImage, setGenImage] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadingFichier, setUploadingFichier] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [imageInput, setImageInput] = useState("");
  const [stats, setStats] = useState({ ventes: 0, vues: 0, avis: 0, commandes: 0 });
    const [boutiqueUrl, setBoutiqueUrl] = useState(""); // adresse publique de la boutique (urlBoutique)
  const [variantes, setVariantes] = useState<{ id?: string; nom: string; valeur: string; sku: string; prix: string; stock: string; image: string; actif: boolean }[]>([]);
  const [varianteForm, setVarianteForm] = useState({ nom: "Taille", valeur: "", sku: "", prix: "", stock: "0", image: "" });
  // Catégories de la boutique (Catalogue → Catégories) et options de variantes de la catégorie choisie.
  const categoriesBoutique = useCategoriesBoutique();
  const [savingVariante, setSavingVariante] = useState(false);
  const [showPubAssistant, setShowPubAssistant] = useState(false);
  const [scanBarcodeOuvert, setScanBarcodeOuvert] = useState(false);
  const { confirmer, dialogue } = useConfirmation();
  // Lien direct « Mettre à jour le stock » depuis la liste (#stock) : le champ n'existe qu'après le chargement.
  useEffect(() => {
    if (loading || window.location.hash !== "#stock") return;
    const champ = document.getElementById("stock") as HTMLInputElement | null;
    champ?.scrollIntoView({ block: "center" });
    champ?.focus({ preventScroll: true });
  }, [loading]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const digitalFileRef = useRef<HTMLInputElement>(null);

  // Dernier état enregistré : la barre « Modifications non enregistrées » compare le formulaire à lui.
  const [enregistre, setEnregistre] = useState<FormState | null>(null);
  const [form, setFormState] = useState<FormState>({
    nom: "", slug: "", description: "", prix: "", prixCompare: "", cout: "", stock: "0", sku: "", codeBarres: "",
    categorie: "", tags: [], images: [], videos: [],
    actif: true, featured: false, poids: "",
    metaTitle: "", metaDesc: "", ogImage: "",
    masquerVentes: false, visibleListage: true, texteBoutonAchat: "",
    faq: [], champsCommande: [],
    type: "physique",
    fichierUrl: "", fichierNom: "", fichierTaille: 0, instructionsTelechargement: "",
    prixFournisseur: "", urlFournisseur: "", nomFournisseur: "",
    affiliationActive: false, tauxCommissionAff: "",
  });

  useEffect(() => {
    fetch("/api/tenants/moi").then(r => r.json()).then(d => {
      if (d.tenant?.slug) setBoutiqueUrl(urlBoutique(d.tenant));
    }).catch(() => {});

    fetch(`/api/produits/${id}`)
      .then(async r => ({ ok: r.ok, d: await r.json().catch(() => ({})) }))
      .then(({ ok, d }) => {
        const p = d.produit;
        // Produit introuvable (404, autre boutique) ou erreur serveur : message au lieu d'un plantage
        if (!ok || !p) { setErreurChargement(d.message || d.error || tr("Produit introuvable")); setLoading(false); return; }
        setStats({ ventes: p.ventes ?? 0, vues: p.vues ?? 0, avis: p._count?.avis ?? 0, commandes: p._count?.lignesCommande ?? 0 });
        const initial: FormState = {
          nom: p.nom ?? "",
          slug: p.slug ?? "",
          description: p.description ?? "",
          prix: p.prix?.toString() ?? "",
          prixCompare: p.prixCompare?.toString() ?? "",
          cout: p.cout?.toString() ?? "",
          stock: p.stock?.toString() ?? "0",
          sku: p.sku ?? "",
          codeBarres: p.codeBarres ?? "",
          categorie: p.categorie ?? "",
          tags: p.tags ?? [],
          images: p.images ?? [],
          videos: p.videos ?? [],
          actif: p.actif ?? true,
          featured: p.featured ?? false,
          poids: p.poids?.toString() ?? "",
          metaTitle: p.metaTitle ?? "",
          metaDesc: p.metaDesc ?? "",
          ogImage: p.ogImage ?? "",
          masquerVentes: p.masquerVentes ?? false,
          visibleListage: p.visibleListage ?? true,
          texteBoutonAchat: p.texteBoutonAchat ?? "",
          faq: Array.isArray(p.faq) ? p.faq : [],
          champsCommande: Array.isArray(p.champsCommande) ? p.champsCommande : [],
          type: p.type ?? "physique",
          fichierUrl: p.fichierUrl ?? "",
          fichierNom: p.fichierNom ?? "",
          fichierTaille: p.fichierTaille ?? 0,
          instructionsTelechargement: p.instructionsTelechargement ?? "",
          prixFournisseur: p.prixFournisseur?.toString() ?? "",
          urlFournisseur: p.urlFournisseur ?? "",
          nomFournisseur: p.nomFournisseur ?? "",
          affiliationActive: p.affiliationActive ?? false,
          tauxCommissionAff: p.tauxCommissionAff ? String(Math.round(p.tauxCommissionAff * 100)) : "",
        };
        setFormState(initial);
        setEnregistre(initial);
        // Load variantes
        if (p.variantes?.length) {
          setVariantes(p.variantes.map((v: any) => ({
            id: v.id, nom: v.nom, valeur: v.valeur,
            sku: v.sku ?? "", prix: v.prix?.toString() ?? "", stock: v.stock?.toString() ?? "0",
            image: v.image ?? "", actif: v.actif ?? true,
          })));
        }
        setLoading(false);
      })
      .catch(() => { setErreurChargement(tr("Impossible de charger le produit")); setLoading(false); });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function ajouterVariante() {
    if (!varianteForm.valeur) return;
    setSavingVariante(true);
    try {
      const res = await fetch(`/api/produits/${id}/variantes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: varianteForm.nom, valeur: varianteForm.valeur,
          sku: varianteForm.sku || null,
          prix: varianteForm.prix ? parseFloat(varianteForm.prix) : null,
          stock: parseInt(varianteForm.stock) || 0,
          image: varianteForm.image || null,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.message || d.error || tr("Erreur ajout variante"));
      setVariantes(vs => [...vs, { ...varianteForm, id: d.variante?.id, actif: true }]);
      setVarianteForm(v => ({ ...v, valeur: "", sku: "", prix: "", stock: "0", image: "" }));
      toast.success(tr("Variante ajoutée"));
    } catch (err: any) { toast.error(err.message || tr("Erreur ajout variante")); }
    finally { setSavingVariante(false); }
  }

  async function supprimerVariante(varianteId: string | undefined, idx: number) {
    if (!varianteId) { setVariantes(vs => vs.filter((_, i) => i !== idx)); return; }
    const res = await fetch(`/api/produits/${id}/variantes?varianteId=${varianteId}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) { toast.error(tr("Suppression de la variante impossible")); return; }
    setVariantes(vs => vs.filter((_, i) => i !== idx));
    toast.success(tr("Variante supprimée"));
  }

  const nomsOptions = optionsVariantes(categoriesBoutique, form.categorie).noms;
  useEffect(() => {
    if (!nomsOptions.includes(varianteForm.nom)) setVarianteForm(v => ({ ...v, nom: nomsOptions[0] }));
  }, [nomsOptions.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  function set(field: string, value: any) {
    setFormState(f => ({ ...f, [field]: value }));
  }

  async function changerType(newType: "physique" | "digital" | "dropshipping") {
    const ancien = form.type;
    set("type", newType);
    try {
      const res = await fetch(`/api/produits/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: newType }),
      });
      if (!res.ok) { set("type", ancien); throw new Error(); }
      setEnregistre(e => e && { ...e, type: newType });
      toast.success(tr("Type changé → {0}", newType === "digital" ? "Digital" : newType === "dropshipping" ? "Dropshipping" : "Physique"));
    } catch {
      toast.error(tr("Erreur lors du changement de type"));
    }
  }

  const marge = form.prixFournisseur && form.prix
    ? Math.round((1 - parseFloat(form.prixFournisseur) / parseFloat(form.prix)) * 100) : null;
  const margeCout = form.cout && form.prix
    ? Math.round((1 - parseFloat(form.cout) / parseFloat(form.prix)) * 100) : null;
  const estDigital = ["digital", "fichier", "licence", "formation", "bundle"].includes(form.type);
  // Mêmes types que TYPES_NUMERIQUES (lib/pricing.ts) : minimum Axso de 20 % pour l'affilié (10 % en physique), lib/affiliation-regles.ts.
  const affDigital = ["digital", "fichier", "formation", "licence", "bundle", "evenement", "bootcamp"].includes(form.type);
  const prixNum = parseFloat(form.prix), prixCompareNum = parseFloat(form.prixCompare);
  const promoInvalide = !!form.prixCompare && prixCompareNum > 0 && prixNum > 0 && prixCompareNum <= prixNum;
  const remisePct = prixCompareNum > prixNum && prixNum > 0 ? Math.round((1 - prixNum / prixCompareNum) * 100) : null;

  // Images du produit : plusieurs à la fois, carrées uniquement (lib/images-carrees.ts).
  async function ajouterImages(fichiers: File[]) {
    if (!fichiers.length) return;
    setUploadingMedia(true);
    try {
      const { urls, refusees, erreur } = await envoyerImagesCarrees(fichiers);
      if (erreur) toast.error(tr(erreur));
      if (urls.length) { setFormState(f => ({ ...f, images: [...f.images, ...urls] })); toast.success(tr("{0} image{1} ajoutée{2}", urls.length, urls.length > 1 ? "s" : "", urls.length > 1 ? "s" : "")); }
      if (refusees.length) toast.error(MESSAGE_REFUS(refusees));
    } catch (err: any) {
      toast.error(tr(err.message));
    } finally {
      setUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function ajouterImageUrl() {
    const u = imageInput.trim();
    if (!u) return;
    const d = await dimensions(u).catch(() => null);
    if (!d) return void toast.error(tr("Image introuvable à cette adresse"));
    if (!estCarre(d.l, d.h)) return void toast.error(MESSAGE_REFUS([`${d.l}×${d.h}`]));
    setFormState(f => ({ ...f, images: [...f.images, u] }));
    setImageInput("");
  }

  async function uploadMedia(file: File, type: "image" | "video") {
    const fd = new FormData(); fd.append("file", file);
    setUploadingMedia(true);
    try {
      const res = await televerser(fd);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur upload");
      if (type === "image") set("images", [...form.images, data.url]);
      else set("videos", [...form.videos, data.url]);
      toast.success(tr("{0} uploadée", type === "image" ? "Image" : "Vidéo"));
    } catch (e: any) { toast.error(tr(e.message)); }
    finally { setUploadingMedia(false); }
  }

  async function uploadFichierDigital(file: File) {
    const fd = new FormData(); fd.append("file", file);
    setUploadingFichier(true);
    try {
      const res = await televerser(fd);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur upload");
      set("fichierUrl", data.url); set("fichierNom", file.name); set("fichierTaille", file.size);
      toast.success(tr("Fichier digital uploadé !"));
    } catch (e: any) { toast.error(tr(e.message)); }
    finally { setUploadingFichier(false); }
  }

  async function genererDescription() {
    if (!form.nom) { toast.error(tr("Entrez d'abord le nom du produit")); return; }
    setGenIA(true);
    try {
      const res = await fetch("/api/ai/description", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: form.nom, categorie: form.categorie }),
      });
      const data = await res.json();
      if (data.description) set("description", data.description);
    } catch { toast.error(tr("La description n'a pas pu être générée. Réessayez ou écrivez-la vous-même.")); }
    finally { setGenIA(false); }
  }

  async function genererImageIA() {
    if (!form.nom) { toast.error(tr("Entrez d'abord le nom du produit")); return; }
    setGenImage(true);
    try {
      const prompt = `${form.nom}, ${form.categorie || "produit"}, professional product photo, clean white background, studio lighting, 4K, sharp`;
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=800&nologo=true&model=flux&enhance=true&seed=${Math.floor(Math.random() * 999999)}`;
      set("images", [...form.images, url]);
      toast.success(tr("Image IA générée !"));
    } catch { toast.error(tr("Erreur génération")); }
    finally { setGenImage(false); }
  }

  async function sauvegarder(overrides: Partial<FormState> = {}) {
    const form_ = { ...form, ...overrides };
    if (!form_.nom || !form_.prix) { toast.error(tr("Indiquez le nom et le prix de vente du produit avant d'enregistrer.")); return; }
    const prix = parseFloat(form_.prix), stock = parseInt(form_.stock, 10);
    if (!(prix > 0)) { toast.error(tr("Le prix de vente doit être supérieur à 0")); return; }
    if (!estDigital && (isNaN(stock) || stock < 0)) { toast.error(tr("Le stock doit être un nombre entier positif")); return; }
    if (form_.cout && parseFloat(form_.cout) < 0) { toast.error(tr("Le coût ne peut pas être négatif")); return; }
    setSaving(true);
    try {
      const payload: any = {
        nom: form_.nom, slug: form_.slug, description: form_.description || null,
        prix,
        prixCompare: parseFloat(form_.prixCompare) > prix ? parseFloat(form_.prixCompare) : null,
        stock: estDigital ? 99999 : stock,
        sku: form_.sku || null, codeBarres: form_.codeBarres || null, categorie: form_.categorie || null,
        tags: form_.tags, images: form_.images, videos: form_.videos,
        actif: form_.actif, featured: form_.featured, type: form_.type,
        metaTitle: form_.metaTitle || null, metaDesc: form_.metaDesc || null,
        ogImage: form_.ogImage || null,
        masquerVentes: form_.masquerVentes,
        visibleListage: form_.visibleListage,
        texteBoutonAchat: form_.texteBoutonAchat || null,
        affiliationActive: form_.affiliationActive,
        tauxCommissionAff: form_.affiliationActive && form_.tauxCommissionAff ? parseFloat(form_.tauxCommissionAff) / 100 : null,
      };
      if (form_.type === "physique") {
        payload.poids = form_.poids ? parseFloat(form_.poids) : null;
        payload.cout = form_.cout ? parseFloat(form_.cout) : null;
      }
      if (form_.type === "digital") {
        payload.fichierUrl = form_.fichierUrl || null;
        payload.fichierNom = form_.fichierNom || null;
        payload.fichierTaille = form_.fichierTaille || null;
        payload.instructionsTelechargement = form_.instructionsTelechargement || null;
      }
      if (form_.type === "dropshipping") {
        payload.prixFournisseur = form_.prixFournisseur ? parseFloat(form_.prixFournisseur) : null;
        payload.urlFournisseur = form_.urlFournisseur || null;
        payload.nomFournisseur = form_.nomFournisseur || null;
      }
      const res = await fetch(`/api/produits/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details?.[0] ? `${data.error} : ${data.details[0].path?.join(".")} — ${data.details[0].message}` : data.error || "Erreur");
      setEnregistre(form_);
      toast.success(tr("Modifications du produit enregistrées."));
    } catch (e: any) { toast.error(tr(e.message)); }
    finally { setSaving(false); }
  }

  async function supprimer() {
    if (!(await confirmer({
      titre: tr("Supprimer ce produit ?"),
      objet: form.nom || tr("Ce produit"),
      description: tr("Il disparaît de votre boutique et de la caisse. Les commandes déjà passées restent visibles. Cette action est définitive."),
      libelleConfirmer: tr("Supprimer le produit"),
    }))) return;
    setDeleting(true);
    const res = await fetch(`/api/produits/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success(tr("Produit supprimé")); router.push("/dashboard/produits"); }
    else { toast.error(tr((await res.json().catch(() => ({}))).error || "Le produit n'a pas pu être supprimé. Réessayez dans un instant.")); setDeleting(false); }
  }

  const inputClass = CHAMP;
  const modifie = !!enregistre && JSON.stringify(form) !== JSON.stringify(enregistre);

  if (loading) return <SkeletonPage label={tr("Chargement du produit…")} />;

  if (erreurChargement) return (
    <EtatErreur className="max-w-md mx-auto" titre={tr("Ce produit ne peut pas être ouvert")}
      texte={tr("{0}. Il a peut-être été supprimé ou appartient à une autre boutique.", erreurChargement)}>
      <Bouton variante="secondaire" href="/dashboard/produits">{tr("Retour aux produits")}</Bouton>
    </EtatErreur>
  );

  return (
    <>
    <div className="mx-auto w-full max-w-[1000px] space-y-4">

      <ContextualSaveBar dirty={modifie} saving={saving} onSave={() => sauvegarder()} onDiscard={() => enregistre && setFormState(enregistre)} />
      <PageHeader
        icon="tag"
        backHref="/dashboard/produits"
        title={<span className="line-clamp-1 break-words">{form.nom || tr("Modifier le produit")}</span>}
        titleMeta={<>
          {form.actif ? <Badge tone="success">{tr("En ligne")}</Badge> : <Badge tone="neutral">{tr("Hors ligne")}</Badge>}
          <span>{stats.ventes} {tr(stats.ventes > 1 ? "ventes" : "vente")} · {stats.vues} {tr(stats.vues > 1 ? "vues" : "vue")} · {stats.avis} {tr("avis")}</span>
        </>}
        primaryAction={{ content: tr("Enregistrer"), loading: saving, onAction: () => sauvegarder() }}
        secondaryActions={[{
          content: form.actif ? tr("Masquer de la boutique") : tr("Publier"), icon: "eye",
          onAction: () => {
            if (!form.actif) { setShowPubAssistant(true); }
            else { set("actif", false); toast.info(tr("Le produit sera masqué de la boutique quand vous enregistrerez.")); }
          },
        }]}
        overflowActions={[{ content: tr("Supprimer le produit"), destructive: true, disabled: deleting, onAction: supprimer }]}
      />

      {/* ── Sélecteur de type ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {TYPES_PRODUIT.map(t => {
          const Icone = t.icon;
          const actif = form.type === t.id;
          return (
            <button key={t.id} onClick={() => changerType(t.id)}
              aria-pressed={actif}
              className={`flex items-start gap-3 rounded-(--radius-xl) bg-(--color-surface) p-4 text-left transition-shadow ${actif ? "shadow-[0_0_0_2px_var(--color-border-strong)]" : "shadow-(--shadow-card) hover:bg-(--color-surface-secondary)"}`}>
              <div className="grid size-10 shrink-0 place-items-center rounded-(--radius-md) bg-(--color-surface-tertiary)">
                <Icone size={18} className="text-(--color-icon-header)" />
              </div>
              <div>
                <p className="font-semibold text-(--color-text-strong) text-sm">{tr(t.label)}</p>
                <p className="text-xs text-(--color-text-secondary) mt-0.5">{tr(t.desc)}</p>
              </div>
              {actif && (
                <span aria-hidden className="ml-auto grid size-5 shrink-0 place-items-center rounded-full bg-(--color-primary) text-[10px] font-bold text-white">✓</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] xl:grid-cols-[minmax(0,1fr)_400px] gap-6">
        {/* ── Colonne principale ── */}
        <div className="min-w-0 space-y-5">

          {/* Infos générales */}
          <div className={`${CARTE} space-y-4`}>
            <div className="flex items-center gap-2 mb-1">
              <Package size={15} className="text-(--color-icon-header)" />
              <h2 className="text-[13px] font-semibold text-(--color-text-strong)">{tr("Informations générales")}</h2>
            </div>
            <div>
              <label htmlFor="produit-nom" className="ax-label block mb-1.5">{tr("Nom du produit *")}</label>
              <input id="produit-nom" required value={form.nom} onChange={e => set("nom", e.target.value)} maxLength={120} className={inputClass} />
            </div>
            <div>
              <label className="ax-label block mb-1.5">{tr("Adresse de la page produit (facultatif)")}</label>
              <div className="flex items-center gap-2 bg-(--color-surface-secondary) border border-(--color-border) rounded-xl px-4 py-3">
                <span className="text-(--color-text-secondary) text-xs flex-shrink-0">/produits/</span>
                <input value={form.slug} onChange={e => set("slug", e.target.value)} className="bg-transparent text-sm text-(--color-text) outline-none flex-1 min-w-0" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-(--color-text-secondary) text-xs">{tr("Description")}</label>
                <button onClick={genererDescription} disabled={genIA}
                  className="flex items-center gap-1 text-(--color-icon-header) text-xs hover:underline transition-colors disabled:opacity-50">
                  {genIA ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}{" "}{tr("Régénérer avec l'IA")}
                </button>
              </div>
              <textarea value={form.description} onChange={e => set("description", e.target.value)}
                rows={5} placeholder={tr("Décrivez votre produit...")} className={`${inputClass} resize-none`} />
            </div>
          </div>

          {/* Prix & Stock */}
          <div className={`${CARTE} space-y-6`}>
            <div className="flex items-center gap-2">
              <BarChart2 size={15} className="text-(--color-icon-header)" />
              <h2 className="text-[13px] font-semibold text-(--color-text-strong)">{tr("Prix & Stock")}</h2>
            </div>

            {/* Tarification */}
            <div className="space-y-3">
              <div className={`grid grid-cols-1 gap-4 ${form.type === "physique" ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                <div>
                  <label className="ax-label block mb-1.5">{tr("Prix de vente *")}</label>
                  <div className="relative">
                    <input type="number" inputMode="decimal" step="any" min="0" value={form.prix} onChange={e => set("prix", e.target.value)} placeholder="0" className={`${inputClass} pr-16`} />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-(--color-text-subdued)">{tr(devise)}</span>
                  </div>
                  <div className="mt-2"><PolitiquePrix prix={form.prix} type={form.type} /></div>
                </div>
                <div>
                  <label className="ax-label block mb-1.5">{tr("Prix barré (avant promo)")}</label>
                  <div className="relative">
                    <input type="number" inputMode="decimal" step="any" min="0" value={form.prixCompare} onChange={e => set("prixCompare", e.target.value)} placeholder={tr("Optionnel")} className={`${inputClass} pr-16 ${promoInvalide ? "!border-(--color-critical)" : ""}`} />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-(--color-text-subdued)">{tr(devise)}</span>
                  </div>
                </div>
                {form.type === "physique" && (
                  <div>
                    <label className="ax-label block mb-1.5">{tr("Prix d'achat (coût)")}</label>
                    <div className="relative">
                      <input type="number" inputMode="decimal" step="any" min="0" value={form.cout} onChange={e => set("cout", e.target.value)} placeholder={tr("Optionnel")} className={`${inputClass} pr-16`} />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-(--color-text-subdued)">{tr(devise)}</span>
                    </div>
                  </div>
                )}
              </div>
              {promoInvalide && <p className="text-[11px] text-(--color-critical-text)">{tr("Le prix barré doit être supérieur au prix de vente, sinon il ne s'affiche pas comme une promo.")}</p>}
              {(remisePct !== null || (form.type === "physique" && margeCout !== null) || (form.type === "dropshipping" && marge !== null)) && (
                <div className="flex flex-wrap gap-2">
                  {remisePct !== null && (
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-(--color-surface-secondary) text-(--color-link)">{tr("Promo affichée : -")}{tr(remisePct)}%</span>
                  )}
                  {[form.type === "physique" ? margeCout : form.type === "dropshipping" ? marge : null].filter((m): m is number => m !== null).map(m => (
                    <span key="marge" className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${m >= 30 ? "bg-(--banner-success-bg) text-(--badge-success-text)" : m >= 10 ? "bg-(--banner-warning-bg) text-(--badge-warning-text)" : "bg-(--banner-critical-bg) text-(--color-critical-text)"}`}>
                      {tr("Marge :")}{" "}{tr(m)}% · {fmt(Math.max(0, (parseFloat(form.prix) || 0) - (parseFloat(form.type === "physique" ? form.cout : form.prixFournisseur) || 0)))} / vente
                    </span>
                  ))}
                </div>
              )}
              {form.type === "physique" && <p className="text-[11px] text-(--color-text-secondary)">{tr("Le coût sert à calculer ta vraie rentabilité (marge, bénéfices) dans le Point de vente. Il n'est jamais visible par les clients.")}</p>}
            </div>

            {/* Inventaire */}
            {estDigital ? (
              <div className="bg-(--color-magic-bg) border border-(--color-magic-border) rounded-xl px-4 py-2.5 text-(--color-magic-text) text-xs flex items-center gap-2">
                <Info size={12} />{" "}{tr("Stock automatiquement illimité pour les produits digitaux")}
              </div>
            ) : (
              <div className="space-y-4 pt-5 border-t border-(--color-border-secondary)">
                <p className="text-[12px] font-semibold text-(--color-text-strong)">{tr("Inventaire")}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="stock" className="ax-label block mb-1.5">{tr("Stock disponible")}</label>
                    <input id="stock" type="number" inputMode="numeric" step="1" min="0" value={form.stock} onChange={e => set("stock", e.target.value)} className={inputClass} />
                    {variantes.length > 0 && <p className="text-[11px] text-(--color-text-secondary) mt-1">{tr("Les variantes ont chacune leur propre stock (colonne de droite).")}</p>}
                  </div>
                  <div>
                    <label className="ax-label block mb-1.5">{tr("SKU / Référence")}</label>
                    <input value={form.sku} onChange={e => set("sku", e.target.value)} placeholder={tr("SKU-001")} className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className="ax-label block mb-1.5">{tr("Code-barres (EAN/UPC)")}</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input value={form.codeBarres} onChange={e => set("codeBarres", e.target.value)} placeholder="ex: 6001234567890" className={`${inputClass} flex-1 min-w-0`} />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setScanBarcodeOuvert(true)} title={tr("Scanner le code-barres avec la caméra")}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 min-h-8 rounded-(--radius-md) font-[550] text-[13px] text-white bg-(--color-primary) shadow-(--shadow-button-primary) hover:bg-(--color-primary-hover)">
                        <ScanLine size={14} />{" "}{tr("Scanner")}
                      </button>
                      <button type="button"
                        onClick={() => { set("codeBarres", genererEAN13()); toast.success(tr("Code-barres généré — pense à enregistrer, puis imprime l'étiquette ci-dessous")); }}
                        title={tr("Générer un code-barres pour ce produit")}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-3 rounded-(--radius-lg) font-semibold text-[12.5px] text-(--color-text) border border-(--color-border) bg-white transition-all hover:bg-(--color-surface-secondary)">
                        <RefreshCw size={14} />{" "}{tr("Générer")}
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-(--color-text-secondary) mt-1.5">{tr("Pas de code d'origine ? Génère-en un, imprime l'étiquette et colle-la sur le produit.")}</p>
                  <BarcodeLabelPreview value={form.codeBarres} nom={form.nom || "Produit"} prix={form.prix ? `${fmt(Number(form.prix) || 0)}` : undefined} />
                </div>
              </div>
            )}
          </div>

          {/* Programme d'affiliation */}
          <div className={`${CARTE} space-y-4`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={15} className="text-(--color-icon-header)" />
                <h2 className="text-[13px] font-semibold text-(--color-text-strong)">{tr("Ouvrir aux affiliés")}</h2>
              </div>
              <Toggle checked={form.affiliationActive} onChange={(v) => set("affiliationActive", v)} label={tr("Ouvrir aux affiliés")} />
            </div>
            <p className="text-[11.5px] text-(--color-text-secondary)">
              {tr("Des affiliés font la promotion de ce produit avec leur lien. Sur les ventes payées en ligne qu'ils t'apportent, Axso leur verse une commission prélevée sur ta part.")}
            </p>
            {form.affiliationActive && (
              <div>
                <label className="ax-label block mb-1.5">{tr("Taux de commission affilié (%)")}</label>
                <input type="number" value={form.tauxCommissionAff} onChange={e => set("tauxCommissionAff", e.target.value)} min="0" max="100" placeholder={affDigital ? "20" : "10"} className={inputClass} />
                <p className="text-[10.5px] text-(--color-text-secondary) mt-1.5">{affDigital
                  ? tr("Laisse vide pour le taux par défaut de ta boutique (10 % si non réglé). Jamais moins de 20 % pour un produit numérique. Ex : 30 = 30 % de ton prix pour l'affilié sur chaque vente.")
                  : tr("Laisse vide pour le taux par défaut de ta boutique (10 % si non réglé). Jamais moins de 10 % pour un produit physique. Ex : 15 = 15 % de ton prix pour l'affilié sur chaque vente.")}</p>
              </div>
            )}
          </div>

          {/* Section DROPSHIPPING */}
          {form.type === "dropshipping" && (
            <div className="bg-white border border-(--badge-success-bg) rounded-(--radius-lg) p-6 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Truck size={15} className="text-(--badge-success-text)" />
                <h2 className="text-[13px] font-semibold text-(--color-text-strong)">{tr("Informations fournisseur")}</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="ax-label block mb-1.5">{tr("Prix fournisseur (coût)")}</label>
                  <input type="number" value={form.prixFournisseur} onChange={e => set("prixFournisseur", e.target.value)} placeholder="0" min="0" className={inputClass} />
                </div>
                <div>
                  <label className="ax-label block mb-1.5">{tr("Nom du fournisseur")}</label>
                  <input value={form.nomFournisseur} onChange={e => set("nomFournisseur", e.target.value)} placeholder={tr("AliExpress, CJ, ...")} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="ax-label block mb-1.5">{tr("URL produit source")}</label>
                <div className="flex gap-2">
                  <input value={form.urlFournisseur} onChange={e => set("urlFournisseur", e.target.value)}
                    placeholder="https://aliexpress.com/item/..." className={`${inputClass} flex-1 min-w-0`} />
                  {form.urlFournisseur && (
                    <a href={form.urlFournisseur} target="_blank" rel="noopener noreferrer"
                      className="px-3 py-2 bg-(--color-surface-secondary) border border-(--color-border) rounded-xl text-(--color-text-secondary) hover:text-(--color-text) transition-colors">
                      <ExternalLink size={15} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Section DIGITAL */}
          {form.type === "digital" && (
            <div className="bg-white border border-(--color-magic-border) rounded-(--radius-lg) p-6 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <FileText size={15} className="text-(--color-magic-text)" />
                <h2 className="text-[13px] font-semibold text-(--color-text-strong)">{tr("Fichier digital")}</h2>
              </div>
              {!form.fichierUrl ? (
                <div
                  className="border-2 border-dashed border-(--color-magic-border) rounded-xl p-8 text-center cursor-pointer hover:border-(--color-magic-text) hover:bg-(--color-magic-bg) transition-all"
                  onClick={() => digitalFileRef.current?.click()}>
                  {uploadingFichier ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 size={28} className="text-(--color-magic-text) animate-spin" />
                      <p className="text-sm text-(--color-magic-text)">{tr("Upload en cours…")}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload size={28} className="text-(--color-magic-text)" />
                      <p className="text-sm font-medium text-(--color-text)">{tr("Cliquez pour uploader votre fichier")}</p>
                      <p className="text-xs text-(--color-text-secondary)">{tr("PDF, ZIP, MP3, MP4, DOCX — max 200 Mo")}</p>
                    </div>
                  )}
                  <input ref={digitalFileRef} type="file" className="hidden"
                    accept=".pdf,.zip,.mp3,.mp4,.docx,.xlsx,.wav,.ogg"
                    onChange={e => e.target.files?.[0] && uploadFichierDigital(e.target.files[0])} />
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-(--color-magic-bg) border border-(--color-magic-border) rounded-xl p-4">
                  <div className="w-10 h-10 rounded-xl bg-(--color-magic-border) flex items-center justify-center flex-shrink-0">
                    <FileText size={18} className="text-(--color-magic-text)" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-(--color-text-strong) truncate">{tr(form.fichierNom) || tr("Fichier uploadé")}</p>
                    <p className="text-xs text-(--color-text-secondary)">{form.fichierTaille ? formatTaille(form.fichierTaille) : tr("Taille inconnue")}{" "}{tr("· Prêt à l'envoi")}</p>
                  </div>
                  {uploadingFichier ? <Loader2 size={16} className="animate-spin text-(--color-magic-text)" /> : (
                    <button onClick={() => digitalFileRef.current?.click()}
                      className="flex items-center gap-1 text-xs text-(--color-magic-text) hover:text-(--color-magic-text)"><RefreshCw size={13} />{tr("Remplacer")}</button>
                  )}
                  <button onClick={() => { set("fichierUrl", ""); set("fichierNom", ""); set("fichierTaille", 0); }}
                    className="text-(--color-critical) hover:text-(--color-critical-text) transition-colors"><X size={16} /></button>
                  <input ref={digitalFileRef} type="file" className="hidden"
                    accept=".pdf,.zip,.mp3,.mp4,.docx,.xlsx,.wav,.ogg"
                    onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) uploadFichierDigital(f); }} />
                </div>
              )}
              <PrevenirAcheteurs produitId={id} aEnregistrer />
              <NouvelleVersion produitId={id} actif={form.actif} />
              <div>
                <label className="ax-label block mb-1.5">{tr("Instructions de téléchargement (optionnel)")}</label>
                <textarea value={form.instructionsTelechargement} onChange={e => set("instructionsTelechargement", e.target.value)}
                  rows={3} placeholder={tr("Ex: Ouvrez le PDF avec Adobe Reader.")} className={`${inputClass} resize-none`} />
              </div>
            </div>
          )}

          {/* Section FICHIERS (produit à plusieurs fichiers) */}
          {form.type === "fichier" && (
            <div className="bg-white border border-(--color-magic-border) rounded-(--radius-lg) p-6 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <FileText size={15} className="text-(--color-magic-text)" />
                <h2 className="text-[13px] font-semibold text-(--color-text-strong)">{tr("Fichiers livrés")}</h2>
              </div>
              <FichiersLivres produitId={id} />
              <PrevenirAcheteurs produitId={id} />
              <NouvelleVersion produitId={id} actif={form.actif} />
            </div>
          )}

          {/* Médias */}
          <div className={`${CARTE} space-y-5`}>
            <div className="flex items-center gap-2 mb-1">
              <ImageIcon size={15} className="text-(--color-icon-header)" />
              <h2 className="text-[13px] font-semibold text-(--color-text-strong)">{tr("Images & Vidéos")}</h2>
            </div>
            {/* Images */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-(--color-text) text-xs font-medium">{tr("Images")}</label>
                <div className="flex flex-wrap gap-2">
                  <button onClick={genererImageIA} disabled={genImage || !form.nom}
                    className="flex items-center gap-1.5 text-xs bg-(--color-surface-tertiary) text-(--color-icon-header) border border-(--color-border) px-3 py-1.5 rounded-lg hover:bg-(--color-tint-hover) transition-all disabled:opacity-50">
                    {genImage ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} />}{" "}{tr("Générer avec l'IA")}
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploadingMedia}
                    className="flex items-center gap-1.5 text-xs bg-(--color-surface-secondary) text-(--color-text) border border-(--color-border) px-3 py-1.5 rounded-lg hover:bg-(--color-surface-tertiary) transition-all">
                    {uploadingMedia ? <Loader2 size={10} className="animate-spin" /> : <Upload size={10} />}{" "}{tr("Importer (images carrées)")}
                  </button>
                  <input ref={fileInputRef} type="file" className="hidden" accept="image/*" multiple
                    onChange={e => ajouterImages(Array.from(e.target.files ?? []))} />
                </div>
              </div>
              <div className="flex gap-2">
                <input value={imageInput} onChange={e => setImageInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") ajouterImageUrl(); }}
                  placeholder={tr("Ou collez une URL d'image...")}
                  className="flex-1 min-w-0 bg-(--color-surface-secondary) border border-(--color-border) rounded-xl px-3 py-2 text-(--color-text-strong) text-sm focus:outline-none focus:border-(--color-border-strong) placeholder:text-(--color-text-secondary)" />
                <button onClick={ajouterImageUrl}
                  className="px-3 py-2 bg-(--color-surface-tertiary) border border-(--color-border) text-(--color-icon-header) rounded-xl hover:bg-(--color-tint-hover) transition-all">
                  <Plus size={15} />
                </button>
              </div>
              {form.images.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {form.images.map((img, i) => (
                    <div key={i} className="relative group aspect-square rounded-xl overflow-hidden bg-(--color-surface-secondary) border border-(--color-border)">
                      <img src={img} alt="" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = "none")} />
                      {i === 0 && <div className="absolute bottom-1 left-1 bg-(--color-primary) text-white text-[9px] px-1.5 py-0.5 rounded font-medium">{tr("Principale")}</div>}
                      <button onClick={() => set("images", form.images.filter((_, j) => j !== i))}
                        className="absolute top-1 right-1 w-6 h-6 bg-(--color-critical) rounded-full flex items-center justify-center md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <X size={9} className="text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border-2 border-dashed border-(--color-border) rounded-xl p-6 text-center">
                  <p className="text-(--color-text-secondary) text-xs">{tr("Uploadez ou collez des URLs d'images ci-dessus")}</p>
                </div>
              )}
            </div>
            {/* Vidéos */}
            <div className="space-y-3 pt-3 border-t border-(--color-border-secondary)">
              <div className="flex items-center justify-between">
                <label className="text-(--color-text) text-xs font-medium">{tr("Vidéos produit")}</label>
                <button onClick={() => videoInputRef.current?.click()} disabled={uploadingMedia}
                  className="flex items-center gap-1.5 text-xs bg-(--color-surface-secondary) text-(--color-text) border border-(--color-border) px-3 py-1.5 rounded-lg hover:bg-(--color-surface-tertiary) transition-all">
                  {uploadingMedia ? <Loader2 size={10} className="animate-spin" /> : <Video size={10} />}{" "}{tr("Upload vidéo")}
                </button>
                <input ref={videoInputRef} type="file" className="hidden" accept="video/mp4,video/webm"
                  onChange={e => e.target.files?.[0] && uploadMedia(e.target.files[0], "video")} />
              </div>
              {(form.videos ?? []).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {form.videos.map((v, i) => (
                    <div key={v} className="relative rounded-xl overflow-hidden bg-black border border-(--color-border)">
                      <video src={v} controls playsInline preload="metadata" className="w-full aspect-video" />
                      <button onClick={() => set("videos", form.videos.filter((_, j) => j !== i))} title={tr("Retirer la vidéo")}
                        className="absolute top-1.5 right-1.5 w-6 h-6 bg-(--color-critical) rounded-full flex items-center justify-center"><X size={11} className="text-white" /></button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-(--color-text-secondary) text-center py-3">{tr("Aucune vidéo — elles s'affichent sur la page produit de ta boutique, sous la fiche.")}</p>
              )}
            </div>
          </div>

          {/* SEO & Open Graph */}
          <details className={`${CARTE}`}>
            <summary className="flex items-center gap-2 min-h-10 cursor-pointer select-none">
              <Globe size={15} className="text-primaire" aria-hidden />
              <h2 className="text-[13px] font-semibold text-encre">{tr("Référencement Google et partage")}</h2>
              <span className="ax-aide">{tr("facultatif")}</span>
            </summary>
            <div className="space-y-4 mt-4">
            <div>
              <label className="ax-label block mb-1.5">{tr("Titre affiché sur Google")}</label>
              <input value={form.metaTitle} onChange={e => set("metaTitle", e.target.value)} placeholder={tr("Titre pour Google (max 60 car.)")} className={inputClass} />
              {form.metaTitle && <p className={`text-[10px] mt-1 ${form.metaTitle.length > 60 ? "text-(--color-critical)" : "text-(--color-text-secondary)"}`}>{form.metaTitle.length}/60</p>}
            </div>
            <div>
              <label className="ax-label block mb-1.5">{tr("Description affichée sur Google")}</label>
              <textarea value={form.metaDesc} onChange={e => set("metaDesc", e.target.value)} rows={2} placeholder={tr("Description Google (max 155 car.)…")} className={`${inputClass} resize-none`} />
              {form.metaDesc && <p className={`text-[10px] mt-1 ${form.metaDesc.length > 155 ? "text-(--color-critical)" : "text-(--color-text-secondary)"}`}>{form.metaDesc.length}/155</p>}
            </div>
            <div>
              <label className="ax-label block mb-1.5">{tr("Image Open Graph (partage réseaux sociaux)")}</label>
              <input value={form.ogImage} onChange={e => set("ogImage", e.target.value)} placeholder="URL de l'image (1200×630px recommandé)" className={inputClass} />
              {form.ogImage && (
                <div className="mt-2 rounded-xl overflow-hidden border border-(--color-border) h-20">
                  <img src={form.ogImage} alt="OG" className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = "none"; }} />
                </div>
              )}
              <p className="text-[10px] text-(--color-text-secondary) mt-1">{tr("Si vide, la première image produit est utilisée.")}</p>
            </div>
          </div>
          </details>

          {/* Tarification avancée (variantes de prix) */}
          <div className={`${CARTE}`}>
            <VariantesPrixManager
              produitId={id}
              boutiqueUrl={boutiqueUrl}
              produitSlug={form.slug}
              devise={devise}
            />
          </div>

          {/* Clés de licence */}
          {form.type === "licence" && (
            <div className="bg-white border border-(--color-border-secondary) rounded-(--radius-lg) overflow-hidden">
              <ClesLicenceManager produitId={id} />
            </div>
          )}

          {/* Formation — chapitres et leçons */}
          {form.type === "formation" && (
            <div className="bg-white border border-(--color-border-secondary) rounded-(--radius-lg) overflow-hidden">
              <FormationManager produitId={id} />
            </div>
          )}

          {/* FAQ */}
          <div className="bg-white border border-(--color-border-secondary) rounded-(--radius-lg) overflow-hidden">
            <div className="flex items-center gap-2 px-5 pt-5 pb-1">
              <HelpCircle size={15} className="text-(--color-icon-header)" />
              <h2 className="text-[13px] font-semibold text-(--color-text-strong)">FAQ</h2>
            </div>
            <FaqManager
              produitId={id}
              initial={form.faq}
              nom={form.nom}
              description={form.description}
            />
          </div>

          {/* Champs à la commande */}
          <div className="bg-white border border-(--color-border-secondary) rounded-(--radius-lg) overflow-hidden">
            <div className="flex items-center gap-2 px-5 pt-5 pb-1">
              <ListOrdered size={15} className="text-(--color-icon-header)" />
              <h2 className="text-[13px] font-semibold text-(--color-text-strong)">{tr("Champs personnalisés à la commande")}</h2>
            </div>
            <ChampsCommandeManager
              produitId={id}
              initial={form.champsCommande}
            />
          </div>
        </div>

        {/* ── Colonne latérale ── */}
        <div className="space-y-5">

          {/* Stats */}
          <div className={`${CARTE}`}>
            <h2 className="text-[13px] font-semibold text-(--color-text-strong) mb-3">{tr("Statistiques")}</h2>
            <div className="space-y-3">
              {[
                { label: "Ventes totales", value: stats.ventes, color: "text-(--color-text-strong)" },
                { label: "Vues totales", value: stats.vues, color: "text-(--color-text-strong)" },
                { label: "Avis reçus", value: stats.avis, color: "text-(--color-text-strong)" },
                { label: "Dans commandes", value: stats.commandes, color: "text-(--color-text-strong)" },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-(--color-text-secondary) text-xs">{tr(s.label)}</span>
                  <span className={`font-bold text-sm ${s.color}`}>{tr(s.value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Catégorie & Tags */}
          <div className={`${CARTE} space-y-4`}>
            <div className="flex items-center gap-2 mb-1">
              <Tag size={14} className="text-(--color-icon-header)" />
              <h2 className="text-[13px] font-semibold text-(--color-text-strong)">{tr("Collection et tags")}</h2>
            </div>
            <select value={form.categorie} onChange={e => set("categorie", e.target.value)}
              className="w-full bg-(--color-surface-secondary) border border-(--color-border) rounded-xl px-4 py-3 text-(--color-text-strong) text-sm focus:outline-none focus:border-(--color-border-strong)">
              <option value="">{categoriesBoutique?.length === 0 ? tr("Aucune collection : créez-en d'abord") : tr("Sélectionner...")}</option>
              {(categoriesBoutique ?? []).map(c => <option key={c.id} value={c.nom}>{tr(c.nom)}</option>)}
              {form.categorie && categoriesBoutique && !categoriesBoutique.some(c => c.nom === form.categorie) && <option value={form.categorie}>{tr(form.categorie)}</option>}
            </select>
            <Link href="/dashboard/produits/categories" className="block -mt-2 text-[12px] font-medium text-(--color-link) hover:underline">{tr("Gérer les collections et leurs options →")}</Link>
            <div className="flex gap-2">
              <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); const t = tagInput.trim().toLowerCase(); if (t && !form.tags.includes(t)) set("tags", [...form.tags, t]); setTagInput(""); }}}
                placeholder={tr("Ajouter un tag...")}
                className="flex-1 min-w-0 bg-(--color-surface-secondary) border border-(--color-border) rounded-xl px-3 py-2 text-(--color-text-strong) text-xs focus:outline-none focus:border-(--color-border-strong) placeholder:text-(--color-text-secondary)" />
              <button onClick={() => { const t = tagInput.trim().toLowerCase(); if (t && !form.tags.includes(t)) set("tags", [...form.tags, t]); setTagInput(""); }}
                className="flex-shrink-0 px-3 py-2 bg-(--color-surface-secondary) border border-(--color-border) rounded-xl text-(--color-text-secondary) hover:text-(--color-text-strong) text-xs">+</button>
            </div>
            {(form.tags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.tags.map(t => (
                  <span key={t} className="flex items-center gap-1 bg-(--color-surface-tertiary) border border-(--color-border) text-(--color-icon-header) text-xs px-2 py-1 rounded-lg">
                    {tr(t)}<button onClick={() => set("tags", form.tags.filter(x => x !== t))}><X size={9} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ─── Variantes ─── */}
          {!estDigital && (
            <div className={`${CARTE} space-y-4`}>
              <div className="flex items-center justify-between">
                <h2 className="text-[13px] font-semibold text-(--color-text-strong)">{tr("Variantes")}</h2>
                <span className="flex-shrink-0 whitespace-nowrap text-[11px] bg-(--color-surface-tertiary) text-(--color-icon-header) px-2 py-0.5 rounded-full">{variantes.length} variante(s)</span>
              </div>
              {/* Existantes */}
              {variantes.length > 0 && (
                <div className="space-y-1.5">
                  {variantes.map((v, idx) => (
                    <div key={idx} className="flex flex-wrap items-center gap-x-2 gap-y-1 bg-(--color-surface-secondary) rounded-xl px-3 py-2">
                      <span className="text-[11px] bg-(--color-surface-tertiary) text-(--color-icon-header) px-2 py-0.5 rounded-full font-medium">{tr(v.nom)}</span>
                      <span className="text-[12px] font-semibold text-(--color-text-strong) flex-1 min-w-0 break-words">{tr(v.valeur)}</span>
                      {v.sku && <span className="text-[10px] text-(--color-text-subdued) font-mono">{tr(v.sku)}</span>}
                      <span className="text-[12px] text-(--color-icon-header) font-bold">{fmt(Number(v.prix || form.prix) || 0)}</span>
                      <span className="text-[11px] text-(--color-text-secondary)">{tr("S:")}{v.stock}</span>
                      <button onClick={() => supprimerVariante(v.id, idx)} className="text-(--color-critical) hover:text-(--color-critical-text) ml-1 text-xs">✕</button>
                    </div>
                  ))}
                </div>
              )}
              {/* Formulaire ajout */}
              <div className="bg-(--color-surface-secondary) rounded-xl p-3 space-y-2">
                <datalist id="valeurs-option">{optionsVariantes(categoriesBoutique, form.categorie).valeurs(varianteForm.nom).map(v => <option key={v} value={v} />)}</datalist>
                <div className="grid grid-cols-2 gap-2">
                  <select value={varianteForm.nom} onChange={e => setVarianteForm(v => ({ ...v, nom: e.target.value }))}
                    className="w-full min-w-0 border border-(--color-border) rounded-xl px-3 py-2 text-[12px] outline-none bg-white">
                    {optionsVariantes(categoriesBoutique, form.categorie).noms.map(n => <option key={n}>{n}</option>)}
                  </select>
                  <input className="w-full min-w-0 border border-(--color-border) rounded-xl px-3 py-2 text-[12px] outline-none bg-white" placeholder={tr("Valeur (ex: XL, Rouge)")} list="valeurs-option"
                    value={varianteForm.valeur} onChange={e => setVarianteForm(v => ({ ...v, valeur: e.target.value }))} />
                  <input className="w-full min-w-0 border border-(--color-border) rounded-xl px-3 py-2 text-[12px] outline-none bg-white" placeholder={tr("SKU (optionnel)")}
                    value={varianteForm.sku} onChange={e => setVarianteForm(v => ({ ...v, sku: e.target.value }))} />
                  <input className="w-full min-w-0 border border-(--color-border) rounded-xl px-3 py-2 text-[12px] outline-none bg-white" placeholder={tr("Prix (défaut: {0})", form.prix)} type="number"
                    value={varianteForm.prix} onChange={e => setVarianteForm(v => ({ ...v, prix: e.target.value }))} />
                  <input className="w-full min-w-0 border border-(--color-border) rounded-xl px-3 py-2 text-[12px] outline-none bg-white" placeholder={tr("Stock")} type="number"
                    value={varianteForm.stock} onChange={e => setVarianteForm(v => ({ ...v, stock: e.target.value }))} />
                </div>
                <button onClick={ajouterVariante} disabled={!varianteForm.valeur || savingVariante}
                  className="w-full py-2 rounded-xl border-2 border-dashed border-(--color-border-strong) text-[12px] text-(--color-icon-header) font-semibold hover:bg-(--color-surface-secondary) transition-all disabled:opacity-40">
                  {savingVariante ? "..." : tr("+ Ajouter cette variante")}
                </button>
              </div>
            </div>
          )}

          {/* Options */}
          <div className={`${CARTE} space-y-3`}>
            <h2 className="text-[13px] font-semibold text-(--color-text-strong) mb-1">{tr("Options")}</h2>
            {[
              { label: "Produit actif", desc: "Accessible et visible sur la boutique", key: "actif", icon: <Eye size={12} /> },
              { label: "Mis en avant", desc: "Affiché en page d'accueil", key: "featured", icon: null },
              { label: "Visible dans le catalogue", desc: "Masqué de la liste, accessible par lien direct", key: "visibleListage", icon: <EyeOff size={12} /> },
              { label: "Masquer le compteur de ventes", desc: "Le nombre d'achats ne s'affiche pas", key: "masquerVentes", icon: null },
            ].map(opt => (
              <div key={opt.key} className="flex items-center justify-between">
                <div>
                  <p className="text-(--color-text-strong) text-sm">{tr(opt.label)}</p>
                  <p className="text-(--color-text-secondary) text-xs">{tr(opt.desc)}</p>
                </div>
                <Toggle checked={!!(form as any)[opt.key]} onChange={(v) => set(opt.key, v)} label={tr(opt.label)} />
              </div>
            ))}

            {/* Texte bouton achat */}
            <div className="pt-2 border-t border-(--color-border-secondary)">
              <label className="ax-label block mb-1.5 flex items-center gap-1.5">
                <ShoppingCart size={12} className="text-(--color-text-secondary)" />{" "}{tr("Texte du bouton d'achat")}
              </label>
              <input
                value={form.texteBoutonAchat}
                onChange={e => set("texteBoutonAchat", e.target.value)}
                placeholder={tr("Acheter maintenant")}
                className="w-full bg-(--color-surface-secondary) border border-(--color-border) rounded-xl px-3 py-2.5 text-(--color-text-strong) text-sm focus:outline-none focus:border-(--color-border-strong)"
              />
            </div>

            {form.type === "physique" && (
              <div className="pt-2 border-t border-(--color-border-secondary)">
                <label className="ax-label block mb-1.5">{tr("Poids (kg)")}</label>
                <input type="number" value={form.poids} onChange={e => set("poids", e.target.value)} placeholder="0.5" min="0" step="0.01"
                  className="w-full bg-(--color-surface-secondary) border border-(--color-border) rounded-xl px-4 py-2.5 text-(--color-text-strong) text-sm focus:outline-none focus:border-(--color-border-strong)" />
              </div>
            )}
          </div>

          {/* Aperçu */}
          {(form.nom || (form.images ?? []).length > 0) && (
            <div className="bg-white border border-(--color-border-secondary) rounded-(--radius-lg) overflow-hidden">
              <p className="text-(--color-text-secondary) text-xs px-4 pt-3 pb-2">{tr("Aperçu boutique")}</p>
              <div className="aspect-square bg-(--color-surface-secondary) overflow-hidden">
                {form.images?.[0]
                  ? <img src={form.images[0]} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center">{form.type === "digital" ? <Download size={40} className="text-(--color-text-subdued)" /> : <Package size={40} className="text-(--color-text-subdued)" />}</div>}
              </div>
              <div className="p-4">
                <p className="font-medium text-(--color-text-strong) text-sm line-clamp-2">{tr(form.nom) || tr("Nom du produit")}</p>
                {form.prix && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-(--color-icon-header) font-bold text-sm">{fmt(Number(form.prix) || 0)}</span>
                    {remisePct !== null && <span className="text-(--color-text-secondary) text-xs line-through">{fmt(prixCompareNum)}</span>}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Publication assistant modal */}
    {showPubAssistant && (
      <PublicationAssistant
        produitId={id}
        nom={form.nom}
        description={form.description}
        images={form.images}
        prix={form.prix}
        metaTitle={form.metaTitle}
        faqCount={form.faq.length}
        onClose={() => setShowPubAssistant(false)}
        onPublier={async () => {
          set("actif", true);
          await sauvegarder({ actif: true });
        }}
      />
    )}

    <BarcodeCaptureModal
      open={scanBarcodeOuvert}
      onClose={() => setScanBarcodeOuvert(false)}
      onDetect={code => { set("codeBarres", code); toast.success(tr("Code-barres scanné !")); }}
    />
    {dialogue}
    </>
  );
}
