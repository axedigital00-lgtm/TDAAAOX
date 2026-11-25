// Ma boutique : la page d'arrivée de l'espace boutique. Elle guide le marchand
// jusqu'à sa première vente (parcours de lancement) puis présente toutes les
// fonctions de la boutique, rangées par besoin.
import { getT } from "@/lib/i18n/serveur";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { urlBoutique } from "@/lib/utils";
import { lireReglagesLivraison } from "@/lib/livraison-reglages";
import { exigerModule } from "@/lib/permissions-server";
import { Icon, type IconName } from "@/components/dashboard/design-system/icons/Icon";
import { PartageBoutique, GuideMaBoutique, BoutonGuider } from "./MaBoutiqueClient";

type Etape = { id: string; titre: string; texte: string; href: string; action: string; fait: boolean; guide?: string };

const FONCTIONS: { titre: string; liens: { label: string; desc: string; href: string; icon: IconName }[] }[] = [
  { titre: "Apparence", liens: [
    { label: "Thèmes", desc: "Choisir le design de la boutique", href: "/dashboard/themes", icon: "grid" },
    { label: "Constructeur", desc: "Modifier textes, images et sections", href: "/dashboard/builder", icon: "pen" },
    { label: "Médias", desc: "Vos images et vidéos", href: "/dashboard/medias", icon: "image" },
  ] },
  { titre: "Réglages", liens: [
    { label: "Informations", desc: "Nom, logo, contacts, réseaux", href: "/dashboard/boutique", icon: "store" },
    { label: "Livraison", desc: "Zones, frais et délais", href: "/dashboard/livraison", icon: "truck" },
    { label: "Domaine", desc: "Une adresse à votre nom", href: "/dashboard/parametres/domaine", icon: "globe" },
    { label: "Paramètres", desc: "Paiements, équipe, notifications", href: "/dashboard/parametres", icon: "gear" },
  ] },
  { titre: "Faire venir des clients", liens: [
    { label: "Codes promo", desc: "Réductions et offres", href: "/dashboard/marketing/codes-promo", icon: "discount" },
    { label: "Marketing", desc: "Stella propose vos actions", href: "/dashboard/marketing", icon: "sparkle" },
    { label: "Campagnes", desc: "Relances et promotions", href: "/dashboard/campagnes", icon: "mail" },
    { label: "Publicité", desc: "Annonces sur les réseaux", href: "/dashboard/publicite", icon: "meta" },
    { label: "WhatsApp", desc: "Vendre par WhatsApp", href: "/dashboard/whatsapp", icon: "whatsapp" },
    { label: "Affiliation", desc: "Des revendeurs vendent pour vous", href: "/dashboard/affiliation", icon: "users" },
    { label: "Planificateur", desc: "Programmer vos publications", href: "/dashboard/scheduler", icon: "calendar" },
  ] },
  { titre: "Suivre les résultats", liens: [
    { label: "Analyses", desc: "Visites, ventes, conversion", href: "/dashboard/analytics", icon: "bars" },
    { label: "Rapports", desc: "Rapports détaillés", href: "/dashboard/rapports", icon: "doc" },
    { label: "Objectifs", desc: "Vos objectifs de vente", href: "/dashboard/objectifs", icon: "flag" },
  ] },
];

export default async function MaBoutiquePage() {
  const session = await auth();
  if (!session) redirect("/connexion");
  await exigerModule(session, "boutique");
  const tenantId = (session.user as { tenantId?: string })?.tenantId;
  if (!tenantId) redirect("/inscription");

  const [tenant, produits, commandes] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: {
      nomBoutique: true, slug: true, logoUrl: true, description: true, themeId: true, statut: true,
      parametresLivraison: true, customDomain: true, domaineActifAt: true, sousDomaineAt: true,
    } }),
    prisma.produit.count({ where: { tenantId, actif: true } }),
    prisma.commande.count({ where: { tenantId, statut: { not: "annulee" } } }),
  ]);
  if (!tenant) redirect("/inscription");

  const t = await getT();
  const livraison = lireReglagesLivraison(tenant.parametresLivraison);
  const enLigne = tenant.statut === "active";
  const etapes: Etape[] = [
    { id: "identite", titre: "Donnez une identité à votre boutique", texte: "Ajoutez votre logo et une courte description : vos clients savent tout de suite qui vous êtes.",
      href: "/dashboard/boutique", action: "Ajouter mon logo", fait: !!tenant.logoUrl && !!tenant.description?.trim() },
    { id: "theme", titre: "Choisissez un thème", texte: "Touchez un thème pour le voir en grand avec vos produits, puis « Utiliser ce thème ».",
      href: "/dashboard/themes?guide=1", action: "Choisir un thème", fait: tenant.themeId !== "terre-et-or", guide: "themes" },
    { id: "produit", titre: "Ajoutez votre premier produit", texte: "Une photo (n'importe quel format), un nom et un prix suffisent pour commencer.",
      href: "/dashboard/produits/nouveau?guide=1", action: "Ajouter un produit", fait: produits > 0, guide: "produit" },
    { id: "livraison", titre: "Indiquez vos frais de livraison", texte: "Vos villes ou quartiers et le prix de livraison : le client voit le total avant de commander.",
      href: "/dashboard/livraison", action: "Régler la livraison", fait: livraison.zones.length > 0 || livraison.frais > 0 || livraison.gratuite },
    { id: "publier", titre: "Mettez votre boutique en ligne", texte: "Dans le Constructeur, vérifiez l'aperçu puis touchez « Publier ».",
      href: "/dashboard/builder?guide=1", action: "Publier ma boutique", fait: enLigne, guide: "builder" },
    { id: "vente", titre: "Partagez et faites votre première vente", texte: "Envoyez le lien de votre boutique sur WhatsApp, Facebook ou Instagram.",
      href: "#partager", action: "Partager ma boutique", fait: commandes > 0 },
  ];
  const faites = etapes.filter((e) => e.fait).length;
  const prochaine = etapes.find((e) => !e.fait);
  const lien = urlBoutique(tenant, "", process.env.NEXT_PUBLIC_APP_URL ?? "");

  return (
    <div className="axd-mb">
      <GuideMaBoutique />

      <header className="axd-mb__tete">
        <div className="axd-mb__logo">{tenant.logoUrl ? <img src={tenant.logoUrl} alt="" /> : <Icon name="store" size={20} />}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1>{tenant.nomBoutique}</h1>
          <span className={`axd-mb__statut${enLigne ? " axd-mb__statut--ok" : ""}`}>{t(enLigne ? "En ligne" : "Pas encore en ligne")}</span>
        </div>
      </header>

      <PartageBoutique lien={lien} nom={tenant.nomBoutique} enLigne={enLigne} />

      {faites < etapes.length && (
        <section className="axd-mb__lancement" data-guide="mb-lancement" aria-labelledby="mb-lancement">
          <div className="axd-mb__lancement-tete">
            <h2 id="mb-lancement">{t("Lancez votre boutique")}</h2>
            <span>{t("{0} sur {1}", faites, etapes.length)}</span>
          </div>
          <div className="axd-mb__barre" role="progressbar" aria-valuemin={0} aria-valuemax={etapes.length} aria-valuenow={faites}>
            <i style={{ width: `${(faites / etapes.length) * 100}%` }} />
          </div>
          <ol className="axd-mb__etapes">
            {etapes.map((e, n) => {
              const active = e === prochaine;
              return (
                <li key={e.id} className={`axd-mb__etape${e.fait ? " is-fait" : ""}${active ? " is-active" : ""}`}>
                  <span className="axd-mb__num" aria-hidden>{e.fait ? <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 10.5 8.5 14.5 15.5 6" /></svg> : n + 1}</span>
                  <div className="axd-mb__etape-corps">
                    <h3>{t(e.titre)}{e.fait && <span className="sr-only"> ({t("fait")})</span>}</h3>
                    {active && <p>{t(e.texte)}</p>}
                    {active && (
                      <div className="axd-mb__etape-actions">
                        <Link href={e.href} className="axd-mb__cta" data-guide="mb-prochaine">{t(e.action)}<Icon name="arrowRight" size={16} /></Link>
                        {e.guide && <BoutonGuider href={e.href} />}
                      </div>
                    )}
                  </div>
                  {!active && !e.fait && <Link href={e.href} className="axd-mb__lien" aria-label={t(e.action)}><Icon name="chevronRight" size={18} /></Link>}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {FONCTIONS.map((g, k) => (
        <section key={g.titre} className="axd-mb__groupe" data-guide={k === 0 ? "mb-fonctions" : undefined}>
          <h2>{t(g.titre)}</h2>
          <div className="axd-mb__tuiles">
            {g.liens.map((l) => (
              <Link key={l.href} href={l.href} className="axd-mb__tuile">
                <span className="axd-mb__tuile-ic"><Icon name={l.icon} size={20} /></span>
                <span className="axd-mb__tuile-txt"><b>{t(l.label)}</b><small>{t(l.desc)}</small></span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
