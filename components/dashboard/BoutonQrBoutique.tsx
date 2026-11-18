"use client";
// QR de la boutique : à afficher sur un stand, un flyer ou un emballage.
// L'affiche PNG (nom de la boutique + QR + adresse) se télécharge pour l'imprimer.
import { useEffect, useState } from "react";
import { Download, QrCode } from "lucide-react";
import QRCode from "qrcode";
import { useT } from "@/components/I18nProvider";
import { Bouton, Modale } from "@/components/ui";

export function BoutonQrBoutique({ url, nomBoutique }: { url: string; nomBoutique: string }) {
  const t = useT();
  const [ouvert, setOuvert] = useState(false);
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    if (!ouvert || image) return;
    QRCode.toDataURL(url, { margin: 1, width: 480, errorCorrectionLevel: "M", color: { dark: "#111111", light: "#ffffff" } }).then(setImage);
  }, [ouvert, image, url]);

  async function telechargerAffiche() {
    const qr = document.createElement("canvas");
    await QRCode.toCanvas(qr, url, { margin: 1, width: 900, errorCorrectionLevel: "M" });
    const c = document.createElement("canvas");
    c.width = 1240; c.height = 1754; // A4 portrait à 150 dpi
    const g = c.getContext("2d")!;
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = "#F5A623"; g.fillRect(0, 0, c.width, 24);
    g.textAlign = "center"; g.fillStyle = "#111111";
    g.font = "800 84px system-ui, sans-serif"; g.fillText(nomBoutique, c.width / 2, 230, c.width - 120);
    g.drawImage(qr, (c.width - 900) / 2, 330);
    g.font = "700 64px system-ui, sans-serif"; g.fillText(t("Scanne pour commander"), c.width / 2, 1340);
    g.fillStyle = "#555555"; g.font = "400 40px system-ui, sans-serif"; g.fillText(url.replace(/^https?:\/\//, ""), c.width / 2, 1430, c.width - 120);
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = `qr-${nomBoutique.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
    a.click();
  }

  return (
    <>
      <button type="button" onClick={() => setOuvert(true)}
        className="flex items-center gap-1.5 min-h-10 text-xs font-semibold border border-white/20 rounded-controle px-3.5 bg-white/10 backdrop-blur-sm text-white hover:bg-white/15 hover:border-white/30 transition-all">
        <QrCode size={14} aria-hidden />{" "}{t("QR boutique")}
      </button>
      <Modale ouverte={ouvert} onFermer={() => setOuvert(false)} taille="sm" titre={t("QR de ta boutique")}
        description={t("Affiche-le sur ton stand, tes flyers ou tes emballages : tes clients arrivent directement sur ta boutique.")}
        actions={<Bouton variante="sombre" large onClick={telechargerAffiche} icone={<Download size={15} aria-hidden />}>{t("Télécharger l'affiche (PNG)")}</Bouton>}>
        <div className="text-center">
          <div className="w-56 h-56 mx-auto rounded-controle border border-bordure overflow-hidden bg-white">
            {image && <img src={image} alt={t("QR code de la boutique")} className="w-full h-full" />}
          </div>
          <p className="mt-3 ax-aide break-all">{url}</p>
        </div>
      </Modale>
    </>
  );
}
