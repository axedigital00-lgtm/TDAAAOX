"use client";
// Comptabilité du magasin : bénéfice net de la période, chiffre d'affaires, coût
// d'achat, charges, fonds généraux, rentabilité par produit, charges par catégorie.
// Tous les montants viennent de GET /api/pos/comptabilite ; l'écran ne calcule
// que la largeur des barres. Même socle que les autres écrans « Finance du magasin ».
import { useMemo, useState } from "react";
import { BarChart3, Package, PiggyBank, ShoppingBag, TrendingDown, TrendingUp } from "lucide-react";
import { ModuleTutorial, BoutonRevoirTutoriel } from "@/components/dashboard/ModuleTutorial";
import { useDevise } from "@/components/dashboard/DeviseProvider";
import { useT } from "@/components/I18nProvider";
import { Bouton, EtatChargement, EtatPos, EtatVide } from "@/components/pos/ui";
import { Carte, Chiffre, EnTete, Page, useLecture } from "@/components/pos/finance/commun";
import { Onglets } from "@/components/pos/stock/commun";

const COMPTA_TUTORIAL_STEPS = [
  { Icon: BarChart3,  titre: "Bénéfice brut vs net",  description: "Le bénéfice brut, c'est ton revenu moins le coût d'achat des produits vendus. Le bénéfice net va plus loin : il retire aussi ta part des charges d'exploitation (loyer, salaires...)." },
  { Icon: ShoppingBag, titre: "Rentabilité par produit", description: "Vois quels produits te rapportent vraiment, une fois le coût d'achat ET la quote-part des charges pris en compte — pas juste le chiffre d'affaires." },
  { Icon: PiggyBank,   titre: "Fonds généraux",        description: "Le solde net cumulé de toute ton activité en boutique physique — entrées moins charges, depuis le début." },
];

interface ProduitRentabilite {
  produitId: string; nom: string; image: string | null;
  quantiteVendue: number; revenu: number; cout: number;
  beneficeBrut: number; beneficeBrutPct: number;
  quotePartCharges: number; beneficeNet: number; beneficeNetPct: number;
}
type Donnees = {
  resume: {
    beneficeNet: number; revenu: number; revenuHT?: number; coutMarchandises: number; beneficeBrut: number;
    chargesExploitation: number; nombreVentes: number; taxes?: number; remises?: number; retours?: number;
  };
  approximation?: { lignesCoutActuel: number; lignesSansCout: number };
  fondsGeneraux: { entreesTotales: number; chargesTotales: number; soldeNet: number };
  parProduit: ProduitRentabilite[];
  parCategorieCharge: Record<string, number>;
};

type Periode = "mois" | "semaine" | "annee";
const PERIODES: { id: Periode; libelle: string }[] = [
  { id: "mois", libelle: "Ce mois-ci" },
  { id: "semaine", libelle: "7 derniers jours" },
  { id: "annee", libelle: "Cette année" },
];
const CATEGORIES: Record<string, string> = {
  loyer: "Loyer", electricite: "Électricité", eau: "Eau", internet: "Internet", fournitures: "Fournitures",
  equipement: "Équipement", salaires: "Salaires", transport: "Transport", autre: "Autre",
};

function plage(periode: Periode): { debut: string; fin: string } {
  const now = new Date();
  let debut: Date;
  if (periode === "semaine") debut = new Date(now.getTime() - 7 * 86400000);
  else if (periode === "annee") debut = new Date(now.getFullYear(), 0, 1);
  else debut = new Date(now.getFullYear(), now.getMonth(), 1);
  return { debut: debut.toISOString(), fin: now.toISOString() };
}

const couleurMontant = (n: number) => (n >= 0 ? "text-[#15803D]" : "text-[#B91C1C]");

export default function ComptabilitePage() {
  const t = useT();
  const { fmt } = useDevise();
  const [periode, setPeriode] = useState<Periode>("mois");
  // La plage est figée au choix de la période : pas de nouvelle requête à chaque rendu.
  const url = useMemo(() => { const { debut, fin } = plage(periode); return `/api/pos/comptabilite?debut=${debut}&fin=${fin}`; }, [periode]);
  const { donnees: data, erreur, charge, recharger } = useLecture<Donnees>(url);

  const enTete = (
    <>
      <ModuleTutorial moduleKey="pos-comptabilite" titre={t("Comptabilité")} sousTitre={t("Module Point de vente")} steps={COMPTA_TUTORIAL_STEPS} />
      <EnTete titre="Comptabilité" sousTitre="Rentabilité, entrées, charges et fonds généraux de la vente en magasin.">
        <BoutonRevoirTutoriel moduleKey="pos-comptabilite" />
      </EnTete>
      <Onglets label="Période" onglets={PERIODES} actif={periode} onChange={setPeriode} />
    </>
  );

  if (erreur && !data) return <Page>{enTete}<EtatPos code={erreur.code} message={erreur.message} onReessayer={() => void recharger()} /></Page>;
  if (!data) return <Page>{enTete}<EtatChargement texte="Calcul de la comptabilité…" /></Page>;

  const r = data.resume;
  const positif = r.beneficeNet >= 0;
  const categories = Object.entries(data.parCategorieCharge);

  return (
    <Page>
      {enTete}
      <div className={`space-y-5 transition-opacity ${charge ? "opacity-60" : ""}`} aria-busy={charge}>
        {/* Bénéfice net : jaune AXSO (texte noir) s'il est positif, rouge (texte blanc) sinon. */}
        <section className={`rounded-2xl p-5 sm:p-6 ${positif ? "bg-[#F5A623] text-[#111111]" : "bg-[#B91C1C] text-white"}`}>
          <h2 className="text-[11px] font-semibold uppercase tracking-widest opacity-80">{t("Bénéfice net de la période")}</h2>
          <p className="mt-1 flex items-center gap-2 text-[26px] font-black tabular-nums [overflow-wrap:anywhere] sm:text-[32px]">
            {positif ? <TrendingUp size={26} aria-hidden /> : <TrendingDown size={26} aria-hidden />}
            {fmt(r.beneficeNet)}
          </p>
          <p className="mt-1 text-[12px] opacity-80">
            {fmt(r.revenuHT ?? r.revenu)} {t("de revenu hors taxes −")} {fmt(r.coutMarchandises)} {t("de coût d'achat −")} {fmt(r.chargesExploitation)} {t("de charges d'exploitation")}
          </p>
        </section>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Chiffre label="Chiffre d'affaires" valeur={fmt(r.revenu)} aide={t("{0} vente(s)", r.nombreVentes)} />
          <Chiffre label="Coût d'achat marchandises" valeur={fmt(r.coutMarchandises)} />
          <Chiffre label="Bénéfice brut" valeur={fmt(r.beneficeBrut)} aide="Avant charges d'exploitation" ton={r.beneficeBrut < 0 ? "danger" : undefined} />
          <Chiffre label="Charges d'exploitation" valeur={fmt(r.chargesExploitation)} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Chiffre label="Taxes collectées" valeur={fmt(r.taxes ?? 0)} aide="Comprises dans le chiffre d'affaires" />
          <Chiffre label="Remises accordées" valeur={fmt(r.remises ?? 0)} aide="Déjà déduites" />
          <Chiffre label="Retours d'articles" valeur={fmt(r.retours ?? 0)} aide="Déjà déduits" />
        </div>

        {(data.approximation?.lignesCoutActuel ?? 0) > 0 || (data.approximation?.lignesSansCout ?? 0) > 0 ? (
          <p role="note" className="rounded-2xl border border-[#FCD34D] bg-[#FFFBEB] p-3 text-[12px] leading-relaxed text-[#92400E]">
            {t("Marge approchée.")}{" "}
            {data.approximation!.lignesCoutActuel > 0 && <>{data.approximation!.lignesCoutActuel} {t("ligne(s) vendue(s) avant la caisse 2.0 n'ont pas de coût figé : le coût actuel du produit est utilisé à la place.")}{" "}</>}
            {data.approximation!.lignesSansCout > 0 && <>{data.approximation!.lignesSansCout} {t("ligne(s) concernent un produit sans prix d'achat : leur coût est compté à zéro.")}</>}
          </p>
        ) : null}

        <Carte titre="Fonds généraux (tout historique)">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Chiffre label="Entrées totales" valeur={fmt(data.fondsGeneraux.entreesTotales)} ton="positif" />
            <Chiffre label="Charges totales" valeur={fmt(data.fondsGeneraux.chargesTotales)} ton="danger" />
            <Chiffre label="Solde net" valeur={fmt(data.fondsGeneraux.soldeNet)} fort />
          </div>
        </Carte>

        <Carte titre="Rentabilité par produit">
          <p className="-mt-1 mb-3 text-[11.5px] leading-relaxed text-[#666666]">{t("Bénéfice net = bénéfice brut − quote-part des charges d'exploitation, répartie au prorata du revenu de chaque produit")}</p>
          {data.parProduit.length === 0 ? (
            <EtatVide compact titre="Aucune vente en magasin sur cette période" texte="Les produits vendus en caisse apparaîtront ici avec leur marge. Choisis une période plus longue, ou encaisse une vente.">
              {periode !== "annee" && <Bouton variante="secondaire" onClick={() => setPeriode("annee")}>{t("Voir toute l'année")}</Bouton>}
              <Bouton variante="secondaire" href="/dashboard/pos/caisse">{t("Aller à la caisse")}</Bouton>
            </EtatVide>
          ) : (
            <ul className="divide-y divide-[#F0F0F0]">
              {data.parProduit.map((p) => (
                <li key={p.produitId} className="py-3">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.image ? <img src={p.image} alt="" className="h-10 w-10 flex-shrink-0 rounded-xl object-cover" />
                      : <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#F5F5F5]" aria-hidden><Package size={15} className="text-[#AAAAAA]" /></span>}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-[#111111]">{p.nom}</p>
                      <p className="text-[11.5px] text-[#666666]">{p.quantiteVendue} {t("vendu(s) ·")} {fmt(p.revenu)} {t("de revenu ·")} {fmt(p.cout)} {t("de coût d'achat")}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className={`text-[13.5px] font-bold tabular-nums ${couleurMontant(p.beneficeNet)}`}>{fmt(p.beneficeNet)}</p>
                      <p className="text-[11px] text-[#666666]">{p.beneficeNetPct}{t("% net")}</p>
                    </div>
                  </div>
                  <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 pl-[52px] text-[11.5px] text-[#666666]">
                    <span>{t("Brut :")} <strong className={couleurMontant(p.beneficeBrut)}>{fmt(p.beneficeBrut)}</strong> ({p.beneficeBrutPct}%)</span>
                    <span>{t("Charges allouées :")} <strong className="text-[#B91C1C]">−{fmt(p.quotePartCharges)}</strong></span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Carte>

        {categories.length > 0 && (
          <Carte titre="Charges par catégorie" actions={<Bouton variante="secondaire" taille="compact" href="/dashboard/pos/charges">{t("Voir les charges")}</Bouton>}>
            <ul className="space-y-3">
              {categories.map(([cat, montant]) => {
                const pct = r.chargesExploitation > 0 ? Math.round((montant / r.chargesExploitation) * 100) : 0;
                return (
                  <li key={cat}>
                    <div className="mb-1 flex items-center justify-between text-[12.5px]">
                      <span className="text-[#555555]">{t(CATEGORIES[cat] ?? cat)} <span className="text-[#888888]">· {pct} %</span></span>
                      <span className="font-bold tabular-nums text-[#111111]">{fmt(montant)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#F0F0F0]" aria-hidden>
                      <div className="h-full rounded-full bg-[#F5A623]" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Carte>
        )}
      </div>
    </Page>
  );
}
