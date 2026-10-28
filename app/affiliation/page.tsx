export const dynamic = "force-dynamic";

import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, BadgeCheck, ChevronDown, Link2, Package, UserPlus, Wallet } from "lucide-react";
import { catalogueAffiliation } from "@/lib/affiliation";
import { formatMontant } from "@/lib/utils";
import { NavbarMarketing } from "@/components/marketing/NavbarMarketing";
import { FooterMarketing } from "@/components/marketing/FooterMarketing";
import { getT } from "@/lib/i18n/serveur";

export const metadata: Metadata = {
  title: "Programme d'affiliation AXSO — gagnez de l'argent en recommandant des produits africains",
  description: "Créez votre compte affilié gratuit, partagez vos liens et touchez une commission (10 % minimum, 20 % sur le numérique) sur chaque vente payée en ligne, versée par Axso sur Mobile Money.",
};

const INSCRIPTION = "/inscription/affilie";
const VERS_CATALOGUE = `${INSCRIPTION}?suite=/affilie/catalogue`;
const AMBRE = "linear-gradient(135deg,#F5A623,#d4880d)";
const pct = (taux: number) => `${Math.round(taux * 100)} %`;

const ETAPES = [
  { Icon: UserPlus, titre: "1. Créez votre compte", texte: "Gratuit, sans boutique : un nom, un e-mail et un mot de passe suffisent." },
  { Icon: Link2, titre: "2. Choisissez un produit et copiez votre lien", texte: "Parcourez le catalogue des boutiques Axso et partagez votre lien personnel où vous voulez." },
  { Icon: Wallet, titre: "3. Touchez votre commission", texte: "Chaque vente payée en ligne via votre lien vous rapporte une commission, versée par Axso sur Mobile Money." },
];

const FAQ = [
  { q: "C'est gratuit ?", r: "Oui. Créer un compte affilié ne coûte rien et ne demande pas de boutique." },
  { q: "Quand suis-je payé ?", r: "Votre commission devient disponible 48 h après la livraison de la commande (immédiatement pour un produit numérique). Vous demandez ensuite un retrait sur Mobile Money, validé par Axso." },
  { q: "Combien je gagne ?", r: "Chaque boutique fixe sa commission, avec un minimum de 10 % sur les produits physiques et 20 % sur les produits numériques. Le taux est affiché sur chaque produit." },
  { q: "Les paiements à la livraison comptent ?", r: "Non. Seules les commandes payées en ligne donnent droit à une commission." },
  { q: "Combien de temps mon lien est valable ?", r: "30 jours après le clic. Si l'acheteur clique ensuite sur le lien d'un autre affilié, c'est le dernier clic qui compte." },
  { q: "Je suis déjà marchand ?", r: "Connectez-vous avec votre compte habituel : votre espace affilié est inclus, inutile de créer un second compte." },
  { q: "Puis-je acheter avec mon propre lien ?", r: "Oui, mais ces achats ne donnent pas de commission." },
];

export default async function AffiliationPage() {
  const t = await getT();
  const { produits, total, boutiques, tauxMax } = await catalogueAffiliation({ take: 8 });

  return (
    <main className="bg-white text-[#111111] min-h-screen" style={{ fontFamily: "'Poppins','Century Gothic',system-ui,sans-serif" }}>
      <NavbarMarketing />

      {/* ── Hero ── */}
      <section className="pt-36 pb-14 px-4 sm:px-10 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] max-w-full h-[500px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse at top, rgba(245,166,35,0.1) 0%, transparent 65%)" }} />
        <div className="max-w-3xl mx-auto text-center relative">
          <h1 className="text-4xl sm:text-6xl font-black mb-6 leading-[1.08]">
            {t("Gagnez de l'argent en recommandant")}{" "}
            <span style={{ background: AMBRE, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              {t("des produits africains")}
            </span>
          </h1>
          <p className="text-[#666666] text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto mb-8">
            {t("Touchez une commission sur chaque vente payée en ligne grâce à votre lien, versée par Axso sur Mobile Money.")}
          </p>
          <Link href={INSCRIPTION}
            className="inline-flex items-center gap-2 font-bold px-8 py-4 rounded-2xl transition-all hover:scale-105"
            style={{ background: AMBRE, color: "#080808", boxShadow: "0 8px 30px rgba(245,166,35,0.35)" }}>
            {t("Créer mon compte affilié")}{" "}<ArrowRight size={18} />
          </Link>
          <p className="mt-4 text-sm text-[#808080]">
            <Link href="/connexion?callbackUrl=/affilie" className="hover:text-[#D4911A] underline">{t("Déjà affilié ? Se connecter")}</Link>
          </p>
        </div>
      </section>

      {/* ── Chiffres ── */}
      <section className="px-4 sm:px-10 pb-20">
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-3 sm:gap-5">
          {[
            { n: String(boutiques), label: "boutiques partenaires" },
            { n: String(total), label: "produits à recommander" },
            { n: pct(tauxMax), label: "commission max" },
          ].map(({ n, label }) => (
            <div key={label} className="rounded-2xl p-4 sm:p-6 text-center border"
              style={{ background: "rgba(245,166,35,0.04)", borderColor: "rgba(245,166,35,0.12)" }}>
              <p className="text-2xl sm:text-3xl font-black mb-1" style={{ color: "#F5A623" }}>{n}</p>
              <p className="text-[#808080] text-xs">{t(label)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Comment ça marche ── */}
      <section className="px-4 sm:px-10 pb-24">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black mb-10 text-center">{t("Comment ça marche")}</h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {ETAPES.map(({ Icon, titre, texte }) => (
              <div key={titre} className="rounded-2xl p-6 border" style={{ background: "rgba(0,0,0,0.02)", borderColor: "rgba(0,0,0,0.07)" }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(245,166,35,0.1)" }}>
                  <Icon size={20} style={{ color: "#F5A623" }} />
                </div>
                <p className="font-bold text-[#111111] mb-2">{t(titre)}</p>
                <p className="text-[#666666] text-sm leading-relaxed">{t(texte)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Aperçu du catalogue ── */}
      {produits.length > 0 && (
        <section className="px-4 sm:px-10 pb-24">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl sm:text-4xl font-black mb-3">{t("Quelques produits à recommander")}</h2>
              <p className="text-[#808080]">{t("Les commissions les plus élevées du moment")}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {produits.map((p) => (
                <Link key={p.produitId} href={VERS_CATALOGUE}
                  className="rounded-2xl overflow-hidden border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  style={{ borderColor: "rgba(0,0,0,0.08)" }}>
                  <div className="relative aspect-square overflow-hidden" style={{ background: "#F5F5F5" }}>
                    {p.image ? (
                      <img src={p.image} alt={p.nom} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Package size={36} style={{ color: "#D9D9D9" }} /></div>
                    )}
                    <span className="absolute top-2.5 left-2.5 text-[11px] font-black px-2 py-1 rounded-lg text-white" style={{ background: "#F5A623" }}>
                      +{pct(p.taux)}
                    </span>
                  </div>
                  <div className="p-3.5">
                    <p className="font-medium text-sm leading-snug line-clamp-2 mb-1.5">{p.nom}</p>
                    <div className="flex items-center gap-1 mb-2 min-w-0">
                      {p.logoUrl && <img src={p.logoUrl} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />}
                      <p className="text-[11px] truncate" style={{ color: "#999999" }}>{p.boutique}</p>
                      {p.certifie && <BadgeCheck size={11} className="flex-shrink-0" style={{ color: "#F5A623" }} />}
                    </div>
                    <p className="font-bold text-sm">{formatMontant(p.prix, p.devise)}</p>
                    <p className="text-xs font-semibold mt-1" style={{ color: "#16a34a" }}>
                      {t("Vous gagnez ~")}{formatMontant(p.gain, p.devise)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
            <div className="text-center mt-10">
              <Link href={VERS_CATALOGUE}
                className="inline-flex items-center gap-2 font-bold px-7 py-3.5 rounded-2xl text-white transition-transform hover:scale-[1.03]"
                style={{ background: "#111111" }}>
                {t("Voir tout le catalogue")}{" "}<ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── FAQ ── */}
      <section className="px-4 sm:px-10 pb-28">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black mb-8 text-center">{t("Questions fréquentes")}</h2>
          <div className="space-y-3">
            {FAQ.map(({ q, r }) => (
              <details key={q} className="group rounded-2xl border px-5 py-4" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
                <summary className="flex items-center justify-between gap-3 cursor-pointer list-none font-bold [&::-webkit-details-marker]:hidden">
                  {t(q)}
                  <ChevronDown size={18} className="flex-shrink-0 transition-transform group-open:rotate-180" style={{ color: "#F5A623" }} />
                </summary>
                <p className="mt-3 text-sm text-[#666666] leading-relaxed">{t(r)}</p>
              </details>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link href={INSCRIPTION}
              className="inline-flex items-center gap-2 font-bold px-8 py-4 rounded-2xl transition-all hover:scale-105"
              style={{ background: AMBRE, color: "#080808", boxShadow: "0 8px 30px rgba(245,166,35,0.35)" }}>
              {t("Créer mon compte affilié")}{" "}<ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <FooterMarketing />
    </main>
  );
}
