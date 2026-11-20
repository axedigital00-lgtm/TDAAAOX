"use client";
import "./auth.css";
import { useState } from "react";
import { Loader2, ArrowLeft } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { BoutonRenvoyerCode } from "@/components/auth/BoutonRenvoyerCode";


// Carte « Vérifie ton email » : saisie du code à 6 chiffres reçu par email.
// Utilisée après la connexion et après l'inscription. onValider renvoie un
// message d'erreur, ou null si le code est bon.
export function EcranCode({ email, titre, onValider, onRenvoyer, onRetour, erreurInitiale = "" }: {
  email: string;
  titre?: string;
  onValider: (code: string) => Promise<string | null>;
  onRenvoyer: () => Promise<void>;
  onRetour?: () => void;
  erreurInitiale?: string;
}) {
  const t = useT();
  const [code, setCode] = useState("");
  const [erreur, setErreur] = useState(erreurInitiale);
  const [verif, setVerif] = useState(false);

  async function valider(e: React.FormEvent) {
    e.preventDefault();
    if (code.length < 6) return;
    setErreur("");
    setVerif(true);
    try {
      const err = await onValider(code);
      if (err) setErreur(err);
    } finally {
      setVerif(false);
    }
  }

  return (
    <div>
      {onRetour && <button type="button" onClick={onRetour} className="axa-retour"><ArrowLeft size={14} />{t("Retour")}</button>}
      <h1 className="axa-titre">{t(titre || "Vérifie ton email")}</h1>
      <p className="axa-sous" style={{ overflowWrap: "anywhere" }}>{t("Code envoyé à")}{" "}<strong style={{ color: "#0b0b0b" }}>{email}</strong>{" "}{t("— valable 10 minutes.")}</p>
      {erreur && <div className="axa-alerte axa-alerte--err" role="alert">{t(erreur)}</div>}
      <form onSubmit={valider} style={{ display: "grid", gap: 16 }}>
        <input
          type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus
          aria-label={t("Code de vérification à 6 chiffres")}
          value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="000000" className="axa-input axa-input--code"
        />
        <button type="submit" disabled={verif || code.length < 6} className="axa-btn">
          {verif ? <><Loader2 size={16} className="animate-spin" />{t("Vérification...")}</> : t("Confirmer")}
        </button>
        <BoutonRenvoyerCode onRenvoyer={async () => { await onRenvoyer(); setCode(""); setErreur(""); }} />
      </form>
    </div>
  );
}
