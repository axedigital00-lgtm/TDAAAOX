"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { FolderOpen, Upload, Copy, Check, Trash2, Film, FileText } from "lucide-react";
import { toast } from "sonner";
import { televerser } from "@/lib/televerser";
import { TYPES_FICHIERS } from "@/lib/types-fichiers";
import { useT } from "@/components/I18nProvider";
import { Alerte, Bouton, BoutonIcone, Confirmation, EnTetePage, EtatChargement, EtatVide, Saisie } from "@/components/ui";

// externe : image d'un produit hébergée ailleurs (IA, lien collé) — affichée, jamais supprimée d'ici.
interface Fichier { url: string; nom: string; type: "image" | "video" | "document"; taille: number | null; date: string; externe?: boolean; produitId?: string }
type Filtre = "tous" | "image" | "video" | "document";
const ACCEPTES = [...TYPES_FICHIERS.image, ...TYPES_FICHIERS.video, ...TYPES_FICHIERS.document];
const categorieDe = (type: string) => (TYPES_FICHIERS.image.includes(type) ? "image" : TYPES_FICHIERS.video.includes(type) ? "video" : "document");

const taille = (o: number) => (o < 1024 * 1024 ? `${Math.max(1, Math.round(o / 1024))} Ko` : `${(o / 1024 / 1024).toFixed(1)} Mo`);
// Nom affiché sans le suffixe aléatoire ajouté par le stockage (photo-AbC123xyz.jpg → photo.jpg).
const nomLisible = (nom: string) => nom.replace(/-[A-Za-z0-9]{20,}(\.[^.]+)$/, "$1");

// Contenu → Fichiers, comme Shopify : images, vidéos et documents de la boutique, à
// importer, retrouver, copier (lien) ou supprimer. Les mêmes fichiers sont
// proposés par « Choisir dans la bibliothèque » du Constructeur.
export default function FichiersPage() {
  const t = useT();
  const [fichiers, setFichiers] = useState<Fichier[]>([]);
  const [suite, setSuite] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);
  const [indisponible, setIndisponible] = useState(false);
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [recherche, setRecherche] = useState("");
  const [envoi, setEnvoi] = useState<{ fait: number; total: number } | null>(null);
  const [survolDepot, setSurvolDepot] = useState(false);
  const champ = useRef<HTMLInputElement>(null);

  const charger = useCallback(async (curseur?: string) => {
    setChargement(true);
    const params = new URLSearchParams();
    if (filtre !== "tous") params.set("type", filtre);
    if (curseur) params.set("cursor", curseur);
    const r = await fetch(`/api/fichiers?${params}`).catch(() => null);
    const d = r ? await r.json().catch(() => null) : null;
    setIndisponible(r?.status === 503);
    if (r?.ok && d) {
      setFichiers((f) => (curseur ? [...f, ...d.fichiers] : d.fichiers));
      setSuite(d.cursor);
    }
    setChargement(false);
  }, [filtre]);
  useEffect(() => { charger(); }, [charger]);

  const importer = async (liste: FileList | File[]) => {
    const choisis = [...liste].filter((f) => ACCEPTES.includes(f.type));
    if (choisis.length < [...liste].length) toast.error(t("Certains fichiers ont un format non accepté (images, vidéos, PDF, tableurs, textes, audio, ZIP)."));
    if (!choisis.length) return;
    setEnvoi({ fait: 0, total: choisis.length });
    let erreurs = 0;
    for (const [i, f] of choisis.entries()) {
      const fd = new FormData();
      fd.append("file", f);
      const r = await televerser(fd, categorieDe(f.type));
      if (!r.ok) { erreurs++; toast.error(`${f.name} : ${(await r.json().catch(() => ({}))).error ?? t("envoi impossible")}`); }
      setEnvoi({ fait: i + 1, total: choisis.length });
    }
    setEnvoi(null);
    if (erreurs < choisis.length) toast.success(t("Fichiers importés"));
    if (champ.current) champ.current.value = "";
    charger();
  };

  const visibles = fichiers.filter((f) => !recherche.trim() || nomLisible(f.nom).toLowerCase().includes(recherche.trim().toLowerCase()));

  return (
    <div
      className="space-y-6 max-w-6xl"
      onDragOver={(e) => { e.preventDefault(); setSurvolDepot(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setSurvolDepot(false); }}
      onDrop={(e) => { e.preventDefault(); setSurvolDepot(false); importer(e.dataTransfer.files); }}
    >
      <input ref={champ} type="file" multiple accept={ACCEPTES.join(",")} className="hidden" onChange={(e) => e.target.files && importer(e.target.files)} />
      <EnTetePage
        className="mb-0"
        titre={t("Fichiers")}
        description={t("Les images, vidéos et documents de votre boutique, réutilisables partout (constructeur, pages, liens…).")}
        actions={
          <Bouton onClick={() => champ.current?.click()} disabled={indisponible} charge={!!envoi}
            texteCharge={envoi ? `${t("Import…")} ${envoi.fait}/${envoi.total}` : undefined} icone={<Upload className="size-4" aria-hidden />}>
            {t("Importer des fichiers")}
          </Bouton>
        }
      />

      {indisponible ? (
        <Alerte ton="attention" titre={t("Le stockage des fichiers n'est pas configuré sur ce serveur : la bibliothèque est indisponible.")} />
      ) : (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex rounded-lg border border-gray-200 bg-white p-0.5">
              {([["tous", "Tous"], ["image", "Images"], ["video", "Vidéos"], ["document", "Documents"]] as [Filtre, string][]).map(([v, l]) => (
                <button key={v} onClick={() => setFiltre(v)} aria-pressed={filtre === v}
                  className={`px-3.5 py-1.5 rounded-md text-[13.5px] font-medium transition-colors ${filtre === v ? "bg-[#FFF1D6] text-[#C77C0A]" : "text-gray-500 hover:text-gray-800"}`}>
                  {t(l)}
                </button>
              ))}
            </div>
            <Saisie type="search" label={t("Rechercher un fichier")} labelMasque className="flex-1 min-w-[200px] space-y-0"
              value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder={t("Rechercher un fichier")} />
          </div>

          <div className={`rounded-2xl border-2 border-dashed p-4 transition-colors ${survolDepot ? "border-[#F5A623] bg-[#FFF7EA]" : "border-transparent"}`}>
            {chargement && !fichiers.length ? (
              <EtatChargement />
            ) : !visibles.length ? (
              <EtatVide icone={<FolderOpen />}
                titre={recherche ? t("Aucun fichier ne correspond.") : t("Aucun fichier pour l'instant — importez-en ou glissez-les ici.")}>
                <Bouton variante="secondaire" onClick={() => champ.current?.click()} disabled={!!envoi} icone={<Upload className="size-4" aria-hidden />}>
                  {t("Importer des fichiers")}
                </Bouton>
              </EtatVide>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {visibles.map((f) => <Carte key={f.url} fichier={f} onSupprime={() => setFichiers((l) => l.filter((x) => x.url !== f.url))} />)}
              </div>
            )}
          </div>
          {suite && (
            <div className="flex justify-center">
              <Bouton variante="secondaire" onClick={() => charger(suite)} charge={chargement} texteCharge={t("Chargement…")}>{t("Afficher plus")}</Bouton>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Carte({ fichier: f, onSupprime }: { fichier: Fichier; onSupprime: () => void }) {
  const t = useT();
  const [copie, setCopie] = useState(false);
  const [confirmer, setConfirmer] = useState(false);

  const copier = () => { navigator.clipboard.writeText(f.url); setCopie(true); setTimeout(() => setCopie(false), 1500); };
  // Lève en cas d'échec : la fenêtre de confirmation reste ouverte.
  const supprimer = async () => {
    const r = await fetch("/api/fichiers", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: f.url }) }).catch(() => null);
    if (!r?.ok) { toast.error(t("Suppression impossible")); throw new Error("suppression"); }
    onSupprime(); toast.success(t("Fichier supprimé"));
  };

  return (
    <div className="group rounded-xl border border-gray-200 bg-white overflow-hidden">
      <a href={f.url} target="_blank" rel="noopener noreferrer" className="block aspect-square bg-gray-50 relative">
        {f.type === "document"
          ? <span className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-gray-400"><FileText size={30} /><span className="text-[12px] font-semibold uppercase">{f.nom.split(".").pop()}</span></span>
          : f.type === "video"
          ? <><video src={f.url} muted preload="metadata" className="w-full h-full object-cover" /><Film size={16} className="absolute top-2 left-2 text-white drop-shadow" /></>
          : <img src={f.url} alt={nomLisible(f.nom)} loading="lazy" className="w-full h-full object-cover" />}
      </a>
      <div className="p-2.5">
        <p className="text-[13px] font-medium text-gray-800 truncate" title={nomLisible(f.nom)}>{nomLisible(f.nom)}</p>
        <p className="text-[12px] text-gray-400">{f.externe ? t("Lien externe · image produit") : `${taille(f.taille ?? 0)} · ${new Date(f.date).toLocaleDateString()}`}</p>
        <div className="mt-2 flex gap-1.5">
          <Bouton variante="secondaire" taille="compact" className="flex-1 min-w-0" onClick={copier}
            icone={copie ? <Check className="size-3.5 text-succes" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}>
            {copie ? t("Copié") : t("Copier le lien")}
          </Bouton>
          {!f.externe && (
            <BoutonIcone variante="danger" label={t("Supprimer")} onClick={() => setConfirmer(true)} className="sm:size-8 sm:min-h-8">
              <Trash2 className="size-3.5" aria-hidden />
            </BoutonIcone>
          )}
        </div>
        {!f.externe && (
          <Confirmation ouverte={confirmer} onFermer={() => setConfirmer(false)} onConfirmer={supprimer}
            titre={t("Supprimer ce fichier ?")} objet={nomLisible(f.nom)}
            description={t("Il disparaîtra aussi des pages qui l'utilisent.")} libelleConfirmer={t("Supprimer le fichier")} />
        )}
      </div>
    </div>
  );
}
