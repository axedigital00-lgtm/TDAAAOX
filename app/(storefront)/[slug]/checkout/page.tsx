export const dynamic = "force-dynamic";

// Storefront — Page checkout
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { boutiqueVisible } from "@/lib/tenant";
import Link from "next/link";
import { CheckoutForm, type ArticleCommande } from "@/components/storefront/CheckoutForm";
import { prixClient } from "@/lib/pricing";
import { habillageDesign } from "@/components/storefront/templates/HabillageDesign";
import { resolveConfigVitrine } from "@/lib/vitrine-design";
import { Lock } from "lucide-react";
import { getT } from "@/lib/i18n/serveur";
import { lireReglagesPaiement } from "@/lib/paiement-pays";
import { decoderPanier, panierActif, type LignePanier } from "@/lib/mode-achat";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ produit?: string; quantite?: string; variante?: string; panier?: string }>;
}

// Les produits commandés — bouton Commander d'une fiche (?produit=…) ou panier (?panier=…,
// lib/mode-achat.ts) : produits et prix recalculés ici depuis la base, comme le refera la création
// de la commande. Le panier ne contient que du physique (une seule commande, paiement à la livraison).
async function articlesCommande(tenantId: string, taux: number, q: { produit?: string; quantite?: string; variante?: string; panier?: string }, panier: boolean): Promise<ArticleCommande[]> {
  const viaPanier = panier && !!q.panier;
  const lignes: LignePanier[] = viaPanier ? decoderPanier(q.panier)
    : q.produit ? [{ produitId: q.produit, quantite: Number(q.quantite) || 1, variante: q.variante }] : [];
  if (!lignes.length) return [];
  const produits = await prisma.produit.findMany({
    where: { id: { in: lignes.map((l) => l.produitId) }, tenantId, actif: true },
    select: { id: true, nom: true, type: true, prix: true, images: true, variantes: { where: { actif: true }, select: { nom: true, valeur: true, prix: true } } },
  });
  return lignes.flatMap((l) => {
    const p = produits.find((x) => x.id === l.produitId);
    if (!p || (viaPanier && p.type !== "physique")) return [];
    const variante = l.variante ? p.variantes.find((v) => `${v.nom}: ${v.valeur}` === l.variante) : undefined;
    return [{
      produitId: p.id, nom: p.nom, type: p.type, imageUrl: p.images[0],
      prix: prixClient(variante?.prix ?? p.prix, taux, p.type),
      // Mêmes plafonds que la création de commande : 999 (à la livraison), 10 (payé en ligne).
      quantite: Math.min(Math.max(Math.floor(l.quantite) || 1, 1), p.type === "physique" ? 999 : 10),
      variante: variante ? l.variante : undefined,
    }];
  });
}

export default async function CheckoutPage({ params, searchParams }: Props) {
  const t = await getT();
  const { slug } = await params;
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  // Même règle que les autres pages : publique si active, visible par le propriétaire (aperçu du Constructeur).
  if (!tenant || !(await boutiqueVisible(tenant))) notFound();

  const cfg = await resolveConfigVitrine(tenant.themeId, tenant.id, (tenant.themeConfig as Record<string, any>) || {});
  const q = await searchParams;
  const depuisPanier = !!q.panier && panierActif(tenant.parametresCommande, cfg.modeBoutique === "digital");
  const articles = await articlesCommande(tenant.id, tenant.commissionRate ?? 0.1, q, depuisPanier);
  const article = articles[0];
  const paiement = { paiement: lireReglagesPaiement(tenant.parametresPaiement), articles, depuisPanier };
  const theme = cfg.colors;

  // Boutique à design : même en-tête / pied de page que le reste de la boutique.
  const Habillage = habillageDesign(cfg);
  if (Habillage) {
    return (
      <Habillage>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <CheckoutForm paysBoutique={tenant.pays} theme={theme} slug={slug} devise={tenant.devise} tenantId={tenant.id} nomBoutique={tenant.nomBoutique}
            logoUrl={tenant.logoUrl || undefined} parametresCommande={(tenant.parametresCommande as any) || {}} {...paiement} />
        </div>
      </Habillage>
    );
  }

  return (
    <div style={{ backgroundColor: theme.fond, color: theme.texte, minHeight: "100vh" }}>
      {/* Navbar minimal */}
      <nav style={{ borderBottomColor: `${theme.accent}20` }} className="border-b">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href={`/${slug}`}>
            <span className="text-xl font-bold font-playfair" style={{ color: theme.accent }}>{t(tenant.nomBoutique)}</span>
          </Link>
          <div className="flex items-center gap-2 text-sm opacity-50">
            <span className="text-xs">{article?.type === "physique" ? t("Paiement à la livraison") : t("Paiement sécurisé")}</span>
            <Lock size={14} />
          </div>
        </div>
      </nav>

      {/* Étapes */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <nav aria-label={t("Fil d'Ariane")} className="flex items-center gap-2 text-xs min-w-0">
          {depuisPanier ? <><Link href={`/${slug}/panier`} className="opacity-70 hover:opacity-100 underline-offset-4 hover:underline">{t("Panier")}</Link><span className="opacity-50">›</span></>
            : article && <><Link href={`/${slug}/produits/${article.produitId}`} className="opacity-70 hover:opacity-100 underline-offset-4 hover:underline truncate max-w-[50%]">{t(article.nom)}</Link><span className="opacity-50">›</span></>}
          <span aria-current="page" className="font-semibold whitespace-nowrap" style={{ color: theme.accent }}>{t("Commande")}</span>
        </nav>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <CheckoutForm paysBoutique={tenant.pays} theme={theme} slug={slug} devise={tenant.devise} tenantId={tenant.id} nomBoutique={tenant.nomBoutique} logoUrl={tenant.logoUrl || undefined}
          parametresCommande={(tenant.parametresCommande as any) || {}} {...paiement} />
      </div>

    </div>
  );
}
