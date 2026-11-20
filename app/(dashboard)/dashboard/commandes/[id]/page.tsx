// Fiche commande (MASTERPROMPT §8.3) : en-tête avec badges et navigation entre
// commandes, colonne principale (traitement, paiement, livraison numérique,
// chronologie) et colonne latérale (notes, client, adresse, livreur, suivi).
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { STATUTS_COURSE_ACTIVE } from "@/lib/commandes";
import { exigerModule } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { formatMontant } from "@/lib/utils";
import { qrSvg } from "@/lib/qr";
import { lienBoutique } from "@/lib/origine-site";
import { lienAccesCommande } from "@/lib/livraison-numerique";
import { StatutCommandeSelector } from "@/components/dashboard/StatutCommandeSelector";
import { AssignerLivreur } from "@/components/dashboard/AssignerLivreur";
import { RenvoyerLienDigital } from "@/components/dashboard/RenvoyerLienDigital";
import { Page, PageHeader, Layout } from "@/components/dashboard/design-system/components/PageHeader";
import { Badge, MappedBadge, paiementCommande, fulfillmentBadge, deliveryBadge, canalCommande } from "@/components/dashboard/design-system/components/Badge";
import { Card, Divider } from "@/components/dashboard/design-system/components/primitives";
import { KeyValue } from "@/components/dashboard/design-system/components/Charts";
import { IconButton } from "@/components/dashboard/design-system/components/Button";
import { Icon } from "@/components/dashboard/design-system/icons/Icon";
import { dateRelativeAdmin, nombre } from "@/components/dashboard/design-system/format";

const METHODES: Record<string, string> = {
  whatsapp_cod: "Paiement à la livraison (WhatsApp)", direct_cod: "Paiement à la livraison", cod: "Paiement à la livraison",
  notchpay: "Payé en ligne", en_attente: "En ligne, non finalisé", mtn_momo: "MTN Mobile Money", orange_money: "Orange Money",
  especes: "Espèces", caisse: "Espèces (caisse)", carte: "Carte bancaire", wave: "Wave",
};

export default async function CommandeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/connexion");
  await exigerModule(session, "commandes");
  const tenantId = (session.user as any)?.tenantId as string;
  const { id } = await params;

  const [commande, livreurs] = await Promise.all([
    prisma.commande.findFirst({
      where: { id, tenantId },
      include: {
        lignes: true,
        client: true,
        livreur: true,
        commission: true,
        codePromo: true,
        tenant: { select: { slug: true, nomBoutique: true } },
      },
    }),
    prisma.livreur.findMany({
      where: { actif: true, OR: [{ tenantId }, { tenantId: null }] },
      include: { _count: { select: { commandes: { where: { statut: { in: STATUTS_COURSE_ACTIVE } } } } } },
      orderBy: { disponible: "desc" },
    }),
  ]);
  if (!commande) notFound();

  const [journalDigital, jetons, nbFormations, nbCles, precedente, suivante] = await Promise.all([
    prisma.livraisonDigitale.findUnique({ where: { commandeId: id } }),
    prisma.telechargement.findMany({ where: { commandeId: id }, select: { id: true, nbTelechargements: true, revoqueAt: true, produit: { select: { nom: true } } } }),
    prisma.accesFormation.count({ where: { commandeId: id } }),
    prisma.cleLicence.count({ where: { commandeId: id } }),
    // Navigation dans l'ordre de la liste (plus récente en haut).
    prisma.commande.findFirst({ where: { tenantId, createdAt: { gt: commande.createdAt } }, orderBy: { createdAt: "asc" }, select: { id: true } }),
    prisma.commande.findFirst({ where: { tenantId, createdAt: { lt: commande.createdAt } }, orderBy: { createdAt: "desc" }, select: { id: true } }),
  ]);
  const slug = commande.tenant.slug;
  const lienAccesDigital = journalDigital ? await lienAccesCommande(slug, id) : null;
  const lienLivreur = commande.livreurToken ? await lienBoutique(slug, `/livreur/${commande.livreurToken}`) : null;
  const courseActive = STATUTS_COURSE_ACTIVE.includes(commande.statut);
  const qrLivreur = lienLivreur && courseActive ? await qrSvg(lienLivreur) : null;
  const lienFacture = commande.trackingToken ? await lienBoutique(slug, `/facture/${commande.trackingToken}`) : null;
  const lienSuivi = commande.trackingToken ? await lienBoutique(slug, `/tracking/${commande.trackingToken}`) : null;

  const devise = commande.devise;
  const nbArticles = commande.lignes.reduce((t, l) => t + l.quantite, 0);
  const paiement = paiementCommande(commande);
  const livraison = deliveryBadge(commande.statut);
  const payee = commande.paiementStatut === "completed";
  const telWa = commande.clientTelephone.replace(/[^\d]/g, "");

  // Chronologie reconstruite à partir des dates enregistrées sur la commande.
  const evenements = [
    { at: commande.createdAt, texte: `Commande passée par ${commande.clientNom} via ${canalCommande(commande)}.` },
    commande.expedieeAt && { at: commande.expedieeAt, texte: commande.livreurNom ? `Commande confiée à ${commande.livreurNom} pour la livraison.` : "Commande expédiée." },
    commande.statut === "tentative_echouee" && { at: commande.updatedAt, texte: `Livraison échouée${commande.echecRaison ? ` : ${commande.echecRaison}` : ""}.` },
    commande.livreeAt && { at: commande.livreeAt, texte: "Commande livrée au client." },
    commande.codRemisAt && { at: commande.codRemisAt, texte: "Encaissement remis par le livreur." },
    commande.statut === "annulee" && { at: commande.updatedAt, texte: "Commande annulée." },
  ].filter(Boolean).sort((a: any, b: any) => b.at.getTime() - a.at.getTime()) as { at: Date; texte: string }[];

  return (
    <Page width="narrow">
      <PageHeader
        icon="orders"
        backHref="/dashboard/commandes"
        title={<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>#{commande.numero} <MappedBadge {...paiement} /> <MappedBadge {...fulfillmentBadge(commande.statut)} /></span>}
        secondaryActions={[
          ...(lienFacture ? [{ content: "Imprimer la facture", href: lienFacture, external: true }] : []),
          ...(lienSuivi ? [{ content: "Page de suivi", href: lienSuivi, external: true }] : []),
        ]}
        extraActions={<>
          {precedente ? <IconButton icon="chevronLeft" href={`/dashboard/commandes/${precedente.id}`} aria-label="Commande précédente" /> : null}
          {suivante ? <IconButton icon="chevronRight" href={`/dashboard/commandes/${suivante.id}`} aria-label="Commande suivante" /> : null}
        </>}
      />
      <p className="axd-muted" style={{ margin: "-4px 0 14px" }}>{dateRelativeAdmin(commande.createdAt)} · {canalCommande(commande)}</p>

      <Layout
        main={<>
          <Card>
            <div className="axd-card__head" style={{ gap: 8 }}>
              <MappedBadge {...fulfillmentBadge(commande.statut)} />
              {livraison && <MappedBadge {...livraison} />}
              <span className="axd-muted">{commande.ville}</span>
            </div>
            {commande.lignes.map((l) => (
              <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
                <span className="axd-thumb">{l.imageUrl ? <img src={l.imageUrl} alt="" /> : <Icon name="image" />}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link href={`/dashboard/produits/${l.produitId}`} style={{ color: "var(--color-link)" }}>{l.nom}</Link>
                  {l.variante && <div className="axd-muted" style={{ fontSize: 12 }}>{l.variante}</div>}
                </div>
                <span className="axd-tabular axd-muted" style={{ whiteSpace: "nowrap" }}>{formatMontant(l.prix, devise)} × {l.quantite}</span>
                <span className="axd-tabular" style={{ width: 110, textAlign: "right", fontWeight: 600, color: "var(--color-text-strong)" }}>{formatMontant(l.prix * l.quantite, devise)}</span>
              </div>
            ))}
            <Divider />
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <StatutCommandeSelector commandeId={commande.id} statutActuel={commande.statut} payeeEnLigne={commande.methodePaiement === "notchpay" && payee} />
            </div>
          </Card>

          <Card>
            <div className="axd-card__head"><MappedBadge {...paiement} /></div>
            <KeyValue rows={[
              { label: `Sous-total · ${nombre(nbArticles)} article${nbArticles > 1 ? "s" : ""}`, value: formatMontant(commande.montantSousTotal, devise) },
              ...(commande.montantReduction > 0 ? [{ label: `Réduction${commande.codePromo ? ` · ${commande.codePromo.code}` : ""}`, value: formatMontant(-commande.montantReduction, devise) }] : []),
              { label: "Livraison", value: formatMontant(commande.montantLivraison, devise) },
              { label: "Total", value: formatMontant(commande.montantTotal, devise), strong: true },
            ]} />
            <Divider />
            <KeyValue rows={[
              { label: payee ? "Payé par le client" : "Montant à encaisser", value: formatMontant(commande.montantTotal, devise), strong: true },
              { label: "Moyen de paiement", value: METHODES[commande.methodePaiement] ?? commande.methodePaiement },
              ...(commande.flutterwaveRef || commande.paiementReference ? [{ label: "Référence", value: <span style={{ fontFamily: "monospace", fontSize: 12 }}>{commande.paiementReference ?? commande.flutterwaveRef}</span> }] : []),
              ...(commande.commission ? [
                { label: "Commission AXSO", value: formatMontant(commande.commission.montantCommission, devise) },
                { label: "Votre part", value: formatMontant(commande.commission.montantMarchand, devise) },
              ] : []),
            ]} />
          </Card>

          {journalDigital && (
            <Card title="Livraison numérique">
              <KeyValue rows={[
                { label: "Accès", value: <Badge tone={journalDigital.statut === "livree" ? "success" : journalDigital.statut === "revoquee" ? "neutral" : "critical"}>{({ livree: "Livrés", partielle: "Incomplets", echec: "Échec", en_cours: "En cours", revoquee: "Révoqués" } as Record<string, string>)[journalDigital.statut] ?? journalDigital.statut}</Badge> },
                { label: "E-mail au client", value: ({ envoye: "Envoyé", echec: "Échec d’envoi", sans_email: "Pas d’e-mail", en_attente: "Pas encore envoyé" } as Record<string, string>)[journalDigital.emailStatut] ?? journalDigital.emailStatut },
                { label: "Tentatives", value: `${journalDigital.tentatives} livraison(s) · ${journalDigital.emailTentatives} e-mail(s)` },
                ...jetons.map((j) => ({ label: j.produit.nom, value: j.revoqueAt ? "Révoqué" : `${j.nbTelechargements} téléchargement(s)` })),
                ...(nbFormations || nbCles ? [{ label: "Droits délivrés", value: [nbFormations && `${nbFormations} accès formation`, nbCles && `${nbCles} clé(s) de licence`].filter(Boolean).join(" · ") }] : []),
              ]} />
              {journalDigital.derniereErreur && journalDigital.statut !== "revoquee" && <p className="axd-critical-text" style={{ fontSize: 12 }}>{journalDigital.derniereErreur}</p>}
              {journalDigital.statut !== "revoquee" && payee && lienAccesDigital && <div style={{ marginTop: 8 }}><RenvoyerLienDigital commandeId={commande.id} lienAcces={lienAccesDigital} /></div>}
            </Card>
          )}

          <Card title="Chronologie">
            <div className="axd-timeline">
              {evenements.map((e, i) => (
                <div key={i} className="axd-timeline__ev">
                  <i className={i === 0 ? "axd-timeline__dot axd-timeline__dot--last" : "axd-timeline__dot"} />
                  <span style={{ flex: 1 }}>{e.texte}</span>
                  <span className="axd-muted" style={{ fontSize: 12, whiteSpace: "nowrap" }}>{dateRelativeAdmin(e.at)}</span>
                </div>
              ))}
            </div>
          </Card>
        </>}
        aside={<>
          <Card title="Notes">
            <p className={commande.noteClient ? undefined : "axd-muted"} style={{ margin: 0 }}>{commande.noteClient ?? "Aucune note du client"}</p>
          </Card>

          <Card title="Client">
            <Link href={`/dashboard/clients?q=${encodeURIComponent(commande.clientTelephone || commande.clientNom)}`} style={{ color: "var(--color-link)" }}>{commande.clientNom}</Link>
            {commande.client && <div className="axd-muted" style={{ fontSize: 12 }}>{nombre(commande.client.totalCommandes)} commande{commande.client.totalCommandes > 1 ? "s" : ""}</div>}
            <Divider />
            <div className="axd-card__title" style={{ fontSize: 12 }}>Coordonnées</div>
            <a href={`tel:${commande.clientTelephone}`} style={{ display: "block", color: "var(--color-link)" }}>{commande.clientTelephone}</a>
            {commande.clientEmail && <a href={`mailto:${commande.clientEmail}`} style={{ display: "block", color: "var(--color-link)", overflowWrap: "anywhere" }}>{commande.clientEmail}</a>}
            {telWa && <a href={`https://wa.me/${telWa}`} target="_blank" rel="noopener noreferrer" className="axd-btn axd-btn--sm" style={{ marginTop: 8 }}><Icon name="whatsapp" />Écrire sur WhatsApp</a>}
            <Divider />
            <div className="axd-card__title" style={{ fontSize: 12 }}>Adresse de livraison</div>
            <p style={{ margin: "4px 0 0" }}>{commande.clientNom}<br />{commande.adresseExacte || commande.adresseLivraison}<br />{commande.ville}, {commande.pays}</p>
            <a href={commande.mapsLienClient || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${commande.adresseLivraison}, ${commande.ville}`)}`}
              target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 6, color: "var(--color-link)" }}>Voir sur la carte</a>
          </Card>

          <Card title="Livreur">
            {commande.livreur ? (
              <p style={{ margin: "0 0 8px" }}>{commande.livreur.nom} · <a href={`tel:${commande.livreur.telephone}`} style={{ color: "var(--color-link)" }}>{commande.livreur.telephone}</a></p>
            ) : <p className="axd-muted" style={{ margin: "0 0 8px" }}>Aucun livreur assigné</p>}
            <AssignerLivreur
              commandeId={commande.id}
              livreurActuelId={commande.livreurId || null}
              villeCommande={commande.ville}
              livreurs={livreurs.map((l) => ({ id: l.id, nom: l.nom, vehicule: l.vehicule, zone: l.zone, disponible: l.disponible, coursesEnCours: l._count.commandes }))}
            />
            {qrLivreur && (
              <>
                <Divider />
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 96, height: 96, flex: "none" }} dangerouslySetInnerHTML={{ __html: qrLivreur }} />
                  <p className="axd-muted" style={{ fontSize: 12, margin: 0 }}>À faire scanner par le livreur depuis cet écran, au départ. Ne l’imprimez pas et ne le mettez pas dans le colis.</p>
                </div>
              </>
            )}
            {lienLivreur && courseActive && (
              <a className="axd-btn axd-btn--sm" style={{ marginTop: 8 }} target="_blank" rel="noopener noreferrer"
                href={`https://wa.me/?text=${encodeURIComponent(`Livraison — ${commande.tenant.nomBoutique}\n\nCommande #${commande.numero}\nClient : ${commande.clientNom}\nTél : ${commande.clientTelephone}\nAdresse : ${commande.adresseExacte || commande.adresseLivraison}, ${commande.ville}\n${commande.mapsLienClient ? `Carte : ${commande.mapsLienClient}\n` : ""}\nVotre lien de course : ${lienLivreur}`)}`}>
                <Icon name="whatsapp" />Envoyer la course au livreur
              </a>
            )}
          </Card>

          {(lienSuivi || commande.numeroSuivi || commande.transporteur) && (
            <Card title="Suivi du colis">
              {lienSuivi && <a href={lienSuivi} target="_blank" rel="noreferrer" className="axd-btn axd-btn--sm" style={{ marginBottom: 8 }}>Ouvrir le suivi client</a>}
              {commande.transporteur && <div className="axd-muted">{commande.transporteur}</div>}
              {commande.numeroSuivi && <div style={{ fontFamily: "monospace" }}>{commande.numeroSuivi}</div>}
            </Card>
          )}
        </>}
      />
    </Page>
  );
}
