import { redirect } from "next/navigation";

// Recherche de la vitrine : le catalogue filtre déjà par ?q= (nom, description, catégorie).
export default async function RecherchePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ q?: string }> }) {
  const { slug } = await params;
  const { q } = await searchParams;
  redirect(`/${slug}/produits${q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
}
