import { PageLegale } from "@/components/marketing/site/Blocs";
import type { Metadata } from "next";
import { getT } from "@/lib/i18n/serveur";

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation",
};

const SECTIONS = [
  {
    titre: "1. Objet",
    contenu: `Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de la plateforme AXSO, éditée par [Raison sociale, adresse et RCCM à compléter], ci-après dénommée "AXSO". En accédant à la plateforme, vous acceptez sans réserve les présentes CGU.`,
  },
  {
    titre: "2. Accès à la plateforme",
    contenu: `L'accès à AXSO est réservé aux personnes physiques ou morales ayant la capacité juridique de contracter. L'inscription est gratuite et sans engagement. AXSO se réserve le droit de suspendre ou résilier tout compte ne respectant pas les présentes CGU.`,
  },
  {
    titre: "3. Services proposés",
    contenu: `AXSO propose une plateforme SaaS permettant la création et la gestion de boutiques en ligne, incluant : la gestion de catalogue produits, la prise de commandes payées à la livraison ou passées par WhatsApp, la gestion logistique et de livraison, des outils de marketing et d'analyse, une assistance par intelligence artificielle (Stella).`,
  },
  {
    titre: "4. Obligations de l'utilisateur",
    contenu: `L'utilisateur s'engage à : fournir des informations exactes lors de l'inscription, ne pas utiliser la plateforme à des fins illicites, respecter les droits de propriété intellectuelle, ne pas tenter de nuire au fonctionnement de la plateforme, signaler tout incident de sécurité à security@axsoafrica.com.`,
  },
  {
    titre: "5. Tarification et facturation",
    contenu: `AXSO propose plusieurs plans tarifaires. Le plan Essentiel est gratuit. Les plans Pro et Illimité sont prépayés pour 30 jours, sans renouvellement ni prélèvement automatique ; leur paiement en ligne est momentanément indisponible. Les prix sont fixés en FCFA. À l'expiration d'une période non renouvelée, le compte repasse au plan Essentiel. Le détail figure dans les Conditions d'abonnement.`,
  },
  {
    titre: "6. Données personnelles",
    contenu: `AXSO traite les données personnelles conformément au RGPD et aux législations africaines applicables. Pour toute demande relative à vos données, contactez privacy@axsoafrica.com. Consultez notre Politique de Confidentialité pour plus d'informations.`,
  },
  {
    titre: "7. Limitation de responsabilité",
    contenu: `AXSO ne saurait être tenu responsable des dommages indirects résultant de l'utilisation de la plateforme. La responsabilité d'AXSO est limitée au montant des sommes versées par l'utilisateur au cours des 12 derniers mois.`,
  },
  {
    titre: "8. Droit applicable",
    contenu: `[Droit applicable et juridiction compétente à compléter]`,
  },
];

export default async function CguPage() {
  const t = await getT();
  return (
    <PageLegale t={t} actif="/legal/cgu" titre={t("Conditions Générales d'Utilisation")} maj={t("Dernière mise à jour : 2 novembre 2026")}>

          <div>
            {SECTIONS.map(s => (
              <div key={s.titre} className="axm-legal__sec">
                <h2>{t(s.titre)}</h2>
                <p className="axm-legal__p">{t(s.contenu)}</p>
              </div>
            ))}
          </div>

          <div className="axm-card" style={{ marginTop: 40 }}>
            <p className="axm-legal__p">{t("Des questions sur ces conditions ? Contactez-nous à")}{" "}
              <a href="mailto:legal@axsoafrica.com" className="axm-link">legal@axsoafrica.com</a>
            </p>
          </div>
    </PageLegale>
  );
}
