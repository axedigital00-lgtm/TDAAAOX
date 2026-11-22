// Contact : canaux (email, WhatsApp), horaires, formulaire (ouvre l'app email)
// et questions fréquentes.
import type { Metadata } from "next";
import { getT } from "@/lib/i18n/serveur";
import { PageAxm, HeroPage, Section, Faq } from "@/components/marketing/site/Blocs";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contactez l'équipe AXSO : support, partenariats, presse.",
};

export default async function ContactPage() {
  const t = await getT();
  const canaux = [
    { titre: t("Email"), texte: "support@axsoafrica.com", lien: "mailto:support@axsoafrica.com", label: t("Envoyer un email"), logo: null },
    { titre: "WhatsApp", texte: t("+237 6 98 67 73 55 · Lun–Ven 8h–20h"), lien: "https://wa.me/237698677355", label: t("Envoyer un message"), logo: "/brand/partenaires/whatsapp.svg" },
    { titre: t("Partenariats et presse"), texte: "hello@axsoafrica.com", lien: "mailto:hello@axsoafrica.com", label: t("Écrire à l’équipe"), logo: null },
  ];
  return (
    <PageAxm>
      <HeroPage image={{ src: "/visuels/hero-contact.webp", alt: "" }}
        surtitre={t("Contact")}
        titre={t("Parlons de votre boutique")}
        lead={t("Écrivez-nous par email ou sur WhatsApp : notre équipe vous répond pendant les heures d’assistance.")}
      />
      <Section serre>
        <div className="axm-grid axm-g3">
          {canaux.map((c) => (
            <a key={c.titre} href={c.lien} target={c.lien.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
              className="axm-card axm-card--lien" style={{ display: "flex", flexDirection: "column", gap: 10, color: "inherit", textDecoration: "none", minHeight: 220 }}>
              {c.logo && <img src={c.logo} alt="" width={32} height={32} />}
              <h3 className="axm-h4">{c.titre}</h3>
              <p className="axm-muted">{c.texte}</p>
              <span className="axm-link" style={{ marginTop: "auto" }}>{c.label} →</span>
            </a>
          ))}
        </div>
      </Section>

      <Section serre>
        <div className="axm-split" style={{ alignItems: "start" }}>
          <div>
            <h2 className="axm-h3">{t("Horaires d’assistance")}</h2>
            <dl style={{ marginTop: 24, display: "grid", gap: 0 }}>
              {[[t("Lundi – vendredi"), t("08h00 – 20h00")], [t("Samedi"), t("Fermé")], [t("Dimanche"), t("Fermé")]].map(([j, h]) => (
                <div key={j} style={{ display: "flex", justifyContent: "space-between", padding: "16px 0", borderBottom: "1px solid var(--m-line)", fontSize: 17 }}>
                  <dt>{j}</dt><dd className="axm-muted" style={{ margin: 0 }}>{h}</dd>
                </div>
              ))}
            </dl>
          </div>
          <form className="axm-card" action="mailto:support@axsoafrica.com" method="get" style={{ display: "grid", gap: 18 }}>
            <h2 className="axm-h3">{t("Envoyer un message")}</h2>
            <p className="axm-muted" style={{ marginTop: -8 }}>{t("Le bouton ouvre votre application email avec votre message prêt à envoyer.")}</p>
            <div className="axm-field">
              <label htmlFor="contact-sujet">{t("Sujet")}</label>
              <input id="contact-sujet" type="text" name="subject" required placeholder={t("Support technique, partenariat, presse...")} className="axm-input" />
            </div>
            <div className="axm-field">
              <label htmlFor="contact-message">{t("Message")}</label>
              <textarea id="contact-message" rows={5} name="body" required placeholder={t("Décrivez votre demande en détail...")} className="axm-input" style={{ resize: "vertical" }} />
            </div>
            <button type="submit" className="axm-btn axm-btn--primary" style={{ border: 0, cursor: "pointer", fontFamily: "inherit" }}>{t("Envoyer le message")}</button>
            <p className="axm-muted" style={{ fontSize: 13, textAlign: "center" }}>{t("Vos données sont protégées et ne sont jamais partagées.")}</p>
          </form>
        </div>
      </Section>

      <Section clair>
        <Faq titre={t("Questions fréquentes")} items={[
          { q: t("Puis-je tester AXSO gratuitement ?"), r: t("Oui, le forfait de départ est gratuit. Aucune carte bancaire n’est demandée pour démarrer.") },
          { q: t("Comment fonctionne l’assistante Stella ?"), r: t("Stella répond à vos questions et prépare de vraies actions dans votre boutique : fiches produits, analyses, promotions. Elle vous demande votre accord avant chaque action importante.") },
        ]} />
      </Section>
    </PageAxm>
  );
}
