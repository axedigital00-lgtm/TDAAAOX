"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, FileCode, Wand2, Copy, Sparkles } from "lucide-react";
import { ApercuDesign, parametresApercu, optionsChangementDesign } from "@/components/dashboard/ApercuDesign";
import { EtatChargement, EtatErreur, useConfirmation } from "@/components/ui";
import { Banner, Button, PageHeader, TextField } from "@/components/ui/adm";
import { useT } from "@/components/I18nProvider";
import { PROMPTS_IMPORT, validerThemeImporte, type RapportTheme, type TypeImport } from "@/lib/prompt-import-theme";

type Mode = "librairie" | "import";

// Ce que le fichier importé remplace (standard de chacun : lib/prompt-import-theme.ts).
const TYPES_IMPORT: { id: TypeImport; label: string; desc: string }[] = [
  { id: "accueil", label: "Page d'accueil", desc: "Remplace votre accueil ; catalogue, fiche produit et commande restent ceux d'Axso, à vos couleurs." },
  { id: "boutique", label: "Boutique complète", desc: "Accueil et catalogue de votre fichier ; fiche produit, panier, commande, À propos et Contact d'Axso dans son en-tête et son pied de page." },
  { id: "page", label: "Une page en plus", desc: "Ajoute une page (campagne, présentation…) entre votre en-tête et votre pied de page. Votre thème ne change pas." },
];

export default function CreerThemePage() {
  const tr = useT();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("librairie");
  const { confirmer, dialogue } = useConfirmation();

  // ─── Bibliothèque AXSO Design (Templates/*.html) ───────────────────────────
  const [librairie, setLibrairie] = useState<any[]>([]);
  const [provisionnant, setProvisionnant] = useState<string | null>(null);

  const [params, setParams] = useState("");
  const [etatLibrairie, setEtatLibrairie] = useState<"chargement" | "pret" | "erreur">("chargement");
  const chargerLibrairie = () => {
    setEtatLibrairie("chargement");
    fetch("/api/themes").then((r) => { if (!r.ok) throw new Error(); return r.json(); }).then((d) => {
      setLibrairie((d.themes || []).filter((t: any) => t.axsoDesign));
      setEtatLibrairie("pret");
    }).catch(() => setEtatLibrairie("erreur"));
  };
  useEffect(() => {
    chargerLibrairie();
    // Aperçus avec les vrais nom, devise et produits de la boutique.
    Promise.all([fetch("/api/tenants/moi").then((r) => r.json()), fetch("/api/produits?limit=24&actif=true").then((r) => r.json())])
      .then(([t, p]) => setParams(parametresApercu(t.tenant, p.produits ?? [])))
      .catch(() => {});
  }, []);

  async function utiliserDesignLibrairie(fichier: string, nom: string) {
    if (!(await confirmer(optionsChangementDesign(nom, tr)))) return;
    setProvisionnant(fichier);
    try {
      const res = await fetch("/api/themes/provisionner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fichier }),
      });
      if (!res.ok) throw new Error();
      toast.success(tr("Design « {0} » activé sur votre boutique.", nom));
      router.push("/dashboard/themes");
    } catch {
      toast.error(tr("Le design n'a pas pu être activé. Vérifiez votre connexion et réessayez."));
    } finally {
      setProvisionnant(null);
    }
  }

  // ─── Import de template — extraction de style par l'IA ────────────────────
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [rapport, setRapport] = useState<RapportTheme | null>(null);
  const [typeImport, setTypeImport] = useState<TypeImport>("accueil");
  const [nomPage, setNomPage] = useState("");
  const prompt = PROMPTS_IMPORT[typeImport];

  async function verifier(f: File | null, type: TypeImport) {
    setRapport(f ? validerThemeImporte(await f.text(), type) : null);
  }
  async function choisirFichier(f: File | null) {
    setImportFile(f);
    await verifier(f, typeImport);
  }
  function choisirType(type: TypeImport) {
    setTypeImport(type);
    verifier(importFile, type);
  }

  async function copierPrompt() {
    try { await navigator.clipboard.writeText(prompt); toast.success(tr("Prompt copié !")); }
    catch { toast.error(tr("Copie impossible : sélectionnez le texte à la main.")); }
  }

  async function importerDepuisFichier() {
    if (!importFile) { toast.error(tr("Choisissez un fichier .html à analyser")); return; }
    if (importFile.size > 300_000) { toast.error(tr("Fichier trop volumineux (300 Ko maximum) : allégez-le (images en lien plutôt qu'intégrées) puis réessayez.")); return; }
    if (rapport?.erreurs.length && !(await confirmer({
      titre: tr("Importer ce fichier malgré tout ?"), objet: importFile.name, destructive: false,
      description: tr("Ce fichier ne respecte pas le standard (voir la liste) : certaines parties ne seront pas modifiables dans le Constructeur."),
      libelleConfirmer: tr("Importer quand même"),
    }))) return;
    if (typeImport !== "page" && !(await confirmer(optionsChangementDesign(importFile.name, tr)))) return;
    setImporting(true);
    try {
      // Le HTML est lu ici et envoyé tel quel : pas de passage par le stockage de fichiers.
      const res = await fetch("/api/themes/importer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: await importFile.text(), type: typeImport, ...(nomPage.trim() ? { nomPage: nomPage.trim() } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec de l'analyse du fichier");
      if (typeImport === "page") {
        toast.success(tr("Page « {0} » ajoutée à votre boutique : {1}", data.page.nom, data.page.url));
        router.push(`/dashboard/builder?page=p:${encodeURIComponent(data.page.slug)}`);
        return;
      }

      const activation = await fetch("/api/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeId: data.theme.id }),
      });
      if (!activation.ok) throw new Error("Thème créé, mais son activation a échoué — active-le depuis « Mes thèmes ».");
      toast.success(tr("Thème créé à partir de votre design !"));
      router.push("/dashboard/themes");
    } catch (e: any) {
      toast.error(tr(e?.message) || tr("L'import n'a pas abouti. Vérifiez le fichier et réessayez."));
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-fond overflow-hidden">
      {dialogue}
      <div className="px-4 pt-1 bg-(--color-surface) border-b border-(--color-border) flex-shrink-0 z-10">
        <PageHeader icon="grid" title={tr("Nouveau thème")} backHref="/dashboard/themes" />
        <p className="-mt-1 mb-2 text-(--color-text-secondary)">{tr("Choisissez un design prêt à l'emploi ou importez le vôtre.")}</p>
        {/* Mode : bibliothèque AXSO Design, ou import de design perso */}
        <div role="tablist" className="flex items-center gap-1 pb-2 overflow-x-auto">
          {([["librairie", "Bibliothèque AXSO Design"], ["import", "Importer mon design"]] as [Mode, string][]).map(([m, label]) => (
            <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
              className={`min-h-10 px-3 rounded-controle text-sm font-semibold whitespace-nowrap transition-all ${mode === m ? "bg-primaire-fond text-encre" : "text-doux hover:text-encre"}`}>
              {tr(label)}
            </button>
          ))}
        </div>
      </div>

      {mode === "librairie" ? (
        <div className="flex-1 overflow-y-auto bg-fond p-4 sm:p-6">
          {etatLibrairie === "chargement" && <EtatChargement texte={tr("Chargement des designs…")} />}
          {etatLibrairie === "erreur" && <EtatErreur titre={tr("Les designs n'ont pas pu être chargés.")} texte={tr("Vérifiez votre connexion puis réessayez.")} onReessayer={chargerLibrairie} />}
          {etatLibrairie === "pret" && <p className="ax-texte-secondaire mb-4 max-w-2xl">
            {librairie.length}{" "}{tr("designs choisis pour votre boutique. En choisir un remplace votre design actuel, avec vos vrais produits déjà branchés dans la grille.")}
          </p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-6xl">
            {librairie.map((t) => (
              <div key={t.id} className="rounded-carte border-2 border-bordure bg-carte overflow-hidden hover:border-bordure-forte transition-all">
                <ApercuDesign fichier={t.fichier} fond={t.config?.colors?.fond} params={params} className="h-44" />
                <div className="p-3.5">
                  <h2 className="text-sm font-bold text-encre">{tr(t.nom)}</h2>
                  <p className="ax-aide mb-3">{tr(t.description)}</p>
                  <Button variant="default" size="sm" fullWidth onClick={() => utiliserDesignLibrairie(t.fichier, t.nom)}
                    disabled={!!provisionnant && provisionnant !== t.fichier} loading={provisionnant === t.fichier}>
                    {tr("Utiliser ce design")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto bg-fond p-4 sm:p-6 flex flex-col items-center gap-4">
          <div className="w-full max-w-md bg-carte rounded-carte border border-bordure p-carte shadow-carte">
            <div className="flex items-center gap-2 mb-1.5">
              <Wand2 size={16} className="text-attention" aria-hidden />
              <h2 className="ax-sous-titre">{tr("Importer votre propre design")}</h2>
            </div>
            <p className="ax-texte-secondaire mb-5">
              {tr("Envoyez un fichier HTML : son design et ses textes sont repris tels quels, vos vrais produits branchés dans sa grille, puis vous le modifiez dans le Constructeur. Les scripts sont retirés, jamais exécutés.")}
            </p>

            <p id="type-import" className="ax-libelle mb-2">{tr("Que contient votre fichier ?")}</p>
            <div role="radiogroup" aria-labelledby="type-import" className="space-y-2 mb-4">
              {TYPES_IMPORT.map((ti) => (
                <button key={ti.id} type="button" role="radio" aria-checked={typeImport === ti.id} onClick={() => choisirType(ti.id)}
                  className={`w-full text-left rounded-controle border-2 px-3 py-2.5 transition-all ${typeImport === ti.id ? "border-primaire bg-primaire-fond" : "border-bordure hover:border-bordure-forte"}`}>
                  <span className="block text-sm font-semibold text-encre">{tr(ti.label)}</span>
                  <span className="block ax-aide mt-0.5">{tr(ti.desc)}</span>
                </button>
              ))}
            </div>
            {typeImport === "page" && (
              <TextField className="mb-4" label={tr("Nom de la page")} helpText={tr("Sinon, le titre du fichier est utilisé.")}
                value={nomPage} onChange={(e) => setNomPage(e.target.value)} maxLength={80} />
            )}

            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-bordure rounded-controle py-8 cursor-pointer hover:border-primaire transition-all focus-within:outline-2 focus-within:outline-focus">
              <input type="file" accept=".html,text/html" className="sr-only"
                onChange={(e) => choisirFichier(e.target.files?.[0] || null)} />
              {importFile ? (
                <>
                  <FileCode size={22} className="text-attention" aria-hidden />
                  <span className="text-sm font-medium text-encre break-all px-3 text-center">{importFile.name}</span>
                  <span className="ax-aide">{tr("Touchez pour choisir un autre fichier")}</span>
                </>
              ) : (
                <>
                  <Upload size={22} className="text-doux" aria-hidden />
                  <span className="text-sm text-doux">{tr("Cliquez pour choisir un fichier .html")}</span>
                </>
              )}
            </label>

            <Button variant="primary" fullWidth className="mt-5" onClick={importerDepuisFichier} disabled={!importFile} loading={importing}>
              {tr(typeImport === "page" ? "Ajouter la page" : "Analyser & créer mon thème")}
            </Button>
          </div>

          {/* Fichier choisi : ce qui ne sera pas modifiable dans le Constructeur (lib/prompt-import-theme.ts). */}
          {rapport && (rapport.erreurs.length > 0 || rapport.avertissements.length > 0) && (
            <Banner tone={rapport.erreurs.length ? "critical" : "warning"} className="w-full max-w-md" title={tr("Ce fichier ne respecte pas tout le standard Axso")}>
              <ul className="list-disc pl-4 space-y-1">
                {rapport.erreurs.map((m) => <li key={m} className="text-(--color-critical-text)">{m}</li>)}
                {rapport.avertissements.map((m) => <li key={m}>{m}</li>)}
              </ul>
            </Banner>
          )}

          {/* Prompt standard à donner à une IA externe pour obtenir un fichier 100 % modifiable. */}
          <div className="w-full max-w-md bg-carte rounded-carte border border-bordure p-carte shadow-carte">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles size={16} className="text-attention" aria-hidden />
              <h2 className="ax-sous-titre">{tr("Faire créer votre thème par une IA")}</h2>
            </div>
            <p className="ax-texte-secondaire mb-3">
              {tr("Copiez ce prompt dans ChatGPT, Claude ou une autre IA, décrivez votre boutique à la fin, puis importez ici le fichier .html obtenu. Il fixe seulement la structure technique : style, couleurs et textes restent libres.")}{" "}
              <strong className="text-encre">{tr("Prompt pour : {0}", tr(TYPES_IMPORT.find((ti) => ti.id === typeImport)!.label))}</strong>
            </p>
            <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap break-words rounded-controle bg-carte-2 border border-bordure p-3 text-xs text-encre font-mono select-all">{prompt}</pre>
            <Button variant="default" fullWidth className="mt-3" onClick={copierPrompt}>{<Copy size={14} aria-hidden />}
              {tr("Copier le prompt")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
