import { PageLegale } from "@/components/marketing/site/Blocs";
import type { Metadata } from "next";
import { getT } from "@/lib/i18n/serveur";

export const metadata: Metadata = {
  title: "Politique de prix",
};

// Reflète lib/pricing.ts (prixClient, tauxProduit, SUPPLEMENT_NUMERIQUE) : à modifier ensemble.
const CAS = [
  { nom: "Produit numérique", detail: "Dès le retour du paiement en ligne", majoration: "+13 %", axso: "10 %", paiement: "3 %", exemple: "10 000 F → le client paie 11 300 F" },
  { nom: "Produit physique payé en ligne", detail: "Dès le retour du paiement en ligne", majoration: "+10 %", axso: "7 %", paiement: "3 %", exemple: "10 000 F → le client paie 11 000 F" },
  { nom: "Produit physique payé à la livraison", detail: "En espèces, directement au marchand", majoration: "0 %", axso: "0 %", paiement: "0 %", exemple: "10 000 F → le client paie 10 000 F" },
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
    <PageLegale t={t} actif="/legal/politique-prix" titre={t("Politique de prix")} maj={t("Dernière mise à jour : 2 novembre 2026")}>

          <div className="axm-grid axm-g3" style={{ marginBottom: 48 }}>
            {CAS.map((c) => (
              <div key={c.nom} className="axm-card" style={{ padding: 24 }}>
                <p style={{ fontWeight: 600 }}>{t(c.nom)}</p>
                <p className="axm-muted" style={{ fontSize: 13, marginTop: 4 }}>{t(c.detail)}</p>
                <p style={{ fontSize: 40, fontWeight: 600, letterSpacing: "-.03em", margin: "16px 0 12px" }}>{c.majoration}</p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6, fontSize: 14, color: "#3d3d3d" }}>
                  <li>{t("AXSO")} : <strong>{c.axso}</strong></li>
                  <li>{t("Frais de paiement")} : <strong>{c.paiement}</strong></li>
                  <li>{t(c.exemple)}</li>
                </ul>
              </div>
            ))}
          </div>

          <div>
            {SECTIONS.map((s) => (
              <div key={s.titre} className="axm-legal__sec">
                <h2>{t(s.titre)}</h2>
                <p className="axm-legal__p">{t(s.contenu)}</p>
              </div>
            ))}
          </div>

          <div className="axm-card" style={{ marginTop: 40 }}>
            <p className="axm-legal__p">{t("Une question sur les prix ou les commissions ?")}{" "}<a href="mailto:facturation@axsoafrica.com" className="axm-link">facturation@axsoafrica.com</a></p>
          </div>
    </PageLegale>
  );
}
