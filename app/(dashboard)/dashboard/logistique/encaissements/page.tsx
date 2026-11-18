import { auth } from "@/lib/auth";
import { exigerModule } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Bike, Package } from "lucide-react";
import { EnTetePage, EtatVide } from "@/components/ui";
import { MarquerRemisButton } from "@/components/dashboard/logistique/MarquerRemisButton";
import { formatMontant } from "@/lib/utils";
import { getT } from "@/lib/i18n/serveur";
import { aRemettre } from "@/lib/gains-livreur";

export default async function EncaissementsPage() {
  const t = await getT();
  const session = await auth();
  if (!session) redirect("/connexion");
  await exigerModule(session, "finance");
  const tenantId = (session.user as any)?.tenantId;

  const brutes = await prisma.commande.findMany({
    where: {
      tenantId,
      methodePaiement: { in: ["whatsapp_cod", "direct_cod"] },
      statut: "livree",
      codRemis: false,
    },
    select: {
      id: true, numero: true, clientNom: true, montantTotal: true, devise: true, updatedAt: true,
      livreur: { select: { id: true, nom: true, telephone: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  // Part gardée par le livreur sur les espèces (lib/gains-livreur.ts) : à remettre = encaissé − part.
  const gains = new Map((await prisma.gainLivreur.findMany({ where: { commandeId: { in: brutes.map(c => c.id) } }, select: { commandeId: true, montant: true } })).map(g => [g.commandeId, g.montant]));
  const commandesNonRemises = brutes.map(c => ({ ...c, part: gains.get(c.id) ?? 0, aRemettre: aRemettre(c.montantTotal, gains.get(c.id) ?? 0) }));
  // Jamais d'addition de devises différentes.
  const parDevise = (cs: typeof commandesNonRemises) => Object.entries(cs.reduce<Record<string, number>>((acc, c) => ({ ...acc, [c.devise]: (acc[c.devise] ?? 0) + c.aRemettre }), {}));

  const parLivreur = new Map<string, { nom: string; telephone: string; commandes: typeof commandesNonRemises }>();
  for (const c of commandesNonRemises) {
    const cle = c.livreur?.id ?? "non_assigne";
    if (!parLivreur.has(cle)) {
      parLivreur.set(cle, { nom: c.livreur?.nom ?? "Non assigné", telephone: c.livreur?.telephone ?? "", commandes: [] });
    }
    parLivreur.get(cle)!.commandes.push(c);
  }

  const groupes = [...parLivreur.entries()];

  const total = parDevise(commandesNonRemises);

  return (
    <div className="space-y-6 max-w-4xl">
      <EnTetePage
        retour={{ href: "/dashboard/logistique", libelle: t("Logistique") }}
        titre={t("Encaissements à la livraison")}
        description={t("Argent encaissé par vos livreurs sur les commandes payées à la livraison, pas encore remis. Confirme chaque remise quand tu as l'argent en main.")}
        className="mb-0"
      />

      <section className="rounded-carte border border-bordure bg-carte p-carte">
        <h2 className="ax-aide">{t("À vous remettre par vos livreurs (encaissé − leur part)")}</h2>
        {(total.length ? total : [["XAF", 0] as [string, number]]).map(([d, m]) => (
          <p key={d} className="mt-1 text-3xl font-bold tabular-nums text-encre">{formatMontant(m, d)}</p>
        ))}
      </section>

      {groupes.length === 0 ? (
        <EtatVide icone={<Package />} titre={t("Aucun encaissement en attente — tout est réconcilié.")}
          texte={t("Quand un livreur livre une commande payée à la livraison, l'argent à recevoir s'affiche ici.")} />
      ) : (
        <div className="space-y-4">
          {groupes.map(([id, g]) => {
            const montants = parDevise(g.commandes).map(([d, m]) => formatMontant(m, d)).join(" + ");
            return (
              <section key={id} className="rounded-carte border border-bordure bg-carte p-carte">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-controle bg-primaire-fond text-attention" aria-hidden>
                      <Bike className="size-4" />
                    </span>
                    <div>
                      <h2 className="text-sm font-bold text-encre">{id === "non_assigne" ? t("Sans livreur assigné") : g.nom}</h2>
                      {g.telephone && <a href={`tel:${g.telephone}`} className="ax-aide hover:text-encre">{g.telephone}</a>}
                    </div>
                  </div>
                  <div className="text-right">
                    {parDevise(g.commandes).map(([d, m]) => <p key={d} className="text-lg font-bold tabular-nums text-encre">{formatMontant(m, d)}</p>)}
                    <p className="ax-aide">{t("{0} commande(s)", g.commandes.length)}</p>
                  </div>
                </div>

                <ul className="mb-4 space-y-1.5">
                  {g.commandes.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-controle bg-carte-2 px-3 py-2 text-sm">
                      <span className="font-mono text-doux">#{c.numero}</span>
                      <span className="min-w-0 flex-1 truncate text-doux">{c.clientNom}</span>
                      <span className="text-right">
                        <span className="block font-semibold tabular-nums text-encre">{formatMontant(c.aRemettre, c.devise)}</span>
                        {c.part > 0 && <span className="block text-xs text-doux">{formatMontant(c.montantTotal, c.devise)} − {t("part livreur")} {formatMontant(c.part, c.devise)}</span>}
                      </span>
                    </li>
                  ))}
                </ul>

                <MarquerRemisButton commandeIds={g.commandes.map((c) => c.id)}
                  objet={`${id === "non_assigne" ? t("Sans livreur assigné") : g.nom} — ${t("{0} commande(s)", g.commandes.length)} — ${montants}`} />
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
