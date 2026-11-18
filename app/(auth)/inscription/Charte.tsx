"use client";
// Écran « Identité visuelle » de l'inscription : logo (ou logo texte), 2 couleurs tirées du logo,
// association de polices. Tout est facultatif ; sans choix, ce sont celles du design.
// Le logo part sur le Blob (dossier temporaire) avant la création du compte : /api/inscription/logo.
import { useRef, useState } from "react";
import { Upload, Check } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { MANIFESTE_LIBRAIRIE } from "@/lib/axso-design-manifest";
import { fontEntry, googleFontsHref } from "@/lib/theme-fonts";
import { associationsPolices, couleursDuLogo, LOGO_TAILLE_MAX, paletteDepuisPixels, TYPES_LOGO } from "@/lib/charte-visuelle";
import { CHARTE_VIDE, type Charte } from "@/lib/inscription";
import { Axia, BoutonNoir, Erreur, Question } from "./ui";

/** Couleurs et polices d'un design (celles de la boutique tant que le marchand n'a rien choisi). */
export function charteDuDesign(themeId?: string) {
  const e = MANIFESTE_LIBRAIRIE.find((x) => x.fichier === themeId);
  return {
    couleurs: { principale: e?.couleurs.accent || "#F5A623", secondaire: e?.couleurs.texte || "#111111" },
    polices: e?.polices,
  };
}

const AUTRES_SUGGESTIONS = ["#111111", "#F5A623", "#1D4ED8", "#0F766E", "#B91C1C", "#7C3AED"];

// Pixels du logo réduit à 64×64 ; logo illisible par le navigateur : aucune couleur proposée.
function extrairePalette(url: string): Promise<string[]> {
  return new Promise((ok) => {
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = c.height = 64;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(img, 0, 0, 64, 64);
        ok(paletteDepuisPixels(ctx.getImageData(0, 0, 64, 64).data));
      } catch { ok([]); }
    };
    img.onerror = () => ok([]);
    img.src = url;
  });
}

export function EcranCharte({ nom, themeId, themeIds, charte, setCharte, onContinuer, onPasser }: {
  nom: string; themeId: string; themeIds: string[]; charte: Charte;
  setCharte: (f: (c: Charte) => Charte) => void; onContinuer: () => void; onPasser: () => void;
}) {
  const tr = useT();
  const fichier = useRef<HTMLInputElement>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [palette, setPalette] = useState<string[]>([]);
  const [edition, setEdition] = useState<"principale" | "secondaire" | null>(null);

  const design = charteDuDesign(themeId);
  const couleurs = charte.couleurs ?? design.couleurs;
  const associations = associationsPolices([
    design.polices ?? {},
    ...themeIds.map((id) => charteDuDesign(id).polices ?? {}),
    ...MANIFESTE_LIBRAIRIE.map((e) => e.polices),
  ]);
  const polices = charte.polices ?? associations[0];
  const suggestions = [...new Set([...palette, design.couleurs.principale, design.couleurs.secondaire, ...AUTRES_SUGGESTIONS].map((c) => c.toLowerCase()))].slice(0, 6);

  const importer = async (f: File) => {
    setErreur("");
    if (f.size > LOGO_TAILLE_MAX) { setErreur("Le logo doit faire 5 Mo au maximum."); return; }
    setEnvoi(true);
    const local = URL.createObjectURL(f);
    try {
      const pal = await extrairePalette(local);
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/inscription/logo", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.message || "L'envoi du logo a échoué, réessaie.");
      setPalette(pal);
      const extraites = couleursDuLogo(pal, design.couleurs.secondaire);
      setCharte((c) => ({ ...c, logoUrl: data.url, sansLogo: false, couleurs: extraites ?? c.couleurs }));
    } catch (e) {
      setErreur(e instanceof Error && e.message !== "Failed to fetch" ? e.message : "Erreur réseau.");
    } finally {
      URL.revokeObjectURL(local);
      setEnvoi(false);
    }
  };

  const changerCouleur = (role: "principale" | "secondaire", v: string) =>
    setCharte((c) => ({ ...c, couleurs: { ...(c.couleurs ?? design.couleurs), [role]: v.toLowerCase() } }));

  const titre = (v?: string) => fontEntry(v)?.label;

  return (
    <>
      <Axia>{tr("Ta boutique à tes couleurs : tout est facultatif, tu pourras tout changer ensuite.")}</Axia>
      <Question id="q-charte">{tr("L'identité visuelle de {0}", nom)}</Question>

      {/* 1. Logo */}
      <section className="space-y-2" aria-labelledby="charte-logo">
        <h2 id="charte-logo" className="text-[14px] font-bold text-[#111111]">{tr("Ton logo")}</h2>
        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3">
          <div className="w-16 h-16 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
            {charte.logoUrl
              ? <img src={charte.logoUrl} alt={tr("Logo de {0}", nom)} className="max-w-full max-h-full object-contain" />
              : <span className="px-1 text-center text-[13px] font-bold leading-tight break-words" style={{ fontFamily: titre(polices?.titre), color: couleurs.secondaire }}>{nom}</span>}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <input ref={fichier} type="file" accept={TYPES_LOGO.join(",")} className="sr-only" aria-describedby="err-logo"
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) importer(f); }} />
            <button type="button" onClick={() => fichier.current?.click()} disabled={envoi}
              className="inline-flex items-center gap-2 h-[44px] px-4 rounded-full text-[14px] font-bold bg-gray-100 text-[#111111] disabled:opacity-50">
              <Upload size={16} aria-hidden /> {envoi ? tr("Envoi…") : charte.logoUrl ? tr("Changer de logo") : tr("Importer mon logo")}
            </button>
            <p className="text-[14px] text-gray-500">{tr("PNG, JPG, SVG ou WebP, 5 Mo maximum")}</p>
          </div>
        </div>
        {!charte.logoUrl && !charte.sansLogo && (
          <button type="button" onClick={() => setCharte((c) => ({ ...c, sansLogo: true }))}
            className="min-h-[44px] text-[14px] font-semibold text-[#111111] underline decoration-[#F5A623] decoration-2 underline-offset-4">
            {tr("Je n'ai pas de logo")}
          </button>
        )}
        {charte.sansLogo && !charte.logoUrl && <p className="text-[14px] text-gray-500">{tr("Axia utilisera le nom de ta boutique, écrit dans ta police, comme logo.")}</p>}
        {charte.logoUrl && (
          <button type="button" onClick={() => { setPalette([]); setCharte((c) => ({ ...c, logoUrl: "", sansLogo: true })); }}
            className="min-h-[44px] text-[14px] font-medium text-gray-600 underline underline-offset-4">{tr("Retirer le logo")}</button>
        )}
        <Erreur id="err-logo">{erreur && tr(erreur)}</Erreur>
      </section>

      {/* 2. Couleurs */}
      <section className="space-y-2" aria-labelledby="charte-couleurs">
        <h2 id="charte-couleurs" className="text-[14px] font-bold text-[#111111]">{tr("Tes couleurs")}</h2>
        <p className="text-[14px] text-gray-500">{charte.logoUrl && palette.length ? tr("Tirées de ton logo. Touche une pastille pour la changer.") : tr("Celles de ton design. Touche une pastille pour la changer.")}</p>
        <div className="grid grid-cols-2 sm:flex gap-3">
          {(["principale", "secondaire"] as const).map((role) => (
            <button key={role} type="button" aria-pressed={edition === role} onClick={() => setEdition(edition === role ? null : role)}
              className="flex items-center gap-2 rounded-full border bg-white pl-1.5 pr-4 h-[52px] min-w-0" style={{ borderColor: edition === role ? "#111111" : "#e5e7eb" }}>
              <span className="w-9 h-9 rounded-full border border-black/10" style={{ background: couleurs[role] }} aria-hidden />
              <span className="text-[14px] font-semibold text-[#111111] truncate">{role === "principale" ? tr("Principale") : tr("Secondaire")}</span>
            </button>
          ))}
        </div>
        {edition && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-white p-3">
            <label className="relative flex-shrink-0 w-[44px] h-[44px] rounded-full overflow-hidden border border-gray-200 cursor-pointer" title={tr("Choisir une couleur")}>
              <span className="sr-only">{tr("Choisir une couleur")}</span>
              <input type="color" value={couleurs[edition]} onChange={(e) => changerCouleur(edition, e.target.value)} className="absolute inset-0 w-full h-full cursor-pointer opacity-0" />
              <span className="block w-full h-full" style={{ background: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)" }} aria-hidden />
            </label>
            {suggestions.map((c) => (
              <button key={c} type="button" onClick={() => changerCouleur(edition, c)} aria-label={tr("Couleur {0}", c)} aria-pressed={couleurs[edition] === c}
                className="flex-shrink-0 w-[44px] h-[44px] rounded-full border border-black/10 flex items-center justify-center" style={{ background: c }}>
                {couleurs[edition] === c && <Check size={16} color="#fff" style={{ filter: "drop-shadow(0 0 2px #000)" }} aria-hidden />}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 3. Polices */}
      <section className="space-y-2" aria-labelledby="charte-polices">
        <h2 id="charte-polices" className="text-[14px] font-bold text-[#111111]">{tr("Ta police")}</h2>
        {associations.map((a) => { const href = googleFontsHref(a); return href ? <link key={href} rel="stylesheet" href={href} /> : null; })}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {associations.map((a) => {
            const sel = polices?.titre === a.titre && polices?.corps === a.corps;
            return (
              <button key={`${a.titre}|${a.corps}`} type="button" aria-pressed={sel}
                onClick={() => setCharte((c) => ({ ...c, polices: a }))}
                className="text-left rounded-2xl border bg-white px-4 py-3" style={{ borderColor: sel ? "#111111" : "#e5e7eb", boxShadow: sel ? "0 0 0 1px #111111" : undefined }}>
                <span className="block text-[28px] leading-none text-[#111111]" style={{ fontFamily: titre(a.titre) }}>Aa</span>
                <span className="block mt-1.5 text-[15px] font-bold text-[#111111] truncate" style={{ fontFamily: titre(a.titre) }}>{nom}</span>
                <span className="block text-[14px] sm:text-[12px] text-gray-500 truncate" style={{ fontFamily: titre(a.corps) }}>{titre(a.titre)} · {titre(a.corps)}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <BoutonNoir onClick={onContinuer} disabled={envoi}>{tr("Continuer avec cette identité")}</BoutonNoir>
        <button type="button" onClick={() => { setPalette([]); setCharte(() => CHARTE_VIDE); onPasser(); }}
          className="min-h-[44px] px-2 text-[14px] font-semibold text-gray-600 underline underline-offset-4">
          {tr("Passer, Axia choisira pour moi")}
        </button>
      </div>
    </>
  );
}
