// Cohortes (§7.8) : tableau natif (accessible tel quel), cellules 30 px rayon 4,
// fond rgba(42,111,219,α) avec α proportionnel, texte blanc si α > 0,5. null = période pas encore écoulée.
import { formatValeur } from "./echelle";

export const alphaCohorte = (v: number, alphaMax: number) => Math.min(1, Math.max(0, v / alphaMax));

export function CohortHeatmap({ titreLignes, colonnes, lignes, alphaMax = 30 }: {
  titreLignes: string;
  colonnes: string[];
  lignes: { libelle: string; valeurs: (number | null)[] }[];
  /** Pourcentage qui donne la teinte pleine (la colonne 0 à 100 % est toujours pleine). */
  alphaMax?: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0.5 text-[12px]">
        <thead>
          <tr className="text-(--color-text-secondary)">
            <th scope="col" className="h-[30px] px-2 text-left font-normal">{titreLignes}</th>
            {colonnes.map((c) => <th key={c} scope="col" className="h-[30px] whitespace-nowrap px-2 font-normal">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => (
            <tr key={l.libelle}>
              <th scope="row" className="h-[30px] whitespace-nowrap px-2 text-left font-normal">{l.libelle}</th>
              {colonnes.map((c, j) => {
                const v = l.valeurs[j];
                if (v === null || v === undefined) return <td key={c} />;
                const a = j === 0 ? 1 : alphaCohorte(v, alphaMax);
                return (
                  <td key={c} className="h-[30px] rounded-[4px] px-2 text-center tabular-nums"
                    style={{ background: `rgba(42,111,219,${a.toFixed(2)})`, color: a > 0.5 ? "#fff" : "var(--color-text)" }}>
                    {formatValeur(v, "pourcent")}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
