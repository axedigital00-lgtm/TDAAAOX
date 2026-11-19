"use client";
import { useState, useEffect } from "react";
import { useT } from "@/components/I18nProvider";
import { toast } from "sonner";
import { Badge, Banner, Button, Card, ContextualSaveBar, IconButton, PageHeader, Select, SkeletonPage, TextField, Textarea, Toggle } from "@/components/ui/adm";

interface ChatbotConfig {
  delaiReponse: number;
  personnalite: string;
  messageAccueil: string;
  horaires: { actif: boolean; debut: string; fin: string };
  motsClesExclus: string[];
  instructionsSupp: string;
  langue: string;
}

const PERSONNALITES = [
  { id: "professionnel", label: "Professionnel", desc: "Formel, courtois, centré sur le service client" },
  { id: "chaleureux", label: "Chaleureux", desc: "Amical, enthousiaste, proche des clients" },
  { id: "concis", label: "Concis", desc: "Réponses courtes et directes, va à l'essentiel" },
  { id: "vendeur", label: "Commercial", desc: "Met en avant les produits, incite à l'achat" },
];

const LANGUES = [
  { id: "fr", label: "Français" },
  { id: "en", label: "English" },
  { id: "fr_en", label: "Français + English (auto)" },
  { id: "wo", label: "Wolof" },
  { id: "ha", label: "Haoussa" },
];

const EXEMPLES_EXCLUS = ["STOP", "Désabonner", "désabonnement", "unsubscribe"];

export default function ChatbotPage() {
  const t = useT();
  const [actif, setActif] = useState(false);
  const [config, setConfig] = useState<ChatbotConfig>({
    delaiReponse: 0,
    personnalite: "professionnel",
    messageAccueil: "",
    horaires: { actif: false, debut: "08:00", fin: "20:00" },
    motsClesExclus: [],
    instructionsSupp: "",
    langue: "fr",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newMotsCle, setNewMotsCle] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  // Dernier état enregistré : la barre d'enregistrement apparaît dès qu'il diffère.
  const [initial, setInitial] = useState("");
  const etat = JSON.stringify({ actif, config });

  const charger = async () => {
    const res = await fetch("/api/chatbot").catch(() => null);
    const data = res?.ok ? await res.json().catch(() => ({})) : {};
    const a = data.actif ?? false;
    setActif(a);
    const next = data.config ? { ...config, ...data.config } : config; // config = valeurs par défaut au premier chargement
    setConfig(next);
    setInitial(JSON.stringify({ actif: a, config: next }));
    setLoading(false);
  };
  useEffect(() => { charger(); }, []);

  async function sauvegarder() {
    setSaving(true);
    const res = await fetch("/api/chatbot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actif, config }),
    }).catch(() => null);
    setSaving(false);
    if (!res?.ok) { toast.error(t("La configuration n'a pas été enregistrée. Réessayez.")); return; }
    setInitial(etat);
    toast.success(t("Configuration du chatbot enregistrée."));
  }

  function ignorer() {
    const i = JSON.parse(initial);
    setActif(i.actif); setConfig(i.config);
  }

  function ajouterMotCle() {
    if (!newMotsCle.trim() || config.motsClesExclus.includes(newMotsCle.trim())) return;
    setConfig(c => ({ ...c, motsClesExclus: [...c.motsClesExclus, newMotsCle.trim()] }));
    setNewMotsCle("");
  }

  const promptPreview = `Tu es AXIA, l'assistante IA de cette boutique.
Style: ${PERSONNALITES.find(p => p.id === config.personnalite)?.desc}
Langue: ${config.langue}
${config.instructionsSupp ? `Instructions: ${config.instructionsSupp}` : ""}
${config.messageAccueil ? `Message d'accueil: ${config.messageAccueil}` : ""}`;

  if (loading) return <SkeletonPage label={t("Chargement…")} />;

  const choix = (on: boolean) => `rounded-(--radius-md) border p-3 text-left transition-colors ${on ? "border-(--color-border-strong) bg-(--color-surface-selected)" : "border-(--color-border) hover:bg-(--color-surface-secondary)"}`;
  const setH = (patch: Partial<ChatbotConfig["horaires"]>) => setConfig(c => ({ ...c, horaires: { ...c.horaires, ...patch } }));

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <ContextualSaveBar dirty={!!initial && etat !== initial} onSave={sauvegarder} onDiscard={ignorer} saving={saving} />
      <PageHeader icon="whatsapp" title={t("Chatbot WhatsApp IA")}
        titleMeta={<Badge tone={actif ? "success" : "neutral"}>{actif ? t("Actif") : t("Inactif")}</Badge>}
        primaryAction={{ content: actif ? t("Désactiver le chatbot") : t("Activer le chatbot"), onAction: () => setActif((a) => !a) }} />

      <Banner tone="warning" title={t("WhatsApp Business requis")} action={{ content: t("Ouvrir Connecteurs"), href: "/dashboard/connecteurs" }}>
        {t("Connectez votre compte WhatsApp Business dans Connecteurs pour activer le chatbot.")}
      </Banner>

      <Banner tone={actif ? "success" : "info"} title={actif ? t("AXIA répond automatiquement à vos messages") : t("Chatbot désactivé — vous répondez manuellement")}>
        {actif ? t("Personnalité: {0} · Délai: {1}s", t(PERSONNALITES.find(p => p.id === config.personnalite)?.label ?? ""), config.delaiReponse) : t("Activez le chatbot en haut de la page pour démarrer.")}
      </Banner>

      <Card title={t("Personnalité d'AXIA")}>
        <div className="grid grid-cols-2 gap-2">
          {PERSONNALITES.map(p => (
            <button key={p.id} type="button" aria-pressed={config.personnalite === p.id} onClick={() => setConfig(c => ({ ...c, personnalite: p.id }))} className={choix(config.personnalite === p.id)}>
              <span className="block font-semibold text-(--color-text-strong)">{t(p.label)}</span>
              <span className="block text-xs text-(--color-text-secondary)">{t(p.desc)}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card title={t("Message d'accueil")}>
        <Textarea label={t("Message d'accueil")} labelHidden rows={3} value={config.messageAccueil}
          onChange={e => setConfig(c => ({ ...c, messageAccueil: e.target.value }))}
          placeholder={t("Ex: Bonjour ! Je suis AXIA, votre assistante chez [Boutique]. Comment puis-je vous aider ?")}
          helpText={t("Envoyé automatiquement quand quelqu'un contacte pour la première fois (optionnel)")} />
      </Card>

      <Card title={t("Langue de réponse")}>
        <Select label={t("Langue de réponse")} labelHidden value={config.langue} onChange={e => setConfig(c => ({ ...c, langue: e.target.value }))}
          options={LANGUES.map(l => ({ value: l.id, label: t(l.label) }))} />
      </Card>

      <Card title={t("Délai avant réponse")}>
        <p className="mb-3 text-xs text-(--color-text-secondary)">{t("Un délai naturel évite l'effet \"bot évident\"")}</p>
        <div className="flex items-center gap-4">
          <input type="range" min={0} max={30} step={5} aria-label={t("Délai avant réponse")} value={config.delaiReponse}
            onChange={e => setConfig(c => ({ ...c, delaiReponse: parseInt(e.target.value) }))} className="flex-1 accent-(--color-primary)" />
          <span className="w-16 text-right font-semibold tabular-nums text-(--color-text-strong)">{config.delaiReponse}s</span>
        </div>
        <div className="mt-1 flex justify-between px-0.5 text-[11px] text-(--color-text-subdued)">
          <span>{t("Immédiat")}</span><span>10s</span><span>20s</span><span>30s</span>
        </div>
      </Card>

      <Card title={t("Horaires de réponse")}
        actions={<Toggle checked={config.horaires.actif} onChange={(v) => setH({ actif: v })} label={t("Horaires de réponse")} />}>
        {config.horaires.actif ? (
          <div className="flex items-center gap-4">
            <TextField className="flex-1" label={t("Début")} type="time" value={config.horaires.debut} onChange={e => setH({ debut: e.target.value })} />
            <TextField className="flex-1" label={t("Fin")} type="time" value={config.horaires.fin} onChange={e => setH({ fin: e.target.value })} />
          </div>
        ) : <p className="text-xs text-(--color-text-secondary)">{t("AXIA répondra 24h/24 — 7j/7")}</p>}
      </Card>

      <Card title={t("Mots-clés exclus")}>
        <p className="mb-3 text-xs text-(--color-text-secondary)">{t("AXIA ne répondra pas si le message contient ces mots (ex: STOP, désabonner)")}</p>
        <div className="mb-3 flex items-end gap-2">
          <TextField className="min-w-0 flex-1" label={t("Ajouter un mot-clé…")} labelHidden value={newMotsCle}
            onChange={e => setNewMotsCle(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); ajouterMotCle(); } }}
            placeholder={t("Ajouter un mot-clé…")} />
          <Button icon="plus" onClick={ajouterMotCle}>{t("Ajouter")}</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {config.motsClesExclus.map(mc => (
            <span key={mc} className="inline-flex items-center gap-1 rounded-(--radius-md) bg-(--color-surface-tertiary) py-0.5 pl-2 text-xs font-medium">
              {t(mc)}
              <IconButton icon="x" aria-label={t("Retirer « {0} »", mc)} onClick={() => setConfig(c => ({ ...c, motsClesExclus: c.motsClesExclus.filter(m => m !== mc) }))} />
            </span>
          ))}
          {config.motsClesExclus.length === 0 && (
            <p className="text-xs text-(--color-text-secondary)">
              {t("Suggestions:")}{" "}{EXEMPLES_EXCLUS.map(e => (
                <Button key={e} variant="plain" onClick={() => setConfig(c => ({ ...c, motsClesExclus: [...c.motsClesExclus, e] }))}>{t(e)}</Button>
              ))}
            </p>
          )}
        </div>
      </Card>

      <Card title={t("Instructions personnalisées")}
        actions={<Button variant="plain" onClick={() => setShowPreview(p => !p)} aria-expanded={showPreview}>{showPreview ? t("Masquer prompt") : t("Voir prompt")}</Button>}>
        <Textarea label={t("Instructions personnalisées")} labelHidden rows={3} value={config.instructionsSupp}
          onChange={e => setConfig(c => ({ ...c, instructionsSupp: e.target.value }))}
          placeholder={t("Ex: Toujours proposer le paiement par Wave ou Orange Money. Ne jamais promettre une livraison en moins de 24h...")}
          helpText={t("Ajoutez des règles spécifiques (ex: \"Ne jamais mentionner les concurrents\")")} />
        {showPreview && (
          <div className="mt-3 rounded-(--radius-lg) bg-(--color-surface-tertiary) p-3">
            <p className="mb-2 text-xs font-semibold text-(--color-text-secondary)">{t("Prompt système généré")}</p>
            <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-(--color-text)">{t(promptPreview)}</pre>
          </div>
        )}
      </Card>
    </div>
  );
}
