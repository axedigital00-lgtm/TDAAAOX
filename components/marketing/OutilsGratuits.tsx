"use client";
// Outils gratuits du site public : tout est calculé dans le navigateur, rien n'est envoyé.
import { useMemo, useState } from "react";
import { useT } from "@/components/I18nProvider";

const champ: React.CSSProperties = { width: "100%", height: 48, borderRadius: 12, border: "1px solid #d4d4d4", padding: "0 14px", fontSize: 16, background: "#fff", color: "#000" };
const carte: React.CSSProperties = { background: "#fff", borderRadius: 20, padding: "28px 24px", border: "1px solid #e5e5e5", display: "grid", gap: 16, alignContent: "start" };
const fcfa = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} FCFA`;

function Nombre({ label, valeur, onChange, suffixe }: { label: string; valeur: number; onChange: (v: number) => void; suffixe?: string }) {
  return (
    <label style={{ display: "grid", gap: 6, fontSize: 14, fontWeight: 600 }}>
      <span>{label}{suffixe ? <span style={{ fontWeight: 400, color: "#737373" }}> ({suffixe})</span> : null}</span>
      <input type="number" min={0} style={champ} value={Number.isFinite(valeur) ? valeur : 0} onChange={(e) => onChange(Math.max(Number(e.target.value) || 0, 0))} />
    </label>
  );
}

function Resultat({ label, valeur, fort }: { label: string; valeur: string; fort?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: fort ? 20 : 15, fontWeight: fort ? 700 : 400, borderTop: fort ? "1px solid #e5e5e5" : undefined, paddingTop: fort ? 12 : 0 }}>
      <span>{label}</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{valeur}</span>
    </div>
  );
}

function PrixDeVente() {
  const t = useT();
  const [cout, setCout] = useState(5000), [livraison, setLivraison] = useState(1000), [pub, setPub] = useState(500), [marge, setMarge] = useState(40), [frais, setFrais] = useState(2);
  const r = useMemo(() => {
    const revient = cout + livraison + pub;
    // Prix tel que (prix − frais de paiement − coût de revient) = marge × prix.
    const diviseur = 1 - marge / 100 - frais / 100;
    const prix = diviseur > 0 ? revient / diviseur : 0;
    return { revient, prix, benefice: prix - revient - (prix * frais) / 100 };
  }, [cout, livraison, pub, marge, frais]);
  return (
    <div style={carte}>
      <h3 style={{ margin: 0, fontSize: 22 }}>{t("Calculateur de prix de vente")}</h3>
      <p style={{ margin: 0, color: "#525252" }}>{t("Fixez un prix qui couvre vos coûts et garde la marge voulue.")}</p>
      <Nombre label={t("Coût d'achat ou de fabrication")} suffixe="FCFA" valeur={cout} onChange={setCout} />
      <Nombre label={t("Livraison par commande")} suffixe="FCFA" valeur={livraison} onChange={setLivraison} />
      <Nombre label={t("Publicité par vente")} suffixe="FCFA" valeur={pub} onChange={setPub} />
      <Nombre label={t("Marge souhaitée")} suffixe="%" valeur={marge} onChange={setMarge} />
      <Nombre label={t("Frais de paiement")} suffixe="%" valeur={frais} onChange={setFrais} />
      <Resultat label={t("Coût de revient")} valeur={fcfa(r.revient)} />
      <Resultat label={t("Bénéfice par vente")} valeur={r.prix ? fcfa(r.benefice) : "—"} />
      <Resultat fort label={t("Prix de vente conseillé")} valeur={r.prix ? fcfa(r.prix) : t("Marge trop élevée")} />
    </div>
  );
}

function SeuilRentabilite() {
  const t = useT();
  const [fixes, setFixes] = useState(150000), [prix, setPrix] = useState(12000), [variable, setVariable] = useState(7000);
  const marge = prix - variable;
  const unites = marge > 0 ? Math.ceil(fixes / marge) : 0;
  return (
    <div style={carte}>
      <h3 style={{ margin: 0, fontSize: 22 }}>{t("Seuil de rentabilité")}</h3>
      <p style={{ margin: 0, color: "#525252" }}>{t("Combien de ventes par mois pour couvrir vos charges fixes ?")}</p>
      <Nombre label={t("Charges fixes mensuelles")} suffixe="FCFA" valeur={fixes} onChange={setFixes} />
      <Nombre label={t("Prix de vente unitaire")} suffixe="FCFA" valeur={prix} onChange={setPrix} />
      <Nombre label={t("Coût variable unitaire")} suffixe="FCFA" valeur={variable} onChange={setVariable} />
      <Resultat label={t("Marge par vente")} valeur={fcfa(marge)} />
      <Resultat label={t("Chiffre d'affaires nécessaire")} valeur={marge > 0 ? fcfa(unites * prix) : "—"} />
      <Resultat fort label={t("Ventes par mois")} valeur={marge > 0 ? String(unites) : t("Prix inférieur au coût")} />
    </div>
  );
}

const DEBUTS = ["Maison", "Atelier", "Comptoir", "Galerie", "Studio", "Marché", "Boutique"];
const FINS = ["Éclat", "Savane", "Baobab", "Indigo", "Kora", "Sahel", "Lumière", "Wax", "Ébène", "Karité", "Soleil", "Dune"];

function GenerateurNoms() {
  const t = useT();
  const [mot, setMot] = useState("");
  const [graine, setGraine] = useState(1);
  const noms = useMemo(() => {
    const m = mot.trim().replace(/\s+/g, " ");
    const cap = m ? m[0].toUpperCase() + m.slice(1).toLowerCase() : "";
    const sorties = new Set<string>();
    for (let i = 0; sorties.size < 8 && i < 60; i++) {
      const a = DEBUTS[(i * 3 + graine) % DEBUTS.length], b = FINS[(i * 7 + graine * 5) % FINS.length];
      const formes = cap ? [`${a} ${cap}`, `${cap} ${b}`, `${cap} & ${b}`, `${cap}${b.toLowerCase().slice(0, 3)}`] : [`${a} ${b}`];
      sorties.add(formes[(i + graine) % formes.length]);
    }
    return [...sorties];
  }, [mot, graine]);
  return (
    <div style={carte}>
      <h3 style={{ margin: 0, fontSize: 22 }}>{t("Générateur de noms de boutique")}</h3>
      <p style={{ margin: 0, color: "#525252" }}>{t("Entrez un mot qui décrit votre activité, puis vérifiez la disponibilité en créant votre boutique.")}</p>
      <label style={{ display: "grid", gap: 6, fontSize: 14, fontWeight: 600 }}>
        <span>{t("Mot-clé")}</span>
        <input style={champ} value={mot} maxLength={30} placeholder={t("ex. beauté, pagne, café")} onChange={(e) => setMot(e.target.value)} />
      </label>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
        {noms.map((n) => <li key={n} style={{ padding: "10px 14px", borderRadius: 12, background: "#f5f5f5", fontWeight: 600 }}>{n}</li>)}
      </ul>
      <button type="button" className="axm-btn axm-btn--secondary" style={{ color: "#000", boxShadow: "inset 0 0 0 1px #d4d4d4" }} onClick={() => setGraine((g) => g + 1)}>{t("Autres idées")}</button>
    </div>
  );
}

export function OutilsGratuits() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 20, color: "#000" }}>
      <PrixDeVente />
      <SeuilRentabilite />
      <GenerateurNoms />
    </div>
  );
}
