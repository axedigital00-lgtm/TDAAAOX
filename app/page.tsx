import { NavbarMarketing } from "@/components/marketing/NavbarMarketing";
import { FooterMarketing } from "@/components/marketing/FooterMarketing";
import { HomeAxso } from "@/components/marketing/home/HomeAxso";
import { avisPublies } from "@/lib/avis-plateforme";

// Régénérée chaque minute : une date de fin de promo changée par l'admin s'affiche vite, la page reste rapide.
export const revalidate = 60;

export default async function HomePage() {
  const avis = await avisPublies(8);
  return (
    <main className="overflow-x-clip" style={{ background: "#000" }}>
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
      <NavbarMarketing/>
      <HomeAxso avis={avis}/>
      <FooterMarketing/>
    </main>
  );
}
