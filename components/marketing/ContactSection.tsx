import { Clock, Mail, Phone } from "lucide-react";
import { getT } from "@/lib/i18n/serveur";
import { SECTION, SURTITRE, TITRE, INTRO } from "./charte";

// Mêmes canaux que /contact.
const CANAUX = [
  { Icon: Mail, titre: "Email support", desc: "support@axsoafrica.com", lien: "mailto:support@axsoafrica.com", label: "Envoyer un email" },
  { Icon: Phone, titre: "WhatsApp Business", desc: "+237 6 98 67 73 55 · Lun–Ven 8h–20h", lien: "https://wa.me/237698677355", label: "Envoyer un message" },
];

export async function ContactSection() {
  const t = await getT();
  return (
    <section id="contact" className={`${SECTION} bg-white`}>
      <div className="w-full px-6 sm:px-10 lg:px-16 xl:px-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <span className={SURTITRE}>{t("Contactez-nous")}</span>
            <h2 className={`${TITRE} mb-5`}>
              {t("Une question ?")}{" "}<span className="text-[#F5A623]">{t("Nous sommes là.")}</span>
            </h2>
            <p className={`${INTRO} max-w-2xl mx-auto`}>{t("Écris-nous par e-mail ou sur WhatsApp, notre équipe te répond pendant les heures d'assistance.")}</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {CANAUX.map(({ Icon, titre, desc, lien, label }) => (
              <a key={titre} href={lien} target={lien.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                className="group rounded-3xl p-7 bg-white border border-gray-100 shadow-sm hover:border-[#F5A623]/40 transition-colors">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 bg-[#111111]">
                  <Icon size={20} className="text-[#F5A623]" />
                </div>
                <p className="font-bold text-[#111111] mb-1">{t(titre)}</p>
                <p className="text-gray-500 text-sm mb-4 break-words">{t(desc)}</p>
                <span className="text-sm font-bold text-[#F5A623]">{t(label)} →</span>
              </a>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-gray-400 inline-flex w-full items-center justify-center gap-1.5">
            <Clock size={14} />{" "}{t("Horaires d'assistance")} : {t("Lun – Ven")} {t("08h00 – 20h00")}
          </p>
        </div>
      </div>
    </section>
  );
}
