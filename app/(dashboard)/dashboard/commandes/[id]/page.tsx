import { auth } from "@/lib/auth";
import { STATUTS_COURSE_ACTIVE } from "@/lib/commandes";
import { exigerModule } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { MapPin, Phone, Mail, Package, Truck, User, CreditCard, FileText, Map, Share2 } from "lucide-react";
import { Badge, EnTetePage } from "@/components/ui";
import { statutCommande, statutPaiement, libelleMethodePaiement } from "../statuts";
import { formatMontant, dateRelative } from "@/lib/utils";
import { StatutCommandeSelector } from "@/components/dashboard/StatutCommandeSelector";
import { AssignerLivreur } from "@/components/dashboard/AssignerLivreur";
import { getT } from "@/lib/i18n/serveur";
import { qrSvg } from "@/lib/qr";
import { lienBoutique } from "@/lib/origine-site";
import { lienAccesCommande } from "@/lib/livraison-numerique";
import { RenvoyerLienDigital } from "@/components/dashboard/RenvoyerLienDigital";

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

  const statutInfo = statutCommande(commande.statut);
  const paiementInfo = statutPaiement(commande.paiementStatut);


  // Lien livreur : QR affiché à l'écran du marchand pendant la course seulement,
  // à scanner par le livreur au départ (jamais imprimé ni glissé dans le colis).
  const lienLivreur = (commande as any).livreurToken ? await lienBoutique((commande as any).tenant?.slug ?? "", `/livreur/${(commande as any).livreurToken}`) : null;
  const qrLivreur = lienLivreur && STATUTS_COURSE_ACTIVE.includes(commande.statut) ? await qrSvg(lienLivreur) : null;
  return (
    <div className="max-w-4xl space-y-6">
      <EnTetePage
        className="mb-0"
        retour={{ href: "/dashboard/commandes", libelle: t("Commandes") }}
        titre={<span className="font-mono break-all">{t("Commande")} {commande.numero}</span>}
        indicateurs={<>
          <Badge ton={statutInfo.ton}>{t(statutInfo.label)}</Badge>
          <Badge ton={paiementInfo.ton}>{t(paiementInfo.label)}</Badge>
        </>}
        description={<>{t("Passée {0}", dateRelative(commande.createdAt))} · {t(libelleMethodePaiement(commande.methodePaiement))}</>}
        actions={<StatutCommandeSelector commandeId={commande.id} numero={commande.numero} statutActuel={commande.statut} payeeEnLigne={commande.methodePaiement === "notchpay" && commande.paiementStatut === "completed"} />}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-5">
          {/* Articles commandés */}
          <div className="bg-carte border border-bordure rounded-carte p-4 sm:p-6">
            <h2 className="text-encre font-semibold text-sm mb-4 flex items-center gap-2">
              <Package size={14} className="text-primaire" aria-hidden />
              {t("Produits commandés")} ({commande.lignes.length})
            </h2>
            <div className="space-y-4">
              {commande.lignes.map((ligne) => (
                <div key={ligne.id} className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-carte-2 border border-bordure overflow-hidden flex-shrink-0">
                    {ligne.imageUrl ? (
                      <img src={ligne.imageUrl} alt={ligne.nom} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Package size={24} className="text-gray-300" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-encre font-medium text-sm truncate">{t(ligne.nom)}</p>
                    {ligne.variante && <p className="text-doux text-xs">{t(ligne.variante)}</p>}
                    <p className="text-doux text-xs mt-0.5">{t("Qté :")}{" "}{ligne.quantite}{" "}{t("×")}{" "}{formatMontant(ligne.prix, commande.devise)}</p>
                  </div>
                  <p className="text-encre font-bold text-sm flex-shrink-0 tabular-nums">
                    {formatMontant(ligne.prix * ligne.quantite, commande.devise)}
                  </p>
                </div>
              ))}
            </div>

            {/* Totaux */}
            <div className="border-t border-bordure mt-5 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-doux">{t("Sous-total")}</span>
                <span className="text-encre">{formatMontant(commande.montantSousTotal, commande.devise)}</span>
              </div>
              {commande.montantLivraison > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-doux">{t("Livraison")}</span>
                  <span className="text-encre">{formatMontant(commande.montantLivraison, commande.devise)}</span>
                </div>
              )}
              {commande.montantReduction > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-doux">{t("Réduction")}{" "}{commande.codePromo && `(${commande.codePromo.code})`}</span>
                  <span className="text-succes">−{formatMontant(commande.montantReduction, commande.devise)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold pt-2 border-t border-bordure">
                <span className="text-encre">{t("Total")}</span>
                <span className="text-encre">{formatMontant(commande.montantTotal, commande.devise)}</span>
              </div>
            </div>
          </div>

          {/* Paiement */}
          <div className="bg-carte border border-bordure rounded-carte p-6">
            <h2 className="text-encre font-semibold text-sm mb-4 flex items-center gap-2">
              <CreditCard size={14} className="text-primaire" aria-hidden />
              {t("Paiement")}
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-doux">{t("Méthode")}</span>
                <span className="text-encre text-right">{t(libelleMethodePaiement(commande.methodePaiement))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-doux">{t("Statut paiement")}</span>
                <Badge ton={paiementInfo.ton}>{t(paiementInfo.label)}</Badge>
              </div>
              {commande.flutterwaveRef && (
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-doux">{t("Référence")}</span>
                  <span className="text-encre font-mono text-xs break-all text-right">{commande.flutterwaveRef}</span>
                </div>
              )}


              {commande.commission && (
                <div className="mt-3 pt-3 border-t border-bordure space-y-1.5 text-xs">
                  <p className="text-doux font-medium">{t("Commission Axso")}</p>
                  <div className="flex justify-between">
                    <span className="text-doux">{t("Commission brute")}</span>
                    <span className="text-encre">{formatMontant(commande.commission.montantCommission, commande.devise)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-doux">{t("Votre part")}</span>
                    <span className="text-succes">{formatMontant(commande.commission.montantMarchand, commande.devise)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Livraison numérique */}
          {journalDigital && (
            <div className="bg-carte border border-bordure rounded-carte p-6">
              <h2 className="text-encre font-semibold text-sm mb-4 flex items-center gap-2">
                <Share2 size={14} className="text-primaire" aria-hidden />
                {t("Livraison numérique")}
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-doux">{t("Accès")}</span>
                  <Badge ton={journalDigital.statut === "livree" ? "succes" : journalDigital.statut === "revoquee" ? "neutre" : journalDigital.statut === "en_cours" ? "info" : "erreur"}>
                    {t(({ livree: "Livrés", partielle: "Incomplets", echec: "Échec", en_cours: "En cours", revoquee: "Révoqués" } as Record<string, string>)[journalDigital.statut] ?? journalDigital.statut)}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-doux">{t("E-mail au client")}</span>
                  <span className="text-encre text-xs">
                    {t(({ envoye: "Envoyé", echec: "Échec d'envoi", sans_email: "Pas d'e-mail", en_attente: "Pas encore envoyé" } as Record<string, string>)[journalDigital.emailStatut] ?? journalDigital.emailStatut)}
                    {journalDigital.emailEnvoyeAt ? ` · ${dateRelative(journalDigital.emailEnvoyeAt)}` : ""}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-doux">{t("Tentatives")}</span>
                  <span className="text-encre text-xs">{journalDigital.tentatives}{" "}{t("livraison(s)")}{" · "}{journalDigital.emailTentatives}{" "}{t("e-mail(s)")}</span>
                </div>
                {jetons.map((j) => (
                  <div key={j.id} className="flex justify-between text-xs">
                    <span className="text-doux truncate">{t(j.produit.nom)}</span>
                    <span className="text-encre">{j.revoqueAt ? t("Révoqué") : `${j.nbTelechargements} ${t("téléchargement(s)")}`}</span>
                  </div>
                ))}
                {(nbFormations > 0 || nbCles > 0) && (
                  <p className="text-xs text-doux">{nbFormations > 0 ? `${nbFormations} ${t("accès formation")}` : ""}{nbFormations > 0 && nbCles > 0 ? " · " : ""}{nbCles > 0 ? `${nbCles} ${t("clé(s) de licence")}` : ""}</p>
                )}
                {journalDigital.derniereErreur && journalDigital.statut !== "revoquee" && (
                  <p className="text-xs text-erreur">{t(journalDigital.derniereErreur)}</p>
                )}
                {journalDigital.statut !== "revoquee" && commande.paiementStatut === "completed" && lienAccesDigital && (
                  <RenvoyerLienDigital commandeId={commande.id} lienAcces={lienAccesDigital} />
                )}
              </div>
            </div>
          )}

          {/* Note client */}
          {commande.noteClient && (
            <div className="bg-carte border border-bordure rounded-carte p-5">
              <p className="text-doux text-xs mb-2">{t("Note du client")}</p>
              <p className="text-encre text-sm italic">"{t(commande.noteClient)}"</p>
            </div>
          )}
        </div>

        {/* Colonne latérale */}
        <div className="space-y-5">
          {/* Client */}
          <div className="bg-carte border border-bordure rounded-carte p-5">
            <h2 className="text-encre font-semibold text-sm mb-4 flex items-center gap-2">
              <User size={14} className="text-primaire" aria-hidden />
              {t("Client")}
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-encre font-medium">{t(commande.clientNom)}</p>
                {commande.client && <p className="text-doux text-xs mt-0.5">{t(commande.client.totalCommandes)} commande(s)</p>}
              </div>
              <a href={`mailto:${commande.clientEmail}`} className="flex items-center gap-2 min-w-0 break-all text-doux hover:text-encre hover:underline text-sm transition-colors">
                <Mail size={13} className="text-doux flex-shrink-0" />
                {t(commande.clientEmail)}
              </a>
              <a href={`tel:${commande.clientTelephone}`} className="flex items-center gap-2 text-doux hover:text-encre hover:underline text-sm transition-colors">
                <Phone size={13} className="text-doux" />
                {t(commande.clientTelephone)}
              </a>
            </div>
          </div>

          {/* Livraison */}
          <div className="bg-carte border border-bordure rounded-carte p-5">
            <h2 className="text-encre font-semibold text-sm mb-4 flex items-center gap-2">
              <MapPin size={14} className="text-primaire" aria-hidden />
              {t("Adresse de livraison")}
            </h2>
            <div className="space-y-1.5 text-sm">
              <p className="text-encre">{t(commande.adresseLivraison)}</p>
              <p className="text-doux">{t(commande.ville)}, {t(commande.pays)}</p>
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${commande.adresseLivraison}, ${commande.ville}`)}`}
              target="_blank" rel="noopener noreferrer"
              className="mt-3 flex items-center gap-2 min-h-10 bg-carte border border-bordure text-encre rounded-controle text-sm font-medium justify-center hover:border-bordure-forte hover:bg-carte-2 transition-colors"
            >
              <MapPin size={12} />{" "}{t("Ouvrir l'adresse dans Google Maps")}
            </a>
          </div>

          {/* Livreur assigné */}
          <div className="bg-carte border border-bordure rounded-carte p-5">
            <h2 className="text-encre font-semibold text-sm mb-4 flex items-center gap-2">
              <Truck size={14} className="text-primaire" aria-hidden />
              {t("Livreur")}
            </h2>
            {commande.livreur ? (
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${commande.livreur.disponible ? "bg-green-400" : "bg-carte-20"}`} />
                  <p className="text-encre font-medium text-sm">{t(commande.livreur.nom)}</p>
                </div>
                <p className="text-doux text-xs">{commande.livreur.telephone}</p>
                <a href={`tel:${commande.livreur.telephone}`} className="flex items-center gap-2 bg-carte-2 border border-bordure text-encre py-2 px-3 rounded-xl text-xs hover:border-bordure-forte transition-all">
                  <Phone size={11} />{" "}{t("Appeler le livreur")}
                </a>
              </div>
            ) : (
              <p className="text-doux text-xs mb-3">{t("Aucun livreur assigné")}</p>
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
          </div>

          {/* Suivi */}
          {(commande.numeroSuivi || commande.transporteur) && (
            <div className="bg-carte border border-bordure rounded-carte p-5">
              <h2 className="text-encre font-semibold text-sm mb-3">{t("Suivi colis")}</h2>
              {commande.transporteur && <p className="text-doux text-xs">{t(commande.transporteur)}</p>}
              {commande.numeroSuivi && <p className="text-encre font-mono text-sm mt-1">{t(commande.numeroSuivi)}</p>}
            </div>
          )}

          {/* ─── Tracking temps réel & Livraison ─── */}
          {(commande as any).trackingToken && (
            <div className="bg-carte border border-bordure rounded-carte p-5 space-y-3">
              <h2 className="text-encre font-semibold text-sm flex items-center gap-2">
                <Truck size={14} className="text-primaire" aria-hidden />
                {t("Tracking & Livraison")}
              </h2>

              {/* Localisation client */}
              {((commande as any).latitudeClient || (commande as any).adresseExacte) && (
                <div className="bg-carte-2 rounded-xl p-3 space-y-1.5">
                  <p className="text-[10px] text-doux font-semibold uppercase tracking-wide">{t("Position client GPS")}</p>
                  {(commande as any).adresseExacte && <p className="text-sm text-encre">{t((commande as any).adresseExacte)}</p>}
                  {(commande as any).latitudeClient && (
                    <p className="text-xs text-doux font-mono">{(commande as any).latitudeClient?.toFixed(5)}, {(commande as any).longitudeClient?.toFixed(5)}</p>
                  )}
                  {(commande as any).mapsLienClient && (
                    <a href={(commande as any).mapsLienClient} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 min-h-10 text-info text-sm font-medium hover:underline">
                      <MapPin size={11} />{" "}{t("Ouvrir Google Maps")}
                    </a>
                  )}
                </div>
              )}

              {/* Liens marchand */}
              <div className="space-y-2">
                {/* Facture */}
                <a href={await lienBoutique((commande as any).tenant?.slug ?? "", `/facture/${(commande as any).trackingToken}`)}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 w-full py-2.5 px-4 bg-carte-2 border border-bordure rounded-xl text-sm text-encre hover:border-bordure-forte hover:text-encre hover:underline transition-all">
                  <FileText size={14} />{" "}{t("Voir la facture client")}
                </a>

                {/* Tracking client */}
                <a href={await lienBoutique((commande as any).tenant?.slug ?? "", `/tracking/${(commande as any).trackingToken}`)}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 w-full py-2.5 px-4 bg-carte-2 border border-bordure rounded-xl text-sm text-encre hover:border-bordure-forte hover:text-encre hover:underline transition-all">
                  <Map size={14} />{" "}{t("Page de suivi (vue client)")}
                </a>

                {/* Lien livreur */}
                {qrLivreur && (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-bordure bg-white">
                    <div className="w-24 h-24 flex-shrink-0" dangerouslySetInnerHTML={{ __html: qrLivreur }} />
                    <div className="text-[12px] text-doux leading-relaxed">
                      <p className="font-semibold text-encre text-[13px] mb-1">{t("QR du livreur")}</p>
                      {t("À faire scanner par le livreur depuis cet écran, au départ : il démarre la course, partage sa position et confirme la livraison avec le code du client. Ne l'imprime pas et ne le mets pas dans le colis. Le lien s'arrête quand la commande est livrée ou annulée, et change si tu changes de livreur.")}
                    </div>
                  </div>
                )}
                {lienLivreur && STATUTS_COURSE_ACTIVE.includes(commande.statut) && (() => {
                  const livreurUrl = lienLivreur;
                  const msg = encodeURIComponent(`🚚 *Livraison — ${(commande as any).tenant?.nomBoutique}*\n\nBonjour ! Vous êtes assigné à la livraison de la commande #${commande.numero}.\n\n👤 Client : ${commande.clientNom}\n📞 Tél : ${commande.clientTelephone}\n📍 Adresse : ${(commande as any).adresseExacte || commande.adresseLivraison}, ${commande.ville}\n${(commande as any).mapsLienClient ? `\n🗺️ Google Maps : ${(commande as any).mapsLienClient}\n` : ""}\n📡 Votre lien de course (démarrer, suivi GPS, confirmer avec le code du client) :\n${livreurUrl}\n\nMerci !`);
                  return (
                    <a href={`https://wa.me/?text=${msg}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 w-full py-2.5 px-4 rounded-xl text-sm font-semibold transition-all text-encre"
                      style={{ background:"rgba(37,211,102,0.15)", border:"1px solid rgba(37,211,102,0.25)", color:"#25D366" }}>
                      <Share2 size={14} />{" "}{t("Partager avec le livreur (WhatsApp)")}
                    </a>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
