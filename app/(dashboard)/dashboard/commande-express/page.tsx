"use client";
// Releasit COD AXSO : activation, apparence du bouton et suivi des commandes passées par le
// formulaire 1 écran (payé à la livraison) de la fiche produit.
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Page, PageHeader, Card, Banner, Badge, Button, Toggle } from "@/components/dashboard/design-system";
import { useT } from "@/components/I18nProvider";
import { OngletsCommandeExpress } from "@/components/dashboard/commande-express/OngletsApp";
import { formatMontant } from "@/lib/utils";

type Reglages = { actif: boolean; boutonCollant: boolean; texteBouton: string; couleur: string; demanderEmail: boolean };
type Recente = { id: string; statutConfirmation: string; quartier: string | null; source: Record<string, string>; createdAt: string; commande: { id: string; numero: string; clientNom: string; clientTelephone: string; montantTotal: number; devise: string; ville: string } | null };
type Donnees = { reglages: Reglages; slug: string; zonesConfigurees: number; stats: Record<string, number>; recentes: Recente[]; miseEnRoute: { offres: number; formulaire: boolean; relances: boolean; pixels: boolean } };

const STATUTS: Record<string, { libelle: string; ton: "info" | "success" | "warning" | "critical" | "neutral" }> = {
  a_confirmer: { libelle: "À confirmer", ton: "warning" }, confirmee: { libelle: "Confirmée", ton: "success" }, injoignable: { libelle: "Injoignable", ton: "neutral" },
  rappeler: { libelle: "À rappeler", ton: "info" }, annulee: { libelle: "Annulée", ton: "critical" }, faux_numero: { libelle: "Faux numéro", ton: "critical" },
};

export default function CommandeExpressPage() {
  const t = useT();
  const [d, setD] = useState<Donnees | null>(null);
  const [brouillon, setBrouillon] = useState<Reglages | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const charger = useCallback(() => fetch("/api/commande-express/reglages").then((r) => (r.ok ? r.json() : null)).then((x) => { if (x) { setD(x); setBrouillon(x.reglages); } }), []);
  useEffect(() => { charger(); }, [charger]);

  const enregistrer = async (maj: Partial<Reglages>) => {
    setEnvoi(true);
    try {
      const r = await fetch("/api/commande-express/reglages", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(maj) });
      const x = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(x.error ?? "Enregistrement impossible");
      setD((v) => (v ? { ...v, reglages: x.reglages } : v)); setBrouillon(x.reglages);
      toast.success(t(maj.actif === true ? "Releasit COD AXSO est activée sur vos fiches produits" : maj.actif === false ? "Releasit COD AXSO est désactivée" : "Réglages enregistrés"));
    } catch (e: any) { toast.error(t(e.message)); }
    finally { setEnvoi(false); }
  };

  if (!d || !brouillon) return <Page><PageHeader icon="orders" title={t("Releasit COD AXSO")} /><Card><p className="axd-muted">{t("Chargement...")}</p></Card></Page>;
  const modifie = JSON.stringify(brouillon) !== JSON.stringify(d.reglages);
  const total = Object.values(d.stats).reduce((a, b) => a + b, 0);
  const etapes = [
    { fait: d.zonesConfigurees > 0, titre: "Indiquez vos zones de livraison", texte: "Le client choisit sa ville ou son quartier dans une liste, et les frais s'ajoutent tout seuls.", lien: "/dashboard/livraison", action: "Régler la livraison" },
    { fait: d.reglages.actif, titre: "Activez Releasit COD AXSO", texte: "Le bouton « Commander maintenant » apparaît sur toutes vos fiches de produits physiques.", lien: null, action: null },
    { fait: d.miseEnRoute.formulaire, titre: "Personnalisez le formulaire", texte: "Modèle de design, champs, questions en plus et messages, avec l'aperçu en direct.", lien: "/dashboard/commande-express/formulaire", action: "Ouvrir l'éditeur" },
    { fait: d.miseEnRoute.offres > 0, titre: "Créez une offre", texte: "« 2 pour… », case à cocher ou ajout en 1 clic : le panier moyen monte tout seul.", lien: "/dashboard/commande-express/offres", action: "Créer une offre" },
    { fait: d.miseEnRoute.relances, titre: "Activez les relances WhatsApp", texte: "Les clients qui partent sans commander reçoivent un rappel aux délais choisis.", lien: "/dashboard/commande-express/abandons", action: "Activer" },
    { fait: d.miseEnRoute.pixels, titre: "Reliez vos publicités", texte: "Les ventes partent directement à Meta et TikTok depuis le serveur.", lien: "/dashboard/commande-express/integrations", action: "Relier" },
  ];

  return (
    <Page width="narrow">
      <PageHeader icon="orders" title={t("Releasit COD AXSO")}
        secondaryActions={d.slug ? [{ content: t("Voir ma boutique"), href: `/${d.slug}`, external: true, icon: "external" }] : []} />
      <OngletsCommandeExpress />
      <div style={{ display: "grid", gap: "var(--space-400)", marginTop: "var(--space-400)" }}>
        {(d.stats.a_confirmer ?? 0) > 0 && (
          <Banner tone="warning" title={t("{0} client(s) à appeler", d.stats.a_confirmer)}>
            <div style={{ display: "grid", gap: 10 }}>
              <span>{t("Une commande confirmée par téléphone est beaucoup plus souvent livrée et payée.")}</span>
              <span><Button variant="primary" size="sm" href="/dashboard/commande-express/confirmation">{t("Ouvrir le centre de confirmation")}</Button></span>
            </div>
          </Banner>
        )}
        <Banner tone="info" title={t("Le client commande en un seul écran")}>
          {t("Nom, téléphone, ville, quantité : « Commander ». Pas de compte, pas de carte, paiement à la livraison. Vous êtes prévenu par e-mail et sur AXSO, et le client vous envoie sa commande sur WhatsApp.")}
        </Banner>

        <Card title={t("Activation")} actions={<span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><Badge tone={d.reglages.actif ? "success" : "neutral"}>{t(d.reglages.actif ? "Activée" : "Désactivée")}</Badge><Toggle checked={d.reglages.actif} disabled={envoi} label={t("Activer Releasit COD AXSO")} onChange={(v) => enregistrer({ actif: v })} /></span>}>
          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
            {etapes.map((e, i) => (
              <li key={e.titre} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span aria-hidden style={{ width: 26, height: 26, flex: "none", borderRadius: 13, display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700, background: e.fait ? "#22c55e" : "var(--color-surface-tertiary)", color: e.fait ? "#fff" : "var(--color-text-secondary)" }}>{e.fait ? "✓" : i + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{t(e.titre)}</div>
                  <div className="axd-muted" style={{ fontSize: 13.5 }}>{t(e.texte)}</div>
                </div>
                {!e.fait && e.lien && <Button size="sm" href={e.lien}>{t(e.action!)}</Button>}
              </li>
            ))}
          </ol>
        </Card>

        <Card title={t("Apparence du bouton")}>
          <div style={{ display: "grid", gap: 14 }}>
            <label style={{ display: "grid", gap: 6 }}><span style={{ fontWeight: 600, fontSize: 13.5 }}>{t("Texte du bouton")}</span>
              <input className="axd-input" maxLength={40} value={brouillon.texteBouton} onChange={(e) => setBrouillon({ ...brouillon, texteBouton: e.target.value })} /></label>
            <label style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontWeight: 600, fontSize: 13.5 }}>{t("Couleur")}</span>
              <input type="color" value={brouillon.couleur} onChange={(e) => setBrouillon({ ...brouillon, couleur: e.target.value })} style={{ width: 44, height: 36, border: 0, background: "none" }} />
              <code style={{ fontSize: 13 }}>{brouillon.couleur}</code></label>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div><div style={{ fontWeight: 600, fontSize: 13.5 }}>{t("Bouton collant en bas de l'écran")}</div><div className="axd-muted" style={{ fontSize: 13 }}>{t("Toujours visible pendant que le client fait défiler la fiche produit.")}</div></div>
              <Toggle checked={brouillon.boutonCollant} label={t("Bouton collant")} onChange={(v) => setBrouillon({ ...brouillon, boutonCollant: v })} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div><div style={{ fontWeight: 600, fontSize: 13.5 }}>{t("Demander l'e-mail (facultatif)")}</div><div className="axd-muted" style={{ fontSize: 13 }}>{t("Le client reçoit alors sa confirmation par e-mail.")}</div></div>
              <Toggle checked={brouillon.demanderEmail} label={t("Demander l'e-mail")} onChange={(v) => setBrouillon({ ...brouillon, demanderEmail: v })} />
            </div>
            <div style={{ padding: 16, borderRadius: 14, background: "var(--color-surface-secondary)" }}>
              <div className="axd-muted" style={{ fontSize: 12, marginBottom: 8 }}>{t("Aperçu")}</div>
              <button type="button" style={{ width: "100%", height: 52, border: 0, borderRadius: 14, background: brouillon.couleur, color: "#fff", fontWeight: 700, fontSize: 16 }}>{brouillon.texteBouton || t("Commander maintenant")}</button>
            </div>
            <div><Button variant="primary" disabled={!modifie} loading={envoi} onClick={() => enregistrer(brouillon)}>{t("Enregistrer")}</Button></div>
          </div>
        </Card>

        <Card title={t("30 derniers jours")}>
          {total === 0 ? <p className="axd-muted" style={{ margin: 0 }}>{t("Aucune commande Releasit pour l'instant.")}</p> : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
              <div><div style={{ fontSize: 24, fontWeight: 700 }}>{total}</div><div className="axd-muted" style={{ fontSize: 13 }}>{t("Commandes")}</div></div>
              {Object.entries(STATUTS).filter(([k]) => d.stats[k]).map(([k, s]) => <div key={k}><div style={{ fontSize: 24, fontWeight: 700 }}>{d.stats[k]}</div><div className="axd-muted" style={{ fontSize: 13 }}>{t(s.libelle)}</div></div>)}
            </div>
          )}
        </Card>

        <Card title={t("Dernières commandes Releasit")} padding="none">
          {!d.recentes.length ? <div style={{ padding: 16 }}><p className="axd-muted" style={{ margin: 0 }}>{t("Elles apparaîtront ici dès la première commande.")}</p></div> : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {d.recentes.map((r) => r.commande && (
                <li key={r.id} style={{ borderTop: "1px solid var(--color-border-secondary)" }}>
                  <Link href={`/dashboard/commandes/${r.commande.id}`} style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 16px", color: "inherit", textDecoration: "none" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>#{r.commande.numero} · {r.commande.clientNom}</div>
                      <div className="axd-muted" style={{ fontSize: 13 }}>{[r.commande.ville, r.quartier, r.commande.clientTelephone].filter(Boolean).join(" · ")}{r.source?.utm_source ? ` · ${t("source")} : ${r.source.utm_source}` : ""}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{formatMontant(r.commande.montantTotal, r.commande.devise)}</div>
                      <Badge tone={STATUTS[r.statutConfirmation]?.ton ?? "neutral"}>{t(STATUTS[r.statutConfirmation]?.libelle ?? r.statutConfirmation)}</Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </Page>
  );
}
