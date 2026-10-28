import { NavbarMarketing } from "@/components/marketing/NavbarMarketing";
import { HeroSection } from "@/components/marketing/HeroSection";
import { PartenairesSection } from "@/components/marketing/PartenairesSection";
import { ConstructeurSection } from "@/components/marketing/ConstructeurSection";
import { AxiaSection } from "@/components/marketing/AxiaSection";
import { VideoSection } from "@/components/marketing/VideoSection";
import { TarifsSection } from "@/components/marketing/TarifsSection";
import { TemoignagesSection } from "@/components/marketing/TemoignagesSection";
import { ThemesSection } from "@/components/marketing/ThemesSection";
import { AffiliationSection } from "@/components/marketing/AffiliationSection";
import { ContactSection } from "@/components/marketing/ContactSection";
import { FaqSection } from "@/components/marketing/FaqSection";
import { CtaFinal } from "@/components/marketing/CtaFinal";
import { FooterMarketing } from "@/components/marketing/FooterMarketing";
import { PauseHorsEcran } from "@/components/marketing/PauseHorsEcran";
import { Preloader } from "@/components/marketing/Preloader";
import { avisPublies } from "@/lib/avis-plateforme";
import { finPromo } from "@/lib/promo";

// Régénérée chaque minute : une date de fin de promo changée par l'admin s'affiche vite, la page reste rapide.
export const revalidate = 60;

export default async function HomePage() {
  const [avis, promo] = await Promise.all([avisPublies(8), finPromo()]);
  return (
    <main className="overflow-x-clip bg-white text-gray-900">
      {/* Logo de la marque pour Google (panneau de connaissances, résultats) : https://developers.google.com/search/docs/appearance/structured-data/logo */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Axso",
            url: "https://axsoafrica.com",
            logo: "https://axsoafrica.com/icon.png",
          }),
        }}
      />
      {/* overflow-x-clip, pas -hidden : « hidden » fait de <main> une seconde zone de défilement
          (overflow-y passe à auto) ; sur mobile, le doigt hésitait entre la page et <main> en bas de page. */}
      <Preloader/>
      <NavbarMarketing/>
      <HeroSection/>
      <PartenairesSection/>
      <ConstructeurSection/>
      <ThemesSection/>
      <AxiaSection/>
      <VideoSection/>
      <TarifsSection promoFinLe={promo?.toISOString() ?? null} maintenant={Date.now()}/>
      <AffiliationSection/>
      <TemoignagesSection reels={avis}/>
      <FaqSection/>
      <ContactSection/>
      <CtaFinal/>
      <FooterMarketing/>
      <PauseHorsEcran/>
    </main>
  );
}
