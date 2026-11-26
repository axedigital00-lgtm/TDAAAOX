"use client";
// Anti-fraude Commande Express : limite de commandes par jour, liste noire et commandes à risque.
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Page, PageHeader, Card, Badge, Button, Banner } from "@/components/dashboard/design-system";
import { OngletsCommandeExpress } from "@/components/dashboard/commande-express/OngletsApp";
import { BadgeRisque } from "@/components/dashboard/commande-express/BadgeRisque";
import { useT } from "@/components/I18nProvider";
import { formatMontant } from "@/lib/utils";

type Facteur = { code: string; points: number; libelle: string };
type Donnees = {
  limiteParJour: number;
  listeNoire: { id: string; type: string; valeur: string | null; motif: string | null; createdAt: string }[];
  risquees: { id: string; scoreRisque: number; facteursRisque: Facteur[] | null; statutConfirmation: string; createdAt: string; commande: { id: string; numero: string; clientNom: string; montantTotal: number; devise: string } }[];
};

export default function AntiFraudePage() {
  const t = useT();
  const [d, setD] = useState<Donnees | null>(null);
  const [limite, setLimite] = useState(3);
  const [tel, setTel] = useState("");
  const [motif, setMotif] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const charger = useCallback(() => fetch("/api/commande-express/anti-fraude").then((r) => (r.ok ? r.json() : null)).then((x) => { if (x) { setD(x); setLimite(x.limiteParJour); } }), []);
  useEffect(() => { charger(); }, [charger]);

  const appel = async (url: string, init: RequestInit, ok: string) => {
    setEnvoi(true);
    try {
      const r = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
      const x = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(x.error ?? "Enregistrement impossible");
      toast.success(t(ok)); await charger(); return true;
    } catch (e) { toast.error(t(e instanceof Error ? e.message : "Enregistrement impossible")); return false; }
    finally { setEnvoi(false); }
  };

  if (!d) return <Page width="narrow"><PageHeader icon="shield" title={t("Anti-fraude")} /><Card><p className="axd-muted" style={{ margin: 0 }}>{t("Chargement...")}</p></Card></Page>;

  return (
    <Page width="narrow">
      <PageHeader icon="shield" title={t("Anti-fraude")} backHref="/dashboard/commande-express" />
      <OngletsCommandeExpress />
      <div style={{ display: "grid", gap: "var(--space-400)", marginTop: "var(--space-400)" }}>
        <Banner tone="info" title={t("Chaque commande reçoit un score de risque de 0 à 100")}>
          {t("Le score ne bloque jamais une commande : il vous dit qui appeler en premier et pourquoi (numéro déjà refusé, formulaire rempli par un robot, nom inhabituel…). Seuls la liste noire et la limite par jour refusent une commande.")}
        </Banner>

        <Card title={t("Limite par jour")}>
          <div style={{ display: "grid", gap: 10 }}>
            <p className="axd-muted" style={{ margin: 0, fontSize: 14 }}>{t("Nombre maximum de commandes par numéro de téléphone et par connexion sur 24 heures. 0 : sans limite.")}</p>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <input className="axd-input" type="number" min={0} max={50} value={limite} onChange={(e) => setLimite(Math.max(0, Math.min(50, Number(e.target.value) || 0)))} style={{ width: 100 }} aria-label={t("Limite par jour")} />
              <Button variant="primary" disabled={envoi || limite === d.limiteParJour} onClick={() => appel("/api/commande-express/reglages", { method: "PATCH", body: JSON.stringify({ limiteParJour: limite }) }, "Limite enregistrée")}>{t("Enregistrer")}</Button>
            </div>
          </div>
        </Card>

        <Card title={t("Liste noire")}>
          <div style={{ display: "grid", gap: 12 }}>
            <p className="axd-muted" style={{ margin: 0, fontSize: 14 }}>{t("Les numéros et connexions bloqués ne peuvent plus commander en ligne dans votre boutique. Le client voit un message neutre l'invitant à vous contacter.")}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8 }}>
              <input className="axd-input" type="tel" inputMode="tel" placeholder={t("Numéro à bloquer")} value={tel} onChange={(e) => setTel(e.target.value)} />
              <input className="axd-input" placeholder={t("Motif (facultatif)")} value={motif} maxLength={200} onChange={(e) => setMotif(e.target.value)} />
              <Button disabled={envoi || tel.replace(/\D/g, "").length < 6} onClick={async () => { if (await appel("/api/commande-express/anti-fraude", { method: "POST", body: JSON.stringify({ action: "bloquer_numero", telephone: tel, motif: motif || undefined }) }, "Numéro bloqué")) { setTel(""); setMotif(""); } }}>{t("Bloquer")}</Button>
            </div>
            {!d.listeNoire.length ? <p className="axd-muted" style={{ margin: 0 }}>{t("Aucun numéro ni connexion bloqué.")}</p> : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {d.listeNoire.map((l) => (
                  <li key={l.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--color-border-secondary)" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{l.type === "telephone" ? l.valeur : t("Connexion bloquée")}</div>
                      <div className="axd-muted" style={{ fontSize: 13 }}>{[l.motif, new Date(l.createdAt).toLocaleDateString(t.loc)].filter(Boolean).join(" · ")}</div>
                    </div>
                    <Button size="sm" variant="plain" disabled={envoi} onClick={() => appel(`/api/commande-express/anti-fraude?id=${l.id}`, { method: "DELETE" }, "Débloqué")}>{t("Débloquer")}</Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card title={t("Commandes à risque (30 jours)")} padding="none">
          {!d.risquees.length ? <div style={{ padding: 16 }}><p className="axd-muted" style={{ margin: 0 }}>{t("Aucune commande à risque moyen ou élevé.")}</p></div> : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {d.risquees.map((r) => (
                <li key={r.id} style={{ borderTop: "1px solid var(--color-border-secondary)", padding: "12px 16px", display: "grid", gap: 6 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <Link href={`/dashboard/commandes/${r.commande.id}`} style={{ flex: 1, minWidth: 0, fontWeight: 600, color: "inherit" }}>#{r.commande.numero} · {r.commande.clientNom}</Link>
                    <span style={{ whiteSpace: "nowrap", fontWeight: 600 }}>{formatMontant(r.commande.montantTotal, r.commande.devise)}</span>
                  </div>
                  <div><BadgeRisque score={r.scoreRisque} /></div>
                  {r.facteursRisque?.length ? <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }} className="axd-muted">{r.facteursRisque.filter((f) => f.points > 0).map((f) => <li key={f.code}>{t(f.libelle)}</li>)}</ul> : null}
                  <div><Button size="sm" disabled={envoi} onClick={() => { if (confirm(t("Bloquer le numéro et la connexion de cette commande ?"))) appel("/api/commande-express/anti-fraude", { method: "POST", body: JSON.stringify({ action: "bloquer_commande", ficheId: r.id }) }, "Numéro et connexion bloqués"); }}>{t("Bloquer ce client")}</Button></div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </Page>
  );
}
