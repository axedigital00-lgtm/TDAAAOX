"use client";
// Inscription marchand : le compte à rebours du lancement de sa boutique.
// Une décision par écran ; chaque réponse fait monter la jauge de poussée, la dernière
// déclenche le décollage (création réelle via /api/ai/onboarding) puis révèle la boutique.
// Progression gardée dans le navigateur (lib/inscription.ts), sons dans lib/son-fusee.ts,
// mesure par étape dans lib/inscription-suivi.ts. Si le son, une animation ou la mesure
// échoue, l'inscription continue : ces modules n'envoient jamais d'erreur.
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Package, Download, Eye, EyeOff, Copy, Check, ExternalLink, Globe, Star, ChevronDown } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import type { PlanBoutique } from "@/lib/ai-agent";
import { PAYS_DEVISES, PAYS_OPTIONS } from "@/lib/ai-agent";
import { exempleTelephone } from "@/lib/devise-convert";
import { SelectPays, Drapeau } from "@/components/ui/SelectPays";
import { LangueSelecteur } from "@/components/ui/LangueSelecteur";
import { MANIFESTE_LIBRAIRIE, choisir4Themes } from "@/lib/axso-design-manifest";
import { demanderCodeConnexion } from "@/components/auth/BoutonRenvoyerCode";
import { EcranCode } from "@/components/auth/EcranCode";
import { HeroFond } from "@/components/marketing/HeroSection";
import { adresseBoutique, slugify } from "@/lib/utils";
import {
  CHARTE_VIDE, CLE_PROGRESSION, emailValide, lireParametresInscription, lireProgression, poussee, signatureReponses,
  type Etape, type Progression,
} from "@/lib/inscription";
import { activerAudio, arreterSons, couperSon, jouerDecollage, jouerPoussee, sonCoupe, vibrer } from "@/lib/son-fusee";
import { suivre, suivreEtape, surveillerAbandon } from "@/lib/inscription-suivi";
import { PAYS_LIST, VENTE_EXEMPLES, VENTE_PLACEHOLDER, raisonTheme, urlApercu, miniatureTheme, type TypeBoutique } from "./donnees";
import { ApercuBoutique } from "./ApercuBoutique";
import { EcranCharte } from "./Charte";
import { Decollage } from "./Decollage";
import { AMBRE, Axia, BoutonNoir, BoutonSon, Carte, CSS, Erreur, Jauge, Question, Retour, garderBoutonVisible } from "./ui";

type Plan = PlanBoutique & { messageIA?: string };

const DEPART: Progression = {
  etape: "type", typeBoutique: "", vente: "", nom: "", paysCode: "", paysNom: "", devise: "XAF",
  planPour: "", plan: null, themeIds: [], messageIA: "", prenom: "", whatsapp: "", email: "", planParam: "", charte: CHARTE_VIDE, creee: null, le: 0,
};

// Écran précédent de chaque écran (bouton Retour et bouton retour du téléphone).
const PRECEDENT: Partial<Record<Etape, Etape>> = {
  vente: "type", nom: "vente", pays: "nom", analyse: "pays", design: "pays", charte: "design", identite: "charte", acces: "identite",
};
// Écrans qu'on ne quitte pas en arrière : la création est lancée.
const SANS_RETOUR: Etape[] = ["decollage", "code", "revelation"];

/** Version allégée : connexion lente, économie de données, petit appareil ou animations réduites. */
function detecterLeger(): boolean {
  try {
    const n = navigator as Navigator & { connection?: { effectiveType?: string; saveData?: boolean }; deviceMemory?: number };
    return matchMedia("(prefers-reduced-motion: reduce)").matches
      || !!n.connection?.saveData
      || /(^|slow-)2g|3g/.test(n.connection?.effectiveType ?? "")
      || (!!n.deviceMemory && n.deviceMemory <= 2)
      || (!!n.hardwareConcurrency && n.hardwareConcurrency <= 4);
  } catch { return false; }
}

const ETAPES_ANALYSE = ["Je lis ton activité", "Je choisis tes premiers produits", "Je règle ta devise et ta livraison", "Je sélectionne 4 designs pour toi"];

export default function InscriptionPage() {
  const tr = useT();
  const [p, setP] = useState<Progression>(DEPART);
  const [charge, setCharge] = useState(false);
  const [repris, setRepris] = useState(false);
  const [leger, setLeger] = useState(false);
  const [coupe, setCoupe] = useState(false);
  // Saisies en cours (validées par un bouton) et mot de passe : jamais sauvegardé.
  const [venteSaisie, setVenteSaisie] = useState("");
  const [nomSaisi, setNomSaisi] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [voirMdp, setVoirMdp] = useState(false);
  const [afrique, setAfrique] = useState(false);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [erreurGlobale, setErreurGlobale] = useState("");
  const [creation, setCreation] = useState<{ fini: boolean; slug?: string; codeRequis?: boolean }>({ fini: false });
  const [compte, setCompte] = useState<{ email: string; password: string } | null>(null);
  const [erreurCode, setErreurCode] = useState("");
  const [indexAnalyse, setIndexAnalyse] = useState(0);
  const [copie, setCopie] = useState(false);

  const etapeRef = useRef<Etape>(p.etape);
  etapeRef.current = p.etape;
  const profondeur = useRef(0); // entrées ajoutées à l'historique du navigateur
  const quitterRef = useRef<((choix?: string) => void) | null>(null);
  const premierAffichage = useRef(true);

  // ─── Chargement : reprise de la progression, paramètres d'arrivée ───
  useEffect(() => {
    const params = lireParametresInscription(new URLSearchParams(window.location.search));
    let reprise: Progression | null = null;
    try { reprise = lireProgression(localStorage.getItem(CLE_PROGRESSION)); } catch {}
    const base = reprise ?? DEPART;
    setP({ ...base, email: base.email || params.email, planParam: params.plan || base.planParam });
    setVenteSaisie(base.vente);
    setNomSaisi(base.nom);
    setRepris(!!reprise && reprise.etape !== "type"); // rien à reprendre sur le premier écran
    setCoupe(sonCoupe());
    setLeger(detecterLeger());
    setCharge(true);
  }, []);

  // Sauvegarde à chaque changement (sans mot de passe) ; effacée une fois la boutique révélée.
  useEffect(() => {
    if (!charge || p.etape === "revelation") return;
    try { localStorage.setItem(CLE_PROGRESSION, JSON.stringify({ ...p, le: Date.now() })); } catch {}
  }, [p, charge]);

  // Mesure : vue de chaque écran ; abandon si la page se ferme avant la fin.
  useEffect(() => {
    if (!charge) return;
    quitterRef.current = suivreEtape(p.etape);
  }, [p.etape, charge]);
  useEffect(() => surveillerAbandon(() => etapeRef.current), []);

  // Focus sur la question à chaque écran (clavier, lecteur d'écran), page remontée en haut.
  useEffect(() => {
    if (!charge) return;
    if (premierAffichage.current) { premierAffichage.current = false; return; }
    window.scrollTo({ top: 0 });
    document.getElementById(`q-${p.etape}`)?.focus({ preventScroll: true });
  }, [p.etape, charge]);

  // ─── Navigation ───
  const aller = useCallback((etape: Etape, mode: "pousser" | "remplacer" = "pousser") => {
    setP((x) => ({ ...x, etape }));
    try {
      if (mode === "pousser") { history.pushState({ insc: etape }, ""); profondeur.current++; }
      else history.replaceState({ insc: etape }, "");
    } catch {}
  }, []);

  const retourLogique = useCallback(() => {
    const prec = PRECEDENT[etapeRef.current];
    if (prec) setP((x) => ({ ...x, etape: prec }));
    setErreurs({});
  }, []);

  useEffect(() => {
    const surRetour = () => {
      profondeur.current = Math.max(0, profondeur.current - 1);
      const e = etapeRef.current;
      if (SANS_RETOUR.includes(e)) { try { history.pushState({ insc: e }, ""); profondeur.current++; } catch {} return; }
      retourLogique();
    };
    window.addEventListener("popstate", surRetour);
    return () => window.removeEventListener("popstate", surRetour);
  }, [retourLogique]);

  const retour = () => { if (profondeur.current > 0) history.back(); else retourLogique(); };

  /** Choix validé : son de poussée (départ immédiat), vibration courte, écran suivant. */
  const valider = (suivante: Etape, maj: Partial<Progression>, valeur?: string) => {
    activerAudio();
    jouerPoussee(poussee(suivante));
    vibrer(12);
    quitterRef.current?.(valeur);
    setErreurs({});
    setErreurGlobale("");
    setP((x) => ({ ...x, ...maj }));
    aller(suivante);
  };

  const basculerSon = () => {
    const c = !coupe;
    couperSon(c);
    setCoupe(c);
    if (!c) activerAudio();
  };

  // ─── Analyse par Axia (plan + 4 designs) ───
  useEffect(() => {
    if (p.etape !== "analyse") return;
    const sig = signatureReponses(p);
    if (p.plan && p.planPour === sig) { aller("design", "remplacer"); return; }
    const ctrl = new AbortController();
    setIndexAnalyse(0);
    const iv = setInterval(() => setIndexAnalyse((i) => Math.min(i + 1, ETAPES_ANALYSE.length - 1)), 2600);
    const typeLabel = p.typeBoutique === "physique" ? "physiques uniquement" : p.typeBoutique === "digital" ? "digitaux uniquement (ebooks, formations, templates…)" : "";
    const description = `${p.vente}. Nom de boutique choisi par le marchand: "${p.nom}". Pays: ${p.paysNom} (${p.paysCode}).${typeLabel ? ` Type de produits: ${typeLabel}.` : ""}`;
    fetch("/api/ai/onboarding", {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: ctrl.signal,
      body: JSON.stringify({ phase: "analyser", description }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.plan) throw new Error(data.message || "Erreur d'analyse.");
        // Le nom et le pays viennent du marchand, jamais de l'IA ; la devise suit le pays.
        const plan: Plan = { ...data.plan, nomBoutique: p.nom, pays: p.paysCode, devise: PAYS_DEVISES[p.paysCode] || p.devise };
        const ids = choisir4Themes(p.vente, plan.themeId, p.typeBoutique === "digital");
        setP((x) => ({
          ...x, plan: ids.includes(plan.themeId) ? plan : { ...plan, themeId: ids[0] },
          themeIds: ids, messageIA: data.messageIA || plan.messageIA || "", planPour: sig,
        }));
        aller("design", "remplacer");
      })
      .catch(() => {
        if (ctrl.signal.aborted) return;
        suivre("erreur", "analyse");
        // Repli : plan par défaut (designs du secteur, aucun produit) plutôt qu'un retour au pays.
        // Les produits s'ajoutent ensuite depuis le tableau de bord.
        const ids = choisir4Themes(p.vente, undefined, p.typeBoutique === "digital");
        const plan: Plan = {
          nomBoutique: p.nom, slug: slugify(p.nom) || "boutique", categorie: p.vente.slice(0, 80), pays: p.paysCode,
          devise: PAYS_DEVISES[p.paysCode] || p.devise, themeId: ids[0], description: "", produits: [],
          livraison: { locale: 0, nationale: 0, gratuite: 0 },
        };
        setP((x) => ({ ...x, plan, themeIds: ids, planPour: sig, messageIA: "Je n'ai pas pu tout préparer, mais voici des designs adaptés à ton activité. Tu ajouteras tes produits ensuite." }));
        aller("design", "remplacer");
      })
      .finally(() => clearInterval(iv));
    return () => { ctrl.abort(); clearInterval(iv); };
  }, [p.etape]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Création de la boutique (pendant le compte à rebours) ───
  const lancer = async () => {
    if (!p.plan) return;
    activerAudio();
    jouerDecollage();
    vibrer([40, 60, 90]);
    quitterRef.current?.();
    const identifiants = { email: p.email.trim().toLowerCase(), password: motDePasse };
    setCreation({ fini: false });
    setErreurGlobale("");
    aller("decollage");
    try {
      const res = await fetch("/api/ai/onboarding", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phase: "executer", plan: p.plan, typeBoutique: p.typeBoutique || undefined, designsProposes: p.themeIds, charte: p.charte,
          compte: { name: p.prenom.trim(), email: identifiants.email, password: motDePasse, whatsapp: p.whatsapp.trim() },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Erreur lors de la création.");
      setCompte(identifiants);
      setP((x) => ({ ...x, creee: { email: identifiants.email, slug: data.slug } }));
      // Code par email (double authentification) : demandé maintenant, pendant le vol.
      let codeRequis = false;
      try { codeRequis = !(await demanderCodeConnexion(identifiants.email, identifiants.password)); }
      catch (e) { codeRequis = true; setErreurCode(e instanceof Error ? e.message : ""); } // l'écran du code propose de le renvoyer
      setCreation({ fini: true, slug: data.slug, codeRequis });
    } catch (e) {
      arreterSons();
      suivre("erreur", "decollage");
      setErreurGlobale(e instanceof Error && e.message !== "Failed to fetch" ? e.message : "Erreur réseau.");
      setP((x) => ({ ...x, etape: "acces" }));
      try { history.replaceState({ insc: "acces" }, ""); } catch {}
    }
  };

  // Renvoie un message d'erreur, ou null une fois connecté.
  const connecter = useCallback(async (identifiants: { email: string; password: string }, code?: string): Promise<string | null> => {
    const lr = await signIn("credentials", { ...identifiants, code, redirect: false });
    // next-auth répond « ok » même quand la connexion est refusée : seul `error` le dit.
    if (!lr?.ok || lr.error) {
      if (code) return "Code invalide ou expiré";
      window.location.href = "/connexion?inscription=success";
      return null;
    }
    suivre("fin", "revelation");
    try { localStorage.removeItem(CLE_PROGRESSION); } catch {}
    aller("revelation", "remplacer");
    return null;
  }, [aller]);

  const apresVol = useCallback(() => {
    if (!compte) return;
    if (creation.codeRequis) aller("code", "remplacer");
    else connecter(compte).catch(() => { window.location.href = "/connexion?inscription=success"; });
  }, [compte, creation.codeRequis, aller, connecter]);

  // Rechargement après la création : plus de mot de passe en mémoire, il reste à se connecter.
  const creeeSansCompte = p.etape === "code" && !compte && !!p.creee;
  useEffect(() => { if (creeeSansCompte) try { localStorage.removeItem(CLE_PROGRESSION); } catch {} }, [creeeSansCompte]);

  // ─── Validation des champs libres (sans son ni vibration en cas d'erreur) ───
  const validerVente = () => {
    const v = venteSaisie.trim();
    if (v.length < 3) { setErreurs({ vente: "Dis-moi en quelques mots ce que tu vends." }); return; }
    valider("nom", { vente: v }, "libre");
  };
  const validerNom = () => {
    const n = nomSaisi.trim();
    if (n.length < 2) { setErreurs({ nom: "Donne un nom d'au moins 2 caractères." }); return; }
    valider("pays", { nom: n });
  };
  const choisirPays = (code: string, nom: string) => valider("analyse", { paysCode: code, paysNom: nom, devise: PAYS_DEVISES[code] || "XOF" }, code);
  const validerIdentite = () => {
    const e: Record<string, string> = {};
    if (p.prenom.trim().length < 2) e.prenom = "Minimum 2 caractères";
    if (p.whatsapp.trim().length < 8) e.whatsapp = "Numéro requis";
    if (Object.keys(e).length) { setErreurs(e); return; }
    valider("acces", {});
  };
  const validerAcces = () => {
    const e: Record<string, string> = {};
    if (!emailValide(p.email.trim())) e.email = "Email invalide";
    if (motDePasse.length < 6) e.password = "Minimum 6 caractères";
    if (Object.keys(e).length) { setErreurs(e); return; }
    lancer();
  };

  // ─── Aperçu ───
  const planAJour = !!p.plan && p.planPour === signatureReponses(p);
  const apercuVisible = ["vente", "nom", "pays", "analyse", "design", "charte", "identite", "acces"].includes(p.etape);
  // Identité visuelle choisie : prioritaire sur le design dès l'écran « charte ».
  const avecCharte = ["charte", "identite", "acces"].includes(p.etape);
  const apercu = {
    nom: p.etape === "nom" ? nomSaisi : p.nom,
    digital: p.typeBoutique === "digital",
    themeId: planAJour && ["design", "charte", "identite", "acces"].includes(p.etape) ? p.plan!.themeId : undefined,
    logoUrl: avecCharte ? p.charte.logoUrl : undefined,
    couleurs: avecCharte ? p.charte.couleurs : undefined,
    polices: avecCharte ? p.charte.polices : undefined,
    produits: planAJour ? p.plan!.produits : undefined,
    devise: p.plan?.devise || p.devise,
  };
  const avecApercu = apercuVisible || p.etape === "type"; // colonne de droite sur ordinateur
  const slug = creation.slug || p.creee?.slug || "";

  const champ = (id: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement>, apres?: React.ReactNode) => (
    <div>
      <label htmlFor={`champ-${id}`} className="block text-[14px] font-bold text-[#111111] mb-2">{tr(label)}</label>
      <div className="relative">
        <input id={`champ-${id}`} className="insc-champ" aria-invalid={!!erreurs[id]} aria-describedby={erreurs[id] ? `err-${id}` : undefined} {...props} />
        {apres}
      </div>
      <Erreur id={`err-${id}`}>{erreurs[id] && tr(erreurs[id])}</Erreur>
    </div>
  );

  const ecran = (() => {
    switch (p.etape) {
      case "type": return (
        <>
          <Axia>{repris ? tr("On reprend là où tu t'étais arrêté.") : tr("C'est parti. Première question :")}</Axia>
          <Question id="q-type">{tr("Tu vas vendre quel type de produits ?")}</Question>
          <div className="grid gap-3">
            {([
              { v: "physique", icone: <Package size={20} />, titre: "Produits physiques", desc: "Vêtements, bijoux, alimentation… expédiés à tes clients" },
              { v: "digital", icone: <Download size={20} />, titre: "Produits digitaux", desc: "Ebooks, formations, templates… livrés instantanément" },
            ] as const).map((o) => (
              <Carte key={o.v} icone={o.icone} titre={tr(o.titre)} desc={tr(o.desc)} choisi={p.typeBoutique === o.v}
                onClick={() => valider("vente", { typeBoutique: o.v as TypeBoutique }, o.v)} />
            ))}
          </div>
          <div className="inline-flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3">
            <span className="text-[14px] font-bold text-[#111111]">{tr("Tu es livreur ?")}</span>
            <Link href="/inscription/livreur" className="inline-flex items-center h-[44px] px-4 rounded-full text-[14px] font-bold text-[#111111] bg-[#F5A623]">
              {tr("Rejoindre la plateforme →")}
            </Link>
          </div>
        </>
      );

      case "vente": {
        const type = (p.typeBoutique || "physique") as TypeBoutique;
        return (
          <>
            <Axia>{tr("Plus tu es précis, plus ta boutique sera juste.")}</Axia>
            <Question id="q-vente">{tr("Qu'est-ce que tu vends ?")}</Question>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {VENTE_EXEMPLES[type].map((ex) => (
                <Carte key={ex} compacte titre={tr(ex)} choisi={p.vente === ex}
                  onClick={() => { setVenteSaisie(ex); valider("nom", { vente: ex }, "suggestion"); }} />
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); validerVente(); }} onFocus={garderBoutonVisible} className="space-y-3">
              <label htmlFor="champ-vente" className="block text-[14px] font-bold text-[#111111]">{tr("Ou décris-le avec tes mots")}</label>
              <textarea id="champ-vente" rows={3} className="insc-champ" value={venteSaisie} placeholder={tr(VENTE_PLACEHOLDER[type])}
                aria-invalid={!!erreurs.vente} aria-describedby={erreurs.vente ? "err-vente" : undefined}
                onChange={(e) => setVenteSaisie(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); validerVente(); } }} />
              <Erreur id="err-vente">{erreurs.vente && tr(erreurs.vente)}</Erreur>
              <BoutonNoir type="submit" disabled={!venteSaisie.trim()}>{tr("Continuer")}</BoutonNoir>
            </form>
          </>
        );
      }

      case "nom": return (
        <>
          <Axia>{tr("Bien noté. Maintenant, le plus important :")}</Axia>
          <Question id="q-nom">{tr("Comment s'appelle ta boutique ?")}</Question>
          <form onSubmit={(e) => { e.preventDefault(); validerNom(); }} onFocus={garderBoutonVisible} className="space-y-4">
            {champ("nom", "Nom de ta boutique", {
              value: nomSaisi, maxLength: 60, autoComplete: "organization", placeholder: tr("Ex : Adama Store, Kente & Co…"),
              onChange: (e) => setNomSaisi(e.target.value), style: { fontWeight: 700, fontSize: 18 },
            })}
            <BoutonNoir type="submit" disabled={!nomSaisi.trim()}>{tr("Continuer")}</BoutonNoir>
          </form>
        </>
      );

      case "pays": return (
        <>
          <Axia>{tr("J'adapte la devise, la livraison et le design à ton marché.")}</Axia>
          <Question id="q-pays">{tr("Où es-tu basé ?")}</Question>
          {erreurGlobale && (
            <p role="alert" className="text-[14px] font-medium text-[#B91C1C]">{tr(erreurGlobale)}{" "}{tr("— choisis à nouveau ton pays pour relancer l'analyse.")}</p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {PAYS_LIST.map((x) => (
              <Carte key={x.code} compacte icone={<Drapeau code={x.code} taille={24} />} titre={tr(x.nom)} choisi={p.paysCode === x.code}
                onClick={() => choisirPays(x.code, x.nom)} />
            ))}
            <Carte compacte icone={<Globe size={20} />} titre={tr("Autre pays d'Afrique")} choisi={afrique} onClick={() => setAfrique((a) => !a)} />
          </div>
          {afrique && (
            <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-2">
              <p className="text-[14px] font-bold text-[#111111]">{tr("Choisis ton pays parmi les 54 pays d'Afrique")}</p>
              <SelectPays value={PAYS_LIST.some((x) => x.code === p.paysCode) ? "" : p.paysCode} options={PAYS_OPTIONS}
                placeholder={tr("Sélectionne un pays…")}
                onChange={(code) => { const x = PAYS_OPTIONS.find((o) => o.code === code); if (x) choisirPays(x.code, x.nom); }} />
            </div>
          )}
        </>
      );

      case "analyse": return (
        <>
          <Axia>{tr("Parfait. Laisse-moi quelques secondes.")}</Axia>
          <Question id="q-analyse">{tr("Axia prépare {0}", p.nom)}</Question>
          <div aria-live="polite" className="space-y-3">
            {ETAPES_ANALYSE.map((e, i) => (
              <div key={e} className="flex items-center gap-3 text-[15px]" style={{ opacity: i <= indexAnalyse ? 1 : 0.3, transition: "opacity .5s" }}>
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: i < indexAnalyse ? "#111111" : AMBRE, animation: i === indexAnalyse && !leger ? "inscFondu 1s ease-in-out infinite alternate" : undefined }} />
                <span className="text-gray-700">{tr(e)}</span>
              </div>
            ))}
          </div>
          <p className="text-[14px] text-gray-500">{tr("Ça peut prendre jusqu'à une minute.")}</p>
        </>
      );

      case "design": {
        if (!p.plan) return null;
        return (
          <>
            <Axia><span className="line-clamp-3">{p.messageIA ? tr(p.messageIA) : tr("Voici ce que j'ai préparé pour toi.")}</span></Axia>
            <Question id="q-design">{tr("Choisis le design de {0}", p.nom)}</Question>
            <div className="flex sm:grid sm:grid-cols-2 gap-3 overflow-x-auto sm:overflow-visible snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0 pb-2">
              {p.themeIds.map((id, i) => {
                const e = MANIFESTE_LIBRAIRIE.find((x) => x.fichier === id);
                if (!e) return null;
                const sel = p.plan!.themeId === id;
                return (
                  <button key={id} type="button" aria-pressed={sel}
                    onClick={() => setP((x) => (x.plan ? { ...x, plan: { ...x.plan, themeId: id } } : x))}
                    className={`insc-carte ${sel ? "insc-sombre" : ""} flex-[0_0_78%] sm:flex-auto snap-start text-left rounded-2xl overflow-hidden border`}
                    style={{ borderColor: sel ? "#111111" : "#e5e7eb", background: sel ? "#111111" : "#fff", boxShadow: sel ? "0 10px 40px -12px rgba(17,17,17,.45)" : undefined }}>
                    <div className="relative h-[160px] overflow-hidden" style={{ background: e.couleurs.fond || "#fff" }}>
                      <ApercuDesign id={id} url={leger ? "" : urlApercu(id, p.nom, p.plan!.devise, p.plan!.produits, p.typeBoutique === "digital")} nom={e.nom} />
                      {i === 0 && (
                        <span className="absolute top-2.5 left-2.5 z-10 inline-flex items-center gap-1 rounded-full bg-[#111111] text-white text-[11px] font-bold px-2.5 py-1">
                          <Star size={10} fill={AMBRE} color={AMBRE} /> {tr("Recommandé")}
                        </span>
                      )}
                      {sel && <span className="absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-full bg-[#F5A623] flex items-center justify-center"><Check size={15} color="#111111" strokeWidth={3} /></span>}
                    </div>
                    <div className="px-4 py-3">
                      <p className={`text-[14px] font-extrabold ${sel ? "text-white" : "text-[#111111]"}`}>{tr(e.nom)}</p>
                      <p className={`text-[14px] sm:text-[13px] mt-0.5 leading-snug ${sel ? "text-white/70" : "text-gray-500"}`}>{tr(raisonTheme(id, p.nom, p.vente))}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <BoutonNoir onClick={() => valider("charte", {}, p.plan!.themeId)}>{tr("Continuer avec ce design")}</BoutonNoir>
          </>
        );
      }

      case "charte": return p.plan ? (
        <EcranCharte nom={p.nom} themeId={p.plan.themeId} themeIds={p.themeIds} charte={p.charte}
          setCharte={(f) => setP((x) => ({ ...x, charte: f(x.charte) }))}
          onContinuer={() => valider("identite", {}, p.charte.logoUrl ? "logo" : p.charte.sansLogo ? "sans-logo" : "")}
          onPasser={() => valider("identite", {}, "passe")} />
      ) : null;

      case "identite": return (
        <>
          <Axia>{tr("Excellent choix. Plus que deux petites étapes avant le décollage.")}</Axia>
          <Question id="q-identite">{tr("Faisons connaissance")}</Question>
          <form onSubmit={(e) => { e.preventDefault(); validerIdentite(); }} onFocus={garderBoutonVisible} className="space-y-4">
            {champ("prenom", "Ton prénom", { value: p.prenom, autoComplete: "given-name", placeholder: "Aminata", onChange: (e) => setP((x) => ({ ...x, prenom: e.target.value })) })}
            {champ("whatsapp", "Ton numéro WhatsApp", { value: p.whatsapp, type: "tel", inputMode: "tel", autoComplete: "tel", placeholder: exempleTelephone(p.paysCode), onChange: (e) => setP((x) => ({ ...x, whatsapp: e.target.value })) })}
            <BoutonNoir type="submit">{tr("Continuer")}</BoutonNoir>
          </form>
        </>
      );

      case "acces": return (
        <>
          {/* Essai Illimité (lib/essai.ts) : annoncé ici, proposé à l'arrivée sur la plateforme. */}
          <Axia>
            {tr("Ton compte démarre en")}{" "}<strong className="text-[#111111]">{tr("Essentiel (gratuit)")}</strong>.{" "}
            {tr("En bonus, je te proposerai d'essayer")}{" "}<strong className="text-[#111111]">{tr("Illimité")}</strong>{" "}{tr("pendant 7 jours, sans payer et sans carte.")}
          </Axia>
          <Question id="q-acces">{tr("Crée tes accès")}</Question>
          <form onSubmit={(e) => { e.preventDefault(); validerAcces(); }} onFocus={garderBoutonVisible} className="space-y-4">
            {champ("email", "Adresse email", { value: p.email, type: "email", inputMode: "email", autoComplete: "email", placeholder: "aminata@exemple.com", onChange: (e) => setP((x) => ({ ...x, email: e.target.value })) })}
            {champ("password", "Mot de passe", {
              value: motDePasse, type: voirMdp ? "text" : "password", autoComplete: "new-password", placeholder: tr("Minimum 6 caractères"),
              onChange: (e) => setMotDePasse(e.target.value), style: { paddingRight: 56 },
            }, (
              <button type="button" onClick={() => setVoirMdp((v) => !v)} aria-label={voirMdp ? tr("Masquer le mot de passe") : tr("Afficher le mot de passe")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-[44px] h-[44px] rounded-full flex items-center justify-center text-gray-600">
                {voirMdp ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            ))}
            {erreurGlobale && <p role="alert" className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-[14px] text-[#B91C1C]">{tr(erreurGlobale)}</p>}
            <BoutonNoir type="submit">{tr("Lancer le compte à rebours")}</BoutonNoir>
          </form>
        </>
      );

      case "decollage": return (
        <>
          <h1 id="q-decollage" tabIndex={-1} className="sr-only">{tr("Lancement de ta boutique")}</h1>
          <Decollage nom={p.nom} pret={creation.fini} onFini={apresVol} />
        </>
      );

      case "code": return creeeSansCompte ? (
        <div className="text-center space-y-6">
          <Question id="q-code">{tr("Ta boutique est créée.")}</Question>
          <p className="text-[16px] text-gray-500">{tr("Connecte-toi pour la retrouver et la personnaliser.")}</p>
          <div><Link href="/connexion?inscription=success" className="insc-sombre inline-flex items-center justify-center rounded-full px-7 h-14 text-[15px] font-bold text-white bg-[#111111]">{tr("Me connecter")}</Link></div>
        </div>
      ) : compte ? (
        <div className="max-w-md mx-auto">
          <h1 id="q-code" tabIndex={-1} className="sr-only">{tr("Vérifie ton email")}</h1>
          <EcranCode email={compte.email} titre="Ta boutique est prête ! Vérifie ton email" erreurInitiale={erreurCode}
            onValider={(code) => connecter(compte, code)}
            onRenvoyer={() => demanderCodeConnexion(compte.email, compte.password).then(() => {})} />
        </div>
      ) : null;

      case "revelation": return <Revelation nom={p.nom} slug={slug} leger={leger} themeId={p.plan?.themeId} copie={copie}
        onCopier={() => {
          const lien = adresseBoutique(slug) ?? `${window.location.origin}/${slug}`;
          navigator.clipboard?.writeText(lien).then(() => { setCopie(true); setTimeout(() => setCopie(false), 2000); }).catch(() => {});
        }} />;
    }
  })();

  return (
    <div className={`insc relative min-h-[100dvh] bg-white text-[#111111] overflow-x-clip ${leger ? "insc-leger" : ""}`}>
      <style>{CSS}</style>
      <div className="fixed inset-0 pointer-events-none"><HeroFond /></div>

      <header className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-8 pt-[max(1rem,env(safe-area-inset-top))] flex items-center justify-between gap-3">
        <Link href="/" aria-label={tr("Accueil Axso")}><img src="/logo.png" alt="Axso" className="h-10 sm:h-12 w-auto" /></Link>
        <div className="flex items-center gap-2 sm:gap-3">
          {!SANS_RETOUR.includes(p.etape) && (
            <Link href="/connexion" className="inline-flex items-center min-h-[44px] text-[14px] text-gray-600 font-medium text-right leading-tight px-1">
              <span className="hidden sm:inline">{tr("Déjà un compte ?")}&nbsp;</span><span className="font-bold text-[#111111] underline decoration-[#F5A623] decoration-2 underline-offset-4">{tr("Connexion")}</span>
            </Link>
          )}
          <LangueSelecteur ouvrirVers="bas" aligner="droite" />
          <BoutonSon coupe={coupe} onClick={basculerSon} />
        </div>
      </header>

      {p.etape !== "revelation" && (
        <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-8 mt-5"><Jauge p={poussee(p.etape)} /></div>
      )}

      {/* Écran avec aperçu (ordinateur) : deux colonnes ; sans aperçu : contenu centré. */}
      <main className={`relative z-10 max-w-[1200px] mx-auto px-4 sm:px-8 pt-6 pb-[calc(4rem+env(safe-area-inset-bottom))] sm:pt-10 ${avecApercu ? "grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-10 lg:gap-16 items-start" : ""}`}>
        <div className={`min-w-0 w-full max-w-[620px] ${avecApercu ? "" : "mx-auto"}`}>
          {PRECEDENT[p.etape] && <div className="mb-2"><Retour onClick={retour} /></div>}
          {charge && <div key={p.etape} className="insc-ecran space-y-6">{ecran}</div>}
          {/* Téléphone : l'aperçu replié sous l'écran, déplié à la demande (le téléphone entier ne tient pas au-dessus du formulaire). */}
          {charge && apercuVisible && (
            <details className="group lg:hidden mt-8">
              <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer rounded-2xl">
                <ApercuBoutique compact {...apercu}>
                  <span className="flex-shrink-0 inline-flex items-center gap-1 min-h-[44px] pl-2 text-[14px] font-bold text-[#111111]">
                    <span className="group-open:hidden">{tr("Voir l'aperçu")}</span>
                    <span className="hidden group-open:inline">{tr("Masquer")}</span>
                    <ChevronDown size={16} aria-hidden className="transition-transform group-open:rotate-180" />
                  </span>
                </ApercuBoutique>
              </summary>
              <div className="flex justify-center pt-5"><ApercuBoutique {...apercu} /></div>
            </details>
          )}
        </div>
        {avecApercu && (
          <div className="hidden lg:flex justify-center sticky top-8">
            <ApercuBoutique {...apercu} />
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Aperçu d'un design : miniature tout de suite, aperçu personnalisé s'il se charge ───
// Réseau lent ou coupé : on garde la miniature, jamais de page d'erreur dans la carte.
// Version allégée : miniature seule (4 pages complètes en 3G, c'est trop).
function ApercuDesign({ id, url, nom }: { id: string; url: string; nom: string }) {
  const [pret, setPret] = useState(false);
  useEffect(() => { setPret(false); }, [url]);
  return (
    <>
      <img src={miniatureTheme(id)} alt="" decoding="async" className="absolute inset-0 w-full h-full object-cover object-top" />
      {url && (
        <iframe src={url} title={nom} sandbox="allow-same-origin allow-scripts" scrolling="no" tabIndex={-1} aria-hidden
          onLoad={(ev) => { try { setPret(!!ev.currentTarget.contentDocument?.getElementById("view-home")); } catch { setPret(false); } }}
          className="absolute top-0 left-0 border-0 pointer-events-none origin-top-left"
          style={{ width: 1280, height: 640, transform: "scale(0.25)", opacity: pret ? 1 : 0, transition: "opacity .3s" }} />
      )}
    </>
  );
}

// ─── Révélation : la vraie boutique et son lien ───
function Revelation({ nom, slug, leger, themeId, copie, onCopier }: {
  nom: string; slug: string; leger: boolean; themeId?: string; copie: boolean; onCopier: () => void;
}) {
  const tr = useT();
  const [origine, setOrigine] = useState("");
  useEffect(() => { setOrigine(window.location.origin); }, []);
  const lien = adresseBoutique(slug) ?? `${origine}/${slug}`;
  return (
    <>
      <div className="flex justify-center"><Axia>{tr("Décollage réussi. Voici ta boutique.")}</Axia></div>
      <div className="text-center">
        <Question id="q-revelation">
          <span style={{ color: AMBRE }}>{nom}</span>{" "}{tr("est en ligne… presque.")}
        </Question>
      </div>
      <p className="text-[16px] sm:text-[18px] text-gray-500 leading-relaxed text-center">
        {tr("Elle reste privée tant que tu ne la publies pas. Vérifie tes produits proposés par Axia (prix, photos, stock), personnalise ton design, puis publie-la.")}
      </p>
      <div className="relative mx-auto w-full max-w-[560px] aspect-[16/10] rounded-[28px] overflow-hidden border border-gray-200 bg-gray-50 shadow-[0_40px_80px_-30px_rgba(17,17,17,0.45)]">
        {themeId && <img src={miniatureTheme(themeId)} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />}
        {!leger && slug && (
          <iframe src={`/${slug}`} title={tr("Aperçu de {0}", nom)} tabIndex={-1} aria-hidden scrolling="no"
            className="insc-fondu absolute top-0 left-0 border-0 pointer-events-none origin-top-left" style={{ width: 1280, height: 800, transform: "scale(0.4375)" }} />
        )}
      </div>
      {/* Lien de la boutique : l'ouvrir ou le copier (actions secondaires). */}
      <div className="mx-auto flex items-center gap-1 w-full max-w-[560px] rounded-full border border-gray-200 bg-white pl-2 pr-1.5 py-1.5">
        <a href={`/${slug}`} target="_blank" rel="noopener noreferrer" title={tr("Voir ma boutique")}
          className="flex-1 min-w-0 inline-flex items-center gap-2 min-h-[44px] px-3 rounded-full text-[14px] font-semibold text-[#111111] hover:underline">
          <ExternalLink size={15} aria-hidden className="flex-shrink-0" />
          <span className="truncate">{lien.replace(/^https?:\/\//, "")}</span>
          <span className="sr-only">{tr("Voir ma boutique")}</span>
        </a>
        <button type="button" onClick={onCopier} className="flex-shrink-0 inline-flex items-center gap-1.5 h-[44px] px-4 rounded-full text-[14px] font-bold bg-gray-100 text-[#111111]">
          {copie ? <Check size={15} /> : <Copy size={15} />} {copie ? tr("Copié") : tr("Copier")}
        </button>
      </div>
      {/* Une seule suite : l'espace marchand, page Démarrer (qui propose déjà « Construire ma boutique »). */}
      <div className="flex justify-center">
        <BoutonNoir onClick={() => { window.location.href = "/dashboard/demarrer"; }}>{tr("Accéder à mon espace")}</BoutonNoir>
      </div>
    </>
  );
}
