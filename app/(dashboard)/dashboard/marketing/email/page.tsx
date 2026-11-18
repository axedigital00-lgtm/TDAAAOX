"use client";
import { useState, useEffect, useCallback } from "react";
import { Send, Wand2, Users, CheckCircle2, XCircle, Mail, RefreshCw, Sparkles, Eye, Gem, Moon, Flame, Crown, UserPlus } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { Alerte, Badge, Bouton, BoutonIcone, Champ, CLASSE_SAISIE, EnTetePage, EtatVide, Saisie, ZoneTexte, useConfirmation } from "@/components/ui";

// ── Types ────────────────────────────────────────────────────────────────────
interface Stats {
  segments: { tous: number; vip: number; nouveaux: number; inactifs: number };
  providers: { gmail: boolean; resend: boolean };
}

interface CodePromo {
  id: string; code: string; type: string; valeur: number; actif: boolean;
  dateExpiration: string | null; maxUtilisations: number | null; utilisations: number;
}

interface Campagne {
  id: string; sujet: string; corps: string; segment: string;
  nbEnvoyes: number; statut: string; source: string; createdAt: string;
}

const SEGMENTS = [
  { value: "tous",     label: "Tous les clients",          Icon: Users    },
  { value: "vip",      label: "VIP (2× la dépense moyenne)", Icon: Gem   },
  { value: "nouveaux", label: "Nouveaux (≤ 1 commande)",   Icon: UserPlus },
  { value: "inactifs", label: "Inactifs (aucun achat en 30 jours)", Icon: Moon },
];

const TEMPLATES = [
  {
    id: "promo", label: "Promotion flash", Icon: Flame,
    sujet: "Offre limitée — {boutique}",
    // {offre} : remplacé par un vrai code promo actif choisi par le marchand (jamais un code inventé).
    corps: "Bonjour {prenom},\n\nNous avons une offre exclusive pour vous !{offre}\n\nÀ très vite,\nL'équipe {boutique}",
  },
  {
    id: "nouveau_produit", label: "Nouveau produit", Icon: Sparkles,
    sujet: "Découvrez notre nouveauté — {boutique}",
    corps: "Bonjour {prenom},\n\nNous venons de lancer un nouveau produit que vous allez adorer !\n\nDécouvrez-le maintenant sur notre boutique.\n\nCordialement,\n{boutique}",
  },
  {
    id: "relance", label: "Relance client", Icon: Mail,
    sujet: "On pense à vous, {prenom} — {boutique}",
    corps: "Bonjour {prenom},\n\nVous nous manquez ! Revenez découvrir nos nouveautés.{offre}\n\nÀ bientôt,\n{boutique}",
  },
  {
    id: "fidelite", label: "Fidélité VIP", Icon: Crown,
    sujet: "Merci pour votre fidélité, {prenom} !",
    corps: "Bonjour {prenom},\n\nEn tant que client VIP de {boutique}, vous bénéficiez d'un accès exclusif à nos meilleures offres.\n\nMerci pour votre confiance !\n\nL'équipe {boutique}",
  },
];

// ── Composant principal ──────────────────────────────────────────────────────
export default function EmailMarketingPage() {
  const tr = useT();
  const [stats, setStats] = useState<Stats | null>(null);
  const [historique, setHistorique] = useState<Campagne[]>([]);
  const [segment, setSegment] = useState("tous");
  const [sujet, setSujet] = useState("");
  const [corps, setCorps] = useState("");
  const [provider, setProvider] = useState<"resend" | "gmail">("resend");
  const [templateId, setTemplateId] = useState("promo");
  const [codes, setCodes] = useState<CodePromo[]>([]);
  const [codeId, setCodeId] = useState("");
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ envoyes: number; total: number; source: string } | null>(null);
  const [erreur, setErreur] = useState("");
  const [onglet, setOnglet] = useState<"composer" | "historique">("composer");
  const [preview, setPreview] = useState(false);
  const { confirmer, dialogue } = useConfirmation();

  const charger = useCallback(async () => {
    try {
      const [s, h] = await Promise.all([
        fetch("/api/email?action=stats").then(r => r.ok ? r.json() : Promise.reject()),
        fetch("/api/email?action=historique").then(r => r.ok ? r.json() : Promise.reject()),
      ]);
      setStats(s);
      setHistorique(Array.isArray(h) ? h : []);
    } catch {
      setErreur("Les statistiques et l'historique n'ont pas pu être chargés. Actualise la page.");
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  // Vrais codes promo utilisables (actifs, non expirés, non épuisés).
  useEffect(() => {
    fetch("/api/codes-promo").then(r => r.ok ? r.json() : []).then((liste: CodePromo[]) => {
      const now = Date.now();
      setCodes((Array.isArray(liste) ? liste : []).filter(c => c.actif
        && (!c.dateExpiration || new Date(c.dateExpiration).getTime() > now)
        && (c.maxUtilisations == null || c.utilisations < c.maxUtilisations)));
    }).catch(() => {});
  }, []);

  function appliquerTemplate(id: string, idCode = codeId) {
    const t = TEMPLATES.find(t => t.id === id);
    if (!t) return;
    const c = codes.find(c => c.id === idCode);
    const offre = c ? `\n\nUtilisez le code ${c.code}${c.type === "pourcentage" ? ` (-${c.valeur}%)` : ""} lors de votre prochain achat.` : "";
    setTemplateId(id);
    setSujet(t.sujet);
    setCorps(t.corps.replace("{offre}", offre));
  }

  async function genererAvecIA() {
    setGenerating(true);
    setErreur("");
    try {
      // Brouillon de texte uniquement : /api/ai/chat n'a aucun outil (rien n'est envoyé).
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `Rédige un brouillon d'email marketing pour le segment "${SEGMENTS.find(s => s.value === segment)?.label}". Template style: ${templateId}. Retourne uniquement un JSON avec les clés "sujet" et "corps". Corps en texte simple avec variables {prenom} et {boutique}. N'invente ni prix, ni réduction, ni chiffre.`,
          }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      const content: string = data.reponse ?? "";
      // Gourmand : le corps contient {prenom}/{boutique}, un match paresseux s'arrêterait dessus.
      const match = content.match(/\{[\s\S]*"sujet"[\s\S]*\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          if (parsed.sujet) setSujet(parsed.sujet);
          if (parsed.corps) setCorps(parsed.corps);
        } catch {
          // Fallback: use the whole content as corps
          setCorps(content.slice(0, 2000));
        }
      } else {
        setCorps(content.slice(0, 2000));
      }
    } catch {
      setErreur("Le brouillon n'a pas pu être généré. Réessaie ou écris ton message toi-même.");
    } finally {
      setGenerating(false);
    }
  }

  async function envoyer() {
    if (!sujet.trim() || !corps.trim()) { setErreur("Remplissez le sujet et le message"); return; }
    // Envoi réel à des clients : impossible à annuler, on confirme en nommant le public.
    const segLabel = tr(SEGMENTS.find(s => s.value === segment)?.label ?? segment);
    if (!(await confirmer({
      titre: tr("Envoyer cette campagne ?"),
      objet: <>« {sujet} »<br /><span className="font-normal">{tr("{0} · {1} destinataire(s)", segLabel, nbDest)}</span></>,
      description: tr("Les e-mails partent immédiatement et ne peuvent pas être rappelés. Les clients désinscrits ne sont pas contactés."),
      libelleConfirmer: tr("Envoyer à {0} client(s)", nbDest),
      destructive: false,
    }))) return;
    setSending(true);
    setErreur("");
    setResult(null);
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sujet, corps, segment, provider }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "La campagne n'a pas été envoyée. Vérifie la connexion de ton service d'envoi (Connecteurs) et réessaie.");
      setResult({ envoyes: data.envoyes, total: data.total, source: data.source });
      charger();
    } catch (e: any) {
      setErreur(e.message || "La campagne n'a pas été envoyée. Vérifie ta connexion et réessaie.");
    } finally {
      setSending(false);
    }
  }

  const nbDest = stats?.segments?.[segment as keyof typeof stats.segments] ?? "…";


  return (
    <div className="space-y-6 max-w-5xl">
      {dialogue}
      <EnTetePage className="mb-0"
        retour={{ href: "/dashboard/marketing", libelle: tr("Marketing") }}
        titre={tr("Email Marketing")}
        description={tr("Envoyez des campagnes directement depuis Axso")} />

      <div className="flex gap-1 bg-carte-2 border border-bordure rounded-controle p-1 w-full sm:w-fit" role="tablist" aria-label={tr("Email Marketing")}>
        {([["composer", tr("Composer")], ["historique", <>{tr("Historique (")}{historique.length})</>]] as const).map(([cle, libelle]) => (
          <button key={cle} type="button" role="tab" aria-selected={onglet === cle}
            onClick={() => { setOnglet(cle); if (cle === "historique") charger(); }}
            className={`flex-1 sm:flex-none min-h-10 px-4 rounded-controle text-sm font-semibold transition-colors ${onglet === cle ? "bg-carte text-encre shadow-sm" : "text-doux hover:text-encre"}`}>
            {libelle}
          </button>
        ))}
      </div>

      {/* Providers connectés */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { key: "resend", label: "Resend",      Icon: Send, actif: stats?.providers.resend, desc: "Jusqu'à 2 000 destinataires par campagne" },
          { key: "gmail",  label: "Gmail OAuth", Icon: Mail, actif: stats?.providers.gmail,  desc: "Votre compte Gmail · 200 destinataires par campagne" },
        ].map((p) => (
          p.actif ? (
          <button
            key={p.key} type="button" aria-pressed={provider === p.key}
            onClick={() => setProvider(p.key as "resend" | "gmail")}
            className={`p-4 rounded-carte border-2 text-left transition-colors ${provider === p.key ? "border-primaire bg-primaire-fond" : "border-bordure bg-carte hover:border-bordure-forte"}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <p.Icon className="size-4 text-doux flex-shrink-0" aria-hidden />
              <span className="font-semibold text-encre text-sm">{tr(p.label)}</span>
              <Badge ton="succes" className="ml-auto">{tr("Connecté")}</Badge>
            </div>
            <p className="ax-aide">{tr(p.desc)}</p>
          </button>
          ) : (
          <div key={p.key} className="p-4 rounded-carte border-2 border-bordure bg-carte-2">
            <div className="flex items-center gap-2 mb-1">
              <p.Icon className="size-4 text-doux flex-shrink-0" aria-hidden />
              <span className="font-semibold text-doux text-sm">{tr(p.label)}</span>
              <Badge className="ml-auto">{tr("Non connecté")}</Badge>
            </div>
            <p className="ax-aide">{tr(p.desc)}</p>
            <Bouton variante="fantome" taille="compact" href="/dashboard/connecteurs" className="mt-1 -ml-3">{tr("Connecter dans Connecteurs")}</Bouton>
          </div>
          )
        ))}
      </div>

      {onglet === "composer" && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Panneau gauche — formulaire */}
          <div className="space-y-5">
            {/* Segment */}
            <div className="ax-card p-5">
              <h2 className="ax-sous-titre mb-3">{tr("Destinataires")}</h2>
              <div className="space-y-2" role="radiogroup" aria-label={tr("Destinataires")}>
                {SEGMENTS.map((s) => (
                  <button
                    key={s.value} type="button" role="radio" aria-checked={segment === s.value}
                    onClick={() => setSegment(s.value)}
                    className={`w-full min-h-11 flex items-center justify-between gap-2 px-4 py-2.5 rounded-controle border-2 text-sm text-left transition-colors ${segment === s.value ? "border-primaire bg-primaire-fond" : "border-bordure hover:border-bordure-forte"}`}
                  >
                    <span className="flex items-center gap-2">
                      <s.Icon className={`size-4 flex-shrink-0 ${segment === s.value ? "text-attention" : "text-doux"}`} aria-hidden />
                      <span className={segment === s.value ? "font-semibold text-encre" : "text-doux"}>{tr(s.label)}</span>
                    </span>
                    <span className="text-xs font-bold text-doux tabular-nums">{stats?.segments?.[s.value as keyof typeof stats.segments] ?? "…"}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Templates */}
            <div className="ax-card p-5">
              <h2 className="ax-sous-titre mb-3">{tr("Modèle de message")}</h2>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id} type="button" aria-pressed={templateId === t.id}
                    onClick={() => appliquerTemplate(t.id)}
                    className={`min-h-11 p-3 rounded-controle border-2 text-left text-sm transition-colors flex items-center gap-2 ${templateId === t.id ? "border-primaire bg-primaire-fond" : "border-bordure hover:border-bordure-forte"}`}
                  >
                    <t.Icon className={`size-4 flex-shrink-0 ${templateId === t.id ? "text-attention" : "text-doux"}`} aria-hidden />
                    <span className={`font-medium ${templateId === t.id ? "text-encre" : "text-doux"}`}>{tr(t.label)}</span>
                  </button>
                ))}
              </div>
              <Champ className="mt-4" label={tr("Code promo à inclure")} mention="facultatif"
                aide={codes.length ? undefined : tr("Aucun code promo actif — créez-en un dans Codes promo")}>
                {(a) => (
                  <select {...a}
                    value={codeId}
                    onChange={(e) => { setCodeId(e.target.value); if (TEMPLATES.find(t => t.id === templateId)?.corps.includes("{offre}")) appliquerTemplate(templateId, e.target.value); }}
                    className={CLASSE_SAISIE}
                  >
                    <option value="">{tr("Aucun code")}</option>
                    {codes.map(c => <option key={c.id} value={c.id}>{c.code}{c.type === "pourcentage" ? ` (-${c.valeur}%)` : ` (-${c.valeur})`}</option>)}
                  </select>
                )}
              </Champ>
            </div>
          </div>

          {/* Panneau droit — éditeur */}
          <div className="space-y-4">
            <div className="ax-card p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="ax-sous-titre">{tr("Contenu de la campagne")}</h2>
                <Bouton variante="secondaire" taille="compact" onClick={genererAvecIA} charge={generating} texteCharge={tr("Rédaction…")}
                  icone={<Wand2 className="size-3.5" aria-hidden />}>
                  {tr("Rédiger un brouillon avec l'IA")}
                </Bouton>
              </div>

              <Saisie label={tr("Sujet")} required value={sujet} onChange={(e) => setSujet(e.target.value)}
                placeholder={tr("Ex: 🔥 Offre spéciale pour vous !")} />
              <ZoneTexte label={tr("Message")} required rows={8} value={corps} onChange={(e) => setCorps(e.target.value)}
                aide={<>{tr("Variables :")}{" "}{"{prenom}"} {"{boutique}"}</>}
                placeholder={tr("Bonjour {prenom},\n\nVotre message ici...")} />

              {/* Preview toggle */}
              {corps && (
                <Bouton variante="fantome" taille="compact" onClick={() => setPreview(!preview)} aria-expanded={preview} icone={<Eye className="size-3.5" aria-hidden />}>
                  {preview ? tr("Masquer l'aperçu") : tr("Prévisualiser l'email")}
                </Bouton>
              )}

              {preview && corps && (
                <div className="border border-bordure rounded-controle overflow-hidden">
                  <div className="bg-carte-2 px-4 py-2 border-b border-bordure text-xs text-doux">
                    {tr("Aperçu —")}{" "}{tr(sujet) || tr("(sans sujet)")}{" · "}{tr("exemple avec un prénom fictif")}
                  </div>
                  <div className="p-4 bg-white max-h-60 overflow-y-auto">
                    <div className="bg-[#F5A623] text-white px-6 py-4 rounded-t-xl font-bold text-base">{tr("Votre Boutique")}</div>
                    <div className="px-6 py-4 text-sm text-gray-700 leading-relaxed border border-t-0 border-gray-100 rounded-b-xl" style={{ whiteSpace: "pre-wrap" }}>
                      {corps.replace(/\{prenom\}/g, "Aminata").replace(/\{boutique\}/g, "Votre Boutique")}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Résultats */}
            {result && (
              <Alerte ton="succes" titre={tr("Campagne envoyée")}>
                {tr(result.envoyes)}/{result.total}{" "}{tr("emails via")}{" "}{tr(result.source)}
              </Alerte>
            )}
            {erreur && (
              <Alerte ton="erreur" titre={tr(erreur)} />
            )}

            <Bouton taille="grand" large onClick={envoyer} disabled={!sujet || !corps} charge={sending} texteCharge={tr("Envoi…")}
              icone={<Send className="size-4" aria-hidden />}>
              {tr("Envoyer la campagne ({0})", nbDest)}
            </Bouton>
            <p className="ax-aide text-center">
              {tr("Chaque e-mail contient un lien de désinscription. Les clients désinscrits ne sont jamais comptés ni contactés.")}
            </p>
          </div>
        </div>
      )}

      {onglet === "historique" && (
        <div className="ax-card overflow-hidden">
          <div className="px-5 py-3 border-b border-bordure flex items-center justify-between">
            <h2 className="ax-sous-titre">{tr("Campagnes envoyées")}</h2>
            <BoutonIcone label={tr("Actualiser l'historique")} onClick={charger}><RefreshCw className="size-4" aria-hidden /></BoutonIcone>
          </div>
          {historique.length === 0 ? (
            <EtatVide className="m-4" icone={<Mail />} titre={tr("Aucune campagne envoyée")}
              texte={tr("Tes campagnes apparaîtront ici avec le nombre d'e-mails envoyés.")}>
              <Bouton variante="secondaire" onClick={() => setOnglet("composer")}>{tr("Composer une campagne")}</Bouton>
            </EtatVide>
          ) : (
            <div className="divide-y divide-bordure">
              {historique.map((c) => (
                <div key={c.id} className="px-5 py-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-controle flex items-center justify-center flex-shrink-0 ${c.statut === "envoye" ? "bg-succes-fond text-succes" : "bg-erreur-fond text-erreur"}`} aria-hidden>
                    {c.statut === "envoye" ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-encre text-sm truncate">{tr(c.sujet)}</p>
                    <p className="ax-aide">
                      {tr(SEGMENTS.find(s => s.value === c.segment)?.label) ?? tr(c.segment)} · {tr(c.nbEnvoyes)}{" "}{tr("envoyé")}{c.nbEnvoyes > 1 ? "s" : ""} · {tr(c.source)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <Badge ton={c.statut === "envoye" ? "succes" : "erreur"}>{c.statut === "envoye" ? tr("Envoyé") : tr("Échec")}</Badge>
                    <p className="ax-aide mt-1">
                      {new Date(c.createdAt).toLocaleDateString(tr.loc, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
