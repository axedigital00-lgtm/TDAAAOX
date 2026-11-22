// Devis vu par le client (lien privé) : détail, acceptation ou refus.
export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { clientPeutRepondre, devisExpire, LIBELLES_CONDITIONS, totauxDevis, type ConditionPaiement, type LigneDevis } from "@/lib/commerce/regles";
import { formatMontant } from "@/lib/utils";
import { getT } from "@/lib/i18n/serveur";
import { ReponseDevis } from "./ReponseDevis";

export const metadata: Metadata = { title: "Devis", robots: { index: false, follow: false } };

export default async function DevisClientPage({ params }: { params: Promise<{ slug: string; token: string }> }) {
  const { slug, token } = await params;
  const t = await getT();
  const d = await prisma.devis.findUnique({ where: { token } });
  if (!d || d.statut === "brouillon") notFound();
  const tenant = await prisma.tenant.findUnique({ where: { id: d.tenantId }, select: { slug: true, nomBoutique: true } });
  if (!tenant || tenant.slug !== slug) notFound();
  const lignes = d.lignes as unknown as LigneDevis[];
  const totaux = totauxDevis(lignes, d.remise, d.livraison);
  const maintenant = new Date();
  const etat = d.statut === "accepte" ? t("Accepté") : d.statut === "refuse" ? t("Refusé") : d.statut === "annule" ? t("Annulé") : devisExpire(d, maintenant) ? t("Expiré") : d.statut === "soumis" ? t("En cours de validation") : t("En attente de votre réponse");

  return (
    <main style={{ minHeight: "100vh", background: "#f6f6f7", color: "#111", padding: "32px 16px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", background: "#fff", borderRadius: 16, border: "1px solid #e5e5e5", padding: "28px 24px" }}>
        <p style={{ margin: 0, fontWeight: 700 }}>{tenant.nomBoutique}</p>
        <h1 style={{ margin: "8px 0 4px", fontSize: 26 }}>{t("Devis")} {d.numero}</h1>
        <p style={{ margin: 0, color: "#666" }}>{etat}{d.expireAt ? ` · ${t("valable jusqu'au")} ${d.expireAt.toLocaleDateString(t.loc)}` : ""}</p>
        <p style={{ margin: "18px 0 0" }}><strong>{d.clientNom}</strong>{d.ville ? ` · ${d.ville}` : ""}{d.bonCommande ? ` · ${t("Bon de commande")} ${d.bonCommande}` : ""}</p>
        <div style={{ marginTop: 18, borderTop: "1px solid #eee" }}>
          {lignes.map((l, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 0", borderBottom: "1px solid #eee" }}>
              <span style={{ overflowWrap: "anywhere" }}>{l.nom}{l.variante ? <span style={{ color: "#666" }}> — {l.variante}</span> : null}<br /><span style={{ color: "#666", fontSize: 14 }}>{l.quantite} × {formatMontant(l.prix, d.devise)}</span></span>
              <strong style={{ whiteSpace: "nowrap" }}>{formatMontant(l.prix * l.quantite, d.devise)}</strong>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gap: 4, marginTop: 14, marginLeft: "auto", maxWidth: 300 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>{t("Sous-total")}</span><span>{formatMontant(totaux.sousTotal, d.devise)}</span></div>
          {totaux.reduction > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span>{t("Remise")}</span><span>−{formatMontant(totaux.reduction, d.devise)}</span></div>}
          {totaux.livraison > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span>{t("Livraison")}</span><span>{formatMontant(totaux.livraison, d.devise)}</span></div>}
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 18 }}><span>{t("Total")}</span><span>{formatMontant(d.total, d.devise)}</span></div>
          <p style={{ margin: "6px 0 0", color: "#666", fontSize: 14, textAlign: "right" }}>{t("Paiement")} : {t(LIBELLES_CONDITIONS[d.conditions as ConditionPaiement] ?? "À la livraison")}</p>
        </div>
        {d.note && <p style={{ marginTop: 16, padding: 12, background: "#f6f6f7", borderRadius: 10, whiteSpace: "pre-wrap" }}>{d.note}</p>}
        {clientPeutRepondre(d, maintenant) && <ReponseDevis token={token} slug={slug} />}
      </div>
    </main>
  );
}
