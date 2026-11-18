import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MapPin, Phone, Package, ChevronRight, Zap, Bike, Car, PersonStanding, Truck, Navigation, MessageCircle, Banknote, CircleCheck } from "lucide-react";
import { formatMontant } from "@/lib/utils";
import { MapLivraisonClient } from "@/components/livreur/MapLivraisonClient";
import { getT } from "@/lib/i18n/serveur";
import { STATUTS_COURSE_ACTIVE } from "@/lib/commandes";
import { aRemettre } from "@/lib/gains-livreur";
import { GainsLivreur } from "@/components/livreur/GainsLivreur";
import { statutLivreur, encaissement, adresseCourse, lienItineraire } from "@/components/livreur/statuts";


export default async function LivreurDashboard() {
  const t = await getT();
  const session = await auth();
  if (!session) redirect("/connexion");

  const livreur = await prisma.livreur.findFirst({
    where: { userId: (session.user as any)?.id },
    include: { tenant: true },
  });
  if (!livreur) redirect("/connexion");

  const now = new Date();
  const debutJour = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const debutSemaine = new Date(now.getTime() - 7 * 24 * 3600 * 1000);

  const [commandesActives, livraisonsJour, livraisonsSemaine, especesNonRemises] = await Promise.all([
    prisma.commande.findMany({
      where: { livreurId: livreur.id, statut: { in: STATUTS_COURSE_ACTIVE } },
      include: { lignes: { take: 3 } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.commande.count({ where: { livreurId: livreur.id, statut: "livree", livreeAt: { gte: debutJour } } }),
    prisma.commande.count({ where: { livreurId: livreur.id, statut: "livree", livreeAt: { gte: debutSemaine } } }),
    // Même filtre que /api/livreurs/[id]/encaissements (côté marchand) : livré en COD, pas encore remis
    prisma.commande.findMany({
      where: { livreurId: livreur.id, methodePaiement: { in: ["whatsapp_cod", "direct_cod"] }, statut: "livree", codRemis: false },
      select: { id: true, montantTotal: true, devise: true, tenant: { select: { nomBoutique: true } } },
    }),
  ]);

  // Sa part est gardée sur les espèces (lib/gains-livreur.ts) : il ne reverse que le reste.
  const parts: Record<string, number> = Object.fromEntries((await prisma.gainLivreur.findMany({ where: { commandeId: { in: especesNonRemises.map(c => c.id) } }, select: { commandeId: true, montant: true } })).map(g => [g.commandeId, g.montant]));
  // Un livreur plateforme peut travailler pour plusieurs boutiques : on regroupe par boutique (et devise)
  const aReverser = Object.values(especesNonRemises.reduce<Record<string, { boutique: string; devise: string; total: number; nb: number }>>((acc, c) => {
    const k = `${c.tenant.nomBoutique}|${c.devise}`;
    acc[k] ??= { boutique: c.tenant.nomBoutique, devise: c.devise, total: 0, nb: 0 };
    acc[k].total += aRemettre(c.montantTotal, parts[c.id] ?? 0);
    acc[k].nb += 1;
    return acc;
  }, {}));

  // Commande en cours (prioritaire = expediée, sinon première active)
  const commandePrioritaire = commandesActives.find((c) => c.statut === "expediee") || commandesActives[0];
  const autres = commandesActives.filter((c) => c !== commandePrioritaire);
  const aEncaisser = commandePrioritaire ? encaissement(commandePrioritaire) : null;

  const VEHICULE_LABELS: Record<string, string> = {
    moto: "Moto", voiture: "Voiture", velo: "Vélo", a_pied: "Piéton",
  };
  function VehiculeIcon({ vehicule }: { vehicule: string }) {
    if (vehicule === "voiture") return <Car size={14} />;
    if (vehicule === "velo") return <Bike size={14} />;
    if (vehicule === "a_pied") return <PersonStanding size={14} />;
    if (vehicule === "moto") return <Bike size={14} />;
    return <Truck size={14} />;
  }

  return (
    <div className="space-y-5 lg:grid lg:grid-cols-2 lg:gap-5 lg:space-y-0 lg:items-start">
      {/* En-tête : salutation et chiffres du jour */}
      <div className="relative rounded-3xl overflow-hidden lg:col-span-2">
        <div className="absolute inset-0 bg-gradient-to-br from-[#F5A623]/20 via-[#F5A623]/5 to-transparent" />
        <div className="relative p-5 sm:p-6">
          <p className="text-gray-400 text-sm mb-1">
            {now.toLocaleDateString(t.loc, { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="text-2xl font-bold text-white font-playfair">
            {t("Bonjour,")}{" "}{t(livreur.nom.split(" ")[0])}
          </h1>
          <p className="text-gray-400 text-sm mt-1 flex items-center gap-1">
            <VehiculeIcon vehicule={livreur.vehicule} />
            {t(VEHICULE_LABELS[livreur.vehicule]) || t("Livraison")}{livreur.zone ? ` · ${livreur.zone}` : ""}
          </p>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-5">
            <div className="bg-white/5 rounded-2xl p-3 text-center border border-white/10">
              <p className="text-2xl font-bold text-[#F5A623]">{commandesActives.length}</p>
              <p className="text-gray-400 text-xs mt-1">{t("En cours")}</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-3 text-center border border-white/10">
              <p className="text-2xl font-bold text-green-400">{livraisonsJour}</p>
              <p className="text-gray-400 text-xs mt-1">{t("Livrées aujourd'hui")}</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-3 text-center border border-white/10">
              <p className="text-2xl font-bold text-[#a78bfa]">{livraisonsSemaine}</p>
              <p className="text-gray-400 text-xs mt-1">{t("Livrées en 7 jours")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Course prioritaire : tout ce qu'il faut pour partir, en un écran */}
      {commandePrioritaire && (
        <section aria-labelledby="course-en-cours" className={`space-y-3 ${autres.length === 0 ? "lg:col-span-2" : ""}`}>
          <div className="flex items-center justify-between gap-2">
            <h2 id="course-en-cours" className="text-white font-semibold flex items-center gap-2">
              <Zap size={16} className="text-[#F5A623]" aria-hidden />
              {commandePrioritaire.statut === "expediee" ? t("Livraison en cours") : t("Prochaine course")}
            </h2>
            <span className="text-xs px-2 py-1 rounded-lg font-medium bg-white/5" style={{ color: statutLivreur(commandePrioritaire.statut).color }}>
              {t(statutLivreur(commandePrioritaire.statut).label)}
            </span>
          </div>

          <MapLivraisonClient
            adresse={adresseCourse(commandePrioritaire)}
            ville={commandePrioritaire.ville}
            latitude={commandePrioritaire.latitudeClient}
            longitude={commandePrioritaire.longitudeClient}
            livreurLat={livreur.latitude}
            livreurLng={livreur.longitude}
          />

          {/* Pas de lien dans un lien (HTML invalide → erreur d'hydratation, et Maps/WhatsApp ouvraient la fiche) */}
          <div className="bg-gradient-to-br from-[#141414] to-[#0d0d0d] border border-white/5 rounded-2xl p-4">
            <Link href={`/livreur/commande/${commandePrioritaire.id}`} className="flex items-start justify-between gap-3 mb-3 group">
              <div className="min-w-0">
                <p className="text-white font-bold flex items-center gap-1">{t(commandePrioritaire.clientNom)}<ChevronRight size={16} className="text-gray-500 group-hover:text-[#F5A623]" aria-hidden /></p>
                <p className="flex items-start gap-1.5 mt-1 text-gray-400 text-sm">
                  <MapPin size={12} className="mt-1 flex-shrink-0" aria-hidden />
                  <span>{t(adresseCourse(commandePrioritaire))}, {t(commandePrioritaire.ville)}</span>
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-white font-bold text-lg">{formatMontant(commandePrioritaire.montantTotal, commandePrioritaire.devise)}</p>
                <p className="text-gray-500 text-xs">{t("{0} article(s)", commandePrioritaire.lignes.length)}</p>
              </div>
            </Link>

            {aEncaisser === "especes" && (
              <p className="flex items-center gap-2 rounded-xl bg-[#F5A623]/10 border border-[#F5A623]/25 px-3 py-2 text-sm text-[#F5A623] mb-3">
                <Banknote size={16} aria-hidden />{t("À encaisser en espèces : {0}", formatMontant(commandePrioritaire.montantTotal, commandePrioritaire.devise))}
              </p>
            )}
            {aEncaisser === "deja_paye" && (
              <p className="flex items-center gap-2 rounded-xl bg-green-500/10 border border-green-500/20 px-3 py-2 text-sm text-green-400 mb-3">
                <CircleCheck size={16} aria-hidden />{t("Déjà payée : n'encaissez rien")}
              </p>
            )}

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/5">
              <a href={lienItineraire(commandePrioritaire)} target="_blank" rel="noopener noreferrer"
                className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 min-h-12 bg-white/5 border border-white/10 text-gray-200 rounded-xl text-xs sm:text-sm">
                <Navigation size={16} aria-hidden />{t("Itinéraire")}
              </a>
              <a href={`tel:${commandePrioritaire.clientTelephone}`}
                className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 min-h-12 bg-white/5 border border-white/10 text-gray-200 rounded-xl text-xs sm:text-sm">
                <Phone size={16} aria-hidden />{t("Appeler")}
              </a>
              <a href={`https://wa.me/${commandePrioritaire.clientTelephone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 min-h-12 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-xs sm:text-sm">
                <MessageCircle size={16} aria-hidden />WhatsApp
              </a>
            </div>
            <Link href={`/livreur/commande/${commandePrioritaire.id}`}
              className="mt-2 flex items-center justify-center gap-2 min-h-12 rounded-xl bg-[#F5A623] text-black font-semibold text-sm">
              {commandePrioritaire.statut === "expediee" ? t("Confirmer la remise ou signaler un échec") : t("Ouvrir la course")}<ChevronRight size={16} aria-hidden />
            </Link>
          </div>
        </section>
      )}

      {/* Autres courses actives */}
      {autres.length > 0 && (
        <section aria-labelledby="autres-courses">
          <h2 id="autres-courses" className="text-white font-semibold mb-3 text-sm">{t("Autres courses ({0})", autres.length)}</h2>
          <div className="space-y-2">
            {autres.map((cmd) => {
              const st = statutLivreur(cmd.statut);
              return (
                <Link key={cmd.id} href={`/livreur/commande/${cmd.id}`}
                  className="flex items-center gap-3 bg-gradient-to-br from-[#141414] to-[#0d0d0d] border border-white/5 rounded-2xl p-3.5 hover:border-[#F5A623]/20 transition-colors">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/5">
                    <Package size={16} style={{ color: st.color }} aria-hidden />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{t(cmd.clientNom)}</p>
                    <p className="text-gray-500 text-xs flex items-center gap-1 mt-0.5">
                      <MapPin size={10} aria-hidden />{t(cmd.ville)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <p className="text-white text-sm font-bold">{formatMontant(cmd.montantTotal, cmd.devise)}</p>
                    <span className="text-xs mt-0.5" style={{ color: st.color }}>{t(st.label)}</span>
                  </div>
                  <ChevronRight size={14} className="text-gray-500" aria-hidden />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Aucune course */}
      {commandesActives.length === 0 && (
        <div className="lg:col-span-2 bg-gradient-to-br from-[#141414] to-[#0d0d0d] border border-white/5 rounded-3xl p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#F5A623]/10 flex items-center justify-center mx-auto mb-4">
            <Package size={28} className="text-[#F5A623]" aria-hidden />
          </div>
          <p className="text-white font-semibold">{t("Aucune course en cours")}</p>
          <p className="text-gray-400 text-sm mt-2">
            {livreur.disponible
              ? t("Vous êtes disponible. Dès qu'une boutique vous attribue une course, elle apparaît ici et vous êtes prévenu.")
              : t("Vous êtes hors service. Touchez « Hors service » en haut de l'écran pour redevenir disponible.")}
          </p>
        </div>
      )}

      {/* Espèces à reverser */}
      {aReverser.length > 0 && (
        <div className="lg:col-span-2 rounded-3xl border border-[#F5A623]/25 bg-[#F5A623]/[0.07] p-5">
          <p className="text-[#F5A623] font-semibold text-sm flex items-center gap-2"><Banknote size={15} aria-hidden />{t("Espèces à reverser")}</p>
          <div className="mt-3 space-y-2">
            {aReverser.map(r => (
              <div key={`${r.boutique}|${r.devise}`} className="flex items-center justify-between gap-3">
                <span className="text-gray-300 text-sm truncate">{t(r.boutique)}{" "}<span className="text-gray-500 text-xs">· {t("{0} livraison(s)", r.nb)}</span></span>
                <span className="text-white font-bold whitespace-nowrap">{formatMontant(r.total, r.devise)}</span>
              </div>
            ))}
          </div>
          <p className="text-gray-400 text-xs mt-3">{t("Votre part est déjà déduite. Le montant disparaît dès que la boutique confirme avoir reçu l'argent.")}</p>
        </div>
      )}

      {/* Solde, gains par course, retraits */}
      <div className="lg:col-span-2"><GainsLivreur /></div>

      <Link href="/livreur/commandes" className="lg:col-span-2 flex items-center justify-center gap-2 w-full min-h-11 text-gray-400 hover:text-white text-sm transition-colors">
        {t("Voir toutes mes livraisons")}<ChevronRight size={14} aria-hidden />
      </Link>
    </div>
  );
}
