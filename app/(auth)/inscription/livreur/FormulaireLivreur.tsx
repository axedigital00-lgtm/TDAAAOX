"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Bike, Building2, Car, Loader2, PersonStanding, ShieldCheck, type LucideIcon } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { AuthCadre } from "@/components/auth/AuthCadre";
import { demanderCodeConnexion } from "@/components/auth/BoutonRenvoyerCode";
import { EcranCode } from "@/components/auth/EcranCode";
import { exempleTelephone } from "@/lib/devise-convert";

const VEHICULES: { value: string; label: string; Icon: LucideIcon }[] = [
  { value: "moto", label: "Moto", Icon: Bike },
  { value: "voiture", label: "Voiture", Icon: Car },
  { value: "velo", label: "Vélo", Icon: Bike },
  { value: "a_pied", label: "À pied", Icon: PersonStanding },
];
const TYPES: { value: "livreur" | "societe"; label: string; desc: string; Icon: LucideIcon }[] = [
  { value: "livreur", label: "Livreur indépendant", desc: "Vous livrez vous-même", Icon: Bike },
  { value: "societe", label: "Société de livraison", desc: "Vous gérez une équipe", Icon: Building2 },
];
const choix = (actif: boolean): React.CSSProperties => ({ display: "flex", alignItems: "center", gap: 10, minHeight: 48, padding: "10px 12px", borderRadius: 12, border: `1px solid ${actif ? "#000" : "#e3e3e3"}`, boxShadow: actif ? "inset 0 0 0 1px #000" : "none", background: "#fff", color: "#0b0b0b", cursor: "pointer", textAlign: "left", font: "inherit", fontSize: 14, fontWeight: 550, minWidth: 0 });

export function FormulaireLivreur({ pays }: { pays: string | null }) {
  const t = useT();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  // Compte créé : on enchaîne sur le code de connexion (même flux que /connexion).
  const [cree, setCree] = useState<{ email: string; erreurEnvoi: string } | null>(null);
  const [erreur, setErreur] = useState("");
  const [form, setForm] = useState({ type: "livreur" as "livreur" | "societe", nom: "", email: "", telephone: "", password: "", vehicule: "moto", zone: "" });
  const societe = form.type === "societe";

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErreur("");
    try {
      const res = await fetch("/api/livreurs/inscription", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la création");
      const email = form.email.trim().toLowerCase(); // tel qu'enregistré par l'API
      let skip2fa = false, erreurEnvoi = "";
      try { skip2fa = await demanderCodeConnexion(email, form.password); }
      catch (e: any) { erreurEnvoi = e.message; } // affiché sur l'écran du code, « Renvoyer » reste possible
      if (skip2fa) {
        const err = await connecter(email);
        if (err) throw new Error(err);
        return;
      }
      setCree({ email, erreurEnvoi });
    } catch (err: any) {
      setErreur(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Renvoie un message d'erreur, ou null une fois connecté (direction le portail transporteur).
  async function connecter(email: string, code?: string): Promise<string | null> {
    const result = await signIn("credentials", { email, password: form.password, code, redirect: false });
    if (result?.error) return code ? "Code invalide ou expiré" : "Email ou mot de passe incorrect";
    router.push("/transporteur");
    router.refresh();
    return null;
  }

  if (cree) {
    return (
      <AuthCadre>
        <div className="axa-alerte axa-alerte--ok" role="status" style={{ display: "flex", gap: 8 }}>
          <ShieldCheck size={16} style={{ flex: "none", marginTop: 2 }} />
          <span>{t("Compte créé. Saisissez le code reçu par e-mail pour compléter votre profil.")}</span>
        </div>
        <EcranCode email={cree.email} erreurInitiale={cree.erreurEnvoi} onValider={(code) => connecter(cree.email, code)} onRenvoyer={async () => { await demanderCodeConnexion(cree.email, form.password); }} />
      </AuthCadre>
    );
  }

  return (
    <AuthCadre large>
      <h1 className="axa-titre">{t("Devenir transporteur AXSO")}</h1>
      <p className="axa-sous">{t("Créez votre compte, envoyez vos documents et recevez des courses dans vos zones.")}</p>
      {erreur && <div className="axa-alerte axa-alerte--err" role="alert">{t(erreur)}</div>}

      <form onSubmit={soumettre}>
        <div role="radiogroup" aria-label={t("Type de compte")} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))", gap: 8, marginBottom: 18 }}>
          {TYPES.map((x) => (
            <button key={x.value} type="button" role="radio" aria-checked={form.type === x.value} onClick={() => setForm({ ...form, type: x.value })} style={choix(form.type === x.value)}>
              <x.Icon size={18} style={{ flex: "none" }} />
              <span style={{ minWidth: 0 }}>{t(x.label)}<small style={{ display: "block", fontWeight: 400, color: "#5c5c5c", fontSize: 12.5 }}>{t(x.desc)}</small></span>
            </button>
          ))}
        </div>

        <div className="axa-champ">
          <label htmlFor="tr-nom">{t(societe ? "Nom de la société" : "Nom complet")}</label>
          <input id="tr-nom" required minLength={2} autoComplete={societe ? "organization" : "name"} value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="axa-input" />
        </div>
        <div className="axa-champ">
          <label htmlFor="tr-email">{t("Adresse e-mail")}</label>
          <input id="tr-email" required type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="axa-input" />
        </div>
        {!societe && <div className="axa-champ">
          <label htmlFor="tr-tel">{t("Téléphone")}</label>
          <input id="tr-tel" required minLength={8} type="tel" autoComplete="tel" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} placeholder={exempleTelephone(pays)} className="axa-input" />
        </div>}
        <div className="axa-champ">
          <label htmlFor="tr-mdp">{t("Mot de passe")}</label>
          <input id="tr-mdp" required minLength={6} type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={t("6 caractères minimum")} className="axa-input" />
        </div>

        {!societe && <>
          <div className="axa-champ">
            <span id="tr-vehicule" style={{ fontSize: 14, fontWeight: 550 }}>{t("Votre véhicule")}</span>
            <div role="radiogroup" aria-labelledby="tr-vehicule" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
              {VEHICULES.map((v) => (
                <button key={v.value} type="button" role="radio" aria-checked={form.vehicule === v.value} onClick={() => setForm({ ...form, vehicule: v.value })} style={choix(form.vehicule === v.value)}>
                  <v.Icon size={16} style={{ flex: "none" }} /><span>{t(v.label)}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="axa-champ">
            <label htmlFor="tr-zone">{t("Ville ou zone de livraison")}</label>
            <input id="tr-zone" value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} placeholder={t("Ex : Douala, Abidjan Plateau")} className="axa-input" />
          </div>
        </>}

        <button type="submit" disabled={loading} className="axa-btn">
          {loading ? <><Loader2 size={16} className="animate-spin" />{t("Création du compte...")}</> : t("Créer mon compte")}
        </button>
      </form>

      <p className="axa-bas">{t("Déjà inscrit ?")}{" "}<Link href="/connexion?callbackUrl=/transporteur" className="axa-lien">{t("Se connecter")}</Link></p>
      <p className="axa-bas" style={{ marginTop: 8 }}>{t("Vous voulez vendre ?")}{" "}<Link href="/inscription" className="axa-lien">{t("Créer une boutique")}</Link></p>
    </AuthCadre>
  );
}
