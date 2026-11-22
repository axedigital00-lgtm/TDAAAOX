"use client";
// Éditeur d'un devis : client ou entreprise, produits, remise, livraison, conditions, puis actions.
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useT } from "@/components/I18nProvider";
import { Page, PageHeader } from "@/components/dashboard/design-system/components/PageHeader";
import { Banner, Card, Field } from "@/components/dashboard/design-system/components/primitives";
import { Badge } from "@/components/dashboard/design-system/components/Badge";
import { Button } from "@/components/dashboard/design-system/components/Button";
import { LIBELLES_CONDITIONS, devisModifiable, prixEntreprise, totauxDevis, type ConditionPaiement, type LigneDevis } from "@/lib/commerce/regles";
import { prixPourQuantite, type VenteGros } from "@/lib/commerce/gros";
import { formatMontant } from "@/lib/utils";

type Article = { produitId: string; nom: string; variante: string | null; prix: number; prixBase: number; stock: number; imageUrl: string | null; gros: VenteGros | null };
type Entreprise = { id: string; nom: string; contactNom: string | null; email: string | null; telephone: string; adresse: string | null; ville: string | null; pays: string | null; conditions: ConditionPaiement; remisePct: number };
type Commande = { id: string; numero: string; paiementStatut: string; methodePaiement: string; echeancePaiement: string | null };

const VIDE = { entrepriseId: "", clientNom: "", clientEmail: "", clientTelephone: "", adresse: "", ville: "", pays: "", remise: 0, livraison: 0, conditions: "comptant" as ConditionPaiement, bonCommande: "", note: "", expireAt: "" };
const STATUTS: Record<string, { l: string; tone?: "success" | "attention" | "critical" | "info" }> = {
  brouillon: { l: "Brouillon" }, envoye: { l: "Envoyé", tone: "info" }, soumis: { l: "À valider", tone: "attention" },
  accepte: { l: "Accepté", tone: "success" }, refuse: { l: "Refusé", tone: "critical" }, annule: { l: "Annulé" },
};

export function EditeurDevis({ id }: { id?: string }) {
  const t = useT();
  const router = useRouter();
  const [catalogue, setCatalogue] = useState<Article[]>([]);
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [devise, setDevise] = useState("XAF");
  const [f, setF] = useState(VIDE);
  const [lignes, setLignes] = useState<LigneDevis[]>([]);
  const [statut, setStatut] = useState("brouillon");
  const [numero, setNumero] = useState("");
  const [lien, setLien] = useState("");
  const [commande, setCommande] = useState<Commande | null>(null);
  const [recherche, setRecherche] = useState("");
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [pret, setPret] = useState(!id);

  async function charger() {
    if (!id) return;
    const r = await fetch(`/api/devis/${id}`);
    const x = await r.json().catch(() => ({}));
    if (!r.ok) { toast.error(t(x.error ?? "Devis introuvable")); return router.push("/dashboard/commandes/devis"); }
    const d = x.devis;
    setF({ entrepriseId: d.entrepriseId ?? "", clientNom: d.clientNom, clientEmail: d.clientEmail ?? "", clientTelephone: d.clientTelephone, adresse: d.adresse ?? "", ville: d.ville ?? "", pays: d.pays ?? "", remise: d.remise, livraison: d.livraison, conditions: d.conditions, bonCommande: d.bonCommande ?? "", note: d.note ?? "", expireAt: d.expireAt ? d.expireAt.slice(0, 10) : "" });
    setLignes(d.lignes); setStatut(d.statut); setNumero(d.numero); setDevise(d.devise); setLien(x.lien); setCommande(x.commande); setPret(true);
  }

  useEffect(() => {
    fetch("/api/devis/catalogue").then((r) => r.json()).then((d) => { setCatalogue(d.catalogue ?? []); setEntreprises(d.entreprises ?? []); if (!id) setDevise(d.devise ?? "XAF"); });
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const modifiable = devisModifiable(statut);
  const totaux = totauxDevis(lignes, f.remise, f.livraison);
  const entreprise = entreprises.find((e) => e.id === f.entrepriseId);
  const resultats = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return q ? catalogue.filter((a) => `${a.nom} ${a.variante ?? ""}`.toLowerCase().includes(q)).slice(0, 8) : [];
  }, [recherche, catalogue]);
  const champ = <K extends keyof typeof VIDE>(k: K, v: (typeof VIDE)[K]) => setF((x) => ({ ...x, [k]: v }));

  function choisirEntreprise(eid: string) {
    const e = entreprises.find((x) => x.id === eid);
    setF((x) => e ? { ...x, entrepriseId: e.id, clientNom: e.nom, clientEmail: e.email ?? "", clientTelephone: e.telephone, adresse: e.adresse ?? "", ville: e.ville ?? "", pays: e.pays ?? "", conditions: e.conditions } : { ...x, entrepriseId: "", conditions: "comptant" });
  }

  const prixArticle = (a: Article, q: number) => prixEntreprise(prixPourQuantite(a.prixBase, a.gros, q), entreprise?.remisePct ?? 0);
  function ajouter(a: Article) {
    setLignes((ls) => {
      const i = ls.findIndex((l) => l.produitId === a.produitId && (l.variante ?? null) === a.variante);
      if (i >= 0) return ls.map((l, j) => (j === i ? { ...l, quantite: l.quantite + 1, prix: prixArticle(a, l.quantite + 1) } : l));
      return [...ls, { produitId: a.produitId, nom: a.nom, variante: a.variante, imageUrl: a.imageUrl, quantite: 1, prix: prixArticle(a, 1) }];
    });
    setRecherche("");
  }
  function changerQuantite(i: number, q: number) {
    setLignes((ls) => ls.map((l, j) => {
      if (j !== i) return l;
      const a = catalogue.find((x) => x.produitId === l.produitId && x.variante === (l.variante ?? null));
      return { ...l, quantite: q, prix: a ? prixArticle(a, q) : l.prix };
    }));
  }

  async function enregistrer(): Promise<string | null> {
    const corps = { ...f, entrepriseId: f.entrepriseId || null, clientEmail: f.clientEmail || null, expireAt: f.expireAt ? new Date(`${f.expireAt}T23:59:59`).toISOString() : null, lignes };
    const r = await fetch(id ? `/api/devis/${id}` : "/api/devis", { method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { toast.error(t(d.error ?? "Enregistrement impossible")); return null; }
    return id ?? d.devis.id;
  }

  async function sauver() {
    setEnvoi("sauver");
    const nid = await enregistrer();
    setEnvoi(null);
    if (!nid) return;
    toast.success(t("Devis enregistré"));
    if (!id) router.replace(`/dashboard/commandes/devis/${nid}`); else charger();
  }

  async function agir(action: "envoyer" | "convertir" | "annuler" | "encaisser") {
    if (action === "annuler" && !window.confirm(t("Annuler ce devis ?"))) return;
    setEnvoi(action);
    if (modifiable && action !== "annuler" && action !== "encaisser" && !(await enregistrer())) return setEnvoi(null);
    const r = await fetch(`/api/devis/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    const d = await r.json().catch(() => ({}));
    setEnvoi(null);
    if (!r.ok) return void toast.error(t(d.error ?? "Action impossible"));
    if (action === "convertir") { toast.success(t("Commande créée")); return router.push(`/dashboard/commandes/${d.commandeId}`); }
    if (action === "envoyer") {
      await navigator.clipboard?.writeText(d.lien).catch(() => {});
      toast.success(d.emailEnvoye ? t("Devis envoyé par e-mail, lien copié") : t("Lien du devis copié"));
      if (!f.clientEmail) window.open(d.whatsapp, "_blank", "noopener");
    } else toast.success(t("Enregistré"));
    charger();
  }

  if (!pret) return <Page width="narrow"><PageHeader title={t("Devis")} backHref="/dashboard/commandes/devis" /><Card><p className="axd-muted" style={{ margin: 0 }}>{t("Chargement…")}</p></Card></Page>;
  const aTerme = commande?.methodePaiement === "facture_terme";

  return (
    <Page width="narrow">
      <PageHeader icon="doc" title={numero || t("Nouveau devis")} backHref="/dashboard/commandes/devis"
        titleMeta={id ? <Badge tone={STATUTS[statut]?.tone}>{t(STATUTS[statut]?.l ?? statut)}</Badge> : undefined}
        primaryAction={modifiable ? { content: t("Enregistrer"), onAction: sauver, loading: envoi === "sauver" } : undefined} />
      <div className="axd-stack">
        {statut === "soumis" && <Banner tone="warning" title={t("Commande reçue du portail entreprise")}>{t("Vérifiez les quantités et les prix, puis créez la commande.")}</Banner>}
        {commande && (
          <Banner tone={commande.paiementStatut === "completed" ? "success" : "info"} title={t("Commande #{0}").replace("{0}", commande.numero)}
            action={aTerme && commande.paiementStatut === "pending" ? <Button onClick={() => agir("encaisser")} loading={envoi === "encaisser"}>{t("Marquer comme payée")}</Button> : <Button href={`/dashboard/commandes/${commande.id}`}>{t("Ouvrir")}</Button>}>
            {aTerme && commande.echeancePaiement ? `${t("Échéance")} : ${new Date(commande.echeancePaiement).toLocaleDateString(t.loc)}` : null}
          </Banner>
        )}

        <Card title={t("Client")}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "var(--space-300)" }}>
            <Field label={t("Compte entreprise (facultatif)")}>{(p) => <select {...p} className="axd-input" disabled={!modifiable} value={f.entrepriseId} onChange={(e) => choisirEntreprise(e.target.value)}><option value="">{t("Aucun")}</option>{entreprises.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}</select>}</Field>
            <Field label={t("Nom")}>{(p) => <input {...p} className="axd-input" disabled={!modifiable} value={f.clientNom} onChange={(e) => champ("clientNom", e.target.value)} />}</Field>
            <Field label={t("Téléphone")}>{(p) => <input {...p} className="axd-input" disabled={!modifiable} inputMode="tel" value={f.clientTelephone} onChange={(e) => champ("clientTelephone", e.target.value)} />}</Field>
            <Field label={t("E-mail")}>{(p) => <input {...p} type="email" className="axd-input" disabled={!modifiable} value={f.clientEmail} onChange={(e) => champ("clientEmail", e.target.value)} />}</Field>
            <Field label={t("Adresse")}>{(p) => <input {...p} className="axd-input" disabled={!modifiable} value={f.adresse} onChange={(e) => champ("adresse", e.target.value)} />}</Field>
            <Field label={t("Ville")}>{(p) => <input {...p} className="axd-input" disabled={!modifiable} value={f.ville} onChange={(e) => champ("ville", e.target.value)} />}</Field>
          </div>
        </Card>

        <Card title={t("Produits")}>
          {modifiable && (
            <div style={{ position: "relative", marginBottom: 12 }}>
              <input className="axd-input" aria-label={t("Rechercher un produit")} placeholder={t("Rechercher un produit…")} value={recherche} onChange={(e) => setRecherche(e.target.value)} />
              {resultats.length > 0 && (
                <div style={{ position: "absolute", zIndex: 5, left: 0, right: 0, top: "calc(100% + 4px)", background: "var(--color-bg-surface, #fff)", border: "1px solid var(--color-border, #e3e3e3)", borderRadius: 10, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,.12)" }}>
                  {resultats.map((a) => (
                    <button key={`${a.produitId}${a.variante}`} type="button" onClick={() => ajouter(a)} style={{ display: "flex", justifyContent: "space-between", gap: 12, width: "100%", padding: "10px 12px", background: "none", border: 0, cursor: "pointer", textAlign: "left", font: "inherit" }}>
                      <span>{a.nom}{a.variante ? ` — ${a.variante}` : ""} <span className="axd-muted">({t("stock")} {a.stock})</span></span><span>{formatMontant(prixArticle(a, 1), devise)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {lignes.length === 0 ? <p className="axd-muted" style={{ margin: 0 }}>{t("Aucun produit ajouté.")}</p> : (
            <div style={{ display: "grid", gap: 10 }}>
              {lignes.map((l, i) => (
                <div key={`${l.produitId}${l.variante}`} style={{ display: "grid", gridTemplateColumns: "minmax(120px, 1fr) 82px 110px auto", gap: 8, alignItems: "center" }}>
                  <span style={{ overflowWrap: "anywhere" }}>{l.nom}{l.variante ? <span className="axd-muted"> — {l.variante}</span> : null}</span>
                  <input aria-label={t("Quantité")} type="number" min={1} className="axd-input" disabled={!modifiable} value={l.quantite} onChange={(e) => changerQuantite(i, Math.max(Math.floor(Number(e.target.value)) || 1, 1))} />
                  <input aria-label={t("Prix unitaire")} type="number" min={0} className="axd-input" disabled={!modifiable} value={l.prix} onChange={(e) => setLignes((ls) => ls.map((x, j) => (j === i ? { ...x, prix: Math.max(Number(e.target.value) || 0, 0) } : x)))} />
                  {modifiable ? <Button variant="plain" onClick={() => setLignes((ls) => ls.filter((_, j) => j !== i))}>{t("Retirer")}</Button> : <span />}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title={t("Conditions et total")}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "var(--space-300)" }}>
            <Field label={t("Remise ({0})").replace("{0}", devise)}>{(p) => <input {...p} type="number" min={0} className="axd-input" disabled={!modifiable} value={f.remise} onChange={(e) => champ("remise", Math.max(Number(e.target.value) || 0, 0))} />}</Field>
            <Field label={t("Livraison ({0})").replace("{0}", devise)}>{(p) => <input {...p} type="number" min={0} className="axd-input" disabled={!modifiable} value={f.livraison} onChange={(e) => champ("livraison", Math.max(Number(e.target.value) || 0, 0))} />}</Field>
            <Field label={t("Paiement")}>{(p) => <select {...p} className="axd-input" disabled={!modifiable} value={f.conditions} onChange={(e) => champ("conditions", e.target.value as ConditionPaiement)}>{Object.entries(LIBELLES_CONDITIONS).filter(([k]) => k === "comptant" || f.entrepriseId).map(([k, l]) => <option key={k} value={k}>{t(l)}</option>)}</select>}</Field>
            <Field label={t("N° de bon de commande")}>{(p) => <input {...p} className="axd-input" disabled={!modifiable} value={f.bonCommande} onChange={(e) => champ("bonCommande", e.target.value)} />}</Field>
            <Field label={t("Valable jusqu'au")}>{(p) => <input {...p} type="date" className="axd-input" disabled={!modifiable} value={f.expireAt} onChange={(e) => champ("expireAt", e.target.value)} />}</Field>
          </div>
          <div style={{ marginTop: 12 }}><Field label={t("Note pour le client")}>{(p) => <textarea {...p} rows={2} className="axd-input" style={{ height: "auto", paddingTop: 8 }} disabled={!modifiable} value={f.note} onChange={(e) => champ("note", e.target.value)} />}</Field></div>
          <div style={{ display: "grid", gap: 4, marginTop: 14, maxWidth: 320, marginLeft: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>{t("Sous-total")}</span><span>{formatMontant(totaux.sousTotal, devise)}</span></div>
            {totaux.reduction > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span>{t("Remise")}</span><span>−{formatMontant(totaux.reduction, devise)}</span></div>}
            {totaux.livraison > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span>{t("Livraison")}</span><span>{formatMontant(totaux.livraison, devise)}</span></div>}
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 16 }}><span>{t("Total")}</span><span>{formatMontant(totaux.total, devise)}</span></div>
          </div>
        </Card>

        {id && modifiable && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Button variant="plain" onClick={() => agir("annuler")}>{t("Annuler le devis")}</Button>
            {lien && <Button onClick={() => { navigator.clipboard?.writeText(lien); toast.success(t("Lien copié")); }}>{t("Copier le lien")}</Button>}
            <Button onClick={() => agir("envoyer")} loading={envoi === "envoyer"}>{t("Envoyer au client")}</Button>
            <Button variant="primary" onClick={() => agir("convertir")} loading={envoi === "convertir"}>{t("Créer la commande")}</Button>
          </div>
        )}
      </div>
    </Page>
  );
}
