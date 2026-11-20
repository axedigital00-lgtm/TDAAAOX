"use client";
import { useEffect, useState } from "react";
import { use as usePromise } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { AuthCadre } from "@/components/auth/AuthCadre";
import { useT } from "@/components/I18nProvider";

const ROLE_LABELS: Record<string, string> = {
  gerant: "Gérant", caissier: "Caissier", comptable: "Comptable",
  lecture: "Lecture seule", personnalise: "Personnalisé",
};

export default function RejoindreEquipePage({ params }: { params: Promise<{ token: string }> }) {
  const t = useT();
  const { token } = usePromise(params);
  const router = useRouter();

  const [statut, setStatut] = useState<"chargement" | "valide" | "invalide">("chargement");
  const [erreur, setErreur] = useState("");
  const [invitation, setInvitation] = useState<{ nom: string; role: string; boutique: string } | null>(null);
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [termine, setTermine] = useState(false);

  useEffect(() => {
    fetch(`/api/equipe/accepter?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) { setErreur(d.error || "Invitation invalide"); setStatut("invalide"); return; }
        setInvitation(d);
        setStatut("valide");
      })
      .catch(() => { setErreur("Erreur de connexion"); setStatut("invalide"); });
  }, [token]);

  async function accepter(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { setErreur("Mot de passe : 6 caractères minimum"); return; }
    setEnvoi(true);
    setErreur("");
    try {
      const res = await fetch("/api/equipe/accepter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setTermine(true);
      setTimeout(() => router.push("/connexion"), 2000);
    } catch (err: any) {
      setErreur(err.message || "Erreur lors de la création du compte");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <AuthCadre>
      {statut === "chargement" && (
        <p className="axa-sous" style={{ display: "flex", alignItems: "center", gap: 10, margin: 0 }}>
          <Loader2 size={18} className="animate-spin" />{t("Vérification de l'invitation...")}
        </p>
      )}

      {statut === "invalide" && (
        <div role="alert">
          <h1 className="axa-titre">{t("Invitation invalide")}</h1>
          <p className="axa-sous">{t(erreur)}</p>
          <Link href="/connexion" className="axa-btn axa-btn--sec">{t("Aller à la connexion")}</Link>
        </div>
      )}

      {statut === "valide" && invitation && !termine && (
        <>
          <h1 className="axa-titre">{t("Rejoindre")}{" "}{t(invitation.boutique)}</h1>
          <p className="axa-sous">
            {t("Bonjour")}{" "}{t(invitation.nom)}{t(", tu es invité·e avec le rôle")}{" "}<strong style={{ color: "#0b0b0b" }}>{t(ROLE_LABELS[invitation.role]) ?? t(invitation.role)}</strong>{t(". Choisis un mot de passe pour créer ton compte.")}
          </p>
          {erreur && <div className="axa-alerte axa-alerte--err" role="alert">{t(erreur)}</div>}
          <form onSubmit={accepter}>
            <div className="axa-champ">
              <label htmlFor="equipe-mdp">{t("Mot de passe")}</label>
              <div className="axa-mdp">
                <input id="equipe-mdp" type={showPass ? "text" : "password"} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="axa-input" minLength={6} required />
                <button type="button" onClick={() => setShowPass(!showPass)} aria-label={showPass ? t("Masquer le mot de passe") : t("Afficher le mot de passe")}>
                  {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={envoi} className="axa-btn">
              {envoi ? <><Loader2 size={16} className="animate-spin" />{t("Création du compte...")}</> : t("Créer mon compte")}
            </button>
          </form>
        </>
      )}

      {termine && (
        <div role="status">
          <h1 className="axa-titre">{t("Compte créé !")}</h1>
          <p className="axa-sous">{t("Redirection vers la connexion...")}</p>
        </div>
      )}
    </AuthCadre>
  );
}
