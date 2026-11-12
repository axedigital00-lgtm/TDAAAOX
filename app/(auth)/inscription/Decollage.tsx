"use client";
// Écran final : 3, 2, 1, décollage — pendant que la boutique se crée pour de vrai.
// L'animation n'attend jamais la création et la création n'attend jamais l'animation :
// on passe à la suite quand les deux sont finies (ou tout de suite en cas d'erreur, voir page.tsx).
import { useEffect, useState } from "react";
import { Rocket, Check, Loader2 } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { COURBE } from "./ui";

// Ce que fait vraiment la création (app/api/ai/onboarding, phase « executer »).
const ETAPES = ["Création de ton compte", "Application du design choisi", "Ajout de tes produits en brouillon", "Réglage de la livraison"];

export function Decollage({ nom, pret, onFini }: { nom: string; pret: boolean; onFini: () => void }) {
  const tr = useT();
  const [compte, setCompte] = useState(3);
  const vol = compte <= 0;
  const [volFini, setVolFini] = useState(false);
  const [etapesVues, setEtapesVues] = useState(0);

  useEffect(() => {
    if (compte <= 0) { const t = setTimeout(() => setVolFini(true), 1700); return () => clearTimeout(t); }
    const t = setTimeout(() => setCompte((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [compte]);

  useEffect(() => {
    if (etapesVues >= ETAPES.length) return;
    const t = setTimeout(() => setEtapesVues((n) => n + 1), 900);
    return () => clearTimeout(t);
  }, [etapesVues]);

  useEffect(() => { if (volFini && pret) onFini(); }, [volFini, pret, onFini]);

  return (
    <div className="relative flex flex-col items-center text-center min-h-[62vh] justify-center">
      <style>{`
        @keyframes inscChiffre { from { opacity: 0; transform: scale(1.35) } to { opacity: 1; transform: none } }
        @keyframes inscFlamme { 0%,100% { transform: scaleY(1) } 50% { transform: scaleY(1.25) } }
        @keyframes inscFumee { from { opacity: .55; transform: translate(-50%,0) scale(.4) } to { opacity: 0; transform: translate(-50%,10px) scale(2.4) } }
        .insc-chiffre { animation: inscChiffre .6s ${COURBE} both; }
        .insc-fusee { transition: transform 1.6s cubic-bezier(.55,0,.75,.2); }
        .insc-vol .insc-fusee { transform: translateY(-120vh); }
        .insc-flamme { transform-origin: top; animation: inscFlamme .18s ease-in-out infinite; }
        .insc-fumee { position: absolute; left: 50%; bottom: -10px; width: 90px; height: 90px; border-radius: 9999px;
          background: radial-gradient(circle, rgba(17,17,17,.10), transparent 70%); animation: inscFumee 1.4s ease-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .insc-chiffre, .insc-flamme, .insc-fumee { animation: none; }
          .insc-fusee { transition: opacity .6s; }
          .insc-vol .insc-fusee { transform: none; opacity: 0; }
        }
      `}</style>

      <div aria-live="assertive" className="h-[120px] flex items-center justify-center">
        {!vol
          ? <span key={compte} className="insc-chiffre text-[96px] sm:text-[120px] font-extrabold leading-none tracking-tight text-[#111111] tabular-nums">{compte}</span>
          : <span className="insc-chiffre text-[30px] sm:text-[40px] font-extrabold tracking-tight text-[#111111]">{tr("Décollage !")}</span>}
      </div>

      {/* Fusée : décorative, le texte reste lisible pendant tout le vol */}
      <div aria-hidden className={`relative h-[190px] w-full flex justify-center ${vol ? "insc-vol" : ""}`}>
        <div className="insc-fusee relative flex flex-col items-center">
          <span className="w-20 h-20 rounded-[26px] bg-[#111111] flex items-center justify-center shadow-[0_20px_50px_-12px_rgba(17,17,17,0.5)]">
            <Rocket size={38} color="#F5A623" style={{ transform: "rotate(-45deg)" }} />
          </span>
          <span className="insc-flamme block w-6 rounded-b-full mt-1" style={{ height: vol ? 70 : 26, transition: "height .4s", background: "linear-gradient(#FFD280, #F5A623 45%, rgba(245,166,35,0))" }} />
        </div>
        {!vol && <><span className="insc-fumee" /><span className="insc-fumee" style={{ animationDelay: "-.7s" }} /></>}
      </div>

      <div className="mt-4 w-full max-w-[340px] text-left space-y-2.5">
        <p className="text-[15px] font-bold text-[#111111] text-center mb-3">{tr("Axia lance {0}…", nom)}</p>
        {ETAPES.map((e, i) => {
          const fait = i < etapesVues && (pret || i < ETAPES.length - 1);
          return (
            <div key={e} className="flex items-center gap-2.5 text-[14px]" style={{ opacity: i <= etapesVues ? 1 : 0.35, transition: "opacity .4s" }}>
              {fait ? <Check size={16} color="#16A34A" strokeWidth={3} /> : <Loader2 size={16} className={i <= etapesVues ? "animate-spin text-[#D4911A]" : "text-gray-300"} />}
              <span className="text-gray-700">{tr(e)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
