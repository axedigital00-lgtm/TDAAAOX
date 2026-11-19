import { auth } from "@/lib/auth";
import { STATUTS_COURSE_ACTIVE } from "@/lib/commandes";
import { exigerModule } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { Badge, Button, Card, CardSection, KeyValue, PageHeader, Thumbnail, Timeline, buttonClasses, badgeCommande, badgePaiement, type TimelineItem } from "@/components/ui/adm";
import { Icon } from "@/components/ui/icones";
import { libelleMethodePaiement } from "../statuts";
import { formatMontant, dateRelative } from "@/lib/utils";
import { StatutCommandeSelector } from "@/components/dashboard/StatutCommandeSelector";
import { AssignerLivreur } from "@/components/dashboard/AssignerLivreur";
import { getT } from "@/lib/i18n/serveur";
import { qrSvg } from "@/lib/qr";
import { lienBoutique } from "@/lib/origine-site";
import { lienAccesCommande } from "@/lib/livraison-numerique";
import { RenvoyerLienDigital } from "@/components/dashboard/RenvoyerLienDigital";
import { canalAttribution } from "@/lib/attribution";

export default async function CommandeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  const session = await auth();
  if (!session) redirect("/connexion");
  await exigerModule(session, "commandes");

  const tenantId = (session.user as any)?.tenantId;
  const { id } = await params;

  const [commande, livreurs] = await Promise.all([
    prisma.commande.findFirst({
      where: { id, tenantId },
      include: {
        lignes: { include: { produit: { select: { slug: true } } } },
        client: true,
        livreur: { include: { user: { select: { email: true } } } },
        commission: true,
        codePromo: true,
        tenant: { select: { slug: true, nomBoutique: true, logoUrl: true } },
      },
    }),
    prisma.livreur.findMany({
      where: { actif: true, OR: [{ tenantId }, { tenantId: null }] },
      include: {
        user: { select: { email: true } },
        _count: { select: { commandes: { where: { statut: { in: STATUTS_COURSE_ACTIVE } } } } },
      },
      orderBy: { disponible: "desc" },
    }),
  ]);

  if (!commande) notFound();

  // Livraison numérique : journal + droits délivrés (jamais l'adresse du fichier).
  const [journalDigital, jetons, nbFormations, nbCles] = await Promise.all([
    prisma.livraisonDigitale.findUnique({ where: { commandeId: id } }),
    prisma.telechargement.findMany({ where: { commandeId: id }, select: { id: true, nbTelechargements: true, revoqueAt: true, dernierTelechargementAt: true, produit: { select: { nom: true } } } }),
    prisma.accesFormation.count({ where: { commandeId: id } }),
    prisma.cleLicence.count({ where: { commandeId: id } }),
  ]);
  const lienAccesDigital = journalDigital ? await lienAccesCommande(commande.tenant.slug, id) : null;

  const statutInfo = badgeCommande(commande.statut);
  const paiementInfo = badgePaiement(commande.paiementStatut, commande.methodePaiement);
  const devise = commande.devise;
  const nbArticles = commande.lignes.reduce((s, l) => s + l.quantite, 0);
  const slug = commande.tenant.slug;
  const c = commande as typeof commande & { livreurToken?: string | null; trackingToken?: string | null; latitudeClient?: number | null; longitudeClient?: number | null; adresseExacte?: string | null; mapsLienClient?: string | null };

  // Chronologie : seulement les événements réellement enregistrés (D4), le plus récent en premier.
  const heure = (d: Date) => d.toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  type Evenement = { id: string; at: Date; content: string };
  const bruts: (Evenement | null | undefined | false)[] = [
    { id: "creee", at: commande.createdAt, content: t("Commande passée · {0}", t(libelleMethodePaiement(commande.methodePaiement))) },
    commande.expedieeAt && { id: "expediee", at: commande.expedieeAt, content: t("Partie en livraison") },
    commande.livreeAt && { id: "livree", at: commande.livreeAt, content: t("Livrée au client") },
    commande.codRemisAt && { id: "cod", at: commande.codRemisAt, content: t("Montant à la livraison remis par le livreur") },
    !!journalDigital?.emailEnvoyeAt && { id: "digital", at: journalDigital!.emailEnvoyeAt!, content: t("Accès numériques envoyés par e-mail") },
  ];
  const evenements: TimelineItem[] = bruts.filter((e): e is Evenement => !!e)
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .map((e) => ({ id: e.id, content: e.content, time: heure(e.at) }));


  // Lien livreur : QR affiché à l'écran du marchand pendant la course seulement,
  // à scanner par le livreur au départ (jamais imprimé ni glissé dans le colis).
  const lienLivreur = c.livreurToken ? await lienBoutique(slug, `/livreur/${c.livreurToken}`) : null;
  const qrLivreur = lienLivreur && STATUTS_COURSE_ACTIVE.includes(commande.statut) ? await qrSvg(lienLivreur) : null;
  const lienFacture = c.trackingToken ? await lienBoutique(slug, `/facture/${c.trackingToken}`) : null;
  const lienSuivi = c.trackingToken ? await lienBoutique(slug, `/tracking/${c.trackingToken}`) : null;
  const msgLivreur = lienLivreur && STATUTS_COURSE_ACTIVE.includes(commande.statut)
    ? encodeURIComponent(`🚚 *Livraison — ${commande.tenant.nomBoutique}*\n\nBonjour ! Vous êtes assigné à la livraison de la commande #${commande.numero}.\n\n👤 Client : ${commande.clientNom}\n📞 Tél : ${commande.clientTelephone}\n📍 Adresse : ${c.adresseExacte || commande.adresseLivraison}, ${commande.ville}\n${c.mapsLienClient ? `\n🗺️ Google Maps : ${c.mapsLienClient}\n` : ""}\n📡 Votre lien de course (démarrer, suivi GPS, confirmer avec le code du client) :\n${lienLivreur}\n\nMerci !`)
    : null;
  const lien = "inline-flex items-center gap-1.5 text-(--color-link) hover:underline";

  return (
    <div className="space-y-4">
      <PageHeader
        backHref="/dashboard/commandes"
        title={<span className="font-mono">{t("Commande")} {commande.numero}</span>}
        titleMeta={<>
          <Badge tone={paiementInfo.tone} progress={paiementInfo.progress}>{t(paiementInfo.label)}</Badge>
          <Badge tone={statutInfo.tone} progress={statutInfo.progress}>{t(statutInfo.label)}</Badge>
        </>}
        secondaryActions={lienFacture ? [{ content: t("Voir la facture"), icon: "receipt", href: lienFacture }] : []}
      />
      <p className="-mt-3 text-(--color-text-secondary)">{t("Passée {0}", dateRelative(commande.createdAt))} · {t(libelleMethodePaiement(commande.methodePaiement))}</p>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Colonne principale */}
        <div className="space-y-4">
          <Card padding="none" title={<span className="flex items-center gap-2">{t("Traitement")} <Badge tone={statutInfo.tone} progress={statutInfo.progress}>{t(statutInfo.label)}</Badge></span>}>
            <ul>
              {commande.lignes.map((ligne) => (
                <li key={ligne.id} className="flex items-center gap-3 border-t border-(--color-border-secondary) px-4 py-3 first:border-t-0">
                  <Thumbnail src={ligne.imageUrl} alt={ligne.nom} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-[550] text-(--color-text-strong)">{t(ligne.nom)}</p>
                    {ligne.variante && <p className="text-(--color-text-secondary)">{t(ligne.variante)}</p>}
                  </div>
                  <span className="tabular whitespace-nowrap text-(--color-text-secondary)">{formatMontant(ligne.prix, devise)} × {ligne.quantite}</span>
                  <span className="tabular w-24 text-right whitespace-nowrap">{formatMontant(ligne.prix * ligne.quantite, devise)}</span>
                </li>
              ))}
            </ul>
            <CardSection className="flex justify-end">
              <StatutCommandeSelector commandeId={commande.id} numero={commande.numero} statutActuel={commande.statut} payeeEnLigne={commande.methodePaiement === "notchpay" && commande.paiementStatut === "completed"} />
            </CardSection>
          </Card>

          <Card title={<span className="flex items-center gap-2">{t("Paiement")} <Badge tone={paiementInfo.tone} progress={paiementInfo.progress}>{t(paiementInfo.label)}</Badge></span>}>
            <KeyValue items={[
              { label: `${t("Sous-total")} (${nbArticles} ${t(nbArticles > 1 ? "articles" : "article")})`, value: formatMontant(commande.montantSousTotal, devise) },
              ...(commande.montantReduction > 0 ? [{ label: `${t("Réduction")}${commande.codePromo ? ` (${commande.codePromo.code})` : ""}`, value: `−${formatMontant(commande.montantReduction, devise)}` }] : []),
              ...(commande.montantLivraison > 0 ? [{ label: t("Livraison"), value: formatMontant(commande.montantLivraison, devise) }] : []),
              ...(commande.montantTaxes > 0 ? [{ label: t("Taxes"), value: formatMontant(commande.montantTaxes, devise) }] : []),
              ...(commande.montantCarteCadeau > 0 ? [{ label: t("Carte-cadeau"), value: `−${formatMontant(commande.montantCarteCadeau, devise)}` }] : []),
              { label: commande.montantCarteCadeau > 0 ? t("Reste à encaisser") : t("Total"), value: formatMontant(commande.montantTotal, devise), strong: true },
            ]} />
            <div className="my-3 border-t border-(--color-border-secondary)" />
            <KeyValue items={[
              { label: t("Méthode"), value: t(libelleMethodePaiement(commande.methodePaiement)) },
              ...(commande.canal !== "pos" ? [{ label: t("Canal d'acquisition"), value: <span title={[commande.utmSource, commande.utmMedium, commande.utmCampagne, commande.referent].filter(Boolean).join(" · ") || undefined}>{t(canalAttribution(commande))}{commande.utmCampagne ? ` · ${commande.utmCampagne}` : ""}</span> }] : []),
              ...(commande.flutterwaveRef ? [{ label: t("Référence"), value: <span className="font-mono text-xs break-all">{commande.flutterwaveRef}</span> }] : []),
              ...(commande.commission ? [
                { label: t("Commission Axso"), value: formatMontant(commande.commission.montantCommission, devise) },
                { label: t("Votre part"), value: formatMontant(commande.commission.montantMarchand, devise) },
              ] : []),
            ]} />
          </Card>

          {journalDigital && (
            <Card title={t("Livraison numérique")}>
              <KeyValue items={[
                { label: t("Accès"), value: (
                  <Badge tone={journalDigital.statut === "livree" ? "success" : journalDigital.statut === "revoquee" ? "neutral" : journalDigital.statut === "en_cours" ? "info" : "critical"}>
                    {t(({ livree: "Livrés", partielle: "Incomplets", echec: "Échec", en_cours: "En cours", revoquee: "Révoqués" } as Record<string, string>)[journalDigital.statut] ?? journalDigital.statut)}
                  </Badge>
                ) },
                { label: t("E-mail au client"), value: `${t(({ envoye: "Envoyé", echec: "Échec d'envoi", sans_email: "Pas d'e-mail", en_attente: "Pas encore envoyé" } as Record<string, string>)[journalDigital.emailStatut] ?? journalDigital.emailStatut)}${journalDigital.emailEnvoyeAt ? ` · ${dateRelative(journalDigital.emailEnvoyeAt)}` : ""}` },
                { label: t("Tentatives"), value: `${journalDigital.tentatives} ${t("livraison(s)")} · ${journalDigital.emailTentatives} ${t("e-mail(s)")}` },
                ...jetons.map((j) => ({ label: t(j.produit.nom), value: j.revoqueAt ? t("Révoqué") : `${j.nbTelechargements} ${t("téléchargement(s)")}` })),
              ]} />
              {(nbFormations > 0 || nbCles > 0) && (
                <p className="mt-2 text-xs text-(--color-text-secondary)">{nbFormations > 0 ? `${nbFormations} ${t("accès formation")}` : ""}{nbFormations > 0 && nbCles > 0 ? " · " : ""}{nbCles > 0 ? `${nbCles} ${t("clé(s) de licence")}` : ""}</p>
              )}
              {journalDigital.derniereErreur && journalDigital.statut !== "revoquee" && (
                <p className="mt-2 text-xs text-(--color-critical-text)">{t(journalDigital.derniereErreur)}</p>
              )}
              {journalDigital.statut !== "revoquee" && commande.paiementStatut === "completed" && lienAccesDigital && (
                <div className="mt-3"><RenvoyerLienDigital commandeId={commande.id} lienAcces={lienAccesDigital} /></div>
              )}
            </Card>
          )}

          <Card title={t("Chronologie")}>
            <Timeline items={evenements} />
          </Card>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-4">
          {commande.noteClient && (
            <Card title={t("Note du client")}>
              <p className="italic">« {t(commande.noteClient)} »</p>
            </Card>
          )}

          <Card padding="none" title={t("Client")}>
            <CardSection>
              <p className="font-[550] text-(--color-text-strong)">{t(commande.clientNom)}</p>
              {commande.client && <p className="text-(--color-text-secondary)">{commande.client.totalCommandes} {t(commande.client.totalCommandes > 1 ? "commandes" : "commande")}</p>}
            </CardSection>
            <CardSection className="space-y-1.5">
              <p className="text-xs font-[550] text-(--color-text-secondary)">{t("Coordonnées")}</p>
              {commande.clientEmail && <a href={`mailto:${commande.clientEmail}`} className={`${lien} break-all`}><Icon name="mail" />{commande.clientEmail}</a>}
              {commande.clientTelephone && <a href={`tel:${commande.clientTelephone}`} className={lien}><Icon name="user" />{commande.clientTelephone}</a>}
            </CardSection>
            <CardSection className="space-y-1">
              <p className="text-xs font-[550] text-(--color-text-secondary)">{t("Adresse de livraison")}</p>
              <p>{t(commande.adresseLivraison)}</p>
              <p className="text-(--color-text-secondary)">{t(commande.ville)}, {t(commande.pays)}</p>
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${commande.adresseLivraison}, ${commande.ville}`)}`}
                target="_blank" rel="noopener noreferrer" className={lien}>
                <Icon name="pin" />{t("Ouvrir l'adresse dans Google Maps")}
              </a>
            </CardSection>
          </Card>

          <Card title={t("Livreur")}>
            {commande.livreur ? (
              <div className="mb-3 space-y-1">
                <p className="flex items-center gap-2 font-[550] text-(--color-text-strong)">
                  <span className={`size-2 rounded-full ${commande.livreur.disponible ? "bg-(--color-live)" : "bg-(--color-border)"}`} aria-hidden />
                  {t(commande.livreur.nom)}
                </p>
                <a href={`tel:${commande.livreur.telephone}`} className={lien}><Icon name="user" />{t("Appeler le livreur")} · {commande.livreur.telephone}</a>
              </div>
            ) : (
              <p className="mb-3 text-(--color-text-secondary)">{t("Aucun livreur assigné")}</p>
            )}
            <AssignerLivreur
              commandeId={commande.id}
              livreurActuelId={commande.livreurId || null}
              livreurActuelNom={commande.livreur?.nom ?? undefined}
              statut={commande.statut}
              villeCommande={commande.ville}
              livreurs={livreurs.map(l => ({
                id: l.id,
                nom: l.nom,
                vehicule: l.vehicule,
                zone: l.zone,
                disponible: l.disponible,
                coursesEnCours: l._count.commandes,
              }))}
            />
          </Card>

          {(commande.numeroSuivi || commande.transporteur) && (
            <Card title={t("Suivi colis")}>
              {commande.transporteur && <p className="text-(--color-text-secondary)">{t(commande.transporteur)}</p>}
              {commande.numeroSuivi && <p className="mt-1 font-mono">{t(commande.numeroSuivi)}</p>}
            </Card>
          )}

          {c.trackingToken && (
            <Card title={t("Suivi et livraison")}>
              <div className="space-y-3">
                {(c.latitudeClient || c.adresseExacte) && (
                  <div className="space-y-1 rounded-(--radius-md) bg-(--color-surface-secondary) p-3">
                    <p className="text-xs font-[550] text-(--color-text-secondary)">{t("Position client GPS")}</p>
                    {c.adresseExacte && <p>{t(c.adresseExacte)}</p>}
                    {c.latitudeClient && <p className="font-mono text-xs text-(--color-text-secondary)">{c.latitudeClient.toFixed(5)}, {c.longitudeClient?.toFixed(5)}</p>}
                    {c.mapsLienClient && (
                      <a href={c.mapsLienClient} target="_blank" rel="noopener noreferrer" className={lien}><Icon name="pin" />{t("Ouvrir Google Maps")}</a>
                    )}
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  {lienFacture && <a href={lienFacture} target="_blank" rel="noopener noreferrer" className={lien}><Icon name="receipt" />{t("Voir la facture client")}</a>}
                  {lienSuivi && <a href={lienSuivi} target="_blank" rel="noopener noreferrer" className={lien}><Icon name="external" />{t("Page de suivi (vue client)")}</a>}
                </div>
                {qrLivreur && (
                  <div className="flex items-center gap-3 rounded-(--radius-md) border border-(--color-border) bg-white p-3">
                    <div className="size-24 flex-none" dangerouslySetInnerHTML={{ __html: qrLivreur }} />
                    <div className="text-xs text-(--color-text-secondary)">
                      <p className="mb-1 text-[13px] font-[550] text-(--color-text-strong)">{t("QR du livreur")}</p>
                      {t("À faire scanner par le livreur depuis cet écran, au départ : il démarre la course, partage sa position et confirme la livraison avec le code du client. Ne l'imprimez pas et ne le mettez pas dans le colis. Le lien s'arrête quand la commande est livrée ou annulée, et change si vous changez de livreur.")}
                    </div>
                  </div>
                )}
                {msgLivreur && (
                  <a href={`https://wa.me/?text=${msgLivreur}`} target="_blank" rel="noopener noreferrer" className={buttonClasses({ fullWidth: true })}>
                    <Icon name="whatsapp" />{t("Partager avec le livreur (WhatsApp)")}
                  </a>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
