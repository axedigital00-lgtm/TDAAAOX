"use client";
// Affiliation côté marchand (modèle Selar/Chariow) : réglages, partenaires, ventes apportées.
// Axso verse les commissions aux affiliés (lib/affiliation.ts) : le marchand ne paie rien lui-même.
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Users, Link2, Settings, Receipt } from "lucide-react";
import { AgentActiveIndicator } from "@/components/dashboard/AgentActiveIndicator";
import { ModuleTutorial } from "@/components/dashboard/ModuleTutorial";
import { toast } from "sonner";
import { useDevise } from "@/components/dashboard/DeviseProvider";
import { useT } from "@/components/I18nProvider";
import { formatMontant } from "@/lib/utils";
import {
  Avatar, Badge, Banner, Button, Card, CardSection, EmptyState, IndexTable, Select, Tabs, TextField, Toggle,
  type BadgeTone, type Column,
} from "@/components/ui/adm";
import { Icon } from "@/components/ui/icones";
import { IllustrationClients, IllustrationGenerique } from "@/components/ui/illustrations";
import { EnTeteModule } from "../clients/EnTeteModule";
import { Chargement, Chiffres, ErreurChargement, useConfirmationAdm } from "../marketing/kit-marketing";
import { actionAffilie } from "../marketing/regles-marketing";

const AFFILIATION_TUTORIAL_STEPS = [
  { Icon: Settings, titre: "Activez l'affiliation",          description: "Choisissez votre taux par défaut et ouvrez vos produits aux affiliés depuis leur fiche." },
  { Icon: Link2,    titre: "Partagez votre lien d'invitation", description: "Les affiliés créent leur compte Axso et rejoignent votre boutique en un clic." },
  { Icon: Users,    titre: "Validez vos affiliés",            description: "Approuvez, suspendez ou réactivez vos partenaires, et suivez leurs clics et ventes." },
  { Icon: Receipt,  titre: "Suivez les ventes apportées",     description: "Axso verse la commission à l'affilié, prélevée sur votre part des ventes payées en ligne uniquement." },
];

interface Programme { id: string; actif: boolean; valeurCommission: number; autoApprobation: boolean }
interface Affilie {
  id: string; nom: string; email: string; codeParrainage: string; statut: string;
  clics: number; conversions: number; commissionTotal: number;
}
interface Commission {
  id: string; createdAt: string; numero: string | null; affilie: string; code: string;
  valeurCommande: number; montant: number; devise: string | null; etat: "en_attente" | "disponible" | "versee" | "annulee";
}

const ONGLETS = [
  { id: "reglages", label: "Réglages" },
  { id: "affilies", label: "Affiliés" },
  { id: "ventes",   label: "Ventes affiliées" },
];

// Mêmes libellés de statut partout (affiliés et commissions).
const STATUTS: Record<string, { label: string; tone: BadgeTone }> = {
  actif:      { label: "Actif",      tone: "success" },
  en_attente: { label: "En attente", tone: "attention" },
  suspendu:   { label: "Suspendu",   tone: "critical" },
  disponible: { label: "Disponible", tone: "info" },
  versee:     { label: "Versée",     tone: "success" },
  annulee:    { label: "Annulée",    tone: "neutral" },
};
function BadgeStatut({ statut }: { statut: string }) {
  const t = useT();
  const m = STATUTS[statut] ?? { label: statut, tone: "neutral" as BadgeTone };
  return <Badge tone={m.tone}>{t(m.label)}</Badge>;
}

// Étape « Recruter des affiliés » du démarrage (lib/demarrage.ts) : lien copié au moins une fois.
const lienPartage = () => { fetch("/api/demarrage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "lien_affilies_partage" }) }).catch(() => {}); };

// ─── Réglages ─────────────────────────────────────────────────────────────────
function OngletReglages() {
  const t = useT();
  const [prog, setProg] = useState<Programme | null>(null);
  const [produitsOuverts, setProduitsOuverts] = useState(0);
  const [taux, setTaux] = useState("10");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copie, setCopie] = useState(false);
  const [origine, setOrigine] = useState("");
  const [erreur, setErreur] = useState(false);
  const { confirmer, dialogue } = useConfirmationAdm();

  const charger = () => {
    setLoading(true); setErreur(false);
    fetch("/api/affiliation/programmes")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { setProg(d.programme ?? null); setProduitsOuverts(d.produitsOuverts ?? 0); if (d.programme) setTaux(String(d.programme.valeurCommission)); })
      .catch(() => setErreur(true))
      .finally(() => setLoading(false));
  };
  useEffect(() => { setOrigine(window.location.origin); charger(); }, []);

  async function enregistrer(data: Partial<Programme>) {
    setSaving(true);
    try {
      const res = await fetch("/api/affiliation/programmes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setProg(d.programme); setTaux(String(d.programme.valeurCommission));
      toast.success(data.actif === true && !prog ? t("Affiliation activée.") : t("Réglages d'affiliation enregistrés."));
    } catch (e: any) {
      toast.error(e?.message ? t(e.message) : t("Les réglages n'ont pas été enregistrés. Réessayez."));
    } finally { setSaving(false); }
  }

  if (loading) return <Chargement />;
  if (erreur) return <ErreurChargement titre={t("Les réglages d'affiliation n'ont pas pu être chargés")} onReessayer={charger} />;

  if (!prog) {
    return (
      <EmptyState title={t("L'affiliation n'est pas encore activée")} image={<IllustrationClients />}
        actions={<Button variant="primary" onClick={() => enregistrer({ actif: true })} loading={saving}>{t("Activer l'affiliation")}</Button>}>
        {t("Des affiliés font la promotion de vos produits. Axso leur verse la commission, prélevée sur votre part des ventes payées en ligne uniquement.")}
      </EmptyState>
    );
  }

  async function basculerActif() {
    if (prog!.actif && !(await confirmer({
      titre: t("Désactiver l'affiliation ?"), objet: t("Programme d'affiliation de votre boutique"),
      description: t("Désactivée, plus aucune nouvelle vente ne rapporte de commission."),
      libelleConfirmer: t("Désactiver l'affiliation"),
    }))) return;
    enregistrer({ actif: !prog!.actif });
  }

  async function copierLien() {
    try {
      await navigator.clipboard.writeText(lien);
      setCopie(true); setTimeout(() => setCopie(false), 2000);
      toast.success(t("Lien d'invitation copié."));
      lienPartage();
    } catch {
      toast.error(t("Copie impossible : sélectionnez le lien et copiez-le à la main."));
    }
  }

  const lien = `${origine}/rejoindre/${prog.id}`;
  const tauxNum = Number(taux);
  const tauxModifie = taux !== "" && Number.isFinite(tauxNum) && tauxNum !== prog.valeurCommission;

  return (
    <div className="space-y-4">
      {dialogue}
      <Card padding="none">
        <CardSection>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-(--color-text-strong)">{t("Affiliation activée")}</p>
              <p className="text-xs text-(--color-text-secondary)">{t("Désactivée, plus aucune nouvelle vente ne rapporte de commission.")}</p>
            </div>
            <Toggle checked={prog.actif} disabled={saving} onChange={basculerActif} label={t("Affiliation activée")} />
          </div>
        </CardSection>
        <CardSection>
          <div className="flex flex-wrap items-end gap-2">
            <TextField className="w-40" label={t("Taux de commission par défaut (%)")} type="number" min={1} max={90}
              value={taux} onChange={e => setTaux(e.target.value)} />
            <Button onClick={() => enregistrer({ valeurCommission: tauxNum })} disabled={!tauxModifie} loading={saving}>
              {t("Enregistrer le taux")}
            </Button>
          </div>
          <p className="mt-1.5 text-xs text-(--color-text-secondary)">
            {t("Minimum Axso : 10 % pour un produit physique, 20 % pour un produit numérique. Le taux de chaque produit se règle sur sa fiche produit.")}
          </p>
        </CardSection>
        <CardSection>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-(--color-text-strong)">{t("Validation automatique des affiliés")}</p>
              <p className="text-xs text-(--color-text-secondary)">
                {prog.autoApprobation ? t("Les affiliés sont actifs dès qu'ils rejoignent votre boutique.") : t("Vous validez chaque affilié à la main dans l'onglet Affiliés.")}
              </p>
            </div>
            <Toggle checked={prog.autoApprobation} disabled={saving} onChange={() => enregistrer({ autoApprobation: !prog.autoApprobation })} label={t("Validation automatique des affiliés")} />
          </div>
        </CardSection>
        <CardSection>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-(--color-text-secondary)">
              <Icon name="box" aria-hidden />
              <span><strong className="text-(--color-text-strong)">{produitsOuverts}</strong>{" "}{t(produitsOuverts > 1 ? "produits ouverts aux affiliés" : "produit ouvert aux affiliés")}</span>
            </p>
            <Button variant="plain" href="/dashboard/produits">{t("Gérer mes produits")}</Button>
          </div>
        </CardSection>
      </Card>

      <Card title={t("Lien d'invitation")}>
        <p className="mb-2 text-xs text-(--color-text-secondary)">{t("Partagez ce lien : les affiliés créent leur compte Axso et rejoignent votre boutique.")}</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1 truncate rounded-(--radius-md) border border-(--color-border) bg-(--color-surface-secondary) px-3 py-1.5 font-mono text-xs text-(--color-text-secondary)">{lien}</div>
          <Button icon={copie ? "checkCircle" : "link"} onClick={copierLien}>{copie ? t("Lien copié") : t("Copier le lien")}</Button>
        </div>
      </Card>

      <p className="text-xs text-(--color-text-secondary)">
        {t("Axso verse la commission à l'affilié, prélevée sur votre part des ventes payées en ligne uniquement. Les ventes payées à la livraison ne rapportent pas de commission.")}
      </p>
    </div>
  );
}

// ─── Affiliés ─────────────────────────────────────────────────────────────────
function OngletAffilies() {
  const t = useT();
  const { fmt } = useDevise();
  const [affilies, setAffilies] = useState<Affilie[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtre, setFiltre] = useState("all");
  const [actioning, setActioning] = useState<string | null>(null);
  const [erreur, setErreur] = useState(false);
  const { confirmer, dialogue } = useConfirmationAdm();

  const charger = useCallback(() => {
    const qs = new URLSearchParams();
    if (filtre !== "all") qs.set("statut", filtre);
    if (search) qs.set("search", search);
    setErreur(false);
    fetch(`/api/affiliation/affilies?${qs}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setAffilies(d.affilies ?? []))
      .catch(() => setErreur(true))
      .finally(() => setLoading(false));
  }, [filtre, search]);

  useEffect(() => { charger(); }, [charger]);

  async function changerStatut(a: Affilie, statut: string) {
    if (statut === "suspendu" && !(await confirmer({
      titre: t("Suspendre cet affilié ?"), objet: <>{a.nom} · {a.codeParrainage}</>,
      description: t("Ses liens ne rapporteront plus de commission tant qu'il est suspendu. Vous pourrez le réactiver à tout moment."),
      libelleConfirmer: t("Suspendre l'affilié"),
    }))) return;
    setActioning(a.id);
    const res = await fetch("/api/affiliation/affilies", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: a.id, statut }) }).catch(() => null);
    if (!res?.ok) toast.error(t("Le statut de {0} n'a pas été modifié. Réessayez.", a.nom));
    else toast.success(statut === "suspendu" ? t("{0} est suspendu.", a.nom) : t("{0} est actif.", a.nom));
    setActioning(null); charger();
  }

  const effacer = () => { setFiltre("all"); setSearch(""); };
  const filtresActifs = filtre !== "all" || !!search;
  const action = (a: Affilie) => {
    const act = actionAffilie(a.statut);
    if (!act) return null;
    return <Button size="sm" variant={act.critique ? "critical" : "default"} loading={actioning === a.id} onClick={() => changerStatut(a, act.statut)}>{t(act.label)}</Button>;
  };

  const colonnes: Column<Affilie>[] = [
    { id: "nom", header: t("Affilié"), mobilePrimary: true, cell: (a) => (
      <span className="flex items-center gap-2">
        <Avatar name={a.nom} />
        <span className="min-w-0"><span className="block truncate">{a.nom}</span><span className="block truncate text-xs font-normal text-(--color-text-secondary)">{a.email}</span></span>
      </span>
    ) },
    { id: "statut", header: t("Statut"), cell: (a) => <BadgeStatut statut={a.statut} /> },
    { id: "code", header: t("Code"), hideOnMobile: true, cell: (a) => <span className="font-mono text-xs">{a.codeParrainage}</span> },
    { id: "clics", header: t("Clics"), numeric: true, align: "end", cell: (a) => a.clics },
    { id: "ventes", header: t("Ventes"), numeric: true, align: "end", cell: (a) => a.conversions },
    { id: "commissions", header: t("Commissions"), numeric: true, align: "end", cell: (a) => fmt(a.commissionTotal) },
    { id: "action", header: "", align: "end", cell: action },
  ];

  return (
    <div className="space-y-4">
      {dialogue}
      {erreur ? (
        <ErreurChargement titre={t("La liste des affiliés n'a pas pu être chargée")} onReessayer={charger} />
      ) : !loading && affilies.length === 0 && !filtresActifs ? (
        <EmptyState title={t("Aucun affilié")} image={<IllustrationClients />}>
          {t("Partagez votre lien d'invitation (onglet Réglages) pour recruter des affiliés.")}
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-(--radius-xl) bg-(--color-surface) shadow-(--shadow-card)">
          <div className="flex flex-col gap-2 border-b border-(--color-border-secondary) p-2 sm:flex-row sm:items-end">
            <TextField className="min-w-0 flex-1" label={t("Rechercher un affilié")} labelHidden type="search" value={search}
              onChange={e => setSearch(e.target.value)} placeholder={t("Rechercher un affilié…")} />
            <Select label={t("Statut")} labelHidden value={filtre} onChange={e => setFiltre(e.target.value)}
              options={[
                { value: "all", label: t("Tous les statuts") }, { value: "en_attente", label: t("En attente") },
                { value: "actif", label: t("Actifs") }, { value: "suspendu", label: t("Suspendus") },
              ]} />
            {filtresActifs && <Button variant="plain" onClick={effacer}>{t("Effacer les filtres")}</Button>}
          </div>
          <IndexTable label={t("Affiliés")} rows={affilies} columns={colonnes} getId={(a) => a.id} loading={loading}
            emptyState={<p className="px-6 py-12 text-center text-(--color-text-secondary)">{t("Aucun affilié ne correspond. Modifiez la recherche ou le statut choisi.")}</p>} />
        </div>
      )}
    </div>
  );
}

// ─── Ventes affiliées ─────────────────────────────────────────────────────────
function OngletVentes() {
  const t = useT();
  const { devise } = useDevise();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(false);

  const charger = () => {
    setLoading(true); setErreur(false);
    fetch("/api/affiliation/commissions")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setCommissions(d.commissions ?? []))
      .catch(() => setErreur(true))
      .finally(() => setLoading(false));
  };
  useEffect(charger, []);

  if (erreur) return <ErreurChargement titre={t("Les ventes affiliées n'ont pas pu être chargées")} onReessayer={charger} />;

  const valides = commissions.filter(c => c.etat !== "annulee");
  const montant = (n: number, d: string | null) => formatMontant(n, d ?? devise);
  // ponytail: totaux dans la devise de la boutique ; une ancienne vente dans une autre devise y est additionnée telle quelle.
  const ca = valides.reduce((s, c) => s + c.valeurCommande, 0);
  const total = valides.reduce((s, c) => s + c.montant, 0);

  const colonnes: Column<Commission>[] = [
    { id: "commande", header: t("Commande"), mobilePrimary: true, cell: (c) => c.numero ? `#${c.numero}` : t("Commande") },
    { id: "date", header: t("Date"), cell: (c) => new Date(c.createdAt).toLocaleDateString(t.loc) },
    { id: "affilie", header: t("Affilié"), hideOnMobile: true, cell: (c) => <>{c.affilie} <span className="font-mono text-xs text-(--color-text-secondary)">{c.code}</span></> },
    { id: "valeur", header: t("Montant de la commande"), numeric: true, align: "end", cell: (c) => montant(c.valeurCommande, c.devise) },
    { id: "commission", header: t("Commission"), numeric: true, align: "end", cell: (c) => montant(c.montant, c.devise) },
    { id: "etat", header: t("État"), cell: (c) => <BadgeStatut statut={c.etat} /> },
  ];

  return (
    <div className="space-y-4">
      <Chiffres items={[
        { label: t("Ventes"), value: valides.length },
        { label: t("CA apporté"), value: montant(ca, null) },
        { label: t("Commissions"), value: montant(total, null) },
      ]} />
      {!loading && commissions.length === 0 ? (
        <EmptyState title={t("Aucune vente affiliée pour l'instant")} image={<IllustrationGenerique />}>
          {t("Les ventes payées en ligne via le lien d'un affilié apparaîtront ici.")}
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-(--radius-xl) bg-(--color-surface) shadow-(--shadow-card)">
          <IndexTable label={t("Ventes affiliées")} rows={commissions} columns={colonnes} getId={(c) => c.id} loading={loading} />
        </div>
      )}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function AffiliationPage() {
  const t = useT();
  const searchParams = useSearchParams();
  const initial = searchParams?.get("tab");
  const [onglet, setOnglet] = useState(ONGLETS.some(o => o.id === initial) ? initial! : "reglages");

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <ModuleTutorial moduleKey="affiliation" titre={t("Affiliation")} sousTitre={t("Des affiliés vendent vos produits")} steps={AFFILIATION_TUTORIAL_STEPS} />
      <EnTeteModule icon="users" title={t("Affiliation")} tutoriel="affiliation"
        titleMeta={<AgentActiveIndicator label={t("Agent Growth actif")} />} />

      {/* Le compte marchand sert aussi de compte affilié : recommander les produits d'autres boutiques. */}
      <Banner tone="info" title={t("Mon espace affilié")} action={{ content: t("Ouvrir mon espace affilié"), href: "/affilie" }}>
        {t("Gagnez des commissions en recommandant les produits d'autres boutiques.")}
      </Banner>

      <Tabs label={t("Sections de l'affiliation")} selected={onglet} onSelect={setOnglet}
        tabs={ONGLETS.map(o => ({ id: o.id, label: t(o.label) }))}/>

      {onglet === "reglages" && <OngletReglages />}
      {onglet === "affilies" && <OngletAffilies />}
      {onglet === "ventes"   && <OngletVentes />}
    </div>
  );
}
