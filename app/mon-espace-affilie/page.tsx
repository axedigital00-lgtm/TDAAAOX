"use client";
// Vue d'ensemble de l'affilié : tous les portails de boutiques qu'il a ouverts dans ce
// navigateur (lib/affiliation-local.ts — pas de compte affilié), additionnés.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  MousePointerClick, ShoppingBag, Percent, Wallet, Clock, Plus, X, ArrowRight, Loader2,
  Copy, Check, MessageCircle, ChevronRight, Store, AlertTriangle,
} from "lucide-react";
import { ClicsConversionsChart, CommissionsChart } from "@/components/affilie/AffiliationCharts";
import { EspaceAffilieShell, Initiale } from "@/components/affilie/EspaceAffilieShell";
import {
  listerAffiliationsLocales, retirerAffiliationLocale, enregistrerAffiliationLocale,
  extraireTokenPortail, type AffiliationLocale,
} from "@/lib/affiliation-local";
import { useT } from "@/components/I18nProvider";

interface Jour { date: string; clics: number; conversions: number; commissions: number; }

interface Compte {
  entry: AffiliationLocale;
  loading: boolean;
  erreur: boolean;
  data?: {
    affilie: { nom: string; codeParrainage: string; statut: string };
    tenant: { nomBoutique: string; slug: string; logoUrl: string | null; devise: string; lien: string };
    programme?: { nom: string } | null;
    periode: { seriesJour: Jour[]; clicsPeriode: number; conversionsPeriode: number; commissionsPeriode: number; soldeDisponible: number; soldeEnAttente: number };
  };
}

const PERIODES = [7, 30, 90] as const;
const carte = "bg-white border border-gray-100 rounded-2xl";

export default function MonEspaceAffiliePage() {
  const t = useT();
  const [comptes, setComptes] = useState<Compte[]>([]);
  const [chargementInitial, setChargementInitial] = useState(true);
  const [periode, setPeriode] = useState<7 | 30 | 90>(30);
  const [nouveauLien, setNouveauLien] = useState("");
  const [ajoutErreur, setAjoutErreur] = useState("");
  const [ajoutEnCours, setAjoutEnCours] = useState(false);
  const [copie, setCopie] = useState<string | null>(null);

  async function chargerCompte(entry: AffiliationLocale, p: number): Promise<Compte> {
    try {
      const res = await fetch(`/api/affilie/${entry.portalToken}?periode=${p}`);
      if (!res.ok) return { entry, loading: false, erreur: true };
      return { entry, loading: false, erreur: false, data: await res.json() };
    } catch {
      return { entry, loading: false, erreur: true };
    }
  }

  async function chargerTout(p: number) {
    const entries = listerAffiliationsLocales();
    if (entries.length === 0) { setComptes([]); setChargementInitial(false); return; }
    setComptes((avant) => entries.map((entry) => avant.find((c) => c.entry.portalToken === entry.portalToken) ?? { entry, loading: true, erreur: false }));
    setComptes(await Promise.all(entries.map((e) => chargerCompte(e, p))));
    setChargementInitial(false);
  }

  useEffect(() => { chargerTout(periode); }, [periode]);

  async function ajouterLien(e: React.FormEvent) {
    e.preventDefault();
    setAjoutErreur("");
    const token = extraireTokenPortail(nouveauLien);
    if (!token) { setAjoutErreur("Lien ou code invalide."); return; }
    setAjoutEnCours(true);
    const res = await fetch(`/api/affilie/${token}`).catch(() => null);
    setAjoutEnCours(false);
    if (!res?.ok) { setAjoutErreur("Aucun compte affilié trouvé avec ce lien."); return; }
    const data = await res.json();
    enregistrerAffiliationLocale({
      portalToken: token,
      nomBoutique: data.tenant.nomBoutique,
      logoUrl: data.tenant.logoUrl,
      nomProgramme: data.programme?.nom ?? "Programme affilié",
    });
    setNouveauLien("");
    toast.success(t("Compte ajouté !"));
    chargerTout(periode);
  }

  function retirer(token: string) {
    retirerAffiliationLocale(token);
    setComptes((c) => c.filter((x) => x.entry.portalToken !== token));
  }

  function copier(texte: string, id: string) {
    navigator.clipboard.writeText(texte).then(() => {
      setCopie(id);
      toast.success(t("Copié !"));
      setTimeout(() => setCopie(null), 2000);
    }, () => toast.error(t("Copie impossible : sélectionnez le lien à la main.")));
  }

  const valides = comptes.filter((c) => c.data);
  const clics = valides.reduce((s, c) => s + c.data!.periode.clicsPeriode, 0);
  const ventes = valides.reduce((s, c) => s + c.data!.periode.conversionsPeriode, 0);
  const tauxConv = clics > 0 ? Math.round((ventes / clics) * 1000) / 10 : 0;

  // Les montants restent groupés par devise : on n'additionne jamais deux monnaies.
  const parDevise = useMemo(() => {
    const g: Record<string, { disponible: number; attente: number; periode: number; serie: Jour[] }> = {};
    for (const c of valides) {
      const { devise } = c.data!.tenant;
      const p = c.data!.periode;
      g[devise] ??= { disponible: 0, attente: 0, periode: 0, serie: p.seriesJour.map((j) => ({ ...j, clics: 0, conversions: 0, commissions: 0 })) };
      g[devise].disponible += p.soldeDisponible;
      g[devise].attente += p.soldeEnAttente;
      g[devise].periode += p.commissionsPeriode;
      g[devise].serie = g[devise].serie.map((j, i) => ({ ...j, commissions: j.commissions + (p.seriesJour[i]?.commissions ?? 0) }));
    }
    return Object.entries(g);
  }, [valides]);

  const seriesClicsConv = useMemo<Jour[]>(() => {
    if (valides.length === 0) return [];
    const longueur = Math.max(...valides.map((c) => c.data!.periode.seriesJour.length));
    return Array.from({ length: longueur }, (_, i) => {
      let clics = 0, conversions = 0, date = "";
      for (const c of valides) {
        const j = c.data!.periode.seriesJour[i];
        if (j) { clics += j.clics; conversions += j.conversions; date = j.date; }
      }
      return { date, clics, conversions, commissions: 0 };
    });
  }, [valides]);

  const fmt = (n: number, devise: string) => `${(Math.round(n * 100) / 100).toLocaleString(t.loc)} ${devise}`;

  const formulaire = (
    <form onSubmit={ajouterLien} className={`${carte} p-4 md:p-5`}>
      <p className="text-[13px] font-bold mb-1">{t("Ajouter une boutique")}</p>
      <p className="text-[12px] text-[#999] mb-3">{t("Collez le lien de portail reçu par e-mail après votre inscription à un programme.")}</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input value={nouveauLien} onChange={(e) => setNouveauLien(e.target.value)}
          placeholder={t("Coller un lien de portail (ex: https://axsoafrica.com/affilie/xxxx)")}
          className="flex-1 min-w-0 px-4 py-3 rounded-xl border border-gray-200 text-base sm:text-[13px] outline-none focus:border-[#F5A623]" />
        <button type="submit" disabled={ajoutEnCours || !nouveauLien.trim()}
          className="px-5 py-3 rounded-xl text-[13px] font-semibold text-white bg-[#111] flex items-center justify-center gap-2 disabled:opacity-40">
          {ajoutEnCours ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}{t("Ajouter")}
        </button>
      </div>
      {ajoutErreur && <p className="text-[12px] text-red-500 mt-2">{t(ajoutErreur)}</p>}
    </form>
  );

  return (
    <EspaceAffilieShell titre={t("Mon espace affilié")}>
      <div className="flex items-end justify-between gap-3 flex-wrap mb-5 md:mb-6">
        <div>
          <h1 className="text-[22px] md:text-[26px] font-bold leading-tight">{t("Mon espace affilié")}</h1>
          <p className="text-[13px] text-[#999] mt-1">{t("Vos gains et vos liens, toutes boutiques réunies.")}</p>
        </div>
        {comptes.length > 0 && (
          <div className="flex bg-white border border-gray-100 rounded-xl p-1">
            {PERIODES.map((pv) => (
              <button key={pv} onClick={() => setPeriode(pv)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors ${periode === pv ? "bg-[#111] text-white" : "text-[#AAA]"}`}>
                {t("{0} j", pv)}
              </button>
            ))}
          </div>
        )}
      </div>

      {chargementInitial ? (
        <div className="py-24 flex justify-center"><Loader2 size={26} className="animate-spin text-[#F5A623]" /></div>
      ) : comptes.length === 0 ? (
        <div className="space-y-4">
          <div className={`${carte} px-6 py-12 text-center`}>
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-[#FFF6E6]"><Store size={24} className="text-[#F5A623]" /></div>
            <p className="font-bold text-[16px] mb-1.5">{t("Aucune affiliation pour l'instant")}</p>
            <p className="text-[13px] text-[#999] max-w-sm mx-auto mb-6">
              {t("Rejoignez un programme depuis le marketplace, ou collez ci-dessous le lien de portail que vous avez reçu par e-mail.")}
            </p>
            <Link href="/affiliation" className="inline-flex items-center gap-2 font-bold text-[13px] px-5 py-3 rounded-xl bg-[#F5A623] text-[#111]">
              {t("Parcourir le marketplace")}<ArrowRight size={15} />
            </Link>
          </div>
          {formulaire}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Soldes, par devise */}
          {parDevise.map(([devise, g]) => (
            <div key={devise} className="rounded-2xl p-5 md:p-6 text-white" style={{ background: "linear-gradient(135deg,#111111 0%,#1d1d1d 100%)" }}>
              <p className="text-[12px] text-white/60 flex items-center gap-1.5"><Wallet size={14} className="text-[#F5A623]" />{t("Solde disponible")}{parDevise.length > 1 && ` · ${devise}`}</p>
              <p className="text-[30px] md:text-[36px] font-black tracking-tight text-[#F5A623] leading-tight mt-1">{fmt(g.disponible, devise)}</p>
              <div className="grid grid-cols-2 gap-2 mt-4 max-w-md">
                <div className="rounded-xl bg-white/[0.06] border border-white/10 p-3 min-w-0">
                  <p className="text-[10.5px] text-white/50 flex items-center gap-1"><Clock size={11} />{t("En attente")}</p>
                  <p className="text-[15px] font-bold mt-0.5 truncate">{fmt(g.attente, devise)}</p>
                </div>
                <div className="rounded-xl bg-white/[0.06] border border-white/10 p-3 min-w-0">
                  <p className="text-[10.5px] text-white/50 truncate">{t("Gagné sur {0} jours", periode)}</p>
                  <p className="text-[15px] font-bold mt-0.5 truncate">{fmt(g.periode, devise)}</p>
                </div>
              </div>
              <p className="text-[11.5px] text-white/50 mt-4 leading-relaxed">{t("Seul le solde disponible est versé, sur votre Mobile Money : chaque boutique déclenche le versement, validé à la main par Axso.")}</p>
            </div>
          ))}

          {/* Chiffres clés */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Clics", v: clics.toLocaleString(t.loc), Icon: MousePointerClick, c: "#3b82f6" },
              { label: "Ventes", v: ventes.toLocaleString(t.loc), Icon: ShoppingBag, c: "#10b981" },
              { label: "Conversion", v: `${tauxConv.toLocaleString(t.loc)} %`, Icon: Percent, c: "#8b5cf6" },
            ].map((k) => (
              <div key={k.label} className={`${carte} p-3.5 md:p-4 min-w-0`}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2.5" style={{ background: `${k.c}14` }}>
                  <k.Icon size={16} style={{ color: k.c }} />
                </div>
                <p className="text-[18px] md:text-[22px] font-bold leading-none truncate">{k.v}</p>
                <p className="text-[11px] text-[#999] mt-1.5 truncate">{t(k.label)}</p>
              </div>
            ))}
          </div>

          {/* Boutiques */}
          <div className={`${carte} p-4 md:p-5`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[13px] font-bold">{t("Mes boutiques")}</h2>
              <Link href="/affiliation" className="text-[12px] font-semibold text-[#B7791F] flex items-center gap-1">{t("Trouver des produits")}<ArrowRight size={13} /></Link>
            </div>
            <div className="divide-y divide-gray-100">
              {comptes.map((c) => {
                const d = c.data;
                const lien = d ? `${d.tenant.lien}?ref=${d.affilie.codeParrainage}` : "";
                const id = c.entry.portalToken;
                return (
                  <div key={id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <Link href={`/affilie/${id}`} className="flex items-center gap-3 flex-1 min-w-0 group">
                        <Initiale nom={c.entry.nomBoutique} logoUrl={c.entry.logoUrl} taille={40} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13.5px] font-semibold truncate group-hover:underline">{c.entry.nomBoutique}</p>
                          {c.loading ? (
                            <p className="text-[11.5px] text-[#AAA]">{t("Chargement…")}</p>
                          ) : c.erreur || !d ? (
                            <p className="text-[11.5px] text-red-500 flex items-center gap-1"><AlertTriangle size={11} />{t("Compte introuvable — a peut-être été supprimé")}</p>
                          ) : (
                            <p className="text-[11.5px] text-[#999] truncate">
                              {t("{0} clics · {1} ventes", d.periode.clicsPeriode, d.periode.conversionsPeriode)} · <span className="font-bold text-[#B7791F]">{fmt(d.periode.soldeDisponible, d.tenant.devise)}</span> {t("disponible")}
                              {d.affilie.statut !== "actif" && <span className="ml-1 text-amber-600">· {t(d.affilie.statut === "suspendu" ? "suspendu" : "en attente de validation")}</span>}
                            </p>
                          )}
                        </div>
                        <ChevronRight size={16} className="text-[#CCC] flex-shrink-0 hidden sm:block" />
                      </Link>
                      {d && (
                        <>
                          <button onClick={() => copier(lien, id)} aria-label={t("Copier le lien")} className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#111] text-white flex-shrink-0">
                            {copie === id ? <Check size={14} className="text-[#F5A623]" /> : <Copy size={14} />}
                          </button>
                          <a href={`https://wa.me/?text=${encodeURIComponent(t("🛍️ Je te recommande *{0}* ! Commande ici : {1}", d.tenant.nomBoutique, lien))}`} target="_blank" rel="noopener noreferrer"
                            aria-label={t("Partager sur WhatsApp")} className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#25D366]/10 text-[#1DA851] flex-shrink-0">
                            <MessageCircle size={15} />
                          </a>
                        </>
                      )}
                      <button onClick={() => retirer(id)} aria-label={t("Retirer")} title={t("Retirer de cet appareil")}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-[#CCC] hover:text-red-500 hover:bg-red-50 flex-shrink-0">
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Graphiques */}
          <div className="grid lg:grid-cols-2 gap-3">
            <ClicsConversionsChart donnees={seriesClicsConv} />
            {parDevise.map(([devise, g]) => <CommissionsChart key={devise} donnees={g.serie} devise={devise} />)}
          </div>
          {parDevise.length > 1 && (
            <p className="text-[11px] text-[#AAA] text-center">{t("Un graphique par devise — les commissions ne sont jamais additionnées entre monnaies différentes.")}</p>
          )}

          {formulaire}
        </div>
      )}
    </EspaceAffilieShell>
  );
}
