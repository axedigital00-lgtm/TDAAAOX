"use client";
import { useState, useEffect, useCallback } from "react";
import { Users, Gem, Moon, UserPlus, Flame, Sparkles, Mail, Crown } from "lucide-react";
import { Page, PageHeader } from "@/components/dashboard/design-system/components/PageHeader";
import { Banner, Card, Field } from "@/components/dashboard/design-system/components/primitives";
import { Badge } from "@/components/dashboard/design-system/components/Badge";
import { Button } from "@/components/dashboard/design-system/components/Button";
import { useT } from "@/components/I18nProvider";
import { iconePlateforme } from "@/components/brand/LogoPlateforme";

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

  const charger = useCallback(async () => {
    try {
      const [s, h] = await Promise.all([
        fetch("/api/email?action=stats").then(r => r.ok ? r.json() : Promise.reject()),
        fetch("/api/email?action=historique").then(r => r.ok ? r.json() : Promise.reject()),
      ]);
      setStats(s);
      setHistorique(Array.isArray(h) ? h : []);
    } catch {
      setErreur("Erreur chargement");
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
      setErreur("Erreur de génération IA");
    } finally {
      setGenerating(false);
    }
  }

  async function envoyer() {
    if (!sujet.trim() || !corps.trim()) { setErreur("Remplissez le sujet et le message"); return; }
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
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de l'envoi");
      setResult({ envoyes: data.envoyes, total: data.total, source: data.source });
      charger();
    } catch (e: any) {
      setErreur(e.message ?? "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  }

  const nbDest = stats?.segments?.[segment as keyof typeof stats.segments] ?? "...";


  const fournisseurs = [
    { key: "resend" as const, label: "Resend", Icon: iconePlateforme("resend"), actif: stats?.providers.resend, desc: "Jusqu'à 2 000 destinataires par campagne" },
    { key: "gmail" as const, label: "Gmail", Icon: iconePlateforme("gmail"), actif: stats?.providers.gmail, desc: "Votre compte Gmail · 200 destinataires par campagne" },
  ];

  return (
    <Page>
      <PageHeader icon="mail" backHref="/dashboard/marketing" title={tr("E-mails")}
        secondaryActions={[{ content: tr("Actualiser"), onAction: charger }]} />

      <div className="axd-card" style={{ overflow: "hidden", marginBottom: "var(--space-400)" }}>
        <div className="axd-ix-bar" style={{ borderBottom: 0 }}>
          <div className="axd-ix-tabs" role="tablist">
            <button type="button" role="tab" className="axd-ix-tab" aria-selected={onglet === "composer"} onClick={() => setOnglet("composer")}>{tr("Nouvelle campagne")}</button>
            <button type="button" role="tab" className="axd-ix-tab" aria-selected={onglet === "historique"} onClick={() => { setOnglet("historique"); charger(); }}>{tr("Campagnes envoyées")} · {historique.length}</button>
          </div>
        </div>
      </div>

      {onglet === "composer" && (
        <div className="axd-layout">
          <div className="axd-stack">
            <Card title={tr("Contenu")} actions={<Button size="sm" onClick={genererAvecIA} loading={generating}>{tr("Rédiger avec Stella")}</Button>}>
              <div style={{ display: "grid", gap: "var(--space-300)" }}>
                <Field label={tr("Objet")}>{(p) => <input {...p} className="axd-input" value={sujet} onChange={(e) => setSujet(e.target.value)} placeholder={tr("Ex: Offre spéciale pour vous !")} />}</Field>
                <Field label={tr("Message")} help={tr("Variables : {prenom} et {boutique}.")}>{(p) => (
                  <textarea {...p} rows={10} className="axd-input" style={{ height: "auto", padding: "8px 12px" }} value={corps} onChange={(e) => setCorps(e.target.value)} placeholder={tr("Bonjour {prenom},\n\nVotre message ici...")} />
                )}</Field>
              </div>
            </Card>

            {corps && (
              <Card title={tr("Aperçu")} actions={<Button size="sm" variant="plain" onClick={() => setPreview(!preview)}>{preview ? tr("Masquer") : tr("Afficher")}</Button>}>
                {preview && (
                  <div style={{ borderRadius: "var(--radius-lg)", boxShadow: "inset 0 0 0 1px var(--color-border-secondary)", overflow: "hidden" }}>
                    <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--color-border-secondary)", fontWeight: 600 }}>{tr(sujet) || tr("(sans objet)")}</div>
                    <div style={{ padding: 14, whiteSpace: "pre-wrap", maxHeight: 280, overflowY: "auto" }}>
                      {corps.replace(/\{prenom\}/g, "Aminata").replace(/\{boutique\}/g, tr("Votre boutique"))}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {result && <Banner tone="success" title={tr("Campagne envoyée :")}>{result.envoyes.toLocaleString(tr.loc)}/{result.total.toLocaleString(tr.loc)} {tr("e-mails via")} {tr(result.source)}</Banner>}
            {erreur && <Banner tone="critical">{tr(erreur)}</Banner>}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, flexWrap: "wrap" }}>
              <span className="axd-muted" style={{ fontSize: 12, flex: 1, minWidth: 220 }}>{tr("Chaque e-mail contient un lien de désinscription. Les clients désinscrits ne sont jamais comptés ni contactés.")}</span>
              <Button variant="primary" onClick={envoyer} loading={sending} disabled={!sujet || !corps}>{tr("Envoyer ({0})", nbDest)}</Button>
            </div>
          </div>

          <div className="axd-stack">
            <Card title={tr("Destinataires")}>
              <div style={{ display: "grid", gap: 6 }}>
                {SEGMENTS.map((s) => (
                  <button key={s.value} type="button" className="axd-choix axd-choix--ligne" aria-pressed={segment === s.value} onClick={() => setSegment(s.value)}>
                    <b style={{ fontWeight: 500 }}>{tr(s.label)}</b><span>{stats?.segments?.[s.value as keyof typeof stats.segments]?.toLocaleString(tr.loc) ?? "…"}</span>
                  </button>
                ))}
              </div>
            </Card>

            <Card title={tr("Modèle")}>
              <div className="axd-chips" style={{ margin: "0 0 12px" }}>
                {TEMPLATES.map((t) => <button key={t.id} type="button" className="axd-chip" aria-pressed={templateId === t.id} onClick={() => appliquerTemplate(t.id)}>{tr(t.label)}</button>)}
              </div>
              <Field label={tr("Code promo à inclure (facultatif)")}>{(p) => (
                <select {...p} className="axd-input" value={codeId}
                  onChange={(e) => { setCodeId(e.target.value); if (TEMPLATES.find(t => t.id === templateId)?.corps.includes("{offre}")) appliquerTemplate(templateId, e.target.value); }}>
                  <option value="">{codes.length ? tr("Aucun code") : tr("Aucun code promo actif — créez-en un dans Codes promo")}</option>
                  {codes.map(c => <option key={c.id} value={c.id}>{c.code}{c.type === "pourcentage" ? ` (-${c.valeur}%)` : ` (-${c.valeur})`}</option>)}
                </select>
              )}</Field>
            </Card>

            <Card title={tr("Envoi")} padding="none">
              {fournisseurs.map((p) => (
                <button key={p.key} type="button" className="axd-row" disabled={!p.actif} onClick={() => p.actif && setProvider(p.key)} aria-pressed={provider === p.key}
                  style={{ width: "100%", opacity: p.actif ? 1 : .6, background: provider === p.key && p.actif ? "var(--color-surface-secondary)" : undefined }}>
                  <p.Icon size={20} />
                  <div className="axd-row__body"><div className="axd-row__title">{tr(p.label)}</div><div className="axd-row__sub">{p.actif ? tr(p.desc) : tr("À connecter dans Connecteurs")}</div></div>
                  <Badge tone={p.actif ? "success" : "neutral"}>{p.actif ? tr("Connecté") : tr("Non connecté")}</Badge>
                </button>
              ))}
            </Card>
          </div>
        </div>
      )}

      {onglet === "historique" && (
        <div className="axd-card" style={{ overflow: "hidden" }}>
          {historique.length === 0 ? (
            <div className="axd-empty"><h3>{tr("Aucune campagne envoyée")}</h3><p>{tr("Vos campagnes e-mail apparaîtront ici avec le nombre de destinataires.")}</p></div>
          ) : (
            <table className="axd-ix">
              <thead><tr><th>{tr("Objet")}</th><th className="axd-ix-hide-m">{tr("Destinataires")}</th><th className="axd-ix-num">{tr("Envoyés")}</th><th>{tr("Statut")}</th><th className="axd-ix-hide-m">{tr("Date")}</th></tr></thead>
              <tbody>
                {historique.map((c) => (
                  <tr key={c.id}>
                    <td className="axd-ix-primary">{tr(c.sujet)}<div className="axd-muted" style={{ fontWeight: 400, fontSize: 12 }}>{tr(c.source)}</div></td>
                    <td className="axd-ix-hide-m">{tr(SEGMENTS.find(s => s.value === c.segment)?.label ?? c.segment)}</td>
                    <td className="axd-ix-num">{c.nbEnvoyes.toLocaleString(tr.loc)}</td>
                    <td><Badge tone={c.statut === "envoye" ? "success" : "critical"}>{c.statut === "envoye" ? tr("Envoyée") : tr("Échec")}</Badge></td>
                    <td className="axd-ix-hide-m">{new Date(c.createdAt).toLocaleDateString(tr.loc, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </Page>
  );
}
