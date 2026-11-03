import { NavbarMarketing } from "@/components/marketing/NavbarMarketing";
import { FooterMarketing } from "@/components/marketing/FooterMarketing";
import { Percent } from "lucide-react";
import type { Metadata } from "next";
import { getT } from "@/lib/i18n/serveur";

export const metadata: Metadata = {
  title: "Politique de prix",
};

// Reflète lib/pricing.ts (prixClient, tauxProduit, SUPPLEMENT_NUMERIQUE) : à modifier ensemble.
const CAS = [
  { nom: "Produit numérique", detail: "Dès le retour du paiement en ligne", majoration: "+13 %", axso: "10 %", paiement: "3 %", exemple: "10 000 F → le client paie 11 300 F", accent: "#7c3aed" },
  { nom: "Produit physique payé en ligne", detail: "Dès le retour du paiement en ligne", majoration: "+10 %", axso: "7 %", paiement: "3 %", exemple: "10 000 F → le client paie 11 000 F", accent: "#F5A623" },
  { nom: "Produit physique payé à la livraison", detail: "En espèces, directement au marchand", majoration: "0 %", axso: "0 %", paiement: "0 %", exemple: "10 000 F → le client paie 10 000 F", accent: "#16A34A" },
];

const SECTIONS = [
  {
    titre: "1. Vous gardez toujours votre prix",
    contenu: "Le prix que vous saisissez pour un produit est celui que vous recevez. AXSO ne retire jamais rien de votre prix : sa commission et les frais du prestataire de paiement sont ajoutés au prix payé par le client.",
  },
  {
    titre: "2. Produits numériques",
    contenu: "Un produit numérique (fichier à télécharger, formation, licence, pack, événement en ligne) se paie en ligne : sa vente est suspendue tant que le paiement en ligne n'est pas de nouveau disponible. À son retour, la plateforme ajoutera 13 % à votre prix : 10 % pour AXSO et 3 % pour le prestataire qui encaisse le paiement. Exemple : si votre produit vaut 10 000 F, le client verra et paiera 11 300 F ; vous recevrez 10 000 F.",
  },
  {
    titre: "3. Produits physiques payés en ligne",
    contenu: "Le paiement en ligne est momentanément indisponible. À son retour, quand votre client paiera un produit physique en ligne, la plateforme ajoutera 10 % à votre prix : 7 % pour AXSO et 3 % pour le prestataire de paiement. Exemple : pour un produit à 10 000 F, le client paiera 11 000 F et vous recevrez 10 000 F.",
  },
  {
    titre: "4. Paiement à la livraison",
    contenu: "Quand votre client paie à la livraison, en espèces, ou commande par WhatsApp, il paie exactement votre prix. AXSO ne prend aucune commission et ne prélève rien sur votre wallet.",
  },
  {
    titre: "5. Frais de livraison",
    contenu: "Les frais de livraison que vous fixez ne sont jamais majorés : ils vous reviennent en entier.",
  },
  {
    titre: "6. Où arrive votre argent",
    contenu: "Aujourd'hui, votre client vous paie directement, à la livraison. Quand le paiement en ligne reviendra, ces paiements seront crédités sur votre wallet AXSO, déjà débarrassés de la commission et des frais de paiement : vous recevrez votre prix et vos frais de livraison. Vous demandez le retrait de votre solde depuis votre tableau de bord ; l'équipe AXSO vous le verse.",
  },
  {
    titre: "7. Modifications",
    contenu: "AXSO peut faire évoluer ces taux. Une commande déjà passée garde toujours le taux en vigueur au moment où elle a été créée.",
  },
];

export default async function PolitiquePrixPage() {
  const t = await getT();
  return (
    <main className="bg-white text-[#111111] min-h-screen" style={{ fontFamily: "'Poppins','Century Gothic',system-ui,sans-serif" }}>
      <NavbarMarketing />

      <section className="pt-36 pb-24 px-6 sm:px-10 lg:px-16 xl:px-24">
        <div className="max-w-4xl mx-auto">
          <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] mb-5" style={{ color: "#F5A623" }}>
            <Percent size={14} className="inline-block mr-1.5" />{t("Légal")}
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">{t("Politique de prix")}</h1>
          <p className="text-[#8C8C8C] text-sm mb-14">{t("Dernière mise à jour : 2 novembre 2026")}</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16">
            {CAS.map((c) => (
              <div key={c.nom} className="rounded-2xl border p-5" style={{ background: `${c.accent}08`, borderColor: `${c.accent}25` }}>
                <p className="text-sm font-bold mb-1">{t(c.nom)}</p>
                <p className="text-[#8C8C8C] text-xs mb-4">{t(c.detail)}</p>
                <p className="text-3xl font-black mb-3" style={{ color: c.accent }}>{c.majoration}</p>
                <ul className="space-y-1.5 text-xs text-[#666666]">
                  <li>{t("AXSO")} : <strong>{c.axso}</strong></li>
                  <li>{t("Frais de paiement")} : <strong>{c.paiement}</strong></li>
                  <li>{t(c.exemple)}</li>
                </ul>
              </div>
            ))}
          </div>

          <div className="space-y-10">
            {SECTIONS.map((s) => (
              <div key={s.titre} className="pb-10 border-b" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
                <h2 className="text-lg font-bold mb-4" style={{ color: "#F5A623" }}>{t(s.titre)}</h2>
                <p className="text-[#595959] leading-relaxed text-sm">{t(s.contenu)}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 rounded-2xl p-6 border" style={{ background: "rgba(245,166,35,0.04)", borderColor: "rgba(245,166,35,0.15)" }}>
            <p className="text-[#666666] text-sm">{t("Une question sur les prix ou les commissions ?")}{" "}<a href="mailto:facturation@axsoafrica.com" className="font-bold" style={{ color: "#F5A623" }}>facturation@axsoafrica.com</a></p>
          </div>
        </div>
      </section>

      <FooterMarketing />
    </main>
  );
}
