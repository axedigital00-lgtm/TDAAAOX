"use client";
// Portail d'un affilié pour UNE boutique (accès par jeton secret, sans compte — voir
// app/api/affilie/[token]/route.ts) : solde, chiffres, liens à partager, commissions et versements.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  Copy, Check, MousePointerClick, ShoppingBag, Percent, TrendingUp, Wallet, Clock, Send, BadgeCheck,
  MessageCircle, Camera, Mail, Award, CheckCircle2, XCircle, LayoutDashboard, Link2, Coins,
  Package, AlertTriangle, Search, ExternalLink, Loader2,
} from "lucide-react";
import { ClicsConversionsChart, CommissionsChart } from "@/components/affilie/AffiliationCharts";
import { EspaceAffilieShell, Initiale, type Onglet } from "@/components/affilie/EspaceAffilieShell";
import { enregistrerAffiliationLocale } from "@/lib/affiliation-local";
import { useT } from "@/components/I18nProvider";

const PERIODES = [7, 30, 90] as const;
const ONGLETS: Onglet[] = [
  { id: "apercu", label: "Aperçu", Icon: LayoutDashboard },
  { id: "liens", label: "Liens", Icon: Link2 },
  { id: "gains", label: "Gains", Icon: Coins },
];
const carte = "bg-white border border-gray-100 rounded-2xl";

const STATUT_COMMISSION: Record<string, { label: string; cls: string }> = {
  pending: { label: "En attente de confirmation", cls: "bg-amber-50 text-amber-700" },
  approuvee: { label: "Disponible", cls: "bg-emerald-50 text-emerald-700" },
  payee: { label: "Payée", cls: "bg-gray-100 text-gray-600" },
  rejetee: { label: "Annulée", cls: "bg-red-50 text-red-600" },
};
const STATUT_PAIEMENT: Record<string, { label: string; cls: string; Icon: typeof Clock }> = {
  en_attente: { label: "En cours de validation", cls: "text-amber-700 bg-amber-50", Icon: Clock },
  refus_en_cours: { label: "En cours de validation", cls: "text-amber-700 bg-amber-50", Icon: Clock },
  traite: { label: "Versé", cls: "text-emerald-700 bg-emerald-50", Icon: CheckCircle2 },
  echec: { label: "Non abouti — remis dans le solde", cls: "text-red-600 bg-red-50", Icon: XCircle },
};

function Badge({ s }: { s: { label: string; cls: string } }) {
  const t = useT();
  return <span className={`inline-flex text-[10.5px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${s.cls}`}>{t(s.label)}</span>;
}

function Titre({ children, droite }: { children: React.ReactNode; droite?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <h2 className="text-[13px] font-bold text-[#111]">{children}</h2>
      {droite}
    </div>
  );
}

export default function PortailAffiliePage() {
  const t = useT();
  const params = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copie, setCopie] = useState<string | null>(null);
  const [periode, setPeriode] = useState<7 | 30 | 90>(30);
  const [onglet, setOnglet] = useState("apercu");
  const [filtre, setFiltre] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/affilie/${params.token}?periode=${periode}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) return;
        setData(d);
        // Retrouvé ensuite dans la vue d'ensemble et la barre latérale (ce navigateur seulement).
        enregistrerAffiliationLocale({ portalToken: params.token, nomBoutique: d.tenant.nomBoutique, logoUrl: d.tenant.logoUrl, nomProgramme: d.programme?.nom ?? "Programme affilié" });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.token, periode]);

  function copier(texte: string, id: string) {
    navigator.clipboard.writeText(texte).then(() => {
      setCopie(id);
      toast.success(t("Copié !"));
      setTimeout(() => setCopie(null), 2000);
    }, () => toast.error(t("Copie impossible : sélectionnez le lien à la main.")));
  }

  if (!data) {
    return (
      <EspaceAffilieShell titre={t("Espace affilié")} retour="/mon-espace-affilie">
        {loading ? (
          <div className="py-24 flex justify-center"><Loader2 size={26} className="animate-spin text-[#F5A623]" /></div>
        ) : (
          <div className={`${carte} py-16 px-6 text-center`}>
            <AlertTriangle size={30} className="mx-auto mb-3 text-[#D9D9D9]" />
            <p className="font-bold mb-1">{t("Portail introuvable.")}</p>
            <p className="text-sm text-[#999] mb-5">{t("Ce lien n'est plus valide. Vérifiez le lien reçu par e-mail.")}</p>
            <Link href="/mon-espace-affilie" className="inline-flex px-5 py-3 rounded-xl bg-[#111] text-white text-sm font-semibold">{t("Mon espace affilié")}</Link>
          </div>
        )}
      </EspaceAffilieShell>
    );
  }

  const { affilie, programme, palier, tenant, commissions, paiements, produits, periode: p } = data;
  const devise = tenant.devise;
  const fmt = (n: number) => `${(n ?? 0).toLocaleString(t.loc)} ${devise}`;
  // Adresse principale de la boutique (domaine personnalisé ou nom.axsoafrica.com), fournie par l'API.
  const lienPartage = `${tenant.lien}?ref=${affilie.codeParrainage}`;
  const msgWhatsapp = (nom: string, lien: string) => t("🛍️ Je te recommande *{0}* ! Commande ici : {1}", nom, lien);
  const wa = (texte: string) => `https://wa.me/?text=${encodeURIComponent(texte)}`;
  const taux = palier ? palier.tauxActuel : programme?.valeurCommission;
  const regle = !programme ? "" : programme.typeCommission === "fixe"
    ? t("{0} par vente", fmt(programme.valeurCommission))
    : t("{0} % sur chaque vente", taux);
  const tauxConv = p.clicsPeriode > 0 ? Math.round((p.conversionsPeriode / p.clicsPeriode) * 1000) / 10 : 0;
  const produitsFiltres = (produits ?? []).filter((x: any) => x.nom.toLowerCase().includes(filtre.trim().toLowerCase()));

  const textes = [
    { id: "whatsapp", label: "WhatsApp", Icon: MessageCircle, couleur: "#25D366", texte: msgWhatsapp(tenant.nomBoutique, lienPartage) },
    { id: "instagram", label: "Instagram / Facebook", Icon: Camera, couleur: "#E1306C",
      texte: t("✨ Découvrez {0} ! Des produits de qualité livrés rapidement. Lien en bio → {1}", tenant.nomBoutique, lienPartage) },
    { id: "email", label: "E-mail", Icon: Mail, couleur: "#6b7280",
      texte: t("Bonjour,\n\nJe voulais vous partager une boutique que j'aime beaucoup : {0}.\nDécouvrez leurs produits ici :\n{1}\n\nBonne découverte !", tenant.nomBoutique, lienPartage) },
  ];

  const enTete = (
    <div className="flex items-center gap-3 mb-4 md:mb-6">
      <Initiale nom={tenant.nomBoutique} logoUrl={tenant.logoUrl} taille={44} />
      <div className="min-w-0 flex-1">
        <h1 className="text-[19px] md:text-[22px] font-bold leading-tight truncate">{tenant.nomBoutique}</h1>
        <p className="text-[12px] text-[#999] truncate">{programme?.nom ?? t("Programme affilié")}{regle && <> · <span className="font-semibold text-[#B7791F]">{regle}</span></>}</p>
      </div>
      <a href={tenant.lien} target="_blank" rel="noreferrer" className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-[12px] font-semibold text-[#555] hover:bg-gray-50">
        {t("Voir la boutique")}<ExternalLink size={13} />
      </a>
    </div>
  );

  const alerteStatut = affilie.statut !== "actif" && (
    <div className="flex gap-3 items-start rounded-2xl border border-amber-200 bg-amber-50 p-4 mb-4 text-[13px] text-amber-800">
      <AlertTriangle size={17} className="flex-shrink-0 mt-0.5" />
      <p>{affilie.statut === "suspendu"
        ? t("Votre compte affilié est suspendu par la boutique : vos liens ne rapportent plus de commission.")
        : t("Votre compte attend la validation de la boutique : vos clics et ventes seront comptés dès qu'il sera activé.")}</p>
    </div>
  );

  const solde = (
    <div className="rounded-2xl p-5 md:p-6 mb-4 text-white" style={{ background: "linear-gradient(135deg,#111111 0%,#1d1d1d 100%)" }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] text-white/60 flex items-center gap-1.5"><Wallet size={14} className="text-[#F5A623]" />{t("Solde disponible")}</p>
          <p className="text-[30px] md:text-[36px] font-black tracking-tight text-[#F5A623] leading-tight mt-1">{fmt(p.soldeDisponible)}</p>
        </div>
        {p.seuilPaiement > 0 && (
          <span className="text-[10.5px] font-semibold px-2.5 py-1 rounded-full bg-white/10 text-white/70 whitespace-nowrap">{t("Versement dès {0}", fmt(p.seuilPaiement))}</span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 mt-5">
        {[
          { label: "En attente", v: p.soldeEnAttente, Icon: Clock },
          { label: "En versement", v: p.enCoursVersement, Icon: Send },
          { label: "Déjà versé", v: p.totalVerse, Icon: BadgeCheck },
        ].map((x) => (
          <div key={x.label} className="rounded-xl bg-white/[0.06] border border-white/10 p-2.5 md:p-3 min-w-0">
            <p className="text-[10.5px] text-white/50 flex items-center gap-1 truncate"><x.Icon size={11} />{t(x.label)}</p>
            <p className="text-[13px] md:text-[16px] font-bold mt-0.5 truncate">{fmt(x.v)}</p>
          </div>
        ))}
      </div>
      <p className="text-[11.5px] text-white/50 mt-4 leading-relaxed">
        {t("Seul le solde disponible est versé : une commission devient disponible quand la commande est confirmée. La boutique déclenche le versement sur votre Mobile Money, validé à la main par Axso.")}
      </p>
    </div>
  );

  const carteLien = (
    <div className={`${carte} p-4 md:p-5 mb-4`}>
      <Titre droite={<span className="text-[10.5px] font-bold tracking-wide text-[#B7791F] bg-[#FFF6E6] rounded-full px-2.5 py-1">{t("CODE")} {affilie.codeParrainage}</span>}>
        {t("Votre lien d'affiliation")}
      </Titre>
      <div className="rounded-xl bg-[#F7F7F7] border border-gray-100 px-3.5 py-3 text-[13px] font-mono text-[#333] break-all select-all">{lienPartage}</div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <button onClick={() => copier(lienPartage, "lien")} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#111] text-white text-[13px] font-semibold active:scale-[0.98]">
          {copie === "lien" ? <Check size={15} className="text-[#F5A623]" /> : <Copy size={15} />}{copie === "lien" ? t("Copié !") : t("Copier le lien")}
        </button>
        <a href={wa(textes[0].texte)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#25D366] text-white text-[13px] font-semibold active:scale-[0.98]">
          <MessageCircle size={15} />WhatsApp
        </a>
      </div>
      <p className="text-[11px] text-[#AAA] mt-3">{t("Vos visiteurs sont suivis pendant {0} jours après leur clic.", programme?.dureeCookie ?? 30)}</p>
    </div>
  );

  const apercu = (
    <>
      {solde}
      {carteLien}
      <div className="flex items-center justify-between gap-3 mb-3 mt-6">
        <h2 className="text-[13px] font-bold">{t("Performance")}</h2>
        <div className="flex bg-white border border-gray-100 rounded-xl p-1">
          {PERIODES.map((pv) => (
            <button key={pv} onClick={() => setPeriode(pv)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors ${periode === pv ? "bg-[#111] text-white" : "text-[#AAA]"}`}>
              {t("{0} j", pv)}
            </button>
          ))}
        </div>
      </div>
      <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 transition-opacity ${loading ? "opacity-50" : ""}`}>
        {[
          { label: "Clics", v: p.clicsPeriode.toLocaleString(t.loc), Icon: MousePointerClick, c: "#3b82f6" },
          { label: "Ventes", v: p.conversionsPeriode.toLocaleString(t.loc), Icon: ShoppingBag, c: "#10b981" },
          { label: "Taux de conversion", v: `${tauxConv.toLocaleString(t.loc)} %`, Icon: Percent, c: "#8b5cf6" },
          { label: "Commissions", v: fmt(p.commissionsPeriode), Icon: TrendingUp, c: "#F5A623" },
        ].map((k) => (
          <div key={k.label} className={`${carte} p-4 min-w-0`}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background: `${k.c}14` }}>
              <k.Icon size={16} style={{ color: k.c }} />
            </div>
            <p className="text-[19px] md:text-[22px] font-bold leading-none truncate">{k.v}</p>
            <p className="text-[11px] text-[#999] mt-1.5">{t(k.label)}</p>
          </div>
        ))}
      </div>
      {palier && (
        <div className={`${carte} p-4 md:p-5 mb-4`}>
          <div className="flex items-center justify-between gap-3 mb-2.5 flex-wrap">
            <p className="text-[13px] font-bold flex items-center gap-1.5"><Award size={15} className="text-[#F5A623]" />{t("Palier {0} — {1} %", palier.nom, palier.tauxActuel)}</p>
            <p className="text-[11.5px] text-[#888]">{palier.prochainPalier
              ? t("Encore {0} vente(s) pour passer {1}", palier.conversionsRestantes, palier.prochainPalier)
              : t("Palier le plus haut atteint")}</p>
          </div>
          <div className="h-2 bg-[#F0F0F0] rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${palier.prochainPalier ? Math.min(100, (affilie.conversions / (affilie.conversions + palier.conversionsRestantes)) * 100) : 100}%`, background: "linear-gradient(90deg,#F5A623,#FFD280)" }} />
          </div>
        </div>
      )}
      <div className="grid lg:grid-cols-2 gap-3">
        <ClicsConversionsChart donnees={p.seriesJour ?? []} />
        <CommissionsChart donnees={p.seriesJour ?? []} devise={devise} />
      </div>
    </>
  );

  const liens = (
    <>
      {carteLien}
      <div className={`${carte} p-4 md:p-5 mb-4`}>
        <Titre droite={produits?.length > 0 && <span className="text-[11px] text-[#AAA]">{t("{0} produit(s)", produits.length)}</span>}>{t("Produits à promouvoir")}</Titre>
        {!produits?.length ? (
          <div className="text-center py-8">
            <Package size={28} className="mx-auto mb-2 text-[#DDD]" />
            <p className="text-[13px] text-[#999] max-w-xs mx-auto">{t("La boutique n'a pas encore ouvert de produit à l'affiliation : partagez le lien de la boutique ci-dessus.")}</p>
          </div>
        ) : (
          <>
            {produits.length > 6 && (
              <div className="relative mb-3">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#BBB]" />
                <input value={filtre} onChange={(e) => setFiltre(e.target.value)} placeholder={t("Rechercher un produit")}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 text-base sm:text-[13px] outline-none focus:border-[#F5A623]" />
              </div>
            )}
            <div className="divide-y divide-gray-100">
              {produitsFiltres.map((prod: any) => {
                const lien = `${tenant.lien}/produits/${prod.id}?ref=${affilie.codeParrainage}`;
                const id = `produit-${prod.id}`;
                return (
                  <div key={prod.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="w-12 h-12 rounded-xl bg-[#F7F7F7] overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {prod.image ? <img src={prod.image} alt="" className="w-full h-full object-cover" /> : <Package size={18} className="text-[#CCC]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate">{prod.nom}</p>
                      <p className="text-[11.5px] text-[#999]">
                        {fmt(prod.prix)} · <span className="font-bold text-emerald-600">{t("{0} % de commission", prod.tauxCommissionPct)}</span>
                      </p>
                    </div>
                    <a href={wa(msgWhatsapp(prod.nom, lien))} target="_blank" rel="noopener noreferrer" aria-label={t("Partager sur WhatsApp")}
                      className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#25D366]/10 text-[#1DA851] flex-shrink-0">
                      <MessageCircle size={16} />
                    </a>
                    <button onClick={() => copier(lien, id)} aria-label={t("Copier le lien")}
                      className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#111] text-white flex-shrink-0">
                      {copie === id ? <Check size={15} className="text-[#F5A623]" /> : <Copy size={15} />}
                    </button>
                  </div>
                );
              })}
              {produitsFiltres.length === 0 && <p className="text-[13px] text-[#AAA] text-center py-4">{t("Aucun produit ne correspond.")}</p>}
            </div>
          </>
        )}
      </div>
      <div className={`${carte} p-4 md:p-5`}>
        <Titre>{t("Textes prêts à partager")}</Titre>
        <div className="grid md:grid-cols-3 gap-3">
          {textes.map((x) => (
            <div key={x.id} className="rounded-xl border border-gray-100 p-3.5 flex flex-col min-w-0">
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 text-[12px] font-bold"><x.Icon size={14} style={{ color: x.couleur }} />{x.label}</span>
                <button onClick={() => copier(x.texte, x.id)} className="flex items-center gap-1 text-[11px] font-bold text-[#666] px-2.5 py-1.5 rounded-lg bg-[#F7F7F7] hover:bg-gray-100">
                  {copie === x.id ? <Check size={12} /> : <Copy size={12} />}{t("Copier")}
                </button>
              </div>
              <p className="text-[12px] text-[#666] whitespace-pre-line leading-relaxed break-words">{x.texte}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  const gains = (
    <>
      {solde}
      <div className={`${carte} p-4 md:p-5 mb-4`}>
        <Titre>{t("Commissions")}</Titre>
        {commissions.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingBag size={28} className="mx-auto mb-2 text-[#DDD]" />
            <p className="text-[13px] text-[#999] mb-4">{t("Pas encore de vente. Partagez votre lien pour gagner votre première commission.")}</p>
            <button onClick={() => setOnglet("liens")} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F5A623] text-[#111] text-[13px] font-bold">
              <Link2 size={14} />{t("Voir mes liens")}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {commissions.map((c: any) => (
              <div key={c.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold">{fmt(c.montantCommission)}</p>
                  <p className="text-[11px] text-[#AAA] truncate">
                    {new Date(c.createdAt).toLocaleDateString(t.loc, { day: "2-digit", month: "short", year: "numeric" })}{c.valeurCommande > 0 && ` · ${t("Vente de {0}", fmt(c.valeurCommande))}`}
                  </p>
                </div>
                <Badge s={STATUT_COMMISSION[c.statut] ?? { label: c.statut, cls: "bg-gray-100 text-gray-600" }} />
              </div>
            ))}
          </div>
        )}
      </div>
      <div className={`${carte} p-4 md:p-5`}>
        <Titre>{t("Versements")}</Titre>
        {paiements.length === 0 ? (
          <p className="text-[13px] text-[#999] text-center py-6">{t("Aucun versement pour l'instant. Dès que votre solde disponible atteint le seuil, la boutique peut déclencher un versement sur votre Mobile Money.")}</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {paiements.map((v: any) => {
              const s = STATUT_PAIEMENT[v.statut] ?? { label: v.statut, cls: "text-gray-600 bg-gray-100", Icon: Clock };
              return (
                <div key={v.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${s.cls}`}><s.Icon size={16} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold">{fmt(v.montant)}</p>
                    <p className="text-[11px] text-[#AAA] truncate">
                      {new Date(v.createdAt).toLocaleDateString(t.loc, { day: "2-digit", month: "short", year: "numeric" })}{v.telephone && ` · ${t("Mobile Money")} ${v.telephone}`}
                    </p>
                  </div>
                  <Badge s={s} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );

  return (
    <EspaceAffilieShell titre={tenant.nomBoutique} retour="/mon-espace-affilie" onglets={ONGLETS} ongletActif={onglet} choisirOnglet={setOnglet} enTete={<>{enTete}{alerteStatut}</>}>
      {onglet === "apercu" ? apercu : onglet === "liens" ? liens : gains}
    </EspaceAffilieShell>
  );
}
