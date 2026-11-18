import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatMontant, formatDate } from "@/lib/utils";
import { Handshake, Users, Clock, CheckCircle } from "lucide-react";
import { getAdminSessionPour, estAdminComplet } from "@/lib/admin-auth";
import { AdminRetraitsManuels } from "@/components/admin/AdminRetraitsManuels";
import { getT } from "@/lib/i18n/serveur";
import { EnTetePage, Carte, Badge, EtatVide } from "@/components/command-center/ui";
import { TableauInteractif, type Colonne, type Ligne } from "@/components/command-center/client";

// Affiliés de toutes les boutiques : retraits d'affiliés à faire à la main (validation par Axso,
// lib/affiliation.ts), vue d'ensemble des partenariats et derniers retraits traités.
export default async function AdminAffiliesPage() {
  const tx = await getT();
  const session = await getAdminSessionPour("affilies");
  if (!session) redirect("/admin?refus=1");

  const [nbAffilies, nbActifs, nbBoutiques, enAttente, affilies, historique] = await Promise.all([
    prisma.affilie.count(),
    prisma.affilie.count({ where: { statut: "actif" } }),
    prisma.affilie.groupBy({ by: ["tenantId"] }).then((g) => g.length),
    prisma.retraitAffilie.count({ where: { statut: "en_attente" } }),
    prisma.affilie.findMany({
      orderBy: [{ commissionTotal: "desc" }, { createdAt: "desc" }], take: 100,
      select: { id: true, nom: true, email: true, telephone: true, statut: true, clics: true, conversions: true, commissionTotal: true, commissionPending: true, tenant: { select: { nomBoutique: true, devise: true } } },
    }),
    prisma.retraitAffilie.findMany({ where: { statut: { in: ["complete", "echoue"] } }, orderBy: { updatedAt: "desc" }, take: 20, include: { user: { select: { name: true, email: true } } } }),
  ]);

  const NOM_STATUT: Record<string, string> = { actif: "Actif", en_attente: "En attente", suspendu: "Suspendu" };
  const tons = { [tx("Actif")]: "good", [tx("En attente")]: "warn", [tx("Suspendu")]: "bad" };
  const colonnes: Colonne[] = [
    { cle: "nom", nom: tx("Affilié"), format: "texte" },
    { cle: "contact", nom: tx("Contact"), format: "texte" },
    { cle: "boutique", nom: tx("Boutique"), format: "texte", filtrable: true },
    { cle: "statut", nom: tx("Statut"), format: "badge", filtrable: true, tons },
    { cle: "clics", nom: tx("Clics"), format: "nombre", droite: true },
    { cle: "ventes", nom: tx("Ventes"), format: "nombre", droite: true },
    { cle: "gagne", nom: tx("Gagné"), format: "nombre", droite: true },
    { cle: "attente", nom: tx("En attente"), format: "nombre", droite: true },
    { cle: "devise", nom: tx("Devise"), format: "texte" },
  ];
  const lignes: Ligne[] = affilies.map((a) => ({
    _id: a.id, nom: a.nom, contact: [a.email, a.telephone].filter(Boolean).join(" · "), boutique: a.tenant.nomBoutique,
    statut: tx(NOM_STATUT[a.statut] ?? a.statut), clics: a.clics, ventes: a.conversions,
    gagne: Math.round(a.commissionTotal), attente: a.commissionPending > 0 ? Math.round(a.commissionPending) : null, devise: a.tenant.devise,
  }));

  return (
    <div className="space-y-5">
      <EnTetePage titre={tx("Affiliés")} sousTitre={tx("Retraits d'affiliés à valider et partenariats de toutes les boutiques")} />

      {/* Action : retraits à verser à la main */}
      <AdminRetraitsManuels peutTraiter={estAdminComplet(session)} commissions />

      {/* Supervision (lecture seule) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Affiliés", value: nbAffilies, icon: Users, cls: "cc-warn" },
          { label: "Actifs", value: nbActifs, icon: CheckCircle, cls: "cc-good" },
          { label: "Boutiques avec affiliés", value: nbBoutiques, icon: Handshake, cls: "cc-muted" },
          { label: "Retraits à faire", value: enAttente, icon: Clock, cls: enAttente ? "cc-bad" : "cc-faint" },
        ].map((k) => (
          <section key={k.label} className="cc-card p-4">
            <p className="flex items-center gap-2 text-[12px] cc-muted"><k.icon size={14} className={k.cls} aria-hidden />{tx(k.label)}</p>
            <p className="text-xl font-semibold cc-num mt-1.5">{k.value.toLocaleString(tx.loc)}</p>
          </section>
        ))}
      </div>

      <Carte titre={tx("Affiliés (les 100 qui ont le plus gagné)")}>
        {affilies.length === 0
          ? <EtatVide titre={tx("Aucun affilié pour l'instant.")} explication={tx("Les affiliés apparaissent ici dès qu'une boutique ouvre son programme et qu'un partenaire le rejoint.")} />
          : <TableauInteractif colonnes={colonnes} lignes={lignes} nomExport="affilies" vide={tx("Aucun affilié")} />}
      </Carte>

      <Carte titre={tx("Derniers retraits traités")} sousTitre={tx("Les 20 plus récents")}>
        {historique.length === 0 ? <EtatVide titre={tx("Aucun retrait traité pour l'instant.")} /> : (
          <ul className="space-y-2">
            {historique.map((p) => (
              <li key={p.id} className="flex items-center justify-between flex-wrap gap-2 px-3 py-2 rounded-lg text-[13px]" style={{ background: "var(--cc-surface-2)" }}>
                <span className="min-w-0 [overflow-wrap:anywhere]"><span className="cc-num font-medium">{formatMontant(p.montant, p.devise)}</span> → {p.user.name ?? p.user.email ?? "?"} <span className="cc-muted">({p.destinataire})</span></span>
                <span className="flex items-center gap-2 text-[12px]"><Badge ton={p.statut === "complete" ? "good" : "bad"}>{tx(p.statut === "complete" ? "Payé" : "Refusé / échoué")}</Badge><span className="cc-faint">{formatDate(p.updatedAt)}</span></span>
              </li>
            ))}
          </ul>
        )}
      </Carte>
    </div>
  );
}
