"use client";
// Affiliation côté marchand (modèle Selar/Chariow) : réglages, partenaires, ventes apportées.
// Axso verse les commissions aux affiliés (lib/affiliation.ts) : le marchand ne paie rien lui-même.
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Users, Link2, Copy, CheckCheck, Eye, ShoppingBag, Settings, Search, Target, UserCheck, UserX, Receipt, Package } from "lucide-react";
import { AgentActiveIndicator } from "@/components/dashboard/AgentActiveIndicator";
import { ModuleTutorial } from "@/components/dashboard/ModuleTutorial";
import { toast } from "sonner";
import { useDevise } from "@/components/dashboard/DeviseProvider";
import { useT } from "@/components/I18nProvider";
import { formatMontant } from "@/lib/utils";
import { Alerte, Badge, Bouton, BoutonIcone, Champ, CLASSE_SAISIE, EtatErreur, EtatVide, Saisie, SqueletteListe, useConfirmation, type Ton } from "@/components/ui";
import { EnTeteModule } from "../clients/EnTeteModule";

const AFFILIATION_TUTORIAL_STEPS = [
  { Icon: Settings, titre: "Active l'affiliation",       description: "Choisis ton taux par défaut et ouvre tes produits aux affiliés depuis leur fiche." },
  { Icon: Link2,    titre: "Partage ton lien d'invitation", description: "Les affiliés créent leur compte Axso et rejoignent ta boutique en un clic." },
  { Icon: Users,    titre: "Valide tes affiliés",         description: "Approuve, suspends ou réactive tes partenaires, et suis leurs clics et ventes." },
  { Icon: Receipt,  titre: "Suis les ventes apportées",   description: "Axso verse la commission à l'affilié, prélevée sur ta part des ventes payées en ligne uniquement." },
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

const TABS = [
  { id: "reglages", label: "Réglages",        Icon: Settings },
  { id: "affilies", label: "Affiliés",        Icon: Users    },
  { id: "ventes",   label: "Ventes affiliées", Icon: Receipt  },
];

// Mêmes libellés de statut partout (affiliés et commissions).
function BadgeStatut({ statut }: { statut: string }) {
  const tr = useT();
  const map: Record<string, { label: string; ton: Ton }> = {
    actif:      { label: "Actif",       ton: "succes" },
    en_attente: { label: "En attente",  ton: "attention" },
    suspendu:   { label: "Suspendu",    ton: "erreur" },
    disponible: { label: "Disponible",  ton: "accent" },
    versee:     { label: "Versée",      ton: "succes" },
    annulee:    { label: "Annulée",     ton: "erreur" },
  };
  const m = map[statut] ?? { label: statut, ton: "neutre" as Ton };
  return <Badge ton={m.ton}>{tr(m.label)}</Badge>;
}

/** Interrupteur : cible tactile de 40 px, nommé pour les lecteurs d'écran. */
function Interrupteur({ actif, onClick, disabled, label }: { actif: boolean; onClick: () => void; disabled?: boolean; label: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} role="switch" aria-checked={actif} aria-label={label}
      className="flex h-10 w-12 shrink-0 items-center justify-center rounded-controle disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-focus">
      <span className={`w-9 h-5 rounded-full transition-colors relative ${actif ? "bg-primaire" : "bg-bordure-forte"}`}>
        <span className={`w-4 h-4 bg-carte rounded-full absolute top-0.5 transition-all ${actif ? "left-4" : "left-0.5"}`} />
      </span>
    </button>
  );
}

// Étape « Recruter des affiliés » du démarrage (lib/demarrage.ts) : lien copié au moins une fois.
const lienPartage = () => { fetch("/api/demarrage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "lien_affilies_partage" }) }).catch(() => {}); };

// ─── Réglages ─────────────────────────────────────────────────────────────────
function OngletReglages() {
  const tr = useT();
  const [prog, setProg] = useState<Programme | null>(null);
  const [produitsOuverts, setProduitsOuverts] = useState(0);
  const [taux, setTaux] = useState("10");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copie, setCopie] = useState(false);
  const [origine, setOrigine] = useState("");
  const [erreur, setErreur] = useState(false);
  const { confirmer, dialogue } = useConfirmation();

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
      toast.success(data.actif === true && !prog ? tr("Affiliation activée.") : tr("Réglages d'affiliation enregistrés."));
    } catch (e: any) {
      toast.error(e?.message ? tr(e.message) : tr("Les réglages n'ont pas été enregistrés. Réessaie."));
    } finally { setSaving(false); }
  }

  if (loading) return <SqueletteListe lignes={3} libelle={tr("Chargement des réglages…")} />;
  if (erreur) return <EtatErreur titre={tr("Les réglages d'affiliation n'ont pas pu être chargés")} texte={tr("Vérifie ta connexion et réessaie.")} onReessayer={charger} />;

  if (!prog) {
    return (
      <EtatVide icone={<Target />} titre={tr("L'affiliation n'est pas encore activée")}
        texte={tr("Des affiliés font la promotion de tes produits. Axso leur verse la commission, prélevée sur ta part des ventes payées en ligne uniquement.")}>
        <Bouton onClick={() => enregistrer({ actif: true })} charge={saving} texteCharge={tr("Activation…")}>{tr("Activer l'affiliation")}</Bouton>
      </EtatVide>
    );
  }

  async function basculerActif() {
    if (prog!.actif && !(await confirmer({
      titre: tr("Désactiver l'affiliation ?"), objet: tr("Programme d'affiliation de ta boutique"),
      description: tr("Désactivée, plus aucune nouvelle vente ne rapporte de commission."),
      libelleConfirmer: tr("Désactiver l'affiliation"),
    }))) return;
    enregistrer({ actif: !prog!.actif });
  }

  async function copierLien() {
    try {
      await navigator.clipboard.writeText(lien);
      setCopie(true); setTimeout(() => setCopie(false), 2000);
      toast.success(tr("Lien d'invitation copié."));
      lienPartage();
    } catch {
      toast.error(tr("Copie impossible : sélectionne le lien et copie-le à la main."));
    }
  }

  const lien = `${origine}/rejoindre/${prog.id}`;
  const tauxNum = Number(taux);
  const tauxModifie = taux !== "" && Number.isFinite(tauxNum) && tauxNum !== prog.valeurCommission;

  return (
    <div className="space-y-4">
      {dialogue}
      <div className="ax-card p-5 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="ax-libelle font-bold">{tr("Affiliation activée")}</p>
            <p className="ax-aide">{tr("Désactivée, plus aucune nouvelle vente ne rapporte de commission.")}</p>
          </div>
          <Interrupteur actif={prog.actif} disabled={saving} onClick={basculerActif} label={tr("Affiliation activée")} />
        </div>

        <div className="border-t border-bordure pt-4">
          <div className="flex flex-wrap items-end gap-2">
            <Saisie className="w-40" label={tr("Taux de commission par défaut")} type="number" min={1} max={90} suffixe="%"
              value={taux} onChange={e => setTaux(e.target.value)} />
            <Bouton variante="secondaire" onClick={() => enregistrer({ valeurCommission: tauxNum })} disabled={!tauxModifie} charge={saving}>
              {tr("Enregistrer le taux")}
            </Bouton>
          </div>
          <p className="ax-aide mt-1.5">
            {tr("Minimum Axso : 10 % pour un produit physique, 20 % pour un produit numérique. Le taux de chaque produit se règle sur sa fiche produit.")}
          </p>
        </div>

        <div className="border-t border-bordure pt-4 flex items-center justify-between gap-3">
          <div>
            <p className="ax-libelle font-bold">{tr("Validation automatique des affiliés")}</p>
            <p className="ax-aide">
              {prog.autoApprobation ? tr("Les affiliés sont actifs dès qu'ils rejoignent ta boutique.") : tr("Tu valides chaque affilié à la main dans l'onglet Affiliés.")}
            </p>
          </div>
          <Interrupteur actif={prog.autoApprobation} disabled={saving} onClick={() => enregistrer({ autoApprobation: !prog.autoApprobation })} label={tr("Validation automatique des affiliés")} />
        </div>

        <div className="border-t border-bordure pt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="ax-texte-secondaire flex items-center gap-2">
            <Package className="size-4 text-attention" aria-hidden />
            <span><strong className="text-encre">{produitsOuverts}</strong>{" "}{tr(produitsOuverts > 1 ? "produits ouverts aux affiliés" : "produit ouvert aux affiliés")}</span>
          </p>
          <Bouton variante="fantome" taille="compact" href="/dashboard/produits">{tr("Gérer mes produits")}</Bouton>
        </div>
      </div>

      <div className="rounded-carte border border-attention-bordure bg-primaire-fond p-4">
        <h2 className="ax-libelle font-bold mb-1">{tr("Lien d'invitation")}</h2>
        <p className="ax-aide mb-2">{tr("Partage ce lien : les affiliés créent leur compte Axso et rejoignent ta boutique.")}</p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex-1 min-w-0 bg-carte border border-bordure rounded-controle px-3 py-2.5 text-xs font-mono text-doux truncate">{lien}</div>
          <Bouton onClick={copierLien} icone={copie ? <CheckCheck className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}>
            {copie ? tr("Lien copié") : tr("Copier le lien")}
          </Bouton>
        </div>
      </div>

      <p className="ax-aide">
        {tr("Axso verse la commission à l'affilié, prélevée sur ta part des ventes payées en ligne uniquement. Les ventes payées à la livraison ne rapportent pas de commission.")}
      </p>
    </div>
  );
}

// ─── Affiliés ─────────────────────────────────────────────────────────────────
function OngletAffilies() {
  const tr = useT();
  const { fmt } = useDevise();
  const [affilies, setAffilies] = useState<Affilie[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtre, setFiltre] = useState("all");
  const [actioning, setActioning] = useState<string | null>(null);
  const [erreur, setErreur] = useState(false);
  const { confirmer, dialogue } = useConfirmation();

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
      titre: tr("Suspendre cet affilié ?"), objet: <>{a.nom} · {a.codeParrainage}</>,
      description: tr("Ses liens ne rapporteront plus de commission tant qu'il est suspendu. Tu pourras le réactiver à tout moment."),
      libelleConfirmer: tr("Suspendre l'affilié"),
    }))) return;
    setActioning(a.id);
    const res = await fetch("/api/affiliation/affilies", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: a.id, statut }) }).catch(() => null);
    if (!res?.ok) toast.error(tr("Le statut de {0} n'a pas été modifié. Réessaie.", a.nom));
    else toast.success(statut === "suspendu" ? tr("{0} est suspendu.", a.nom) : tr("{0} est actif.", a.nom));
    setActioning(null); charger();
  }

  const action = (a: Affilie, statut: string, label: string, rouge = false) => (
    <Bouton variante={rouge ? "danger" : "secondaire"} taille="compact" onClick={() => changerStatut(a, statut)} charge={actioning === a.id}
      icone={rouge ? <UserX className="size-3.5" aria-hidden /> : <UserCheck className="size-3.5 text-succes" aria-hidden />}>
      {tr(label)}
    </Bouton>
  );
  const filtresActifs = filtre !== "all" || !!search;

  return (
    <div className="space-y-4">
      {dialogue}
      <div className="flex flex-col sm:flex-row sm:items-end gap-2">
        <Champ className="flex-1 min-w-0" label={tr("Rechercher un affilié")} labelMasque>
          {(a) => (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-doux" aria-hidden />
              <input {...a} type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder={tr("Rechercher un affilié…")} className={`${CLASSE_SAISIE} pl-9`} />
            </div>
          )}
        </Champ>
        <Champ label={tr("Statut")} labelMasque>
          {(a) => (
            <select {...a} value={filtre} onChange={e => setFiltre(e.target.value)} className={CLASSE_SAISIE}>
              <option value="all">{tr("Tous les statuts")}</option>
              <option value="en_attente">{tr("En attente")}</option>
              <option value="actif">{tr("Actifs")}</option>
              <option value="suspendu">{tr("Suspendus")}</option>
            </select>
          )}
        </Champ>
        {filtresActifs && <Bouton variante="fantome" onClick={() => { setFiltre("all"); setSearch(""); }}>{tr("Effacer les filtres")}</Bouton>}
      </div>

      {loading ? (
        <SqueletteListe lignes={3} libelle={tr("Chargement des affiliés…")} />
      ) : erreur ? (
        <EtatErreur titre={tr("La liste des affiliés n'a pas pu être chargée")} texte={tr("Vérifie ta connexion et réessaie.")} onReessayer={charger} />
      ) : affilies.length === 0 ? (
        filtresActifs ? (
          <EtatVide icone={<Search />} titre={tr("Aucun affilié ne correspond")} texte={tr("Modifie la recherche ou le statut choisi.")}>
            <Bouton variante="secondaire" onClick={() => { setFiltre("all"); setSearch(""); }}>{tr("Effacer les filtres")}</Bouton>
          </EtatVide>
        ) : (
          <EtatVide icone={<Users />} titre={tr("Aucun affilié")} texte={tr("Partage ton lien d'invitation (onglet Réglages) pour recruter des affiliés.")} />
        )
      ) : (
        <div className="space-y-2">
          {affilies.map(a => (
            <div key={a.id} className="ax-card p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-carte-2 border border-bordure flex items-center justify-center text-sm font-bold text-encre shrink-0" aria-hidden>
                  {a.nom.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-encre truncate">{a.nom}</p>
                    <BadgeStatut statut={a.statut} />
                  </div>
                  <p className="ax-aide break-words">{a.email}</p>
                  <p className="text-xs font-mono text-doux mt-0.5">{tr("Code :")}{" "}{a.codeParrainage}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 ax-aide">
                    <span><Eye className="inline size-3 mr-1" aria-hidden />{a.clics}{" "}{tr("clics")}</span>
                    <span><ShoppingBag className="inline size-3 mr-1" aria-hidden />{a.conversions}{" "}{tr("ventes")}</span>
                    <span className="text-encre font-bold">{fmt(a.commissionTotal)}{" "}{tr("de commissions")}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                {a.statut === "en_attente" && action(a, "actif", "Approuver")}
                {a.statut === "actif" && action(a, "suspendu", "Suspendre", true)}
                {a.statut === "suspendu" && action(a, "actif", "Réactiver")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Ventes affiliées ─────────────────────────────────────────────────────────
function OngletVentes() {
  const tr = useT();
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

  if (loading) return <SqueletteListe lignes={4} libelle={tr("Chargement des ventes affiliées…")} />;
  if (erreur) return <EtatErreur titre={tr("Les ventes affiliées n'ont pas pu être chargées")} texte={tr("Vérifie ta connexion et réessaie.")} onReessayer={charger} />;

  const valides = commissions.filter(c => c.etat !== "annulee");
  const montant = (n: number, d: string | null) => formatMontant(n, d ?? devise);
  // ponytail: totaux dans la devise de la boutique ; une ancienne vente dans une autre devise y est additionnée telle quelle.
  const ca = valides.reduce((s, c) => s + c.valeurCommande, 0);
  const total = valides.reduce((s, c) => s + c.montant, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Ventes", value: String(valides.length) },
          { label: "CA apporté", value: montant(ca, null) },
          { label: "Commissions", value: montant(total, null) },
        ].map(s => (
          <div key={s.label} className="ax-card p-4">
            <p className="text-[18px] font-bold text-encre leading-none break-words tabular-nums">{s.value}</p>
            <p className="ax-aide mt-1">{tr(s.label)}</p>
          </div>
        ))}
      </div>

      {commissions.length === 0 ? (
        <EtatVide icone={<Receipt />} titre={tr("Aucune vente affiliée pour l'instant")}
          texte={tr("Les ventes payées en ligne via le lien d'un affilié apparaîtront ici.")} />
      ) : (
        <div className="space-y-2">
          {commissions.map(c => (
            <div key={c.id} className="ax-card p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-encre">
                  {c.numero ? `#${c.numero}` : tr("Commande")}{" "}<span className="text-doux font-normal">· {new Date(c.createdAt).toLocaleDateString(tr.loc)}</span>
                </p>
                <p className="ax-aide truncate">{tr("Affilié :")}{" "}{c.affilie}{" "}<span className="font-mono">{c.code}</span></p>
                <p className="ax-aide">{tr("Commande :")}{" "}{montant(c.valeurCommande, c.devise)}</p>
              </div>
              <div className="text-right shrink-0 space-y-1">
                <p className="text-sm font-bold text-encre tabular-nums">{montant(c.montant, c.devise)}</p>
                <BadgeStatut statut={c.etat} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function AffiliationPage() {
  const tr = useT();
  const searchParams = useSearchParams();
  const initial = searchParams?.get("tab");
  const [onglet, setOnglet] = useState(TABS.some(t => t.id === initial) ? initial! : "reglages");

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <ModuleTutorial moduleKey="affiliation" titre={tr("Affiliation")} sousTitre={tr("Des affiliés vendent tes produits")} steps={AFFILIATION_TUTORIAL_STEPS} />
      <EnTeteModule icon="users" title={tr("Affiliation")} tutoriel="affiliation"
        titleMeta={<AgentActiveIndicator label={tr("Agent Growth actif")} />} />

      {/* Le compte marchand sert aussi de compte affilié : recommander les produits d'autres boutiques. */}
      <Link href="/affilie" className="flex min-h-12 items-center justify-between gap-3 rounded-carte bg-secondaire text-white px-4 py-3 focus-visible:outline-2 focus-visible:outline-focus">
        <span className="text-sm"><span className="font-bold text-primaire">{tr("Mon espace affilié")}</span>{" · "}{tr("gagne des commissions en recommandant les produits d'autres boutiques")}</span>
        <Link2 className="size-4 text-primaire flex-shrink-0" aria-hidden />
      </Link>

      <div className="flex gap-1 bg-carte-2 border border-bordure rounded-controle p-1 overflow-x-auto" role="tablist" aria-label={tr("Sections de l'affiliation")}>
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} type="button" role="tab" aria-selected={onglet === id} onClick={() => setOnglet(id)}
            className={`flex-1 min-h-10 px-3 rounded-controle text-sm font-semibold whitespace-nowrap transition-colors flex items-center justify-center gap-1.5 ${onglet === id ? "bg-carte shadow-sm text-encre" : "text-doux hover:text-encre"}`}>
            <Icon className="size-3.5" aria-hidden />
            {tr(label)}
          </button>
        ))}
      </div>

      {onglet === "reglages" && <OngletReglages />}
      {onglet === "affilies" && <OngletAffilies />}
      {onglet === "ventes"   && <OngletVentes />}
    </div>
  );
}
