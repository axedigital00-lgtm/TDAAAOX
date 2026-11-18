"use client";
import { Lock, Sparkles } from "lucide-react";
import { useAbonnementOverlay } from "@/components/dashboard/AbonnementOverlayProvider";
import { useT } from "@/components/I18nProvider";
import { Bouton } from "@/components/ui";

interface Props {
  titre: string;
  description: string;
  palierRequis?: "palier1" | "palier2";
  // Contenu flouté en arrière-plan pour donner envie d'upgrader (aperçu de ce
  // qui est débloqué), optionnel — sans lui, affiche juste la carte verrouillée.
  apercu?: React.ReactNode;
}

const LABEL_PALIER: Record<string, string> = { palier1: "Pro", palier2: "Illimité" };

export function UpgradeGate({ titre, description, palierRequis = "palier2", apercu }: Props) {
  const t = useT();
  const { openAbonnement } = useAbonnementOverlay();
  return (
    <div className="relative rounded-carte overflow-hidden border border-bordure bg-carte">
      {apercu && (
        <div aria-hidden inert className="pointer-events-none select-none opacity-40" style={{ filter: "blur(3px)" }}>
          {t(apercu)}
        </div>
      )}
      <div className={apercu ? "absolute inset-0 flex items-center justify-center p-6" : "flex items-center justify-center p-10"}
        style={apercu ? { background: "rgba(255,255,255,0.55)" } : undefined}>
        <div className="max-w-sm text-center space-y-3">
          <div className="w-12 h-12 rounded-carte bg-primaire-fond border border-attention-bordure flex items-center justify-center mx-auto" aria-hidden>
            <Lock size={18} className="text-attention" />
          </div>
          <h3 className="ax-sous-titre">{t(titre)}</h3>
          <p className="ax-texte-secondaire">{t(description)}</p>
          <Bouton onClick={() => openAbonnement(palierRequis)} icone={<Sparkles size={14} aria-hidden />}>
            {t("Passer au Palier")}{" "}{t(LABEL_PALIER[palierRequis])}
          </Bouton>
        </div>
      </div>
    </div>
  );
}
