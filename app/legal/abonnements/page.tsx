import { PageLegale } from "@/components/marketing/site/Blocs";
import Link from "next/link";
import type { Metadata } from "next";
import { getT } from "@/lib/i18n/serveur";

export const metadata: Metadata = {
  title: "Conditions d'abonnement",
};

const SUPPORT = "Support WhatsApp (lun-ven, 8h-20h)";
const PLANS = [
  { nom: "Essentiel", prix: "Gratuit", engagement: "Sans engagement ni limite de durée", inclus: ["60 commandes/mois", "1 boutique", "Stella essentielle", SUPPORT] },
  { nom: "Pro", prix: "6 000 FCFA / 30 jours", engagement: "Prépayé, sans renouvellement automatique", inclus: ["Commandes illimitées", "Stella avancée", "Analytics avancés", SUPPORT], popular: true },
  { nom: "Illimité", prix: "20 000 FCFA / 30 jours", engagement: "Prépayé, sans renouvellement automatique", inclus: ["Tout inclus sans limite", "Stella complète", "Boutiques illimitées", SUPPORT] },
];

// Reflète lib/abonnement.ts (planActif, expirationApresPaiement) et lib/abonnement-paiement.ts (30 jours, XAF).
const SECTIONS = [
  {
    titre: "1. Souscription",
    contenu: `Vous choisissez votre plan depuis votre tableau de bord (Abonnement). Le plan Essentiel est gratuit, sans limite de durée, et permet jusqu'à 60 commandes par mois calendaire. Les plans Pro et Illimité sont activés dès la confirmation de votre paiement. L'abonnement vaut pour votre compte : toutes les boutiques dont vous êtes propriétaire bénéficient du meilleur plan en cours.`,
  },
  {
    titre: "2. Paiement",
    contenu: `Les plans payants sont prépayés pour 30 jours, en FCFA. Le paiement en ligne des abonnements est momentanément indisponible : pour l'instant, les plans Pro et Illimité ne peuvent pas être achetés depuis le tableau de bord. Il n'y a aucun prélèvement automatique : rien n'est débité sans une action de votre part, et il n'y a donc rien à résilier. Pour continuer après 30 jours, vous effectuez simplement un nouveau paiement.`,
  },
  {
    titre: "3. Renouvellement",
    contenu: `Si vous renouvelez le même plan avant son expiration, les 30 nouveaux jours s'ajoutent aux jours qu'il vous restait : vous ne perdez aucun jour payé.`,
  },
  {
    titre: "4. Changement de plan",
    contenu: `Passer à un autre plan payant prend effet dès la confirmation du paiement, pour 30 jours à compter de ce jour. Ce changement n'est pas proratisé : les jours restants du plan précédent ne sont ni reportés ni remboursés. Revenir au plan Essentiel est gratuit et immédiat depuis votre tableau de bord ; les jours payés restants sont alors perdus.`,
  },
  {
    titre: "5. Fin de la période payée",
    contenu: `À la fin des 30 jours, si vous n'avez pas renouvelé, votre compte repasse automatiquement au plan Essentiel. Vos boutiques, produits et commandes sont conservés ; les limites du plan Essentiel s'appliquent de nouveau, notamment 60 commandes par mois. Vous pouvez reprendre un plan payant à tout moment.`,
  },
  {
    titre: "6. Modifications tarifaires",
    contenu: `AXSO peut faire évoluer ses tarifs. Une période déjà payée n'est jamais affectée : un nouveau tarif ne s'applique qu'aux paiements suivants.`,
  },
];

export default async function AbonnementsPage() {
  const t = await getT();
  return (
    <PageLegale t={t} actif="/legal/abonnements" titre={t("Conditions d'abonnement")} maj={t("Dernière mise à jour : 2 novembre 2026")}>

          {/* Plans recap */}
          <div className="axm-grid axm-g3" style={{ marginBottom: 48 }}>
            {PLANS.map(p => (
              <div key={p.nom} className="axm-card" style={{ padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <h3 className="axm-h4">{t(p.nom)}</h3>
                  {p.popular && <span className="axm-mock__tag">{t("Populaire")}</span>}
                </div>
                <p style={{ fontSize: 20, fontWeight: 600, marginTop: 12 }}>{t(p.prix)}</p>
                <p className="axm-muted" style={{ fontSize: 13, marginTop: 4 }}>{t(p.engagement)}</p>
                <ul className="axm-checks" style={{ marginTop: 16, gap: 8 }}>
                  {p.inclus.map(i => <li key={i} style={{ fontSize: 14 }}><span aria-hidden>✓</span><span>{t(i)}</span></li>)}
                </ul>
              </div>
            ))}
          </div>

          {/* Sections légales */}
          <div>
            {SECTIONS.map(s => (
              <div key={s.titre} className="axm-legal__sec">
                <h2>{t(s.titre)}</h2>
                <p className="axm-legal__p">{t(s.contenu)}</p>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 16, marginTop: 40, flexWrap: "wrap", alignItems: "stretch" }}>
            <div className="axm-card" style={{ flex: 1 }}>
              <p className="axm-legal__p">{t("Questions sur votre abonnement ?")}{" "}<a href="mailto:facturation@axsoafrica.com" className="axm-link">facturation@axsoafrica.com</a></p>
            </div>
            <Link href="/tarifs" className="axm-btn axm-btn--primary" style={{ alignSelf: "center" }}>{t("Voir les forfaits")}</Link>
          </div>
    </PageLegale>
  );
}
