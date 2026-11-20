"use client";
// FAQ des tarifs : accordéon de la charte du site public (`.axm-faq`).
import { useT } from "@/components/I18nProvider";

const faqs = [
  { q: "Est-ce vraiment gratuit ?", r: "Oui ! Le plan Essentiel est gratuit à vie et suffit largement pour lancer votre boutique, la gérer et commencer à vendre. Et quand vos ventes décollent, les plans Pro et Illimité vont encore plus loin : commandes illimitées, IA pour vos visuels pub, statistiques avancées, plusieurs boutiques, équipe et pub Meta & TikTok intégrée." },
  { q: "Comment mes clients paient-ils ?", r: "Pour l'instant, à la livraison ou en commandant par WhatsApp : vous êtes payé directement, sans commission. Le paiement en ligne est momentanément indisponible." },
  { q: "Puis-je utiliser mon propre nom de domaine ?", r: "Oui ! Vous obtenez d'abord une URL gratuite (axsoafrica.com/votre-boutique), puis vous pouvez connecter votre propre domaine depuis les paramètres." },
  { q: "L'assistant IA parle-t-il français ?", r: "Absolument. L'IA d'Axso est configurée pour comprendre et répondre en français (et en anglais). Elle connaît les marchés africains et peut vous aider à rédiger vos fiches produits." },
  { q: "Ai-je besoin de compétences techniques ?", r: "Aucune. Le constructeur Axso fonctionne par glisser-déposer, sans code. Décrivez votre boutique à Stella et elle configure l'essentiel à votre place en 3 minutes." },
  { q: "Puis-je importer mes produits depuis un fichier Excel ?", r: "Oui ! Depuis la page Produits, cliquez sur « Importer (Excel) », téléchargez le modèle, remplissez une ligne par produit et envoyez-le. Fichiers Excel et CSV acceptés, jusqu'à 1 000 produits par import." },
  { q: "Les notifications WhatsApp sont-elles automatiques ?", r: "Oui ! Chaque nouvelle commande vous est notifiée dans votre tableau de bord, et vos clients reçoivent sur WhatsApp la confirmation de leur commande et le lien pour la suivre." },
  { q: "Puis-je vendre dans plusieurs pays africains ?", r: "Oui. Vous pouvez configurer des zones de livraison et des tarifs différents selon les pays. Le paiement à la livraison et la commande par WhatsApp fonctionnent partout." },
  { q: "Et si j'ai besoin d'aide ?", r: "Notre équipe vous répond sur WhatsApp au +237 6 98 67 73 55, du lundi au vendredi de 8h à 20h. Stella, l'IA intégrée, répond à vos questions 24h/24, et des guides en français sont en cours de rédaction." },
];

export function FaqSection() {
  const t = useT();
  return (
    <section className="axm axm-page axm-section axm-light" id="faq">
      <div className="axm-wrap">
        <div className="axm-faq-wrap">
          <h2 className="axm-h2">{t("Questions fréquentes")}</h2>
          <div className="axm-faq">
            {faqs.map((faq, i) => (
              <details key={faq.q} open={i === 0}>
                <summary>{t(faq.q)}<span aria-hidden className="axm-faq__plus" /></summary>
                <div className="axm-faq__r">{t(faq.r)}</div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
