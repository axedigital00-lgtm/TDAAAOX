"use client";
// Centre de confirmation Commande Express : la file des clients à appeler, dans l'ordre utile
// (rappels à l'heure, nouvelles commandes, injoignables), avec appel, WhatsApp et résultat en 1 geste.
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Page, PageHeader, Card, Badge, Button, Banner, Icon } from "@/components/dashboard/design-system";
import { OngletsCommandeExpress } from "@/components/dashboard/commande-express/OngletsApp";
import { BadgeRisque } from "@/components/dashboard/commande-express/BadgeRisque";
import { useT } from "@/components/I18nProvider";
import { formatMontant } from "@/lib/utils";

type Appel = { resultat: string; note: string | null; agentNom: string | null; rappelA: string | null; createdAt: string };
type Element = {
  id: string; statutConfirmation: string; tentatives: number; rappelA: string | null; note: string | null; quartier: string | null; repere: string | null;
  latitude: number | null; longitude: number | null; scoreRisque: number | null; facteursRisque: { code: string; points: number; libelle: string }[] | null; source: Record<string, string>; createdAt: string; aTraiter: boolean;
  commande: { id: string; numero: string; clientNom: string; clientTelephone: string; montantTotal: number; devise: string; ville: string; adresse: string; statut: string; livraisonStatut: string; produits: string };
  lienAppel: string | null; lienWhatsApp: string | null; appels: Appel[];
};
type Stats = { total: number; parStatut: Record<string, number>; tauxConfirmation: number | null; tauxLivraison: number | null; appelsAujourdhui: number; agents: { nom: string; appels: number; confirmees: number; aujourdhui: number }[] };

const STATUTS: Record<string, { libelle: string; ton: "info" | "success" | "warning" | "critical" | "neutral" }> = {
  a_confirmer: { libelle: "À confirmer", ton: "warning" }, confirmee: { libelle: "Confirmée", ton: "success" }, injoignable: { libelle: "Injoignable", ton: "neutral" },
  rappeler: { libelle: "À rappeler", ton: "info" }, annulee: { libelle: "Annulée", ton: "critical" }, faux_numero: { libelle: "Faux numéro", ton: "critical" },
};
const VUES = [{ id: "a_traiter", label: "À traiter" }, { id: "traitees", label: "Traitées" }, { id: "toutes", label: "Toutes" }];

/** Créneaux de rappel proposés : dans 1 h, dans 3 h, demain 9 h. */
function creneaux(): { label: string; date: Date }[] {
  const h = (n: number) => new Date(Date.now() + n * 3_600_000);
  const demain = new Date(); demain.setDate(demain.getDate() + 1); demain.setHours(9, 0, 0, 0);
  return [{ label: "Dans 1 h", date: h(1) }, { label: "Dans 3 h", date: h(3) }, { label: "Demain 9 h", date: demain }];
}

export default function CentreConfirmationPage() {
  const t = useT();
  const [vue, setVue] = useState("a_traiter");
  const [elements, setElements] = useState<Element[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const charger = useCallback((v: string) => fetch(`/api/commande-express/confirmation?vue=${v}`).then((r) => (r.ok ? r.json() : null)).then((x) => { if (x) { setElements(x.elements); setStats(x.stats); } }), []);
  useEffect(() => { setElements(null); charger(vue); }, [vue, charger]);

  return (
    <Page width="narrow">
      <PageHeader icon="orders" title={t("Centre de confirmation")} backHref="/dashboard/commande-express" />
      <OngletsCommandeExpress />
      <div style={{ display: "grid", gap: "var(--space-400)", marginTop: "var(--space-400)" }}>
        {stats && <Chiffres stats={stats} />}
        <nav className="axd-tabs" aria-label={t("Filtre")}>
          {VUES.map((v) => <button key={v.id} type="button" className="axd-tab" aria-current={vue === v.id ? "page" : undefined} onClick={() => setVue(v.id)}>{t(v.label)}{v.id === "a_traiter" && vue === v.id && elements ? ` (${elements.length})` : ""}</button>)}
        </nav>
        {!elements ? <Card><p className="axd-muted" style={{ margin: 0 }}>{t("Chargement...")}</p></Card>
          : !elements.length ? (
            <Card>
              <div style={{ textAlign: "center", padding: "24px 8px" }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>{t(vue === "a_traiter" ? "Aucun client à appeler" : "Rien à afficher")}</div>
                <p className="axd-muted" style={{ margin: 0 }}>{t(vue === "a_traiter" ? "Chaque nouvelle commande express arrive ici pour être confirmée par téléphone ou WhatsApp." : "Les commandes traitées depuis 60 jours apparaissent ici.")}</p>
              </div>
            </Card>
          ) : elements.map((e) => <FicheAppel key={e.id} e={e} apres={() => charger(vue)} />)}
      </div>
    </Page>
  );
}

function Chiffres({ stats }: { stats: Stats }) {
  const t = useT();
  const cases = [
    { valeur: String(stats.parStatut.a_confirmer ?? 0), libelle: "À confirmer" },
    { valeur: stats.tauxConfirmation === null ? "-" : `${stats.tauxConfirmation} %`, libelle: "Taux de confirmation" },
    { valeur: stats.tauxLivraison === null ? "-" : `${stats.tauxLivraison} %`, libelle: "Livrées après confirmation" },
    { valeur: String(stats.appelsAujourdhui), libelle: "Appels aujourd'hui" },
  ];
  return (
    <Card title={t("30 derniers jours")}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
        {cases.map((c) => <div key={c.libelle}><div style={{ fontSize: 24, fontWeight: 700 }}>{c.valeur}</div><div className="axd-muted" style={{ fontSize: 13 }}>{t(c.libelle)}</div></div>)}
      </div>
      {stats.agents.length > 0 && (
        <div style={{ marginTop: 16, borderTop: "1px solid var(--color-border-secondary)", paddingTop: 12 }}>
          <div className="axd-muted" style={{ fontSize: 12, marginBottom: 8 }}>{t("Par agent")}</div>
          {stats.agents.map((a, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14, padding: "4px 0" }}>
              <span style={{ fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{a.nom || t("Équipe")}</span>
              <span className="axd-muted">{t("{0} appels · {1} confirmées · {2} aujourd'hui", a.appels, a.confirmees, a.aujourdhui)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function FicheAppel({ e, apres }: { e: Element; apres: () => void }) {
  const t = useT();
  const [note, setNote] = useState("");
  const [rappel, setRappel] = useState(false);
  const [envoi, setEnvoi] = useState<string | null>(null);
  const s = STATUTS[e.statutConfirmation] ?? { libelle: e.statutConfirmation, ton: "neutral" as const };
  const enRetard = e.statutConfirmation === "rappeler" && e.rappelA && new Date(e.rappelA) <= new Date();
  const carte = e.latitude !== null && e.longitude !== null ? `https://www.google.com/maps?q=${e.latitude},${e.longitude}` : null;

  const enregistrer = async (resultat: string, rappelA?: Date) => {
    setEnvoi(resultat);
    try {
      const r = await fetch(`/api/commande-express/confirmation/${e.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resultat, note: note || undefined, rappelA }) });
      const x = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(x.error ?? "Enregistrement impossible");
      if (x.avertissement) toast.warning(t(x.avertissement));
      else toast.success(t(resultat === "confirmee" ? "Commande confirmée : elle part en préparation" : resultat === "rappeler" ? "Rappel programmé" : resultat === "injoignable" ? "Tentative notée" : "Commande annulée"));
      setNote(""); setRappel(false); apres();
    } catch (err) { toast.error(t(err instanceof Error ? err.message : "Enregistrement impossible")); }
    finally { setEnvoi(null); }
  };

  const bloquer = async () => {
    if (!confirm(t("Bloquer le numéro et la connexion de ce client ? Il ne pourra plus commander en ligne dans votre boutique."))) return;
    const r = await fetch("/api/commande-express/anti-fraude", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "bloquer_commande", ficheId: e.id }) });
    const x = await r.json().catch(() => ({}));
    if (r.ok) toast.success(t("Client bloqué")); else toast.error(t(x.error ?? "Blocage impossible"));
  };

  return (
    <Card padding="none">
      <div style={{ padding: 16, display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{e.commande.clientNom}</div>
            <div className="axd-muted" style={{ fontSize: 13.5 }}>
              <Link href={`/dashboard/commandes/${e.commande.id}`} style={{ color: "inherit" }}>#{e.commande.numero}</Link> · {new Date(e.createdAt).toLocaleString(t.loc, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
          <div style={{ textAlign: "right", flex: "none" }}>
            <div style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{formatMontant(e.commande.montantTotal, e.commande.devise)}</div>
            <Badge tone={s.ton}>{t(s.libelle)}{e.statutConfirmation === "injoignable" ? ` ${e.tentatives}/3` : ""}</Badge>
          </div>
        </div>

        {e.scoreRisque !== null && e.scoreRisque >= 30 && (
          <div style={{ display: "grid", gap: 4 }}>
            <div><BadgeRisque score={e.scoreRisque} /></div>
            <ul className="axd-muted" style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>{(e.facteursRisque ?? []).filter((f) => f.points > 0).map((f) => <li key={f.code}>{t(f.libelle)}</li>)}</ul>
          </div>
        )}

        <div style={{ fontSize: 14, display: "grid", gap: 4 }}>
          <div>{e.commande.produits}</div>
          <div className="axd-muted">{[e.commande.ville, e.quartier, e.repere].filter(Boolean).join(" · ")}{carte && <> · <a href={carte} target="_blank" rel="noreferrer">{t("Voir la position")}</a></>}</div>
          {e.source?.utm_source && <div className="axd-muted" style={{ fontSize: 12.5 }}>{t("Source")} : {e.source.utm_source}{e.source.utm_campaign ? ` · ${e.source.utm_campaign}` : ""}</div>}
        </div>

        {e.statutConfirmation === "rappeler" && e.rappelA && (
          <Banner tone={enRetard ? "warning" : "info"} title={t(enRetard ? "Rappel à faire maintenant" : "Rappel prévu")}>
            {new Date(e.rappelA).toLocaleString(t.loc, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </Banner>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {e.lienAppel ? <a className="axd-btn axd-btn--primary" href={e.lienAppel} style={{ justifyContent: "center" }}><Icon name="user" />{t("Appeler")}</a> : <span className="axd-btn" aria-disabled>{t("Numéro invalide")}</span>}
          {e.lienWhatsApp && <a className="axd-btn" href={e.lienWhatsApp} target="_blank" rel="noreferrer" style={{ justifyContent: "center" }}><Icon name="whatsapp" />WhatsApp</a>}
        </div>
        <div className="axd-muted" style={{ fontSize: 13, marginTop: -4 }}>{e.commande.clientTelephone}</div>

        {e.aTraiter && (
          <>
            <input className="axd-input" placeholder={t("Note (facultatif) : adresse précisée, heure préférée…")} value={note} maxLength={500} onChange={(x) => setNote(x.target.value)} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Button variant="primary" loading={envoi === "confirmee"} disabled={!!envoi} onClick={() => enregistrer("confirmee")}>{t("Confirmée")}</Button>
              <Button loading={envoi === "injoignable"} disabled={!!envoi} onClick={() => enregistrer("injoignable")}>{t("Injoignable")}</Button>
              <Button disabled={!!envoi} onClick={() => setRappel((v) => !v)}>{t("À rappeler")}</Button>
              <Button variant="plain" loading={envoi === "annulee"} disabled={!!envoi} onClick={() => { if (confirm(t("Annuler cette commande ?"))) enregistrer("annulee"); }}>{t("Annulée")}</Button>
            </div>
            {rappel && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {creneaux().map((c) => <Button key={c.label} size="sm" disabled={!!envoi} onClick={() => enregistrer("rappeler", c.date)}>{t(c.label)}</Button>)}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="axd-btn axd-btn--plain axd-btn--sm" disabled={!!envoi} onClick={() => { if (confirm(t("Signaler un faux numéro et annuler la commande ?"))) enregistrer("faux_numero"); }}>{t("Faux numéro")}</button>
              <button type="button" className="axd-btn axd-btn--plain axd-btn--sm" disabled={!!envoi} onClick={() => bloquer()}>{t("Bloquer ce client")}</button>
            </div>
          </>
        )}

        {e.appels.length > 0 && (
          <details>
            <summary className="axd-muted" style={{ fontSize: 13, cursor: "pointer" }}>{t("Historique des appels ({0})", e.appels.length)}</summary>
            <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0, display: "grid", gap: 6, fontSize: 13 }}>
              {e.appels.map((a, i) => (
                <li key={i}><strong>{t(STATUTS[a.resultat]?.libelle ?? a.resultat)}</strong> · {new Date(a.createdAt).toLocaleString(t.loc, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}{a.agentNom ? ` · ${a.agentNom}` : ""}{a.note ? ` · ${a.note}` : ""}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </Card>
  );
}
