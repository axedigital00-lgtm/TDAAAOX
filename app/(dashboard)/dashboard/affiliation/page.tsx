"use client";
// Affiliation côté marchand (modèle Selar/Chariow) : réglages, partenaires, ventes apportées.
// Axso verse les commissions aux affiliés (lib/affiliation.ts) : le marchand ne paie rien lui-même.
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Users, Link2, Copy, CheckCheck, Eye, ShoppingBag, Settings, Search, Target, UserCheck, UserX, Receipt, Package } from "lucide-react";
import { AgentActiveIndicator } from "@/components/dashboard/AgentActiveIndicator";
import { ModuleTutorial, BoutonRevoirTutoriel } from "@/components/dashboard/ModuleTutorial";
import { toast } from "sonner";
import { useDevise } from "@/components/dashboard/DeviseProvider";
import { useT } from "@/components/I18nProvider";
import { formatMontant } from "@/lib/utils";

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

function Badge({ statut }: { statut: string }) {
  const tr = useT();
  const map: Record<string, { label: string; cls: string }> = {
    actif:      { label: "Actif",       cls: "bg-green-100 text-green-700" },
    en_attente: { label: "En attente",  cls: "bg-amber-100 text-amber-700" },
    suspendu:   { label: "Suspendu",    cls: "bg-red-100 text-red-600" },
    disponible: { label: "Disponible",  cls: "bg-[#F5A623]/15 text-[#111111]" },
    versee:     { label: "Versée",      cls: "bg-green-100 text-green-700" },
    annulee:    { label: "Annulée",     cls: "bg-red-100 text-red-600" },
  };
  const m = map[statut] ?? { label: statut, cls: "bg-gray-100 text-gray-500" };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.cls}`}>{tr(m.label)}</span>;
}

function Interrupteur({ actif, onClick, disabled }: { actif: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} role="switch" aria-checked={actif}
      className={`w-9 h-5 rounded-full transition-colors relative shrink-0 disabled:opacity-50 ${actif ? "bg-[#F5A623]" : "bg-gray-200"}`}>
      <span className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${actif ? "left-4" : "left-0.5"}`} />
    </button>
  );
}

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

  useEffect(() => {
    setOrigine(window.location.origin);
    fetch("/api/affiliation/programmes")
      .then(r => r.json())
      .then(d => { setProg(d.programme ?? null); setProduitsOuverts(d.produitsOuverts ?? 0); if (d.programme) setTaux(String(d.programme.valeurCommission)); })
      .finally(() => setLoading(false));
  }, []);

  async function enregistrer(data: Partial<Programme>) {
    setSaving(true);
    try {
      const res = await fetch("/api/affiliation/programmes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setProg(d.programme); setTaux(String(d.programme.valeurCommission));
      toast.success(tr("Réglages enregistrés"));
    } catch (e: any) {
      toast.error(tr(e.message || "Erreur lors de l'enregistrement"));
    } finally { setSaving(false); }
  }

  if (loading) return <div className="py-12 text-center text-sm text-gray-400">{tr("Chargement…")}</div>;

  if (!prog) {
    return (
      <div className="py-10 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[#F5A623]/10 flex items-center justify-center mx-auto">
          <Target size={28} className="text-[#F5A623]" />
        </div>
        <p className="text-[14px] font-bold text-[#111]">{tr("L'affiliation n'est pas encore activée")}</p>
        <p className="text-[12px] text-gray-400 max-w-sm mx-auto">{tr("Des affiliés font la promotion de tes produits. Axso leur verse la commission, prélevée sur ta part des ventes payées en ligne uniquement.")}</p>
        <button onClick={() => enregistrer({ actif: true })} disabled={saving}
          className="px-5 py-2.5 bg-[#F5A623] text-white rounded-xl text-[12px] font-bold disabled:opacity-50">
          {saving ? tr("Activation…") : tr("Activer l'affiliation")}
        </button>
      </div>
    );
  }

  const lien = `${origine}/rejoindre/${prog.id}`;
  const tauxNum = Number(taux);
  const tauxModifie = taux !== "" && Number.isFinite(tauxNum) && tauxNum !== prog.valeurCommission;

  return (
    <div className="space-y-4">
      <div className="ax-card bg-white border border-gray-100 rounded-2xl p-5 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-bold text-[#111]">{tr("Affiliation activée")}</p>
            <p className="text-[11px] text-gray-400">{tr("Désactivée, plus aucune nouvelle vente ne rapporte de commission.")}</p>
          </div>
          <Interrupteur actif={prog.actif} disabled={saving} onClick={() => enregistrer({ actif: !prog.actif })} />
        </div>

        <div className="border-t border-gray-100 pt-4">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{tr("Taux de commission par défaut (%)")}</label>
          <div className="mt-1 flex gap-2">
            <input type="number" min={1} max={90} value={taux} onChange={e => setTaux(e.target.value)}
              className="w-28 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-[#F5A623]/60" />
            <button onClick={() => enregistrer({ valeurCommission: tauxNum })} disabled={!tauxModifie || saving}
              className="px-4 py-2 bg-[#F5A623] text-white rounded-xl text-[12px] font-bold disabled:opacity-40">
              {tr("Enregistrer")}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">
            {tr("Minimum Axso : 10 % pour un produit physique, 20 % pour un produit numérique. Le taux de chaque produit se règle sur sa fiche produit.")}
          </p>
        </div>

        <div className="border-t border-gray-100 pt-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-bold text-[#111]">{tr("Validation automatique des affiliés")}</p>
            <p className="text-[11px] text-gray-400">
              {prog.autoApprobation ? tr("Les affiliés sont actifs dès qu'ils rejoignent ta boutique.") : tr("Tu valides chaque affilié à la main dans l'onglet Affiliés.")}
            </p>
          </div>
          <Interrupteur actif={prog.autoApprobation} disabled={saving} onClick={() => enregistrer({ autoApprobation: !prog.autoApprobation })} />
        </div>

        <div className="border-t border-gray-100 pt-4 flex items-center justify-between gap-3">
          <p className="text-[12px] text-gray-600 flex items-center gap-2">
            <Package size={14} className="text-[#F5A623]" />
            <span><strong className="text-[#111]">{produitsOuverts}</strong>{" "}{tr(produitsOuverts > 1 ? "produits ouverts aux affiliés" : "produit ouvert aux affiliés")}</span>
          </p>
          <Link href="/dashboard/produits" className="text-[11px] font-bold text-[#F5A623] hover:underline shrink-0">{tr("Gérer mes produits")}</Link>
        </div>
      </div>

      <div className="bg-[#FFF8EC] border border-[#F5A623]/30 rounded-2xl p-4">
        <p className="text-[11px] font-bold text-[#d4880d] mb-1">{tr("Lien d'invitation")}</p>
        <p className="text-[11px] text-gray-500 mb-2">{tr("Partage ce lien : les affiliés créent leur compte Axso et rejoignent ta boutique.")}</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 bg-white border border-[#F5A623]/20 rounded-xl px-3 py-2 text-[11px] font-mono text-gray-500 truncate">{lien}</div>
          <button onClick={() => { navigator.clipboard.writeText(lien).catch(() => {}); setCopie(true); setTimeout(() => setCopie(false), 2000); }}
            aria-label={tr("Copier le lien")}
            className={`shrink-0 px-3 py-2 rounded-xl text-[11px] font-bold transition-all ${copie ? "bg-green-100 text-green-700" : "bg-[#F5A623] text-white"}`}>
            {copie ? <CheckCheck size={12} /> : <Copy size={12} />}
          </button>
        </div>
      </div>

      <p className="text-[11px] text-gray-400">
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

  const charger = useCallback(() => {
    const qs = new URLSearchParams();
    if (filtre !== "all") qs.set("statut", filtre);
    if (search) qs.set("search", search);
    fetch(`/api/affiliation/affilies?${qs}`)
      .then(r => r.json())
      .then(d => setAffilies(d.affilies ?? []))
      .finally(() => setLoading(false));
  }, [filtre, search]);

  useEffect(() => { charger(); }, [charger]);

  async function changerStatut(id: string, statut: string) {
    setActioning(id);
    const res = await fetch("/api/affiliation/affilies", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, statut }) });
    if (!res.ok) toast.error(tr("Action impossible"));
    setActioning(null); charger();
  }

  const action = (id: string, statut: string, label: string, rouge = false) => (
    <button onClick={() => changerStatut(id, statut)} disabled={actioning === id}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors disabled:opacity-50 ${rouge ? "bg-red-100 text-red-600 hover:bg-red-200" : "bg-green-100 text-green-700 hover:bg-green-200"}`}>
      {rouge ? <UserX size={10} /> : <UserCheck size={10} />}{" "}{tr(label)}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={tr("Rechercher un affilié…")}
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-[12px] outline-none focus:border-[#F5A623]/50" />
        </div>
        <select value={filtre} onChange={e => setFiltre(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-[12px] outline-none focus:border-[#F5A623]/50 bg-white">
          <option value="all">{tr("Tous")}</option>
          <option value="en_attente">{tr("En attente")}</option>
          <option value="actif">{tr("Actifs")}</option>
          <option value="suspendu">{tr("Suspendus")}</option>
        </select>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-gray-400">{tr("Chargement…")}</div>
      ) : affilies.length === 0 ? (
        <div className="py-10 text-center border-2 border-dashed border-gray-200 rounded-2xl">
          <Users size={28} className="text-gray-200 mx-auto mb-3" />
          <p className="text-[13px] font-semibold text-[#111]">{tr("Aucun affilié")}</p>
          <p className="text-[11px] text-gray-400 mt-1">{tr("Partage ton lien d'invitation (onglet Réglages) pour recruter des affiliés.")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {affilies.map(a => (
            <div key={a.id} className="ax-card bg-white border border-gray-100 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-[#111111]/15 flex items-center justify-center text-[12px] font-bold text-[#1B2A4A] shrink-0">
                  {a.nom.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-semibold text-[#111] truncate">{a.nom}</p>
                    <Badge statut={a.statut} />
                  </div>
                  <p className="text-[11px] text-gray-400 break-words">{a.email}</p>
                  <p className="text-[10px] font-mono text-[#F5A623] mt-0.5">{tr("Code :")}{" "}{a.codeParrainage}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-gray-400">
                    <span><Eye size={10} className="inline mr-1" />{a.clics}{" "}{tr("clics")}</span>
                    <span><ShoppingBag size={10} className="inline mr-1" />{a.conversions}{" "}{tr("ventes")}</span>
                    <span className="text-[#F5A623] font-bold">{fmt(a.commissionTotal)}{" "}{tr("de commissions")}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                {a.statut === "en_attente" && action(a.id, "actif", "Approuver")}
                {a.statut === "actif" && action(a.id, "suspendu", "Suspendre", true)}
                {a.statut === "suspendu" && action(a.id, "actif", "Réactiver")}
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

  useEffect(() => {
    fetch("/api/affiliation/commissions")
      .then(r => r.json())
      .then(d => setCommissions(d.commissions ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-12 text-center text-sm text-gray-400">{tr("Chargement…")}</div>;

  const valides = commissions.filter(c => c.etat !== "annulee");
  const montant = (n: number, d: string | null) => formatMontant(n, d ?? devise);
  // ponytail: totaux dans la devise de la boutique ; une ancienne vente dans une autre devise y est additionnée telle quelle.
  const ca = valides.reduce((s, c) => s + c.valeurCommande, 0);
  const total = valides.reduce((s, c) => s + c.montant, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Ventes", value: String(valides.length) },
          { label: "CA apporté", value: montant(ca, null) },
          { label: "Commissions", value: montant(total, null) },
        ].map(s => (
          <div key={s.label} className="ax-card bg-white border border-gray-100 rounded-2xl p-4">
            <p className="text-[18px] font-bold text-[#111] leading-none break-words">{s.value}</p>
            <p className="text-[11px] text-gray-400 mt-1">{tr(s.label)}</p>
          </div>
        ))}
      </div>

      {commissions.length === 0 ? (
        <div className="py-10 text-center border-2 border-dashed border-gray-200 rounded-2xl">
          <Receipt size={28} className="text-gray-200 mx-auto mb-3" />
          <p className="text-[13px] font-semibold text-[#111]">{tr("Aucune vente affiliée pour l'instant")}</p>
          <p className="text-[11px] text-gray-400 mt-1">{tr("Les ventes payées en ligne via le lien d'un affilié apparaîtront ici.")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {commissions.map(c => (
            <div key={c.id} className="ax-card bg-white border border-gray-100 rounded-2xl p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-[#111]">
                  {c.numero ? `#${c.numero}` : tr("Commande")}{" "}<span className="text-gray-400 font-normal">· {new Date(c.createdAt).toLocaleDateString("fr-FR")}</span>
                </p>
                <p className="text-[11px] text-gray-400 truncate">{tr("Affilié :")}{" "}{c.affilie}{" "}<span className="font-mono text-[#F5A623]">{c.code}</span></p>
                <p className="text-[11px] text-gray-400">{tr("Commande :")}{" "}{montant(c.valeurCommande, c.devise)}</p>
              </div>
              <div className="text-right shrink-0 space-y-1">
                <p className="text-[13px] font-bold text-[#F5A623]">{montant(c.montant, c.devise)}</p>
                <Badge statut={c.etat} />
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
    <div className="p-5 max-w-4xl mx-auto space-y-5" style={{ fontFamily: "'Poppins',system-ui,sans-serif" }}>
      <ModuleTutorial moduleKey="affiliation" titre={tr("Affiliation")} sousTitre={tr("Des affiliés vendent tes produits")} steps={AFFILIATION_TUTORIAL_STEPS} />
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-[18px] font-bold text-[#111] inline-flex items-center gap-2">{tr("Affiliation")}{" "}<AgentActiveIndicator label={tr("Agent Growth actif")} /></h1>
          <BoutonRevoirTutoriel moduleKey="affiliation" />
        </div>
        <p className="text-[12px] text-gray-500">{tr("Réglages, affiliés et ventes apportées")}</p>
      </div>

      {/* Le compte marchand sert aussi de compte affilié : recommander les produits d'autres boutiques. */}
      <Link href="/affilie" className="flex items-center justify-between gap-3 rounded-2xl bg-[#111] text-white px-4 py-3">
        <span className="text-[12.5px]"><span className="font-bold text-[#F5A623]">{tr("Mon espace affilié")}</span>{" · "}{tr("gagne des commissions en recommandant les produits d'autres boutiques")}</span>
        <Link2 size={15} className="text-[#F5A623] flex-shrink-0" />
      </Link>

      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 overflow-x-auto">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setOnglet(id)}
            className={`flex-1 py-2 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all flex items-center justify-center gap-1.5 ${onglet === id ? "bg-white shadow-sm text-[#111]" : "text-gray-500 hover:text-gray-700"}`}>
            <Icon size={11} />
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
