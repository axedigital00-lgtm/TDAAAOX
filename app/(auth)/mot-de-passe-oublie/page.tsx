"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { AuthCadre } from "@/components/auth/AuthCadre";
import { useT } from "@/components/I18nProvider";
import { BoutonRenvoyerCode } from "@/components/auth/BoutonRenvoyerCode";


export default function MotDePasseOubliePage() {
  const t = useT();
  const router = useRouter();
  const [etape, setEtape] = useState<"email" | "code" | "succes">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState("");


  async function envoyerCode() {
    const res = await fetch("/api/auth/mot-de-passe-oublie/demander", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Erreur");
  }

  async function demanderCode(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");
    setLoading(true);
    try {
      await envoyerCode();
      setEtape("code");
    } catch (e: any) {
      setErreur(e.message ?? "Erreur, réessaie");
    } finally {
      setLoading(false);
    }
  }

  async function reinitialiser(e: React.FormEvent) {
    e.preventDefault();
    if (code.length < 6 || nouveauMotDePasse.length < 6) return;
    setErreur("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/mot-de-passe-oublie/reinitialiser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, nouveauMotDePasse }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setEtape("succes");
      setTimeout(() => router.push("/connexion"), 2500);
    } catch (e: any) {
      setErreur(e.message ?? "Erreur, réessaie");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCadre>
      <Link href="/connexion" className="axa-retour"><ArrowLeft size={14} />{t("Retour à la connexion")}</Link>

      {erreur && <div className="axa-alerte axa-alerte--err" role="alert">{t(erreur)}</div>}

      {etape === "email" && (
        <>
          <h1 className="axa-titre">{t("Mot de passe oublié")}</h1>
          <p className="axa-sous">{t("On t'envoie un code de vérification par email.")}</p>
          <form onSubmit={demanderCode}>
            <div className="axa-champ">
              <label htmlFor="mdp-email">{t("Adresse e-mail")}</label>
              <input id="mdp-email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="axa-input" />
            </div>
            <button type="submit" disabled={loading} className="axa-btn">
              {loading ? <><Loader2 size={16} className="animate-spin" />{t("Envoi...")}</> : t("Envoyer le code")}
            </button>
          </form>
        </>
      )}

      {etape === "code" && (
        <>
          <h1 className="axa-titre">{t("Nouveau mot de passe")}</h1>
          <p className="axa-sous" style={{ overflowWrap: "anywhere" }}>{t("Code envoyé à")}{" "}<strong style={{ color: "#0b0b0b" }}>{email}</strong>{" "}{t("— valable 10 minutes.")}</p>
          <form onSubmit={reinitialiser} style={{ display: "grid", gap: 16 }}>
            <input
              type="text" inputMode="numeric" maxLength={6} autoFocus aria-label={t("Code de vérification à 6 chiffres")}
              value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000" className="axa-input axa-input--code"
            />
            <div className="axa-champ" style={{ margin: 0 }}>
              <label htmlFor="mdp-nouveau">{t("Nouveau mot de passe")}</label>
              <div className="axa-mdp">
                <input id="mdp-nouveau" type={showPass ? "text" : "password"} required autoComplete="new-password" value={nouveauMotDePasse}
                  onChange={e => setNouveauMotDePasse(e.target.value)} className="axa-input" />
                <button type="button" onClick={() => setShowPass(!showPass)} aria-label={showPass ? t("Masquer le mot de passe") : t("Afficher le mot de passe")}>
                  {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading || code.length < 6 || nouveauMotDePasse.length < 6} className="axa-btn">
              {loading ? <><Loader2 size={16} className="animate-spin" />{t("Réinitialisation...")}</> : t("Réinitialiser")}
            </button>
            <BoutonRenvoyerCode onRenvoyer={async () => { await envoyerCode(); setCode(""); }} />
          </form>
        </>
      )}

      {etape === "succes" && (
        <div role="status">
          <h1 className="axa-titre">{t("Mot de passe mis à jour")}</h1>
          <p className="axa-sous">{t("Redirection vers la connexion...")}</p>
        </div>
      )}
    </AuthCadre>
  );
}
