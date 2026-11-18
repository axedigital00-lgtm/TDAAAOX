"use client";
// Politiques de la boutique (B5) : 4 politiques rédigées par Axia, relues et validées par le marchand.
// Seules les politiques validées apparaissent dans la boutique (/{slug}/politiques/{type}).
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Bold, CheckCircle2, ExternalLink, Eye, Heading2, List, PenLine, RotateCcw, Sparkles,
} from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { Alerte, Badge, Bouton, BoutonIcone, CLASSE_SAISIE, EnTetePage, EtatChargement, EtatErreur, ZoneTexte, useConfirmation } from "@/components/ui";
import { RenduPolitique } from "@/components/politiques/RenduPolitique";
import {
  passagesACompleter, statutPolitique, TITRES_POLITIQUES, TYPES_POLITIQUES, type Politiques, type TypePolitique,
} from "@/lib/politiques";

type Occupe = null | "chargement" | "enregistrer" | "valider" | "rediger" | "revenir";

export default function PolitiquesPage() {
  const t = useT();
  const [politiques, setPolitiques] = useState<Politiques | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [erreurChargement, setErreurChargement] = useState(false);
  const [actif, setActif] = useState<TypePolitique>("livraison");
  // Textes en cours de saisie, par politique : conservés en changeant d'onglet et en cas d'échec.
  const [saisies, setSaisies] = useState<Partial<Record<TypePolitique, string>>>({});
  const [occupe, setOccupe] = useState<Occupe>("chargement");
  const [erreur, setErreur] = useState<string | null>(null);
  const [consigneOuverte, setConsigneOuverte] = useState(false);
  const [consigne, setConsigne] = useState("");
  const [vueMobile, setVueMobile] = useState<"texte" | "apercu">("texte");
  const zone = useRef<HTMLTextAreaElement>(null);
  const { confirmer, dialogue } = useConfirmation();

  const charger = useCallback(async () => {
    setOccupe("chargement");
    setErreurChargement(false);
    try {
      const r = await fetch("/api/politiques");
      if (!r.ok) throw new Error();
      const d = await r.json();
      setPolitiques(d.politiques);
      setSlug(d.slug);
    } catch {
      setErreurChargement(true);
    } finally {
      setOccupe(null);
    }
  }, []);
  useEffect(() => { charger(); }, [charger]);

  const serveur = politiques?.[actif];
  const texte = saisies[actif] ?? serveur?.contenu ?? "";
  const modifie = saisies[actif] !== undefined && saisies[actif] !== (serveur?.contenu ?? "");
  const passages = passagesACompleter(texte);
  const auMoinsUnModifie = TYPES_POLITIQUES.some((k) => saisies[k] !== undefined && saisies[k] !== (politiques?.[k]?.contenu ?? ""));

  // Quitter la page avec des modifications non enregistrées : le navigateur prévient.
  useEffect(() => {
    if (!auMoinsUnModifie) return;
    const avant = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avant);
    return () => window.removeEventListener("beforeunload", avant);
  }, [auMoinsUnModifie]);

  async function agir(action: Exclude<Occupe, null | "chargement">, extra: Record<string, unknown> = {}) {
    setOccupe(action);
    setErreur(null);
    try {
      const r = await fetch("/api/politiques", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || d.message || t("Action impossible pour le moment. Réessaie dans un instant."));
      setPolitiques(d.politiques);
      if (d.slug) setSlug(d.slug);
      return d.politiques as Politiques;
    } catch (e) {
      const msg = e instanceof Error && e.message ? e.message : t("Connexion impossible. Vérifie ta connexion internet puis réessaie.");
      setErreur(msg);
      toast.error(msg);
      return null;
    } finally {
      setOccupe(null);
    }
  }

  const oublierSaisie = (k: TypePolitique) => setSaisies((s) => { const n = { ...s }; delete n[k]; return n; });

  async function enregistrer() {
    if (await agir("enregistrer", { type: actif, contenu: texte })) {
      oublierSaisie(actif);
      toast.success(serveur?.valideeLe ? t("Modifications enregistrées. La politique est retirée de ta boutique jusqu'à sa validation.") : t("Modifications enregistrées."));
    }
  }

  async function valider() {
    if (await agir("valider", { type: actif, contenu: texte })) {
      oublierSaisie(actif);
      toast.success(t("« {0} » est validée et visible dans ta boutique.", t(TITRES_POLITIQUES[actif])));
    }
  }

  async function reecrire() {
    if (texte.trim() && texte !== serveur?.brouillonAxia && !consigne.trim()
      && !(await confirmer({
        titre: t("Remplacer le texte par un nouveau brouillon ?"), objet: t(TITRES_POLITIQUES[actif]),
        description: t("Axia va remplacer le texte actuel de « {0} » par un nouveau brouillon.", t(TITRES_POLITIQUES[actif])),
        libelleConfirmer: t("Remplacer par un nouveau brouillon"),
      }))) return;
    const p = await agir("rediger", { type: actif, consigne, contenu: texte });
    if (p) {
      oublierSaisie(actif);
      setConsigne("");
      setConsigneOuverte(false);
      toast.success(t("Axia a réécrit « {0} ». Relis-la avant de la valider.", t(TITRES_POLITIQUES[actif])));
    }
  }

  async function revenir() {
    if (!(await confirmer({
      titre: t("Revenir au brouillon d'Axia ?"), objet: t(TITRES_POLITIQUES[actif]),
      description: t("Remplacer ton texte de « {0} » par le dernier brouillon d'Axia ?", t(TITRES_POLITIQUES[actif])),
      libelleConfirmer: t("Revenir au brouillon d'Axia"),
    }))) return;
    if (await agir("revenir", { type: actif })) {
      oublierSaisie(actif);
      toast.success(t("Le brouillon d'Axia est rétabli."));
    }
  }

  async function redigerTout() {
    const p = await agir("rediger", {});
    if (p) toast.success(t("Axia a rédigé tes politiques. Relis chacune puis valide-la."));
  }

  // ─── Barre de mise en forme (Markdown simple) ───
  function modifierTexte(nouveau: string, debut: number, fin: number) {
    setSaisies((s) => ({ ...s, [actif]: nouveau }));
    requestAnimationFrame(() => { zone.current?.focus(); zone.current?.setSelectionRange(debut, fin); });
  }
  function prefixerLigne(prefixe: string) {
    const el = zone.current;
    if (!el) return;
    const debutLigne = texte.lastIndexOf("\n", el.selectionStart - 1) + 1;
    const ligne = texte.slice(debutLigne).split("\n")[0];
    const sans = ligne.replace(/^(#{1,3}\s+|[-*]\s+)/, "");
    const nouvelle = ligne.startsWith(prefixe) ? sans : prefixe + sans;
    modifierTexte(texte.slice(0, debutLigne) + nouvelle + texte.slice(debutLigne + ligne.length), debutLigne + nouvelle.length, debutLigne + nouvelle.length);
  }
  function gras() {
    const el = zone.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b } = el;
    const sel = texte.slice(a, b) || t("texte en gras");
    modifierTexte(texte.slice(0, a) + `**${sel}**` + texte.slice(b), a + 2, a + 2 + sel.length);
  }
  function allerAuPassage(p: string) {
    const i = texte.indexOf(p);
    setVueMobile("texte");
    if (i >= 0) requestAnimationFrame(() => { zone.current?.focus(); zone.current?.setSelectionRange(i, i + p.length); });
  }

  const badge = (k: TypePolitique) => {
    const p = politiques?.[k];
    const s = statutPolitique(saisies[k] !== undefined && p ? { ...p, contenu: saisies[k]!, valideeLe: saisies[k] === p.contenu ? p.valideeLe : null } : p);
    if (s === "validee") return <Badge ton="succes">{t("Validée")}</Badge>;
    if (s === "a_completer") return <Badge ton="attention">{t("À compléter")}</Badge>;
    if (s === "absente") return <Badge ton="neutre">{t("À rédiger")}</Badge>;
    const deAxia = (saisies[k] ?? p?.contenu) === p?.brouillonAxia;
    return <Badge ton={deAxia ? "info" : "neutre"}>{deAxia ? t("Brouillon d'Axia") : t("À valider")}</Badge>;
  };

  // ─── États chargement / erreur / vide ───
  const entete = (
    <>
      {dialogue}
      <EnTetePage titre={t("Politiques de la boutique")} retour={{ href: "/dashboard/boutique", libelle: t("Ma boutique") }}
        description={t("Ce que tes clients lisent avant d'acheter. Axia les rédige avec les vraies informations de ta boutique ; tu complètes ce qu'il ne peut pas savoir, puis tu valides. Seules les politiques validées apparaissent dans ta boutique.")} />
    </>
  );

  if (occupe === "chargement" && !politiques) {
    return <div className="p-4 sm:p-6">{entete}<EtatChargement texte={t("Chargement des politiques…")} /></div>;
  }
  if (erreurChargement || !politiques) {
    return (
      <div className="p-4 sm:p-6">{entete}
        <EtatErreur className="max-w-lg" titre={t("Impossible de charger tes politiques.")} texte={t("Vérifie ta connexion internet puis réessaie.")} onReessayer={charger} />
      </div>
    );
  }

  const aucune = TYPES_POLITIQUES.every((k) => !politiques[k]?.contenu.trim());
  if (aucune) {
    return (
      <div className="p-4 sm:p-6">{entete}
        <div className="rounded-carte border border-bordure bg-carte p-carte max-w-xl">
          <Sparkles className="w-6 h-6 text-attention" aria-hidden />
          <h2 className="mt-3 ax-sous-titre">{t("Ta boutique n'a pas encore de politiques")}</h2>
          <p className="ax-texte-secondaire mt-1">
            {t("Axia rédige les 4 politiques (livraison, retours et remboursements, confidentialité, conditions de vente) avec tes réglages réels : zones, tarifs, moyens de paiement et coordonnées. Ce qu'il ne connaît pas sera surligné en jaune pour que tu le complètes. Rien n'est publié sans ta validation.")}
          </p>
          {erreur && <p className="mt-3 ax-erreur-champ" role="alert">{erreur}</p>}
          <Bouton className="mt-4" onClick={redigerTout} charge={occupe === "rediger"} texteCharge={t("Axia rédige tes politiques…")} icone={<Sparkles className="w-4 h-4" aria-hidden />}>
            {t("Faire rédiger mes politiques par Axia")}
          </Bouton>
        </div>
      </div>
    );
  }

  const valide = statutPolitique(serveur) === "validee" && !modifie;
  const lienVitrine = slug ? `/${slug}/politiques/${actif}` : null;
  const enCours = occupe !== null;

  return (
    <div className="p-4 sm:p-6">
      {entete}

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_minmax(0,1fr)]">
        {/* Liste des politiques (onglets défilants sur mobile) */}
        <nav aria-label={t("Politiques")} className="flex lg:flex-col gap-2 overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0 pb-1">
          {TYPES_POLITIQUES.map((k) => (
            <button key={k} onClick={() => { setActif(k); setErreur(null); setConsigneOuverte(false); }}
              aria-current={k === actif ? "page" : undefined}
              className={`shrink-0 text-left rounded-controle border px-3 py-2.5 transition-colors ${k === actif ? "border-secondaire bg-carte" : "border-bordure bg-carte/60 hover:bg-carte"}`}>
              <span className="block text-sm font-semibold text-encre whitespace-nowrap lg:whitespace-normal">{t(TITRES_POLITIQUES[k])}</span>
              <span className="block mt-1">{badge(k)}</span>
            </button>
          ))}
        </nav>

        {/* Éditeur */}
        <section className={`rounded-carte border border-bordure bg-carte p-4 min-w-0 ${vueMobile === "apercu" ? "hidden lg:block" : ""}`}>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="ax-titre-section">{t(TITRES_POLITIQUES[actif])}</h2>
            <Bouton variante="secondaire" taille="compact" className="lg:hidden" onClick={() => setVueMobile("apercu")} icone={<Eye className="w-4 h-4" aria-hidden />}>{t("Aperçu client")}</Bouton>
          </div>

          {valide && (
            <Alerte ton="succes" className="mt-3" titre={t("Validée et visible dans ta boutique.")}
              action={lienVitrine ? <a href={lienVitrine} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold underline inline-flex items-center gap-1">{t("Voir dans la boutique")} <ExternalLink className="w-3.5 h-3.5" aria-hidden /></a> : undefined}>
              {t("Si tu la modifies, elle sera retirée de ta boutique jusqu'à ce que tu la valides à nouveau.")}
            </Alerte>
          )}
          {modifie && serveur?.valideeLe && (
            <Alerte ton="attention" className="mt-3" titre={t("Tu modifies une politique publiée.")}>
              {t("Dès que tu enregistres, elle est retirée de ta boutique jusqu'à ce que tu la valides à nouveau.")}
            </Alerte>
          )}

          {!serveur?.contenu.trim() && !modifie ? (
            <div className="mt-4 rounded-controle border border-dashed border-bordure p-4">
              <p className="ax-texte-secondaire">{t("Cette politique n'est pas encore rédigée. Écris-la toi-même ou laisse Axia préparer un brouillon avec tes réglages réels.")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Bouton variante="secondaire" onClick={() => setSaisies((s) => ({ ...s, [actif]: "## " }))} icone={<PenLine className="w-4 h-4" aria-hidden />}>{t("Écrire moi-même")}</Bouton>
                <Bouton onClick={reecrire} disabled={enCours && occupe !== "rediger"} charge={occupe === "rediger"} texteCharge={t("Axia rédige…")} icone={<Sparkles className="w-4 h-4" aria-hidden />}>
                  {t("Faire rédiger par Axia")}
                </Bouton>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-3 flex items-center gap-1 rounded-t-controle border border-b-0 border-bordure bg-carte-2 p-1">
                <BoutonIcone label={t("Titre")} onClick={() => prefixerLigne("## ")}><Heading2 className="w-4 h-4" aria-hidden /></BoutonIcone>
                <BoutonIcone label={t("Liste")} onClick={() => prefixerLigne("- ")}><List className="w-4 h-4" aria-hidden /></BoutonIcone>
                <BoutonIcone label={t("Gras")} onClick={gras}><Bold className="w-4 h-4" aria-hidden /></BoutonIcone>
                <span className="ml-auto pr-2 text-xs text-doux hidden sm:inline">{t("## titre · - liste · **gras**")}</span>
              </div>
              <label htmlFor="texte-politique" className="sr-only">{t("Texte de la politique")}</label>
              <textarea id="texte-politique" ref={zone} value={texte} disabled={occupe === "rediger" || occupe === "revenir"}
                onChange={(e) => setSaisies((s) => ({ ...s, [actif]: e.target.value }))}
                className={CLASSE_SAISIE + " min-h-[340px] lg:min-h-[480px] rounded-t-none font-mono leading-relaxed"} />

              {passages.length > 0 && (
                <div className="mt-3 rounded-controle bg-attention-fond border border-attention-bordure p-3">
                  <p className="text-sm font-semibold text-attention">
                    {passages.length === 1 ? t("1 passage à compléter avant de valider :") : t("{0} passages à compléter avant de valider :", passages.length)}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {[...new Set(passages)].map((p) => (
                      <li key={p}>
                        <button onClick={() => allerAuPassage(p)} className="text-left text-sm text-encre underline decoration-dotted min-h-8">
                          {p.replace(/^\[À compléter\s*:\s*/, "").replace(/\]$/, "")}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 ax-aide">{t("Remplace chaque passage entre crochets par la bonne information. Ils ne sont jamais montrés à tes clients.")}</p>
                </div>
              )}

              {erreur && <p className="mt-3 ax-erreur-champ" role="alert">{erreur}</p>}

              <div className="mt-4 flex flex-wrap gap-2">
                <Bouton onClick={valider} disabled={(enCours && occupe !== "valider") || passages.length > 0 || !texte.trim() || valide} charge={occupe === "valider"}
                  title={passages.length ? t("Complète d'abord les passages surlignés") : undefined} icone={<CheckCircle2 className="w-4 h-4" aria-hidden />}>
                  {valide ? t("Politique validée") : t("Valider cette politique")}
                </Bouton>
                {modifie && (
                  <Bouton variante="secondaire" onClick={enregistrer} disabled={enCours && occupe !== "enregistrer"} charge={occupe === "enregistrer"}>
                    {t("Enregistrer les modifications")}
                  </Bouton>
                )}
                <Bouton variante="secondaire" onClick={() => setConsigneOuverte((o) => !o)} disabled={enCours} aria-expanded={consigneOuverte} icone={<Sparkles className="w-4 h-4" aria-hidden />}>
                  {t("Demander à Axia de réécrire")}
                </Bouton>
                {serveur?.brouillonAxia && texte !== serveur.brouillonAxia && (
                  <Bouton variante="secondaire" onClick={revenir} disabled={enCours && occupe !== "revenir"} charge={occupe === "revenir"} icone={<RotateCcw className="w-4 h-4" aria-hidden />}>
                    {t("Revenir au brouillon d'Axia")}
                  </Bouton>
                )}
              </div>

              {consigneOuverte && (
                <div className="mt-3 rounded-controle border border-bordure p-3 space-y-2">
                  <ZoneTexte label={t("Ta consigne pour Axia")} mention="facultatif" value={consigne} onChange={(e) => setConsigne(e.target.value)} maxLength={1000} rows={3}
                    placeholder={t("Ex. : plus court, ton plus chaleureux, retours acceptés sous 7 jours")}
                    aide={t("Avec une consigne, Axia retravaille ton texte actuel. Sans consigne, il repart de tes réglages. Il n'invente ni prix, ni délai, ni engagement : ce qu'il ignore reste à compléter.")} />
                  <Bouton variante="sombre" onClick={reecrire} disabled={enCours && occupe !== "rediger"} charge={occupe === "rediger"} texteCharge={t("Axia réécrit…")} icone={<Sparkles className="w-4 h-4" aria-hidden />}>
                    {t("Lancer la réécriture")}
                  </Bouton>
                </div>
              )}
            </>
          )}
        </section>

        {/* Aperçu client */}
        <section className={`rounded-carte border border-bordure bg-carte p-4 sm:p-5 min-w-0 ${vueMobile === "texte" ? "hidden lg:block" : ""}`} aria-label={t("Aperçu client")}>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="ax-aide font-semibold">{t("Aperçu : tel que le client le verra")}</p>
            <Bouton variante="secondaire" taille="compact" className="lg:hidden" onClick={() => setVueMobile("texte")} icone={<PenLine className="w-4 h-4" aria-hidden />}>{t("Modifier le texte")}</Bouton>
          </div>
          <h2 className="mt-3 text-xl font-bold text-encre">{t(TITRES_POLITIQUES[actif])}</h2>
          <div className="mt-3 text-encre">
            {texte.trim() ? <RenduPolitique contenu={texte} surligner /> : <p className="ax-texte-secondaire">{t("Rien à afficher pour l'instant.")}</p>}
          </div>
          {passages.length > 0 && (
            <p className="mt-4 ax-aide">{t("Les passages en jaune sont visibles seulement par toi. La politique n'apparaîtra dans ta boutique qu'une fois complétée et validée.")}</p>
          )}
        </section>
      </div>
    </div>
  );
}
