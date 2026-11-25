import { PageLegale } from "@/components/marketing/site/Blocs";
import type { Metadata } from "next";
import { getT } from "@/lib/i18n/serveur";

export const metadata: Metadata = {
  title: "Politique de prix",
};

// Reflète lib/pricing.ts (prixClient, COMMISSION_NUMERIQUE, repartitionNumerique) : à modifier ensemble.
const CAS = [
  { nom: "Produit numérique", detail: "Payé en ligne par Mobile Money", majoration: "10 %", axso: "10 %", paiement: "inclus", exemple: "10 000 F → le client paie 10 000 F, vous recevez 9 000 F" },
  { nom: "Produit physique payé à la livraison", detail: "En espèces, directement au marchand", majoration: "0 %", axso: "0 %", paiement: "0 %", exemple: "10 000 F → le client paie 10 000 F" },
];

const SECTIONS = [
  {
    titre: "1. Le client paie le prix que vous fixez",
    contenu: "Le prix que vous saisissez est exactement celui que paie votre client : AXSO n'ajoute rien. Sur une vente de produit numérique, AXSO prélève une commission de 10 %, qui couvre aussi les frais du prestataire de paiement. Sur une vente payée à la livraison, AXSO ne prélève rien.",
  },
  {
    titre: "2. Produits numériques",
    contenu: "Un produit numérique (fichier à télécharger, formation, licence, pack, événement en ligne) se paie en ligne par Mobile Money sur AXSO, depuis de nombreux pays africains. Dès que le paiement est confirmé, votre client reçoit son accès par e-mail, et vous êtes crédité de 90 % du montant payé. AXSO garde 10 %, frais de paiement compris. Exemple : pour un produit à 10 000 F, le client paie 10 000 F et vous recevez 9 000 F.",
  },
  {
    titre: "3. Produits physiques",
    contenu: "Les produits physiques se paient à la livraison ou par WhatsApp, directement au marchand. Ils ne se paient pas en ligne sur AXSO.",
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
    contenu: "Une vente de produit numérique est créditée sur votre wallet AXSO dès la confirmation du paiement, commission déduite. Elle devient retirable 24 heures plus tard (délai de sécurité contre les litiges et la fraude). Vous retirez ensuite votre argent quand vous voulez depuis votre tableau de bord : le versement part automatiquement sur votre Mobile Money, en quelques minutes. Les frais du versement sont déduits de la somme envoyée et affichés avant que vous confirmiez. Un versement qui échoue est remis aussitôt sur votre solde. Les ventes payées à la livraison vous sont payées directement par le client.",
  },
  {
    titre: "7. Modifications",
    contenu: "AXSO peut faire évoluer ces taux. Une commande déjà passée garde toujours le taux en vigueur au moment où elle a été créée.",
  },
];

export default async function PolitiquePrixPage() {
  const t = await getT();
  return (
    <PageLegale t={t} actif="/legal/politique-prix" titre={t("Politique de prix")} maj={t("Dernière mise à jour : 25 novembre 2026")}>

          <div className="axm-grid axm-g2" style={{ marginBottom: 48 }}>
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
