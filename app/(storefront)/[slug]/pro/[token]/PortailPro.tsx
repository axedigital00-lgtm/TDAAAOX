"use client";
// Grille de commande rapide : une quantité par ligne, total en direct, validation par le marchand.
import { useMemo, useState } from "react";
import { useT } from "@/components/I18nProvider";
import { formatMontant } from "@/lib/utils";

type Article = { produitId: string; nom: string; variante: string | null; sku: string | null; imageUrl: string | null; disponible: boolean; prix: number; paliers: { min: number; prix: number }[]; min: number; max: number | null; multiple: number };
const cle = (a: Pick<Article, "produitId" | "variante">) => `${a.produitId}|${a.variante ?? ""}`;
const prixPour = (a: Article, q: number) => [...a.paliers].sort((x, y) => y.min - x.min).find((p) => q >= p.min)?.prix ?? a.prix;
const refus = (a: Article, q: number) => (q < a.min ? `min. ${a.min}` : a.max && q > a.max ? `max. ${a.max}` : a.multiple > 1 && q % a.multiple ? `× ${a.multiple}` : null);
const champ: React.CSSProperties = { height: 44, borderRadius: 10, border: "1px solid #d4d4d4", padding: "0 12px", fontSize: 16, background: "#fff", color: "#111", width: "100%" };

export function PortailPro({ token, boutique, entreprise, devise, conditions, articles }: { token: string; boutique: string; entreprise: string; devise: string; conditions: string; articles: Article[] }) {
  const t = useT();
  const [q, setQ] = useState<Record<string, number>>({});
  const [recherche, setRecherche] = useState("");
  const [bon, setBon] = useState("");
  const [note, setNote] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [fait, setFait] = useState<string | null>(null);

  const visibles = useMemo(() => {
    const m = recherche.trim().toLowerCase();
    return m ? articles.filter((a) => `${a.nom} ${a.variante ?? ""} ${a.sku ?? ""}`.toLowerCase().includes(m)) : articles;
  }, [articles, recherche]);
  const choisis = articles.filter((a) => (q[cle(a)] ?? 0) > 0);
  const total = choisis.reduce((s, a) => s + prixPour(a, q[cle(a)]) * q[cle(a)], 0);
  const bloque = choisis.some((a) => refus(a, q[cle(a)]));

  async function envoyer() {
    setEnvoi(true); setErreur("");
    const r = await fetch(`/api/pro/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bonCommande: bon || null, note: note || null, lignes: choisis.map((a) => ({ produitId: a.produitId, variante: a.variante, quantite: q[cle(a)] })) }) });
    const d = await r.json().catch(() => ({}));
    setEnvoi(false);
    if (!r.ok) return setErreur(t(d.error ?? "Envoi impossible"));
    setFait(d.numero); setQ({}); setBon(""); setNote("");
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f6f6f7", color: "#111", padding: "28px 16px 120px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <p style={{ margin: 0, fontWeight: 700 }}>{boutique}</p>
        <h1 style={{ margin: "6px 0 2px", fontSize: 26 }}>{t("Commande professionnelle")}</h1>
        <p style={{ margin: 0, color: "#666" }}>{entreprise} · {t("Paiement")} : {t(conditions)}</p>
        {fait && <p role="status" style={{ marginTop: 14, padding: 12, borderRadius: 10, background: "#ecfdf3" }}>{t("Demande {0} envoyée. La boutique la valide et vous recontacte.").replace("{0}", fait)}</p>}
        <input aria-label={t("Rechercher un produit")} placeholder={t("Rechercher un produit ou une référence…")} style={{ ...champ, marginTop: 16 }} value={recherche} onChange={(e) => setRecherche(e.target.value)} />
        <div style={{ marginTop: 12, background: "#fff", border: "1px solid #e5e5e5", borderRadius: 14, overflow: "hidden" }}>
          {visibles.length === 0 && <p style={{ padding: 16, margin: 0, color: "#666" }}>{t("Aucun produit trouvé.")}</p>}
          {visibles.map((a) => {
            const v = q[cle(a)] ?? 0, err = v > 0 ? refus(a, v) : null;
            return (
              <div key={cle(a)} style={{ display: "grid", gridTemplateColumns: "44px minmax(0, 1fr) 92px", gap: 12, alignItems: "center", padding: "10px 12px", borderBottom: "1px solid #eee", opacity: a.disponible ? 1 : 0.5 }}>
                {a.imageUrl ? <img src={a.imageUrl} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover" }} /> : <span style={{ width: 44, height: 44, borderRadius: 8, background: "#eee" }} />}
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 600, overflowWrap: "anywhere" }}>{a.nom}{a.variante ? <span style={{ fontWeight: 400, color: "#666" }}> — {a.variante}</span> : null}</p>
                  <p style={{ margin: 0, fontSize: 14, color: "#666" }}>{formatMontant(v ? prixPour(a, v) : a.prix, devise)}{a.paliers.length > 0 && ` · ${t("dès {0} :").replace("{0}", String(a.paliers[0].min))} ${formatMontant(a.paliers[0].prix, devise)}`}{!a.disponible && ` · ${t("rupture")}`}</p>
                  {err && <p role="alert" style={{ margin: 0, fontSize: 13, color: "#b42318" }}>{t("Quantité")} : {err}</p>}
                </div>
                <input aria-label={`${t("Quantité")} ${a.nom}`} type="number" min={0} step={a.multiple} disabled={!a.disponible} style={champ} value={v || ""} placeholder="0"
                  onChange={(e) => setQ((x) => ({ ...x, [cle(a)]: Math.max(Math.floor(Number(e.target.value)) || 0, 0) }))} />
              </div>
            );
          })}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 12 }}>
          <input aria-label={t("N° de bon de commande")} placeholder={t("N° de bon de commande (facultatif)")} maxLength={60} style={champ} value={bon} onChange={(e) => setBon(e.target.value)} />
          <input aria-label={t("Note")} placeholder={t("Note pour la boutique (facultatif)")} maxLength={2000} style={champ} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>
      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: "#fff", borderTop: "1px solid #e5e5e5", padding: "12px 16px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div><span style={{ color: "#666", fontSize: 14 }}>{choisis.length} {t("article(s)")}</span><br /><strong style={{ fontSize: 18 }}>{formatMontant(total, devise)}</strong>{erreur && <span role="alert" style={{ color: "#b42318", fontSize: 13, marginLeft: 8 }}>{erreur}</span>}</div>
          <button type="button" onClick={envoyer} disabled={envoi || !choisis.length || bloque} style={{ height: 48, padding: "0 22px", borderRadius: 12, border: 0, background: "#111", color: "#fff", fontWeight: 600, fontSize: 16, cursor: "pointer", opacity: envoi || !choisis.length || bloque ? 0.5 : 1 }}>{envoi ? t("Envoi…") : t("Envoyer la commande")}</button>
        </div>
      </div>
    </main>
  );
}
