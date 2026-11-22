"use client";
// Preuve de remise : photo compressée sur l'appareil et signature au doigt, selon ce que la boutique exige.
import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { useT } from "@/components/I18nProvider";

const compresser = (f: File) => new Promise<string>((ok, ko) => {
  const url = URL.createObjectURL(f), img = new Image();
  img.onload = () => { const e = Math.min(1, 1024 / Math.max(img.width, img.height)), c = document.createElement("canvas"); c.width = Math.round(img.width * e); c.height = Math.round(img.height * e); c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); ok(c.toDataURL("image/jpeg", .72)); };
  img.onerror = () => { URL.revokeObjectURL(url); ko(new Error("Image illisible")); };
  img.src = url;
});

function Signature({ onChange }: { onChange: (v: string | null) => void }) {
  const t = useT();
  const c = useRef<HTMLCanvasElement>(null), trace = useRef(false);
  useEffect(() => { const x = c.current!, r = x.getBoundingClientRect(); x.width = Math.round(r.width); x.height = 150; const g = x.getContext("2d")!; g.lineWidth = 2.4; g.lineCap = "round"; g.strokeStyle = "#111"; }, []);
  const pos = (e: React.PointerEvent) => { const r = c.current!.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] as const; };
  return <div style={{ display: "grid", gap: 6 }}>
    <canvas ref={c} aria-label={t("Signature du client")} style={{ width: "100%", height: 150, border: "1px solid #d6d6d3", borderRadius: 10, background: "#fff", touchAction: "none" }}
      onPointerDown={(e) => { trace.current = true; c.current!.setPointerCapture(e.pointerId); const g = c.current!.getContext("2d")!, [x, y] = pos(e); g.beginPath(); g.moveTo(x, y); }}
      onPointerMove={(e) => { if (!trace.current) return; const g = c.current!.getContext("2d")!, [x, y] = pos(e); g.lineTo(x, y); g.stroke(); }}
      onPointerUp={() => { if (trace.current) { trace.current = false; onChange(c.current!.toDataURL("image/png")); } }} />
    <div><button type="button" className="axl-btn" onClick={() => { const x = c.current!; x.getContext("2d")!.clearRect(0, 0, x.width, x.height); onChange(null); }}>{t("Effacer")}</button></div>
  </div>;
}

export function PreuveRemise({ requises, envoi, onConfirmer }: { requises: string[]; envoi: boolean; onConfirmer: (p: { code?: string; photo?: string; signature?: string; confirmationClient?: boolean }) => void }) {
  const t = useT();
  const [code, setCode] = useState(""); const [photo, setPhoto] = useState<string | null>(null); const [signature, setSignature] = useState<string | null>(null); const [confirme, setConfirme] = useState(false); const [erreur, setErreur] = useState<string | null>(null);
  const pret = (!requises.includes("otp") || code.length >= 4) && (!requises.includes("photo") || !!photo) && (!requises.includes("signature") || !!signature) && (!requises.includes("confirmation") || confirme);
  return <div className="axl-preuve" style={{ display: "grid", alignItems: "stretch" }}>
    {requises.includes("otp") && <label><span>{t("Code du client")}</span><input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} /></label>}
    {requises.includes("photo") && <div style={{ display: "grid", gap: 6 }}>
      <label className="axl-btn axl-depot"><Camera size={15} /> {t(photo ? "Reprendre la photo" : "Photographier le colis remis")}<input type="file" accept="image/*" capture="environment" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; try { setPhoto(await compresser(f)); setErreur(null); } catch { setErreur(t("Cette image n'a pas pu être lue.")); } }} /></label>
      {photo && <img src={photo} alt={t("Aperçu de la preuve")} style={{ maxHeight: 160, borderRadius: 10, objectFit: "cover" }} />}
      {erreur && <p className="axl-alerte">{erreur}</p>}
    </div>}
    {requises.includes("signature") && <Signature onChange={setSignature} />}
    {requises.includes("confirmation") && <label className="axl-coche"><input type="checkbox" checked={confirme} onChange={(e) => setConfirme(e.target.checked)} />{t("Le client confirme avoir reçu son colis")}</label>}
    <button type="button" className="axl-btn axl-btn--fort" disabled={envoi || !pret} onClick={() => onConfirmer({ ...(requises.includes("otp") ? { code } : {}), ...(photo ? { photo } : {}), ...(signature ? { signature } : {}), ...(confirme ? { confirmationClient: true } : {}) })}>{t("Confirmer la remise")}</button>
  </div>;
}
