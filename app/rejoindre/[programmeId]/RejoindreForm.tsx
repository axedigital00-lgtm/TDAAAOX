"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Loader2, Percent } from "lucide-react";
import { useT } from "@/components/I18nProvider";

interface Props {
  programmeId: string; ouvert: boolean; connecte: boolean;
  tenantId: string; boutique: string; logoUrl: string | null; taux: number;
}

export function RejoindreForm(p: Props) {
  const t = useT();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const retour = `/rejoindre/${p.programmeId}`;

  async function rejoindre() {
    setLoading(true);
    try {
      const res = await fetch("/api/affilie/lien", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: p.tenantId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Impossible de rejoindre cette boutique");
      toast.success(data.statut === "en_attente" ? t("Demande envoyée : la boutique va valider votre partenariat.") : t("Vous êtes maintenant affilié de cette boutique. Votre lien vous attend dans « Mes liens »."));
      router.push("/affilie/liens");
    } catch (e: any) {
      toast.error(t(e.message));
      setLoading(false);
    }
  }

  const bouton: React.CSSProperties = { width: "100%", padding: 13, borderRadius: 14, background: "#F5A623", color: "#111", border: "none", minHeight: 48, fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", textDecoration: "none" };

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAFA", fontFamily: "'Poppins',system-ui,sans-serif" }}>
      <div style={{ background: "linear-gradient(135deg,#111111,#1a1a1a)", padding: "40px 20px 80px", color: "white", textAlign: "center" }}>
        <a href="/" aria-label="Axso"><img src="/logo-dark.png" alt="Axso" style={{ height: 30, width: "auto", margin: "0 auto 24px" }} /></a>
        {p.logoUrl && <img src={p.logoUrl} alt="" style={{ height: 48, margin: "0 auto 16px", borderRadius: 10 }} />}
        <p style={{ fontSize: 12, fontWeight: 600, opacity: 0.7, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
          {t("Programme d'affiliation")}
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>{p.ouvert ? p.boutique : t("Invitation indisponible")}</h1>
      </div>

      <div style={{ maxWidth: 460, margin: "-48px auto 0", padding: "0 16px 60px" }}>
        <div style={{ background: "white", borderRadius: 20, padding: 22, boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }}>
          {!p.ouvert ? (
            <>
              <p style={{ fontSize: 13, color: "#666", textAlign: "center", marginBottom: 16 }}>
                {t("Cette boutique n'accepte pas d'affiliés pour le moment, ou ce lien n'existe plus.")}
              </p>
              <a href="/affiliation" style={bouton}>{t("Découvrir les autres boutiques à recommander")} <ArrowRight size={15} /></a>
            </>
          ) : (
            <>
              <div style={{ textAlign: "center", marginBottom: 18 }}>
                <Percent size={20} color="#F5A623" style={{ margin: "0 auto 6px" }} />
                <p style={{ fontSize: 22, fontWeight: 800, color: "#111" }}>{p.taux} %</p>
                <p style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                  {t("de commission sur chaque vente payée en ligne grâce à votre lien (taux par défaut, certains produits rapportent plus). C'est Axso qui vous verse vos gains.")}
                </p>
              </div>
              {p.connecte ? (
                <button onClick={rejoindre} disabled={loading} aria-busy={loading} style={{ ...bouton, opacity: loading ? 0.7 : 1 }}>
                  {loading ? <><Loader2 size={16} className="animate-spin" />{t("Envoi en cours…")}</> : <>{t("Rejoindre cette boutique")} <ArrowRight size={15} /></>}
                </button>
              ) : (
                <>
                  <a href={`/inscription/affilie?suite=${encodeURIComponent(retour)}`} style={bouton}>
                    {t("Créer mon compte affilié")} <ArrowRight size={15} />
                  </a>
                  <p style={{ textAlign: "center", marginTop: 12 }}>
                    <a href={`/connexion?callbackUrl=${encodeURIComponent(retour)}`} style={{ fontSize: 13, color: "#B7791F", fontWeight: 600, display: "inline-block", padding: "10px 8px" }}>
                      {t("J'ai déjà un compte")}
                    </a>
                  </p>
                </>
              )}
            </>
          )}
        </div>
        <p style={{ textAlign: "center", fontSize: 11, color: "#BBB", marginTop: 24, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          {t("Propulsé par")} <img src="/logo.png" alt="Axso" style={{ height: 18, width: "auto" }} />
        </p>
      </div>
    </div>
  );
}
