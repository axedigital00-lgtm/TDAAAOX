"use client";
// 404 de la vitrine, aux couleurs de la boutique (fournies par le layout, components/storefront/Panier.tsx).
import Link from "next/link";
import { useVitrine } from "@/components/storefront/Panier";
import { useT } from "@/components/I18nProvider";

export default function VitrineIntrouvable() {
  const t = useT();
  const v = useVitrine();
  const accent = v?.accent ?? "#111111";
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 text-center" style={{ background: v?.fond, color: v?.texte }}>
      <div className="space-y-4 max-w-md">
        <p className="text-6xl font-black" style={{ color: accent }}>404</p>
        <h1 className="text-xl font-bold">{t("Cette page est introuvable")}</h1>
        <p className="opacity-70">{t("Le lien est peut-être erroné ou la page n'existe plus.")}</p>
        {v && (
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link href={`/${v.slug}`} className="inline-flex items-center min-h-11 px-5 rounded-xl font-semibold" style={{ background: accent, color: "#fff" }}>{t("Retour à la boutique")}</Link>
            <Link href={`/${v.slug}/produits`} className="inline-flex items-center min-h-11 px-5 rounded-xl font-semibold border" style={{ borderColor: accent, color: accent }}>{t("Voir les produits")}</Link>
          </div>
        )}
      </div>
    </main>
  );
}
