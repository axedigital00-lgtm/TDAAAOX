"use client";
// Contenu → Fichiers (comme Shopify) : images, vidéos et documents de la boutique,
// à importer (bouton ou glisser-déposer), retrouver, copier (lien) ou supprimer.
// Les mêmes fichiers sont proposés par « Choisir dans la bibliothèque » du Constructeur.
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { televerser } from "@/lib/televerser";
import { TYPES_FICHIERS } from "@/lib/types-fichiers";
import { useT } from "@/components/I18nProvider";
import { Page, PageHeader } from "@/components/dashboard/design-system/components/PageHeader";
import { Banner } from "@/components/dashboard/design-system/components/primitives";
import { Button } from "@/components/dashboard/design-system/components/Button";
import { Badge } from "@/components/dashboard/design-system/components/Badge";
import { IndexTable, type IndexColumn, type IndexRow } from "@/components/dashboard/design-system/components/IndexTable";
import { Icon } from "@/components/dashboard/design-system/icons/Icon";

// externe : image d'un produit hébergée ailleurs (IA, lien collé) — affichée, jamais supprimée d'ici.
interface Fichier { url: string; nom: string; type: "image" | "video" | "document"; taille: number | null; date: string; externe?: boolean; produitId?: string }
type Filtre = "tous" | "image" | "video" | "document";
const FILTRES: [Filtre, string][] = [["tous", "Tous"], ["image", "Images"], ["video", "Vidéos"], ["document", "Documents"]];
const ACCEPTES = [...TYPES_FICHIERS.image, ...TYPES_FICHIERS.video, ...TYPES_FICHIERS.document];
const categorieDe = (type: string) => (TYPES_FICHIERS.image.includes(type) ? "image" : TYPES_FICHIERS.video.includes(type) ? "video" : "document");

const taille = (o: number) => (o < 1024 * 1024 ? `${Math.max(1, Math.round(o / 1024))} Ko` : `${(o / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`);
// Nom affiché sans le suffixe aléatoire ajouté par le stockage (photo-AbC123xyz.jpg → photo.jpg).
const nomLisible = (nom: string) => nom.replace(/-[A-Za-z0-9]{20,}(\.[^.]+)$/, "$1");
const extension = (nom: string) => (nom.split(".").pop() || "").toUpperCase();

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
  const [copie, setCopie] = useState<string | null>(null);
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

  const supprimer = async (urls: string[]) => {
    const cibles = urls.filter((u) => !fichiers.find((f) => f.url === u)?.externe);
    if (!cibles.length) { toast.error(t("Les images externes des produits ne se suppriment pas d'ici.")); return; }
    if (!confirm(cibles.length > 1 ? t("Supprimer ces {0} fichiers ? Ils disparaîtront aussi des pages qui les utilisent.", cibles.length) : t("Supprimer ce fichier ? Il disparaîtra aussi des pages qui l'utilisent."))) return;
    let ok = 0;
    for (const url of cibles) {
      const r = await fetch("/api/fichiers", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) }).catch(() => null);
      if (r?.ok) { ok++; setFichiers((l) => l.filter((x) => x.url !== url)); }
    }
    if (ok) toast.success(ok > 1 ? t("{0} fichiers supprimés", ok) : t("Fichier supprimé"));
    if (ok < cibles.length) toast.error(t("Suppression impossible"));
  };

  const copier = (url: string) => { navigator.clipboard.writeText(url); setCopie(url); setTimeout(() => setCopie(null), 1500); };

  const visibles = fichiers.filter((f) => !recherche.trim() || nomLisible(f.nom).toLowerCase().includes(recherche.trim().toLowerCase()));

  const colonnes: IndexColumn[] = [
    { id: "apercu", header: "", thumbnail: true, width: 56 },
    { id: "nom", header: t("Nom du fichier"), mobilePrimary: true },
    { id: "date", header: t("Date d’ajout"), hideOnMobile: true },
    { id: "taille", header: t("Taille"), numeric: true },
    { id: "actions", header: "", width: 140 },
  ];
  const lignes: IndexRow[] = visibles.map((f) => ({
    id: f.url,
    cells: {
      apercu: (
        <a href={f.url} target="_blank" rel="noopener noreferrer" className="axd-thumb" aria-label={t("Ouvrir")}>
          {f.type === "image" ? <img src={f.url} alt="" loading="lazy" />
            : f.type === "video" ? <video src={f.url} muted preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ font: "650 10px/1 var(--font-admin)" }}>{extension(f.nom)}</span>}
        </a>
      ),
      nom: (
        <div style={{ minWidth: 0 }}>
          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 360 }} title={nomLisible(f.nom)}>{nomLisible(f.nom)}</div>
          <div style={{ color: "var(--color-text-subdued)", fontWeight: 400, fontSize: 12 }}>
            {f.externe ? <Badge>{t("Image produit externe")}</Badge> : extension(f.nom)}
          </div>
        </div>
      ),
      date: f.externe ? "—" : new Date(f.date).toLocaleDateString(t.loc, { day: "numeric", month: "short", year: "numeric" }),
      taille: f.externe || f.taille == null ? "—" : taille(f.taille),
      actions: (
        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
          <Button size="sm" variant="plain" onClick={() => copier(f.url)}>{copie === f.url ? t("Copié") : t("Copier le lien")}</Button>
          {!f.externe && <button type="button" className="axd-icon-btn" onClick={() => supprimer([f.url])} aria-label={t("Supprimer")} title={t("Supprimer")}><Icon name="x" /></button>}
        </div>
      ),
    },
  }));

  return (
    <Page>
      <PageHeader
        icon="folder"
        title={t("Fichiers")}
        primaryAction={{ content: envoi ? `${t("Import…")} ${envoi.fait}/${envoi.total}` : t("Importer des fichiers"), onAction: () => champ.current?.click(), loading: !!envoi, disabled: indisponible }}
      />
      <input ref={champ} type="file" multiple accept={ACCEPTES.join(",")} hidden onChange={(e) => e.target.files && importer(e.target.files)} />

      {indisponible ? (
        <Banner tone="warning">{t("Le stockage des fichiers n'est pas configuré sur ce serveur : la bibliothèque est indisponible.")}</Banner>
      ) : (
        <div
          className="axd-card axd-fichiers"
          data-survol={survolDepot || undefined}
          onDragOver={(e) => { e.preventDefault(); setSurvolDepot(true); }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setSurvolDepot(false); }}
          onDrop={(e) => { e.preventDefault(); setSurvolDepot(false); importer(e.dataTransfer.files); }}
        >
          <button type="button" className="axd-depot" onClick={() => champ.current?.click()} disabled={!!envoi}>
            <span className="axd-btn axd-btn--sm" aria-hidden>{t("Importer des fichiers")}</span>
            <span>{t("ou glissez-déposez vos images, vidéos et documents")}</span>
          </button>

          <div className="axd-ix-bar">
            <div className="axd-ix-tabs" role="tablist">
              {FILTRES.map(([v, l]) => (
                <button key={v} type="button" role="tab" aria-selected={filtre === v} className="axd-ix-tab" onClick={() => setFiltre(v)}>{t(l)}</button>
              ))}
            </div>
            <label className="axd-ix-search">
              <Icon name="search" />
              <input type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder={t("Rechercher un fichier")} aria-label={t("Rechercher un fichier")} />
            </label>
          </div>

          {chargement && !fichiers.length ? (
            <p className="axd-fichiers__etat">{t("Chargement…")}</p>
          ) : !visibles.length ? (
            <div className="axd-empty">
              <img src="/admin/fichiers-vide.svg" alt="" width={200} height={150} style={{ margin: "0 auto 8px", maxWidth: "100%" }} />
              <h3>{recherche ? t("Aucun fichier ne correspond") : t("Importez et gérez vos fichiers")}</h3>
              <p>{recherche ? t("Essayez un autre nom de fichier.") : t("Les images, vidéos et documents de votre boutique, réutilisables partout : constructeur, pages, liens.")}</p>
            </div>
          ) : (
            <IndexTable
              columns={colonnes}
              rows={lignes}
              resourceName={{ singular: t("fichier"), plural: t("fichiers") }}
              bulkActions={[{ id: "supprimer", content: t("Supprimer les fichiers"), destructive: true }]}
              onBulkAction={(_, ids) => supprimer(ids)}
            />
          )}

          {suite && (
            <div className="axd-ix-pager" style={{ justifyContent: "center" }}>
              <Button size="sm" onClick={() => charger(suite)} loading={chargement}>{t("Afficher plus")}</Button>
            </div>
          )}
        </div>
      )}
    </Page>
  );
}
