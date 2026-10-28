import { FormulaireAffilie } from "./FormulaireAffilie";

// ?suite=/affilie/catalogue : page où revenir après l'inscription (chemin interne uniquement).
export default async function InscriptionAffiliePage({ searchParams }: { searchParams: Promise<{ suite?: string }> }) {
  const { suite } = await searchParams;
  return <FormulaireAffilie suite={suite?.startsWith("/") && !suite.startsWith("//") ? suite : null} />;
}
