"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/components/I18nProvider";

const bouton: React.CSSProperties = { height: 48, padding: "0 22px", borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: "pointer" };

export function ReponseDevis({ token, slug }: { token: string; slug: string }) {
  const t = useT();
  const router = useRouter();
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [suivi, setSuivi] = useState<{ numero: string; trackingToken: string } | null>(null);

  async function repondre(action: "accepter" | "refuser") {
    if (action === "refuser" && !window.confirm(t("Refuser ce devis ?"))) return;
    setEnvoi(true); setErreur("");
    const r = await fetch(`/api/devis/public/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    const d = await r.json().catch(() => ({}));
    setEnvoi(false);
    if (!r.ok) return setErreur(t(d.error ?? "Action impossible"));
    if (action === "accepter") setSuivi({ numero: d.numero, trackingToken: d.trackingToken });
    else router.refresh();
  }

  if (suivi) return (
    <div style={{ marginTop: 22, padding: 14, borderRadius: 12, background: "#ecfdf3" }}>
      <strong>{t("Merci ! Votre commande #{0} est enregistrée.").replace("{0}", suivi.numero)}</strong>
      <div style={{ marginTop: 8 }}><Link href={`/${slug}/tracking/${suivi.trackingToken}`} style={{ textDecoration: "underline" }}>{t("Suivre ma commande")}</Link></div>
    </div>
  );
  return (
    <div style={{ marginTop: 22 }}>
      {erreur && <p role="alert" style={{ color: "#b42318", margin: "0 0 10px" }}>{erreur}</p>}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
        <button type="button" disabled={envoi} onClick={() => repondre("refuser")} style={{ ...bouton, background: "#fff", color: "#111", border: "1px solid #d4d4d4" }}>{t("Refuser")}</button>
        <button type="button" disabled={envoi} onClick={() => repondre("accepter")} style={{ ...bouton, background: "#111", color: "#fff", border: 0 }}>{envoi ? t("Envoi…") : t("Accepter le devis")}</button>
      </div>
    </div>
  );
}
