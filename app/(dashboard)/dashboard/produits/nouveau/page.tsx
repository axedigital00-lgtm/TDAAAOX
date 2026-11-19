"use client";
import { useState, useRef, useEffect } from "react";
import { televerser } from "@/lib/televerser";
import { useRouter } from "next/navigation";
import {
  Plus, X, Sparkles, Loader2, Package, Image as ImageIcon,
  Tag, BarChart2, Globe, Upload, Video, FileText, Truck, Download,
  ExternalLink, Info, Zap, ScanLine
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { envoyerImagesCarrees, dimensions, estCarre, MESSAGE_REFUS } from "@/lib/images-carrees";
import { slugify } from "@/lib/utils";
import { BarcodeCaptureModal } from "@/components/dashboard/BarcodeCaptureModal";
import { useCategoriesBoutique, optionsVariantes } from "@/components/dashboard/CategoriesProduit";
import { GardeProduitPhysique } from "@/components/dashboard/GardeProduitPhysique";

import { useDevise } from "@/components/dashboard/DeviseProvider";
import { useT } from "@/components/I18nProvider";
import { PolitiquePrix } from "@/components/dashboard/PolitiquePrix";
import { Badge, ContextualSaveBar, PageHeader, Toggle } from "@/components/ui/adm";
import { CARTE, CHAMP } from "../styles";

const TYPES_PRODUIT = [
  {
    id: "physique",
    icon: Package,
    label: "Physique",
    desc: "Stock, livraison, poids",
  },
  {
    id: "digital",
    icon: Download,
    label: "Digital",
    desc: "Fichier, formation, licence, bundle — assistant dédié",
  },
  {
    id: "dropshipping",
    icon: Truck,
    label: "Dropshipping",
    desc: "Fournisseur externe, envoi direct",
  },
];

const FORM_VIDE = {
  type: "physique" as "physique" | "digital" | "dropshipping",
  nom: "",
  slug: "",
  description: "",
  prix: "",
  prixCompare: "",
  cout: "",
  stock: "0",
  sku: "",
  codeBarres: "",
  categorie: "",
  tags: [] as string[],
  images: [] as string[],
  videos: [] as string[],
  actif: true,
  featured: false,
  poids: "",
  metaTitle: "",
  metaDesc: "",
  // digital
  fichierUrl: "",
  fichierNom: "",
  fichierTaille: 0,
  instructionsTelechargement: "",
  // dropshipping
  prixFournisseur: "",
  urlFournisseur: "",
  nomFournisseur: "",
};

function formatTaille(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(1)} Ko`;
  return `${(octets / 1024 / 1024).toFixed(1)} Mo`;
}

// Boutique digitale : on propose d'abord une boutique physique (voir GardeProduitPhysique).
export default function NouveauProduitPage() {
  return <GardeProduitPhysique><FormulaireProduit /></GardeProduitPhysique>;
}

function FormulaireProduit() {
  const tr = useT();
  const { fmt } = useDevise();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [genIA, setGenIA] = useState(false);
  const [genImage, setGenImage] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [imageInput, setImageInput] = useState("");
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadingFichier, setUploadingFichier] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const digitalFileRef = useRef<HTMLInputElement>(null);

  const [variantes, setVariantes] = useState<{ nom: string; valeur: string; sku: string; prix: string; stock: string; image: string }[]>([]);
  const [varianteForm, setVarianteForm] = useState({ nom: "Taille", valeur: "", sku: "", prix: "", stock: "0", image: "" });
  // Catégories de la boutique (Catalogue → Catégories) et options de variantes de la catégorie choisie.
  const categoriesBoutique = useCategoriesBoutique();
  const [scanBarcodeOuvert, setScanBarcodeOuvert] = useState(false);

  const [form, setForm] = useState(FORM_VIDE);

  const nomsOptions = optionsVariantes(categoriesBoutique, form.categorie).noms;
  useEffect(() => {
    if (!nomsOptions.includes(varianteForm.nom)) setVarianteForm(v => ({ ...v, nom: nomsOptions[0] }));
  }, [nomsOptions.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  function set(field: string, value: any) {
    setForm(f => {
      const updated = { ...f, [field]: value };
      if (field === "nom") updated.slug = slugify(value);
      return updated;
    });
  }

  const marge = form.prixFournisseur && form.prix
    ? Math.round((1 - parseFloat(form.prixFournisseur) / parseFloat(form.prix)) * 100)
    : null;
  const margeCout = form.cout && form.prix
    ? Math.round((1 - parseFloat(form.cout) / parseFloat(form.prix)) * 100)
    : null;

  // ─── Upload image/vidéo ──────────────────────────────────────────
  // Images du produit : plusieurs à la fois, carrées uniquement (lib/images-carrees.ts).
  async function ajouterImages(fichiers: File[]) {
    if (!fichiers.length) return;
    setUploadingMedia(true);
    try {
      const { urls, refusees, erreur } = await envoyerImagesCarrees(fichiers);
      if (erreur) toast.error(tr(erreur));
      if (urls.length) { setForm(f => ({ ...f, images: [...f.images, ...urls] })); toast.success(tr("{0} image{1} ajoutée{2}", urls.length, urls.length > 1 ? "s" : "", urls.length > 1 ? "s" : "")); }
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
    setForm(f => ({ ...f, images: [...f.images, u] }));
    setImageInput("");
  }

  async function uploadMedia(file: File, type: "image" | "video") {
    const fd = new FormData();
    fd.append("file", file);
    setUploadingMedia(true);
    try {
      const res = await televerser(fd);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur upload");
      if (type === "image") set("images", [...form.images, data.url]);
      else set("videos", [...form.videos, data.url]);
      toast.success(tr("{0} uploadée", type === "image" ? "Image" : "Vidéo"));
    } catch (err: any) {
      toast.error(tr(err.message));
    } finally {
      setUploadingMedia(false);
    }
  }

  async function uploadFichierDigital(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    setUploadingFichier(true);
    try {
      const res = await televerser(fd);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur upload");
      set("fichierUrl", data.url);
      set("fichierNom", file.name);
      set("fichierTaille", file.size);
      toast.success(tr("Fichier digital uploadé !"));
    } catch (err: any) {
      toast.error(tr(err.message));
    } finally {
      setUploadingFichier(false);
    }
  }

  // ─── IA : génération description ────────────────────────────────
  async function genererDescription() {
    if (!form.nom) { toast.error(tr("Entrez d'abord le nom du produit")); return; }
    setGenIA(true);
    try {
      const res = await fetch("/api/ai/description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: form.nom, categorie: form.categorie }),
      });
      const data = await res.json();
      if (data.description) set("description", data.description);
    } catch { toast.error(tr("La description n'a pas pu être générée. Réessayez ou écrivez-la vous-même.")); }
    finally { setGenIA(false); }
  }

  // ─── IA : génération image Pollinations ─────────────────────────
  async function genererImageIA() {
    if (!form.nom) { toast.error(tr("Entrez d'abord le nom du produit")); return; }
    setGenImage(true);
    try {
      const prompt = `${form.nom}, ${form.categorie || "produit"}, professional product photo, clean white background, studio lighting, 4K, sharp`;
      const encoded = encodeURIComponent(prompt);
      const seed = Math.floor(Math.random() * 999999);
      const url = `https://image.pollinations.ai/prompt/${encoded}?width=800&height=800&nologo=true&model=flux&enhance=true&seed=${seed}`;
      set("images", [...form.images, url]);
      toast.success(tr("Image IA générée !"));
    } catch { toast.error(tr("L'image n'a pas pu être générée. Réessayez ou importez une photo.")); }
    finally { setGenImage(false); }
  }

  // ─── Sauvegarde ─────────────────────────────────────────────────
  async function sauvegarder() {
    if (!form.nom || !form.prix) { toast.error(tr("Indiquez le nom et le prix de vente du produit avant de le créer.")); return; }
    if (form.type === "digital" && !form.fichierUrl) {
      toast.error(tr("Uploadez le fichier digital avant de créer le produit"));
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        nom: form.nom,
        slug: form.slug || slugify(form.nom),
        description: form.description || undefined,
        prix: parseFloat(form.prix),
        prixCompare: form.prixCompare ? parseFloat(form.prixCompare) : undefined,
        stock: form.type === "digital" ? 99999 : parseInt(form.stock) || 0,
        sku: form.sku || undefined,
        codeBarres: form.codeBarres || undefined,
        categorie: form.categorie || undefined,
        tags: form.tags,
        images: form.images,
        videos: form.videos,
        actif: form.actif,
        featured: form.featured,
        type: form.type,
        metaTitle: form.metaTitle || undefined,
        metaDesc: form.metaDesc || undefined,
      };

      if (form.type === "physique") {
        payload.poids = form.poids ? parseFloat(form.poids) : undefined;
        payload.cout = form.cout ? parseFloat(form.cout) : undefined;
      }
      if (form.type === "digital") {
        payload.fichierUrl = form.fichierUrl;
        payload.fichierNom = form.fichierNom;
        payload.fichierTaille = form.fichierTaille || undefined;
        payload.instructionsTelechargement = form.instructionsTelechargement || undefined;
      }
      if (form.type === "dropshipping") {
        payload.prixFournisseur = form.prixFournisseur ? parseFloat(form.prixFournisseur) : undefined;
        payload.urlFournisseur = form.urlFournisseur || undefined;
        payload.nomFournisseur = form.nomFournisseur || undefined;
      }
      if (variantes.length > 0) {
        payload.variantes = variantes.map(v => ({
          nom: v.nom, valeur: v.valeur, sku: v.sku || undefined,
          prix: v.prix ? parseFloat(v.prix) : undefined,
          stock: parseInt(v.stock) || 0,
          image: v.image || undefined,
        }));
      }

      const res = await fetch("/api/produits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        // Zod renvoie les champs fautifs : on nomme le premier
        const champ = data.erreurs?.[0];
        throw new Error(champ ? `${data.message} : ${champ.path?.join(".")} — ${champ.message}` : (data.message || data.error || "Erreur"));
      }
      toast.success(tr("Produit créé !"));
      router.push(`/dashboard/produits/${data.produit.id}`);
    } catch (err: any) {
      toast.error(tr(err.message));
    } finally {
      setSaving(false);
    }
  }

  const inputClass = CHAMP;
  // Barre « Modifications non enregistrées » dès qu'un champ est rempli (rien n'est encore créé).
  const modifie = JSON.stringify(form) !== JSON.stringify(FORM_VIDE) || variantes.length > 0;

  return (
    <div className="mx-auto w-full max-w-[1000px] space-y-4">
      <ContextualSaveBar dirty={modifie} saving={saving} onSave={sauvegarder} message={tr("Produit non enregistré")}
        onDiscard={() => { setForm(FORM_VIDE); setVariantes([]); }} />
      <PageHeader
        icon="tag"
        backHref="/dashboard/produits"
        title={tr("Ajouter un produit")}
        titleMeta={form.actif ? <Badge tone="success">{tr("Sera en ligne")}</Badge> : <Badge tone="info">{tr("Brouillon")}</Badge>}
        primaryAction={{ content: tr("Créer le produit"), loading: saving, onAction: sauvegarder }}
      />
      <p className="m-0 text-(--color-text-secondary)">{tr("Commencez par l'essentiel : type, nom, prix, photos et stock. Les autres réglages sont facultatifs.")}</p>

      {/* ─── Sélecteur de type ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {TYPES_PRODUIT.map((t) => {
          const Icone = t.icon;
          const actif = form.type === t.id;
          const estDigital = t.id === "digital";
          return (
            <button
              key={t.id}
              onClick={() => estDigital ? router.push("/dashboard/produits/digital/nouveau") : set("type", t.id)}
              aria-pressed={estDigital ? undefined : actif}
              className={`flex items-start gap-3 rounded-(--radius-xl) bg-(--color-surface) p-4 text-left transition-shadow ${actif ? "shadow-[0_0_0_2px_var(--color-border-strong)]" : "shadow-(--shadow-card) hover:bg-(--color-surface-secondary)"}`}
            >
              <div className="grid size-10 shrink-0 place-items-center rounded-(--radius-md) bg-(--color-surface-tertiary)">
                <Icone size={18} className="text-(--color-icon-header)" />
              </div>
              <div>
                <p className="font-semibold text-(--color-text-strong) text-sm">{tr(t.label)}</p>
                <p className="text-xs text-(--color-text-secondary) mt-0.5">{tr(t.desc)}</p>
              </div>
              {estDigital ? (
                <ExternalLink size={13} className="ml-auto text-(--color-text-subdued) flex-shrink-0 mt-0.5" />
              ) : actif && (
                <span aria-hidden className="ml-auto grid size-5 shrink-0 place-items-center rounded-full bg-(--color-primary) text-[10px] font-bold text-white">✓</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] xl:grid-cols-[minmax(0,1fr)_400px] gap-6">
        {/* Colonne principale */}
        <div className="min-w-0 space-y-5">

          {/* Infos générales */}
          <div className={`${CARTE} space-y-4`}>
            <div className="flex items-center gap-2 mb-1">
              <Package size={15} className="text-(--color-icon-header)" />
              <h2 className="text-[13px] font-semibold text-(--color-text-strong)">{tr("Informations générales")}</h2>
            </div>
            <div>
              <label htmlFor="produit-nom" className="ax-label block mb-1.5">{tr("Nom du produit *")}</label>
              <input id="produit-nom" required value={form.nom} onChange={e => set("nom", e.target.value)} placeholder={tr("Ex: Robe Wax Premium")} maxLength={120} className={inputClass} />
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
                <div className="flex gap-2">
                  <button onClick={genererDescription} disabled={genIA}
                    className="flex items-center gap-1 text-(--color-icon-header) text-xs hover:underline transition-colors disabled:opacity-50">
                    {genIA ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}{" "}{tr("Générer avec l'IA")}
                  </button>
                </div>
              </div>
              <textarea value={form.description} onChange={e => set("description", e.target.value)}
                rows={5} placeholder={tr("Décrivez votre produit...")} className={`${inputClass} resize-none`} />
            </div>
          </div>

          {/* Prix & Stock */}
          <div className={`${CARTE} space-y-4`}>
            <div className="flex items-center gap-2 mb-1">
              <BarChart2 size={15} className="text-(--color-icon-header)" />
              <h2 className="text-[13px] font-semibold text-(--color-text-strong)">{tr("Prix & Stock")}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="produit-prix" className="ax-label block mb-1.5">{tr("Prix de vente *")}</label>
                <input id="produit-prix" required type="number" inputMode="decimal" value={form.prix} onChange={e => set("prix", e.target.value)} placeholder="0" min="0" className={inputClass} />
                <div className="mt-2"><PolitiquePrix prix={form.prix} type={form.type} /></div>
              </div>
              <div>
                <label className="ax-label block mb-1.5">{tr("Prix barré (promo)")}</label>
                <input type="number" value={form.prixCompare} onChange={e => set("prixCompare", e.target.value)} placeholder="0" min="0" className={inputClass} />
              </div>
              {form.type !== "digital" && (
                <>
                  <div>
                    <label className="ax-label block mb-1.5">{tr("Stock initial")}</label>
                    <input type="number" value={form.stock} onChange={e => set("stock", e.target.value)} min="0" className={inputClass} />
                  </div>
                  <div>
                    <label className="ax-label block mb-1.5">{tr("SKU / Référence")}</label>
                    <input value={form.sku} onChange={e => set("sku", e.target.value)} placeholder={tr("SKU-001")} className={inputClass} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="ax-label block mb-1.5">{tr("Code-barres (EAN/UPC)")}</label>
                    <div className="flex items-center gap-2">
                      <input value={form.codeBarres} onChange={e => set("codeBarres", e.target.value)} placeholder="ex: 6001234567890" className={`${inputClass} flex-1 min-w-0`} />
                      <button
                        type="button"
                        onClick={() => setScanBarcodeOuvert(true)}
                        title={tr("Scanner le code-barres avec la caméra")}
                        className="flex items-center gap-1.5 px-3 min-h-8 rounded-(--radius-md) font-[550] text-[13px] text-white shrink-0 bg-(--color-primary) shadow-(--shadow-button-primary) hover:bg-(--color-primary-hover)"
                      >
                        <ScanLine size={14} />{" "}{tr("Scanner")}
                      </button>
                    </div>
                  </div>
                </>
              )}
              {form.type === "physique" && (
                <div>
                  <label className="ax-label block mb-1.5">{tr("Prix d'achat (coût)")}</label>
                  <input type="number" value={form.cout} onChange={e => set("cout", e.target.value)} placeholder="0" min="0" className={inputClass} />
                  <p className="text-[11px] text-(--color-text-secondary) mt-1">{tr("Pour calculer la vraie rentabilité dans le module Point de vente")}</p>
                </div>
              )}
            </div>
            {form.type === "digital" && (
              <div className="bg-(--color-magic-bg) border border-(--color-magic-border) rounded-xl px-4 py-2.5 text-(--color-magic-text) text-xs flex items-center gap-2">
                <Info size={12} />{" "}{tr("Stock automatiquement illimité pour les produits digitaux")}
              </div>
            )}
            {form.type === "dropshipping" && marge !== null && (
              <div className={`rounded-xl px-4 py-2.5 text-xs flex items-center gap-2 ${marge >= 30 ? "bg-(--banner-success-bg) border border-(--badge-success-bg) text-(--badge-success-text)" : marge >= 10 ? "bg-(--banner-warning-bg) border border-(--badge-warning-bg) text-(--badge-warning-text)" : "bg-(--banner-critical-bg) border border-(--badge-critical-bg) text-(--color-critical-text)"}`}>
                <BarChart2 size={12} />{" "}{tr("Marge :")}{" "}{tr(marge)}% {marge >= 30 ? tr("✓ Bonne marge") : marge >= 10 ? tr("⚠ Marge faible") : tr("✗ Marge insuffisante")}
              </div>
            )}
            {form.type === "physique" && margeCout !== null && (
              <div className={`rounded-xl px-4 py-2.5 text-xs flex items-center gap-2 ${margeCout >= 30 ? "bg-(--banner-success-bg) border border-(--badge-success-bg) text-(--badge-success-text)" : margeCout >= 10 ? "bg-(--banner-warning-bg) border border-(--badge-warning-bg) text-(--badge-warning-text)" : "bg-(--banner-critical-bg) border border-(--badge-critical-bg) text-(--color-critical-text)"}`}>
                <BarChart2 size={12} />{" "}{tr("Marge brute :")}{" "}{tr(margeCout)}% {margeCout >= 30 ? tr("✓ Bonne marge") : margeCout >= 10 ? tr("⚠ Marge faible") : tr("✗ Marge insuffisante")}
              </div>
            )}
          </div>

          {/* ─── Section DROPSHIPPING ─── */}
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

          {/* ─── Section DIGITAL ─── */}
          {form.type === "digital" && (
            <div className="bg-white border border-(--color-magic-border) rounded-(--radius-lg) p-6 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <FileText size={15} className="text-(--color-magic-text)" />
                <h2 className="text-[13px] font-semibold text-(--color-text-strong)">{tr("Fichier digital *")}</h2>
              </div>

              {!form.fichierUrl ? (
                <div
                  className="border-2 border-dashed border-(--color-magic-border) rounded-xl p-8 text-center cursor-pointer hover:border-(--color-magic-text) hover:bg-(--color-magic-bg) transition-all"
                  onClick={() => digitalFileRef.current?.click()}
                >
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
                    <p className="text-sm font-semibold text-(--color-text-strong) truncate">{tr(form.fichierNom)}</p>
                    <p className="text-xs text-(--color-text-secondary)">{formatTaille(form.fichierTaille)}{" "}{tr("· Prêt à l'envoi")}</p>
                  </div>
                  <button onClick={() => { set("fichierUrl", ""); set("fichierNom", ""); set("fichierTaille", 0); }}
                    className="text-(--color-critical) hover:text-(--color-critical-text) transition-colors"><X size={16} /></button>
                </div>
              )}

              <div>
                <label className="ax-label block mb-1.5">{tr("Instructions de téléchargement (optionnel)")}</label>
                <textarea value={form.instructionsTelechargement} onChange={e => set("instructionsTelechargement", e.target.value)}
                  rows={3} placeholder={tr("Ex: Ouvrez le PDF avec Adobe Reader. Mot de passe: AXSO2024")}
                  className={`${inputClass} resize-none`} />
              </div>
            </div>
          )}

          {/* Médias : Images + Vidéos */}
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
                  className="px-3 py-2 bg-(--color-surface-tertiary) border border-(--color-border) text-(--color-icon-header) rounded-xl text-sm hover:bg-(--color-tint-hover) transition-all">
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
                  {uploadingMedia ? <Loader2 size={10} className="animate-spin" /> : <Video size={10} />}{" "}{tr("Upload vidéo MP4")}
                </button>
                <input ref={videoInputRef} type="file" className="hidden" accept="video/mp4,video/webm"
                  onChange={e => e.target.files?.[0] && uploadMedia(e.target.files[0], "video")} />
              </div>
              {form.videos.length > 0 ? (
                <div className="space-y-2">
                  {form.videos.map((v, i) => (
                    <div key={i} className="flex items-center gap-3 bg-(--color-surface-secondary) border border-(--color-border) rounded-xl p-3">
                      <Video size={14} className="text-(--color-text-secondary) flex-shrink-0" />
                      <p className="text-xs text-(--color-text) flex-1 truncate">{tr(v)}</p>
                      <button onClick={() => set("videos", form.videos.filter((_, j) => j !== i))}
                        className="text-(--color-critical) hover:text-(--color-critical-text)"><X size={13} /></button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-(--color-text-secondary) text-center py-3">{tr("Aucune vidéo — max 100 Mo par vidéo")}</p>
              )}
            </div>
          </div>

          {/* SEO */}
          <details className={`${CARTE}`}>
            <summary className="flex items-center gap-2 min-h-10 cursor-pointer select-none">
              <Globe size={15} className="text-primaire" aria-hidden />
              <h2 className="text-[13px] font-semibold text-encre">{tr("Référencement Google et partage")}</h2>
              <span className="ax-aide">{tr("facultatif")}</span>
            </summary>
            <div className="space-y-4 mt-4">
            <div>
              <label className="ax-label block mb-1.5">{tr("Titre affiché sur Google")}</label>
              <input value={form.metaTitle} maxLength={60} onChange={e => set("metaTitle", e.target.value)} placeholder={tr("Titre pour Google")} className={inputClass} />
            </div>
            <div>
              <label className="ax-label block mb-1.5">{tr("Description affichée sur Google")}</label>
              <textarea value={form.metaDesc} maxLength={155} onChange={e => set("metaDesc", e.target.value)} rows={2} placeholder={tr("Description Google...")} className={`${inputClass} resize-none`} />
            </div>
          </div>
          </details>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-5">
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
                placeholder={tr("Ajouter un tag...")} className="flex-1 min-w-0 bg-(--color-surface-secondary) border border-(--color-border) rounded-xl px-3 py-2 text-(--color-text-strong) text-xs focus:outline-none focus:border-(--color-border-strong)" />
              <button onClick={() => { const t = tagInput.trim().toLowerCase(); if (t && !form.tags.includes(t)) set("tags", [...form.tags, t]); setTagInput(""); }}
                className="flex-shrink-0 px-3 py-2 bg-(--color-surface-secondary) border border-(--color-border) rounded-xl text-(--color-text-secondary) hover:text-(--color-text-strong) text-xs">+</button>
            </div>
            {form.tags.length > 0 && (
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
          {form.type !== "digital" && (
            <div className={`${CARTE} space-y-4`}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[13px] font-semibold text-(--color-text-strong)">{tr("Variantes (taille, couleur, matière…)")}</h2>
                <span className="flex-shrink-0 whitespace-nowrap text-[11px] bg-(--color-surface-tertiary) text-(--color-icon-header) px-2 py-0.5 rounded-full">{variantes.length} variante(s)</span>
              </div>

              {/* Form ajout variante */}
              <div className="bg-(--color-surface-secondary) rounded-xl p-3 space-y-2">
                <datalist id="valeurs-option">{optionsVariantes(categoriesBoutique, form.categorie).valeurs(varianteForm.nom).map(v => <option key={v} value={v} />)}</datalist>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={varianteForm.nom}
                    onChange={e => setVarianteForm(v => ({ ...v, nom: e.target.value }))}
                    className="w-full min-w-0 border border-(--color-border) rounded-xl px-3 py-2 text-[12px] outline-none bg-white"
                  >
                    {optionsVariantes(categoriesBoutique, form.categorie).noms.map(n => <option key={n}>{n}</option>)}
                  </select>
                  <input
                    className="w-full min-w-0 border border-(--color-border) rounded-xl px-3 py-2 text-[12px] outline-none bg-white"
                    placeholder={tr("Valeur (ex: XL, Rouge)")}
                    list="valeurs-option"
                    value={varianteForm.valeur}
                    onChange={e => setVarianteForm(v => ({ ...v, valeur: e.target.value }))}
                  />
                  <input
                    className="w-full min-w-0 border border-(--color-border) rounded-xl px-3 py-2 text-[12px] outline-none bg-white"
                    placeholder={tr("SKU (optionnel)")}
                    value={varianteForm.sku}
                    onChange={e => setVarianteForm(v => ({ ...v, sku: e.target.value }))}
                  />
                  <input
                    className="w-full min-w-0 border border-(--color-border) rounded-xl px-3 py-2 text-[12px] outline-none bg-white"
                    placeholder={tr("Prix (défaut: {0})", form.prix || "0")}
                    type="number"
                    value={varianteForm.prix}
                    onChange={e => setVarianteForm(v => ({ ...v, prix: e.target.value }))}
                  />
                  <input
                    className="w-full min-w-0 border border-(--color-border) rounded-xl px-3 py-2 text-[12px] outline-none bg-white"
                    placeholder={tr("Stock")}
                    type="number"
                    value={varianteForm.stock}
                    onChange={e => setVarianteForm(v => ({ ...v, stock: e.target.value }))}
                  />
                </div>
                <button
                  onClick={() => {
                    if (!varianteForm.valeur) return;
                    setVariantes(vs => [...vs, { ...varianteForm }]);
                    setVarianteForm(v => ({ ...v, valeur: "", sku: "", prix: "", stock: "0", image: "" }));
                  }}
                  className="w-full py-2 rounded-xl border-2 border-dashed border-(--color-border-strong) text-[12px] text-(--color-icon-header) font-semibold hover:bg-(--color-surface-secondary) transition-all"
                >
                  {tr("+ Ajouter cette variante")}
                </button>
              </div>

              {/* Liste variantes ajoutées */}
              {variantes.length > 0 && (
                <div className="space-y-1.5">
                  {variantes.map((v, idx) => (
                    <div key={idx} className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-(--color-surface-secondary) rounded-xl px-3 py-2">
                      <span className="text-[11px] bg-(--color-surface-tertiary) text-(--color-icon-header) px-2 py-0.5 rounded-full font-medium">{tr(v.nom)}</span>
                      <span className="text-[12px] font-semibold text-(--color-text-strong) flex-1 min-w-0 break-words">{tr(v.valeur)}</span>
                      {v.sku && <span className="text-[10px] text-(--color-text-subdued) font-mono">{tr(v.sku)}</span>}
                      <span className="text-[12px] text-(--color-icon-header) font-bold">{v.prix || form.prix} XAF</span>
                      <span className="text-[11px] text-(--color-text-secondary)">{tr("S:")}{v.stock}</span>
                      <button onClick={() => setVariantes(vs => vs.filter((_, i) => i !== idx))} className="text-(--color-critical) hover:text-(--color-critical-text) ml-1">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Options */}
          <div className={`${CARTE} space-y-3`}>
            <h2 className="text-[13px] font-semibold text-(--color-text-strong) mb-1">{tr("Options")}</h2>
            {[
              { label: "Produit actif", desc: "Visible sur la boutique", key: "actif" },
              { label: "Mis en avant", desc: "Affiché en page d'accueil", key: "featured" },
            ].map(opt => (
              <div key={opt.key} className="flex items-center justify-between">
                <div>
                  <p className="text-(--color-text-strong) text-sm">{tr(opt.label)}</p>
                  <p className="text-(--color-text-secondary) text-xs">{tr(opt.desc)}</p>
                </div>
                <Toggle checked={!!(form as any)[opt.key]} onChange={(v) => set(opt.key, v)} label={tr(opt.label)} />
              </div>
            ))}
            {form.type === "physique" && (
              <div className="pt-2">
                <label className="ax-label block mb-1.5">{tr("Poids (kg)")}</label>
                <input type="number" value={form.poids} onChange={e => set("poids", e.target.value)} placeholder="0.5" min="0" step="0.01"
                  className="w-full bg-(--color-surface-secondary) border border-(--color-border) rounded-xl px-4 py-2.5 text-(--color-text-strong) text-sm focus:outline-none focus:border-(--color-border-strong)" />
              </div>
            )}
          </div>

          {/* Aperçu */}
          {(form.nom || form.images[0]) && (
            <div className="bg-white border border-(--color-border-secondary) rounded-(--radius-lg) overflow-hidden">
              <p className="text-(--color-text-secondary) text-xs px-4 pt-3 pb-2">{tr("Aperçu boutique")}</p>
              <div className="aspect-square bg-(--color-surface-secondary) overflow-hidden">
                {form.images[0] ? <img src={form.images[0]} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package size={40} className="text-(--color-text-subdued)" /></div>}
              </div>
              <div className="p-4">
                <p className="font-medium text-(--color-text-strong) text-sm line-clamp-2">{tr(form.nom) || tr("Nom du produit")}</p>
                {form.prix && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-(--color-text-strong) font-bold text-sm">{fmt(Number(form.prix) || 0)}</span>
                    {form.prixCompare && <span className="text-(--color-text-secondary) text-xs line-through">{tr(form.prixCompare)}</span>}
                  </div>
                )}
                <span className="mt-2 inline-block rounded-(--radius-md) bg-(--color-surface-tertiary) px-2 py-0.5 text-[11px] font-[550] text-(--color-text)">
                  {form.type === "digital" ? <><FileText size={11} className="inline-block mr-1" />{tr("Digital")}</> : form.type === "dropshipping" ? <><Truck size={11} className="inline-block mr-1" />{tr("Dropshipping")}</> : <><Package size={11} className="inline-block mr-1" />{tr("Physique")}</>}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <BarcodeCaptureModal
        open={scanBarcodeOuvert}
        onClose={() => setScanBarcodeOuvert(false)}
        onDetect={code => { set("codeBarres", code); toast.success(tr("Code-barres scanné !")); }}
      />
    </div>
  );
}
