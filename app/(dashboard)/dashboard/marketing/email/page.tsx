"use client";
import { useState, useEffect, useCallback } from "react";
import { useT } from "@/components/I18nProvider";
import { Badge, Banner, Button, Card, EmptyState, IconButton, IndexTable, PageHeader, Select, Tabs, TextField, Textarea, type Column } from "@/components/ui/adm";
import { Icon } from "@/components/ui/icones";
import { IllustrationCampagnes } from "@/components/ui/illustrations";
import { useConfirmationAdm } from "../kit-marketing";

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
  { value: "tous",     label: "Tous les clients" },
  { value: "vip",      label: "VIP (5 commandes ou 2× la dépense moyenne)" },
  { value: "nouveaux", label: "Nouveaux (≤ 1 commande)" },
  { value: "inactifs", label: "Inactifs (aucun achat en 30 jours)" },
];

const TEMPLATES = [
  {
    id: "promo", label: "Promotion flash",
    sujet: "Offre limitée — {boutique}",
    // {offre} : remplacé par un vrai code promo actif choisi par le marchand (jamais un code inventé).
    corps: "Bonjour {prenom},\n\nNous avons une offre exclusive pour vous !{offre}\n\nÀ très vite,\nL'équipe {boutique}",
  },
  {
    id: "nouveau_produit", label: "Nouveau produit",
    sujet: "Découvrez notre nouveauté — {boutique}",
    corps: "Bonjour {prenom},\n\nNous venons de lancer un nouveau produit que vous allez adorer !\n\nDécouvrez-le maintenant sur notre boutique.\n\nCordialement,\n{boutique}",
  },
  {
    id: "relance", label: "Relance client",
    sujet: "On pense à vous, {prenom} — {boutique}",
    corps: "Bonjour {prenom},\n\nVous nous manquez ! Revenez découvrir nos nouveautés.{offre}\n\nÀ bientôt,\n{boutique}",
  },
  {
    id: "fidelite", label: "Fidélité VIP",
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
  const { confirmer, dialogue } = useConfirmationAdm();

  const charger = useCallback(async () => {
    try {
      const [s, h] = await Promise.all([
        fetch("/api/email?action=stats").then(r => r.ok ? r.json() : Promise.reject()),
        fetch("/api/email?action=historique").then(r => r.ok ? r.json() : Promise.reject()),
      ]);
      setStats(s);
      setHistorique(Array.isArray(h) ? h : []);
    } catch {
      setErreur("Les statistiques et l'historique n'ont pas pu être chargés. Actualisez la page.");
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
      setErreur("Le brouillon n'a pas pu être généré. Réessayez ou écrivez votre message vous-même.");
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
      if (!res.ok) throw new Error(data.error ?? "La campagne n'a pas été envoyée. Vérifiez la connexion de votre service d'envoi (Connecteurs) et réessayez.");
      setResult({ envoyes: data.envoyes, total: data.total, source: data.source });
      charger();
    } catch (e: any) {
      setErreur(e.message || "La campagne n'a pas été envoyée. Vérifiez votre connexion et réessayez.");
    } finally {
      setSending(false);
    }
  }

  const nbDest = stats?.segments?.[segment as keyof typeof stats.segments] ?? "…";


  const radio = (on: boolean) => `flex w-full min-h-10 items-center justify-between gap-2 rounded-(--radius-md) border px-3 py-2 text-left transition-colors ${on ? "border-(--color-border-strong) bg-(--color-surface-selected)" : "border-(--color-border) hover:bg-(--color-surface-secondary)"}`;
  const colonnes: Column<Campagne>[] = [
    { id: "sujet", header: tr("Sujet"), mobilePrimary: true, cell: (c) => tr(c.sujet) },
    { id: "segment", header: tr("Destinataires"), cell: (c) => tr(SEGMENTS.find(s => s.value === c.segment)?.label ?? c.segment) },
    { id: "envoyes", header: tr("Envoyés"), numeric: true, align: "end", cell: (c) => c.nbEnvoyes },
    { id: "source", header: tr("Service"), hideOnMobile: true, cell: (c) => tr(c.source) },
    { id: "statut", header: tr("Statut"), cell: (c) => <Badge tone={c.statut === "envoye" ? "success" : "critical"}>{c.statut === "envoye" ? tr("Envoyé") : tr("Échec")}</Badge> },
    { id: "date", header: tr("Date"), cell: (c) => new Date(c.createdAt).toLocaleDateString(tr.loc, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) },
  ];

  return (
    <div className="max-w-5xl space-y-4">
      {dialogue}
      <PageHeader icon="mail" title={tr("Email Marketing")} backHref="/dashboard/marketing" />

      <Tabs label={tr("Email Marketing")} selected={onglet}
        onSelect={(cle) => { setOnglet(cle as "composer" | "historique"); if (cle === "historique") charger(); }}
        tabs={[{ id: "composer", label: tr("Composer") }, { id: "historique", label: tr("Historique ({0})", historique.length) }]} />

      {/* Services d'envoi connectés */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[
          { key: "resend", label: "Resend",      actif: stats?.providers.resend, desc: "Jusqu'à 2 000 destinataires par campagne" },
          { key: "gmail",  label: "Gmail OAuth", actif: stats?.providers.gmail,  desc: "Votre compte Gmail · 200 destinataires par campagne" },
        ].map((p) => p.actif ? (
          <button key={p.key} type="button" aria-pressed={provider === p.key} onClick={() => setProvider(p.key as "resend" | "gmail")}
            className={`${radio(provider === p.key)} flex-col !items-start !rounded-(--radius-xl) p-4`}>
            <span className="flex w-full items-center gap-2">
              <Icon name="mail" aria-hidden />
              <span className="font-semibold text-(--color-text-strong)">{tr(p.label)}</span>
              <Badge tone="success" className="ml-auto">{tr("Connecté")}</Badge>
            </span>
            <span className="text-xs text-(--color-text-secondary)">{tr(p.desc)}</span>
          </button>
        ) : (
          <Card key={p.key}>
            <div className="flex items-center gap-2">
              <Icon name="mail" aria-hidden />
              <span className="font-semibold text-(--color-text-secondary)">{tr(p.label)}</span>
              <Badge className="ml-auto">{tr("Non connecté")}</Badge>
            </div>
            <p className="text-xs text-(--color-text-secondary)">{tr(p.desc)}</p>
            <Button variant="plain" href="/dashboard/connecteurs">{tr("Connecter dans Connecteurs")}</Button>
          </Card>
        ))}
      </div>

      {onglet === "composer" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <Card title={tr("Destinataires")}>
              <div className="space-y-2" role="radiogroup" aria-label={tr("Destinataires")}>
                {SEGMENTS.map((s) => (
                  <button key={s.value} type="button" role="radio" aria-checked={segment === s.value} onClick={() => setSegment(s.value)} className={radio(segment === s.value)}>
                    <span className={segment === s.value ? "font-semibold text-(--color-text-strong)" : "text-(--color-text-secondary)"}>{tr(s.label)}</span>
                    <span className="text-xs font-semibold tabular-nums text-(--color-text-secondary)">{stats?.segments?.[s.value as keyof typeof stats.segments] ?? "…"}</span>
                  </button>
                ))}
              </div>
            </Card>

            <Card title={tr("Modèle de message")}>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.map((t) => (
                  <button key={t.id} type="button" aria-pressed={templateId === t.id} onClick={() => appliquerTemplate(t.id)} className={radio(templateId === t.id)}>
                    <span className={templateId === t.id ? "font-semibold text-(--color-text-strong)" : "text-(--color-text-secondary)"}>{tr(t.label)}</span>
                  </button>
                ))}
              </div>
              <Select className="mt-4" label={tr("Code promo à inclure (facultatif)")}
                helpText={codes.length ? undefined : tr("Aucun code promo actif — créez-en un dans Codes promo")}
                value={codeId}
                onChange={(e) => { setCodeId(e.target.value); if (TEMPLATES.find(t => t.id === templateId)?.corps.includes("{offre}")) appliquerTemplate(templateId, e.target.value); }}
                options={[{ value: "", label: tr("Aucun code") }, ...codes.map(c => ({ value: c.id, label: `${c.code}${c.type === "pourcentage" ? ` (-${c.valeur}%)` : ` (-${c.valeur})`}` }))]} />
            </Card>
          </div>

          <div className="space-y-4">
            <Card title={tr("Contenu de la campagne")}
              actions={<Button size="sm" icon="sparkle" onClick={genererAvecIA} loading={generating}>{tr("Rédiger un brouillon avec l'IA")}</Button>}>
              <div className="space-y-3">
                <TextField label={tr("Sujet")} required value={sujet} onChange={(e) => setSujet(e.target.value)} placeholder={tr("Ex : Offre spéciale pour vous")} />
                <Textarea label={tr("Message")} required rows={8} value={corps} onChange={(e) => setCorps(e.target.value)}
                  helpText={`${tr("Variables :")} {prenom} {boutique}`} placeholder={tr("Bonjour {prenom},\n\nVotre message ici...")} />
                {corps && (
                  <Button variant="plain" icon="eye" onClick={() => setPreview(!preview)} aria-expanded={preview}>
                    {preview ? tr("Masquer l'aperçu") : tr("Prévisualiser l'email")}
                  </Button>
                )}
                {preview && corps && (
                  <div className="overflow-hidden rounded-(--radius-md) border border-(--color-border)">
                    <div className="border-b border-(--color-border) bg-(--color-surface-secondary) px-4 py-2 text-xs text-(--color-text-secondary)">
                      {tr("Aperçu —")}{" "}{tr(sujet) || tr("(sans sujet)")}{" · "}{tr("exemple avec un prénom fictif")}
                    </div>
                    <div className="max-h-60 overflow-y-auto bg-white p-4">
                      {/* Reproduit l'e-mail réellement envoyé (en-tête aux couleurs de la marque, D9). */}
                      <div className="rounded-t-xl bg-(--color-brand) px-6 py-4 text-base font-bold text-white">{tr("Votre Boutique")}</div>
                      <div className="rounded-b-xl border border-t-0 border-(--color-border-secondary) px-6 py-4 leading-relaxed text-(--color-text)" style={{ whiteSpace: "pre-wrap" }}>
                        {corps.replace(/\{prenom\}/g, "Aminata").replace(/\{boutique\}/g, "Votre Boutique")}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {result && (
              <Banner tone="success" title={tr("Campagne envoyée")}>
                {tr("{0}/{1} e-mails envoyés via {2}", result.envoyes, result.total, tr(result.source))}
              </Banner>
            )}
            {erreur && <Banner tone="critical" title={tr(erreur)} />}

            <Button variant="primary" fullWidth icon="mail" onClick={envoyer} disabled={!sujet || !corps} loading={sending}>
              {tr("Envoyer la campagne ({0})", nbDest)}
            </Button>
            <p className="text-center text-xs text-(--color-text-secondary)">
              {tr("Chaque e-mail contient un lien de désinscription. Les clients désinscrits ne sont jamais comptés ni contactés.")}
            </p>
          </div>
        </div>
      )}

      {onglet === "historique" && (
        historique.length === 0 ? (
          <EmptyState title={tr("Aucune campagne envoyée")} image={<IllustrationCampagnes />}
            actions={<Button onClick={() => setOnglet("composer")}>{tr("Composer une campagne")}</Button>}>
            {tr("Vos campagnes apparaîtront ici avec le nombre d'e-mails envoyés.")}
          </EmptyState>
        ) : (
          <Card title={tr("Campagnes envoyées")} padding="none"
            actions={<IconButton icon="history" aria-label={tr("Actualiser l'historique")} onClick={charger} />}>
            <IndexTable label={tr("Campagnes envoyées")} rows={historique} columns={colonnes} getId={(c) => c.id} />
          </Card>
        )
      )}
    </div>
  );
}
