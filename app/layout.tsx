import { PAGES_SEO } from "@/lib/seo";
import type { Metadata } from "next";
import "@fontsource/poppins/latin-300.css";
import "@fontsource/poppins/latin-400.css";
import "@fontsource/poppins/latin-500.css";
import "@fontsource/poppins/latin-600.css";
import "@fontsource/poppins/latin-700.css";
import "@fontsource/poppins/latin-800.css";
import { Toaster } from "@/components/ui/sonner";
import { LangueSelecteur } from "@/components/ui/LangueSelecteur";
import { I18nProvider } from "@/components/I18nProvider";
import { getLangue, dico } from "@/lib/i18n/serveur";
import "./globals.css";


export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://www.axsoafrica.com"),
  title: {
    default: PAGES_SEO["/"].titre,
    template: "%s | AXSO",
  },
  description: PAGES_SEO["/"].description,
  openGraph: {
    title: PAGES_SEO["/"].titre,
    description: PAGES_SEO["/"].description,
    type: "website",
    siteName: "AXSO",
    locale: "fr_FR",
  },
  twitter: { card: "summary_large_image" },
  // Comme AxeTask : une PNG légère déclarée en premier — c'est elle que Vercel (avatar du projet),
  // Google (résultats de recherche) et les navigateurs prennent. favicon.ico reste servi à son
  // adresse pour les anciens navigateurs, sans balise.
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png", sizes: "64x64" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.png",
    apple: { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const langue = await getLangue();
  return (
    // data-scroll-behavior : globals.css met scroll-behavior:smooth sur <html> ; Next le désactive
    // pendant les changements de page (sinon avertissement à chaque chargement).
    <html lang={langue} data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full antialiased">
        <I18nProvider langue={langue} dico={await dico("commun")}>
          {children}
          {/* Toasts : sombres et sobres, comme l'admin (erreurs en rouge). */}
          <Toaster position="bottom-center" toastOptions={{ style: { background: "#1a1a1a", color: "#fff", border: "0", borderRadius: 12, fontFamily: "'Inter Variable', Inter, system-ui, sans-serif", fontSize: 13 }, classNames: { error: "ax-toast-erreur" } }} />
          <LangueSelecteur flottant />
        </I18nProvider>
      </body>
    </html>
  );
}
