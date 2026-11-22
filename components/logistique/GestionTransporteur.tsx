"use client";
// Portail transporteur : contrat de versement, flotte, équipe, zones et tarif.
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FileSignature, MapPinned, Truck, Users } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { VEHICULES } from "@/lib/logistique/libelles";

const api = async (u: string, m = "GET", b?: unknown) => {
  const r = await fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error ?? "Action impossible");
  return d;
};

function Contrat({ f }: { f: any }) {
  const t = useT();
  const [c, setC] = useState<any>(null);
  const [nom, setNom] = useState(""); const [accepte, setAccepte] = useState(false); const [auto, setAuto] = useState(true); const [envoi, setEnvoi] = useState(false);
  const lire = useCallback(() => api(`/api/logistique/fournisseurs/${f.id}/contrat`).then(setC).catch(() => {}), [f.id]);
  useEffect(() => { lire(); }, [lire]);
  if (!c) return null;
  const signer = async () => { setEnvoi(true); try { await api(`/api/logistique/fournisseurs/${f.id}/contrat`, "POST", { nom, accepte: true, autoVersement: auto }); toast.success(t("Contrat signé")); await lire(); } catch (e: any) { toast.error(t(e.message)); } finally { setEnvoi(false); } };
  const basculer = async () => { try { await api(`/api/logistique/fournisseurs/${f.id}/contrat`, "PATCH", { autoVersement: !c.signe.autoVersement }); await lire(); } catch (e: any) { toast.error(t(e.message)); } };
  return <section className="axl-carte">
    <h2><FileSignature size={18} /> {t("Contrat de versement")} <span className="axl-etat" data-tone={c.aJour ? "success" : "warning"}>{t(c.aJour ? "Signé" : "À signer")}</span></h2>
    {!c.pret && !c.signe ? <p className="axl-doux">{t("Le contrat sera disponible dès que les informations légales d'AXSO seront finalisées.")}</p> : <>
      {c.texte && <details><summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 14 }}>{t("Lire le contrat")}</summary><pre style={{ whiteSpace: "pre-wrap", font: "inherit", fontSize: 13, lineHeight: 1.5, maxHeight: 340, overflow: "auto", marginTop: 10 }}>{c.texte}</pre></details>}
      {c.aJour ? <>
        <p className="axl-doux">{t("Signé par")} {c.signe.signataireNom} {t("le")} {new Date(c.signe.signeLe).toLocaleDateString(t.loc)}</p>
        <label className="axl-coche"><input type="checkbox" checked={c.signe.autoVersement} onChange={basculer} />{t("Recevoir mes versements automatiquement")}</label>
        {c.signe.autoVersement && !c.versementsActifs && <p className="axl-alerte">{t("Les versements automatiques ne sont pas encore ouverts : vos lots restent réglés par AXSO.")}</p>}
      </> : c.pret && <>
        <label><span>{t("Votre nom complet")}</span><input value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="name" /></label>
        <label className="axl-coche"><input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />{t("Recevoir mes versements automatiquement")}</label>
        <label className="axl-coche"><input type="checkbox" checked={accepte} onChange={(e) => setAccepte(e.target.checked)} />{t("J'ai lu et j'accepte ce contrat")}</label>
        <div><button type="button" className="axl-btn axl-btn--fort" disabled={envoi || !accepte || nom.trim().length < 3} onClick={signer}>{t("Signer le contrat")}</button></div>
      </>}
      {!c.compteValide && <p className="axl-alerte">{t("Votre compte Mobile Money n'est pas reconnu. Indiquez l'opérateur et le numéro, par exemple : MTN 690000000.")}</p>}
    </>}
  </section>;
}

export function GestionTransporteur({ f }: { f: any }) {
  const t = useT();
  const [g, setG] = useState<any>(null);
  const [veh, setVeh] = useState({ type: "moto", immatriculation: "" }); const [email, setEmail] = useState(""); const [role, setRole] = useState("dispatch");
  const [villes, setVilles] = useState(""); const [capacite, setCapacite] = useState(""); const [tarif, setTarif] = useState({ base: "", parKm: "", enlevement: "", expressPct: "" });
  const u = `/api/logistique/fournisseurs/${f.id}/gestion`;
  const appliquer = useCallback((d: any) => { setG(d); setVilles(d.zones.map((z: any) => (z.quartier ? `${z.ville} / ${z.quartier}` : z.ville)).join(", ")); setCapacite(String(d.capaciteMax)); const r = d.tarif ?? {}; setTarif({ base: String(r.base ?? ""), parKm: String(r.parKm ?? ""), enlevement: String(r.enlevement ?? ""), expressPct: String(r.expressPct ?? "") }); }, []);
  useEffect(() => { api(u).then(appliquer).catch(() => {}); }, [u, appliquer]);
  const agir = async (b: object, ok = "Enregistré") => { try { appliquer(await api(u, "POST", b)); toast.success(t(ok)); return true; } catch (e: any) { toast.error(t(e.message)); return false; } };
  const publier = async () => { try { await api(`/api/logistique/fournisseurs/${f.id}`, "PATCH", { tarif: { ...(g.tarif ?? { modele: "hybride" }), base: Number(tarif.base) || 0, parKm: Number(tarif.parKm) || 0, enlevement: Number(tarif.enlevement) || 0, expressPct: Number(tarif.expressPct) || 0 } }); toast.success(t("Nouveau tarif publié")); appliquer(await api(u)); } catch (e: any) { toast.error(t(e.message)); } };
  if (!g) return <Contrat f={f} />;
  const zones = villes.split(",").map((x) => x.trim()).filter(Boolean).map((x) => { const [ville, quartier] = x.split("/").map((y) => y.trim()); return { ville, quartier: quartier || null }; });
  return <>
    <Contrat f={f} />
    <section className="axl-carte">
      <h2><Truck size={18} /> {t("Flotte")}</h2>
      {g.vehicules.length === 0 ? <p className="axl-doux">{t("Ajoutez vos véhicules pour recevoir les courses adaptées.")}</p> : <ul className="axl-liste">{g.vehicules.map((v: any) => <li key={v.id}><span>{t(VEHICULES[v.type] ?? v.type)}{v.immatriculation ? ` · ${v.immatriculation}` : ""}</span><button type="button" className="axl-btn" onClick={() => agir({ action: "vehicule_etat", id: v.id, actif: !v.actif })}>{t(v.actif ? "Mettre hors service" : "Remettre en service")}</button></li>)}</ul>}
      <div className="axl-grille">
        <label><span>{t("Type")}</span><select value={veh.type} onChange={(e) => setVeh({ ...veh, type: e.target.value })}>{Object.entries(VEHICULES).map(([k, l]) => <option key={k} value={k}>{t(l)}</option>)}</select></label>
        <label><span>{t("Immatriculation")}</span><input value={veh.immatriculation} onChange={(e) => setVeh({ ...veh, immatriculation: e.target.value })} /></label>
        <button type="button" className="axl-btn" onClick={async () => { if (await agir({ action: "vehicule_ajout", type: veh.type, immatriculation: veh.immatriculation || null }, "Véhicule ajouté")) setVeh({ ...veh, immatriculation: "" }); }}>{t("Ajouter")}</button>
      </div>
    </section>
    {f.type === "societe" && <section className="axl-carte">
      <h2><Users size={18} /> {t("Équipe")}</h2>
      {g.membres.length === 0 ? <p className="axl-doux">{t("Invitez un collègue qui possède déjà un compte AXSO.")}</p> : <ul className="axl-liste">{g.membres.map((m: any) => <li key={m.id}><span>{m.nom ?? m.email} · {t(m.role === "admin" ? "Administrateur" : "Dispatch")}</span>{g.proprietaire && <button type="button" className="axl-btn" onClick={() => agir({ action: "membre_retrait", id: m.id }, "Membre retiré")}>{t("Retirer")}</button>}</li>)}</ul>}
      {g.proprietaire && <div className="axl-grille">
        <label><span>{t("E-mail du compte")}</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label><span>{t("Rôle")}</span><select value={role} onChange={(e) => setRole(e.target.value)}><option value="dispatch">{t("Dispatch")}</option><option value="admin">{t("Administrateur")}</option></select></label>
        <button type="button" className="axl-btn" disabled={!email.includes("@")} onClick={async () => { if (await agir({ action: "membre_ajout", email, role }, "Membre ajouté")) setEmail(""); }}>{t("Ajouter")}</button>
      </div>}
    </section>}
    <section className="axl-carte">
      <h2><MapPinned size={18} /> {t("Zones, capacité et tarif")}</h2>
      <label><span>{t("Villes desservies (Ville ou Ville / Quartier, séparées par des virgules)")}</span><input value={villes} onChange={(e) => setVilles(e.target.value)} /></label>
      <div className="axl-grille">
        <label><span>{t("Courses simultanées maximum")}</span><input type="number" min={1} value={capacite} onChange={(e) => setCapacite(e.target.value)} /></label>
        <button type="button" className="axl-btn" disabled={!zones.length} onClick={async () => { if (await agir({ action: "zones", zones })) await agir({ action: "capacite", capaciteMax: Number(capacite) || 1 }); }}>{t("Enregistrer les zones")}</button>
      </div>
      <div className="axl-grille">{([["base", "Prix de base (FCFA)"], ["parKm", "Prix par km (FCFA)"], ["enlevement", "Frais d'enlèvement (FCFA)"], ["expressPct", "Supplément express (%)"]] as const).map(([k, l]) => <label key={k}><span>{t(l)}</span><input type="number" min={0} value={tarif[k]} onChange={(e) => setTarif({ ...tarif, [k]: e.target.value })} /></label>)}</div>
      <div><button type="button" className="axl-btn axl-btn--fort" onClick={publier}>{t("Publier ce tarif")}</button></div>
    </section>
  </>;
}
