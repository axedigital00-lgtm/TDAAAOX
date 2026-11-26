"use client";
// Offres Releasit COD AXSO : paliers de quantité, case à cocher, ajout en 1 clic après la commande et
// offre à la fermeture du formulaire, avec vues, acceptations et taux.
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Page, PageHeader, Card, Badge, Button, Banner, Toggle } from "@/components/dashboard/design-system";
import { OngletsCommandeExpress } from "@/components/dashboard/commande-express/OngletsApp";
import { useT } from "@/components/I18nProvider";
import { formatMontant } from "@/lib/utils";

type Palier = { quantite: number; prix: number; libelle?: string; badge?: string };
type Offre = { id: string; type: string; titre: string; texte: string | null; produitId: string | null; produitOffertId: string | null; codePromoId: string | null; paliers: Palier[] | null; actif: boolean; vues: number; acceptations: number };
type Produit = { id: string; nom: string; prix: number; image: string | null };
type Donnees = { offres: Offre[]; produits: Produit[]; codes: { id: string; code: string }[]; devise: string };

const TYPES = [
  { id: "quantite", titre: "Offre de quantité", texte: "« 1 pour 6 500, 2 pour 12 000, 3 pour 16 500 » : le client choisit un palier, le prix dégressif s'applique tout seul.", exemple: "Choisissez votre offre" },
  { id: "case", titre: "Case à cocher dans le formulaire", texte: "« Ajouter la garantie / l'emballage cadeau / un 2e produit » : un produit ajouté d'un simple geste avant de commander.", exemple: "Ajouter l'emballage cadeau" },
  { id: "apres_achat", titre: "Ajout en 1 clic après la commande", texte: "Juste après « Commande reçue », le client ajoute un produit à la même commande, sans rien ressaisir.", exemple: "Complétez votre commande" },
  { id: "sortie", titre: "Offre à la fermeture", texte: "Si le client ferme le formulaire sans commander, il reçoit un code promo pour revenir.", exemple: "−10 % sur votre commande" },
] as const;

const vide = (type: string): Partial<Offre> => ({ type, titre: TYPES.find((x) => x.id === type)?.exemple ?? "", texte: "", produitId: null, produitOffertId: null, codePromoId: null, paliers: type === "quantite" ? [{ quantite: 2, prix: 0, badge: "Le plus populaire" }, { quantite: 3, prix: 0 }] : null, actif: true });

export default function OffresPage() {
  const t = useT();
  const [d, setD] = useState<Donnees | null>(null);
  const [edition, setEdition] = useState<Partial<Offre> | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [suggestions, setSuggestions] = useState<{ type: string; titre: string; raison: string; offre: Partial<Offre> }[]>([]);
  useEffect(() => { fetch("/api/commande-express/suggestions").then((r) => (r.ok ? r.json() : null)).then((x) => x && setSuggestions(x.suggestions)); }, []);
  const charger = useCallback(() => fetch("/api/commande-express/offres").then((r) => (r.ok ? r.json() : null)).then((x) => x && setD(x)), []);
  useEffect(() => { charger(); }, [charger]);
  const produit = useMemo(() => new Map((d?.produits ?? []).map((p) => [p.id, p])), [d]);

  const envoyer = async (url: string, init: RequestInit, ok: string) => {
    setEnvoi(true);
    try {
      const r = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
      const x = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(x.error ?? "Enregistrement impossible");
      toast.success(t(ok)); await charger(); return true;
    } catch (e) { toast.error(t(e instanceof Error ? e.message : "Enregistrement impossible")); return false; }
    finally { setEnvoi(false); }
  };
  const enregistrer = async () => {
    if (!edition) return;
    const corps = { ...edition, texte: edition.texte || undefined, paliers: edition.type === "quantite" ? edition.paliers?.filter((p) => p.quantite >= 2 && p.prix > 0).map((p) => ({ ...p, libelle: p.libelle || undefined, badge: p.badge || undefined })) : undefined };
    const ok = edition.id
      ? await envoyer(`/api/commande-express/offres?id=${edition.id}`, { method: "PATCH", body: JSON.stringify(corps) }, "Offre enregistrée")
      : await envoyer("/api/commande-express/offres", { method: "POST", body: JSON.stringify(corps) }, "Offre créée");
    if (ok) setEdition(null);
  };

  if (!d) return <Page width="narrow"><PageHeader icon="discount" title={t("Offres")} /><Card><p className="axd-muted" style={{ margin: 0 }}>{t("Chargement...")}</p></Card></Page>;

  return (
    <Page width="narrow">
      <PageHeader icon="discount" title={t("Offres")} backHref="/dashboard/commande-express" />
      <OngletsCommandeExpress />
      <div style={{ display: "grid", gap: "var(--space-400)", marginTop: "var(--space-400)" }}>
        <Banner tone="info" title={t("Augmentez le panier moyen sans effort")}>
          {t("Les prix affichés au client sont toujours recalculés par AXSO au moment de la commande : une offre ne peut jamais être détournée.")}
        </Banner>

        {!edition && suggestions.length > 0 && (
          <Card title={t("Recommandées pour votre boutique")}>
            <div style={{ display: "grid", gap: 10 }}>
              <p className="axd-muted" style={{ margin: 0, fontSize: 13 }}>{t("Calculées à partir de vos ventes des 60 derniers jours.")}</p>
              {suggestions.map((x) => (
                <div key={x.titre} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--color-border-secondary)" }}>
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600 }}>✨ {x.titre}</div><div className="axd-muted" style={{ fontSize: 13 }}>{x.raison}</div></div>
                  {x.offre.type && <Button size="sm" variant="primary" onClick={() => setEdition({ ...vide(x.offre.type!), ...x.offre })}>{t("Créer cette offre")}</Button>}
                </div>
              ))}
            </div>
          </Card>
        )}

        {edition ? (
          <Card title={t(TYPES.find((x) => x.id === edition.type)?.titre ?? "Offre")}>
            <div style={{ display: "grid", gap: 12 }}>
              <label style={{ display: "grid", gap: 6 }}><span style={{ fontWeight: 600, fontSize: 13.5 }}>{t("Titre affiché au client")}</span>
                <input className="axd-input" maxLength={80} value={edition.titre ?? ""} onChange={(e) => setEdition({ ...edition, titre: e.target.value })} /></label>
              {edition.type !== "quantite" && (
                <label style={{ display: "grid", gap: 6 }}><span style={{ fontWeight: 600, fontSize: 13.5 }}>{t("Texte (facultatif)")}</span>
                  <input className="axd-input" maxLength={240} value={edition.texte ?? ""} onChange={(e) => setEdition({ ...edition, texte: e.target.value })} /></label>
              )}
              {edition.type !== "sortie" && (
                <label style={{ display: "grid", gap: 6 }}><span style={{ fontWeight: 600, fontSize: 13.5 }}>{t(edition.type === "quantite" ? "Produit concerné" : "Afficher sur la fiche de")}</span>
                  <select className="axd-input" value={edition.produitId ?? ""} onChange={(e) => setEdition({ ...edition, produitId: e.target.value || null })}>
                    {edition.type !== "quantite" && <option value="">{t("Tous les produits")}</option>}
                    {edition.type === "quantite" && <option value="">{t("Choisir…")}</option>}
                    {d.produits.map((p) => <option key={p.id} value={p.id}>{p.nom} · {formatMontant(p.prix, d.devise)}</option>)}
                  </select></label>
              )}
              {(edition.type === "case" || edition.type === "apres_achat") && (
                <label style={{ display: "grid", gap: 6 }}><span style={{ fontWeight: 600, fontSize: 13.5 }}>{t("Produit proposé")}</span>
                  <select className="axd-input" value={edition.produitOffertId ?? ""} onChange={(e) => setEdition({ ...edition, produitOffertId: e.target.value || null })}>
                    <option value="">{t("Choisir…")}</option>
                    {d.produits.map((p) => <option key={p.id} value={p.id}>{p.nom} · {formatMontant(p.prix, d.devise)}</option>)}
                  </select>
                  <span className="axd-muted" style={{ fontSize: 12.5 }}>{t("Astuce : créez un produit « Emballage cadeau », « Garantie 1 an » ou « Livraison express » pour le proposer ici.")}</span></label>
              )}
              {edition.type === "sortie" && (
                <label style={{ display: "grid", gap: 6 }}><span style={{ fontWeight: 600, fontSize: 13.5 }}>{t("Code promo proposé")}</span>
                  <select className="axd-input" value={edition.codePromoId ?? ""} onChange={(e) => setEdition({ ...edition, codePromoId: e.target.value || null })}>
                    <option value="">{t("Choisir…")}</option>
                    {d.codes.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
                  </select>
                  {!d.codes.length && <span className="axd-muted" style={{ fontSize: 12.5 }}>{t("Créez d'abord un code promo dans Réductions.")}</span>}</label>
              )}
              {edition.type === "quantite" && (
                <div style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 13.5 }}>{t("Paliers (prix à l'unité)")}</span>
                  {(edition.paliers ?? []).map((p, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "70px 1fr 1fr 1fr auto", gap: 6, alignItems: "center" }}>
                      <input className="axd-input" type="number" min={2} aria-label={t("Quantité")} value={p.quantite} onChange={(e) => setEdition({ ...edition, paliers: edition.paliers!.map((x, j) => j === i ? { ...x, quantite: Number(e.target.value) } : x) })} />
                      <input className="axd-input" type="number" min={1} aria-label={t("Prix à l'unité")} placeholder={t("Prix à l'unité")} value={p.prix || ""} onChange={(e) => setEdition({ ...edition, paliers: edition.paliers!.map((x, j) => j === i ? { ...x, prix: Number(e.target.value) } : x) })} />
                      <input className="axd-input" maxLength={60} placeholder={t("Libellé (facultatif)")} value={p.libelle ?? ""} onChange={(e) => setEdition({ ...edition, paliers: edition.paliers!.map((x, j) => j === i ? { ...x, libelle: e.target.value } : x) })} />
                      <input className="axd-input" maxLength={30} placeholder={t("Badge (facultatif)")} value={p.badge ?? ""} onChange={(e) => setEdition({ ...edition, paliers: edition.paliers!.map((x, j) => j === i ? { ...x, badge: e.target.value } : x) })} />
                      <button type="button" className="axd-icon-btn" aria-label={t("Retirer")} onClick={() => setEdition({ ...edition, paliers: edition.paliers!.filter((_, j) => j !== i) })}>×</button>
                    </div>
                  ))}
                  {(edition.paliers?.length ?? 0) < 6 && <div><Button size="sm" onClick={() => setEdition({ ...edition, paliers: [...(edition.paliers ?? []), { quantite: (edition.paliers?.at(-1)?.quantite ?? 1) + 1, prix: 0 }] })}>{t("Ajouter un palier")}</Button></div>}
                  {edition.produitId && produit.get(edition.produitId) && <span className="axd-muted" style={{ fontSize: 12.5 }}>{t("Prix normal : {0} l'unité.", formatMontant(produit.get(edition.produitId)!.prix, d.devise))}</span>}
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <Button variant="primary" loading={envoi} onClick={enregistrer}>{t("Enregistrer")}</Button>
                <Button variant="plain" onClick={() => setEdition(null)}>{t("Annuler")}</Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card title={t("Créer une offre")}>
            <div style={{ display: "grid", gap: 10 }}>
              {TYPES.map((x) => (
                <div key={x.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--color-border-secondary)" }}>
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600 }}>{t(x.titre)}</div><div className="axd-muted" style={{ fontSize: 13 }}>{t(x.texte)}</div></div>
                  <Button size="sm" onClick={() => setEdition(vide(x.id))}>{t("Créer")}</Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card title={t("Vos offres")} padding="none">
          {!d.offres.length ? <div style={{ padding: 16 }}><p className="axd-muted" style={{ margin: 0 }}>{t("Aucune offre pour l'instant.")}</p></div> : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {d.offres.map((o) => {
                const taux = o.vues ? Math.round((o.acceptations / o.vues) * 100) : null;
                const cible = o.type === "sortie" ? d.codes.find((c) => c.id === o.codePromoId)?.code : produit.get(o.produitOffertId ?? o.produitId ?? "")?.nom;
                return (
                  <li key={o.id} style={{ borderTop: "1px solid var(--color-border-secondary)", padding: "12px 16px", display: "grid", gap: 6 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>{o.titre}</div>
                        <div className="axd-muted" style={{ fontSize: 13 }}>{t(TYPES.find((x) => x.id === o.type)?.titre ?? o.type)}{cible ? ` · ${cible}` : ""}{o.type === "quantite" && o.paliers ? ` · ${o.paliers.map((p) => `${p.quantite} × ${formatMontant(p.prix, d.devise)}`).join(", ")}` : ""}</div>
                      </div>
                      <Toggle checked={o.actif} disabled={envoi} label={t("Active")} onChange={(v) => envoyer(`/api/commande-express/offres?id=${o.id}`, { method: "PATCH", body: JSON.stringify({ actif: v }) }, v ? "Offre activée" : "Offre désactivée")} />
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <Badge tone={o.actif ? "success" : "neutral"}>{t(o.actif ? "Active" : "Désactivée")}</Badge>
                      <span className="axd-muted" style={{ fontSize: 13 }}>{t("{0} vues · {1} acceptées", o.vues, o.acceptations)}{taux !== null ? ` · ${taux} %` : ""}</span>
                      <span style={{ flex: 1 }} />
                      <Button size="sm" variant="plain" onClick={() => setEdition({ ...o, texte: o.texte ?? "", paliers: o.paliers ?? null })}>{t("Modifier")}</Button>
                      <Button size="sm" variant="plain" disabled={envoi} onClick={() => { if (confirm(t("Supprimer cette offre ?"))) envoyer(`/api/commande-express/offres?id=${o.id}`, { method: "DELETE" }, "Offre supprimée"); }}>{t("Supprimer")}</Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </Page>
  );
}
