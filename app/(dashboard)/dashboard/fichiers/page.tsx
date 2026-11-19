"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Film, FileText } from "lucide-react";
import { toast } from "sonner";
import { televerser } from "@/lib/televerser";
import { TYPES_FICHIERS } from "@/lib/types-fichiers";
import { useT } from "@/components/I18nProvider";
import { Banner, Button, EmptyState, IndexTable, Modal, PageHeader, Tabs, TextField, Thumbnail, type Column } from "@/components/ui/adm";
import { IllustrationFichiers } from "@/components/ui/illustrations";

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
  const [aSupprimer, setASupprimer] = useState<Fichier | null>(null);
  const [suppression, setSuppression] = useState(false);
  const [copie, setCopie] = useState<string | null>(null);
  const copier = (url: string) => { navigator.clipboard.writeText(url); setCopie(url); setTimeout(() => setCopie(null), 1500); };
  const supprimer = async () => {
    if (!aSupprimer) return;
    setSuppression(true);
    const r = await fetch("/api/fichiers", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: aSupprimer.url }) }).catch(() => null);
    setSuppression(false);
    if (!r?.ok) { toast.error(t("Suppression impossible")); return; }
    const url = aSupprimer.url;
    setFichiers((l) => l.filter((x) => x.url !== url));
    setASupprimer(null);
    toast.success(t("Fichier supprimé"));
  };
  const importerAction = { content: envoi ? `${t("Import…")} ${envoi.fait}/${envoi.total}` : t("Importer des fichiers"), icon: "import" as const, onAction: () => champ.current?.click(), disabled: indisponible, loading: !!envoi };

  const colonnes: Column<Fichier>[] = [
    { id: "nom", header: t("Fichier"), mobilePrimary: true, cell: (f) => (
      <a href={f.url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-3 text-inherit no-underline">
        <Apercu fichier={f} />
        <span className="truncate" title={nomLisible(f.nom)}>{nomLisible(f.nom)}</span>
      </a>
    ) },
    { id: "type", header: t("Type"), hideOnMobile: true, cell: (f) => f.externe ? t("Lien externe · image produit") : (f.nom.split(".").pop() ?? "").toUpperCase() },
    { id: "taille", header: t("Taille"), numeric: true, align: "end", cell: (f) => f.externe ? "—" : taille(f.taille ?? 0) },
    { id: "date", header: t("Date"), hideOnMobile: true, cell: (f) => f.externe ? "—" : new Date(f.date).toLocaleDateString() },
    { id: "actions", header: "", align: "end", cell: (f) => (
      <span className="inline-flex gap-1.5">
        <Button size="sm" icon={copie === f.url ? "checkCircle" : "link"} onClick={() => copier(f.url)}>{copie === f.url ? t("Copié") : t("Copier le lien")}</Button>
        {!f.externe && <Button size="sm" variant="critical" onClick={() => setASupprimer(f)}>{t("Supprimer")}</Button>}
      </span>
    ) },
  ];

  return (
    <div
      className="space-y-4"
      onDragOver={(e) => { e.preventDefault(); setSurvolDepot(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setSurvolDepot(false); }}
      onDrop={(e) => { e.preventDefault(); setSurvolDepot(false); importer(e.dataTransfer.files); }}
    >
      <input ref={champ} type="file" multiple accept={ACCEPTES.join(",")} className="hidden" onChange={(e) => e.target.files && importer(e.target.files)} />
      <PageHeader icon="folder" title={t("Fichiers")} primaryAction={importerAction} />

      {indisponible ? (
        <Banner tone="warning" title={t("Le stockage des fichiers n'est pas configuré sur ce serveur : la bibliothèque est indisponible.")} />
      ) : !chargement && !fichiers.length && filtre === "tous" ? (
        <EmptyState title={t("Aucun fichier pour l'instant — importez-en ou glissez-les ici.")} image={<IllustrationFichiers />}
          actions={<Button variant="primary" icon="import" onClick={() => champ.current?.click()} disabled={!!envoi}>{t("Importer des fichiers")}</Button>}>
          {t("Les images, vidéos et documents de votre boutique, réutilisables partout (constructeur, pages, liens…).")}
        </EmptyState>
      ) : (
        <div className={`overflow-hidden rounded-(--radius-xl) bg-(--color-surface) shadow-(--shadow-card) outline-2 outline-dashed transition-[outline-color] ${survolDepot ? "outline-(--color-focus-ring)" : "outline-transparent"}`}>
          <div className="flex flex-wrap items-end gap-3 border-b border-(--color-border-secondary) px-3">
            <Tabs label={t("Type de fichier")} selected={filtre} onSelect={(id) => setFiltre(id as Filtre)} className="border-b-0"
              tabs={([["tous", "Tous"], ["image", "Images"], ["video", "Vidéos"], ["document", "Documents"]] as [Filtre, string][]).map(([id, l]) => ({ id, label: t(l) }))} />
            <div className="ml-auto min-w-[200px] flex-1 py-2 sm:max-w-xs">
              <TextField type="search" label={t("Rechercher un fichier")} labelHidden value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder={t("Rechercher un fichier")} />
            </div>
          </div>
          <IndexTable
            label={t("Fichiers")}
            rows={visibles}
            columns={colonnes}
            getId={(f) => f.url}
            loading={chargement && !fichiers.length}
            emptyState={<p className="px-6 py-12 text-center text-(--color-text-secondary)">{t("Aucun fichier ne correspond.")}</p>}
          />
          {suite && (
            <div className="flex justify-center border-t border-(--color-border-secondary) bg-(--color-surface-secondary) p-2">
              <Button size="sm" onClick={() => charger(suite)} loading={chargement}>{t("Afficher plus")}</Button>
            </div>
          )}
        </div>
      )}

      <Modal open={!!aSupprimer} onClose={() => setASupprimer(null)} locked={suppression} size="sm" title={t("Supprimer ce fichier ?")}
        footer={<>
          <Button onClick={() => setASupprimer(null)} disabled={suppression}>{t("Annuler")}</Button>
          <Button variant="critical" onClick={supprimer} loading={suppression}>{t("Supprimer le fichier")}</Button>
        </>}>
        <p className="m-0"><strong>{aSupprimer && nomLisible(aSupprimer.nom)}</strong></p>
        <p className="m-0 mt-1 text-(--color-text-secondary)">{t("Il disparaîtra aussi des pages qui l'utilisent.")}</p>
      </Modal>
    </div>
  );
}

/** Vignette 32 px (§7.5 : table de fichiers). */
function Apercu({ fichier: f }: { fichier: Fichier }) {
  if (f.type === "image") return <Thumbnail src={f.url} alt={nomLisible(f.nom)} size={32} />;
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-(--radius-md) border border-(--color-border) bg-[#fafafa] text-(--color-text-subdued)">
      {f.type === "video" ? <Film size={16} aria-hidden /> : <FileText size={16} aria-hidden />}
    </span>
  );
}
