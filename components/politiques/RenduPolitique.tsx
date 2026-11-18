// Rendu d'une politique (Markdown simple de lib/politiques.ts), partagé entre l'aperçu marchand
// et la vitrine. Uniquement du texte rendu par React (échappé) : jamais de HTML injecté.
import { analyserMarkdown, type Segment } from "@/lib/politiques";

function Segments({ segments, surligner }: { segments: Segment[]; surligner: boolean }) {
  return (
    <>
      {segments.map((s, i) => {
        const contenu = s.gras ? <strong>{s.texte}</strong> : s.texte;
        return s.aCompleter && surligner
          ? <mark key={i} className="rounded px-1 bg-yellow-200 text-yellow-900">{contenu}</mark>
          : <span key={i}>{contenu}</span>;
      })}
    </>
  );
}

export function RenduPolitique({ contenu, couleurTitre, surligner = false }: {
  contenu: string;
  couleurTitre?: string;
  /** Côté marchand : passages « À compléter » surlignés en jaune. */
  surligner?: boolean;
}) {
  const titre = { color: couleurTitre };
  return (
    <div className="space-y-3 text-[15px] leading-relaxed">
      {analyserMarkdown(contenu).map((b, i) => {
        if (b.type === "titre") {
          const Balise = (["h2", "h2", "h3", "h4"] as const)[b.niveau];
          const taille = b.niveau === 1 ? "text-2xl" : b.niveau === 2 ? "text-lg" : "text-base";
          return <Balise key={i} className={`${taille} font-semibold pt-2`} style={titre}><Segments segments={b.segments} surligner={surligner} /></Balise>;
        }
        if (b.type === "liste") {
          return (
            <ul key={i} className="list-disc pl-5 space-y-1">
              {b.items.map((it, j) => <li key={j}><Segments segments={it} surligner={surligner} /></li>)}
            </ul>
          );
        }
        return <p key={i}><Segments segments={b.segments} surligner={surligner} /></p>;
      })}
    </div>
  );
}
