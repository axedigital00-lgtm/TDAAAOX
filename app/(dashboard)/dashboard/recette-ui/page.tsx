import { notFound } from "next/navigation";
import { DemoBase } from "./demo-base";
import { DemoIndex } from "./demo-index";
import { DemoShell } from "./demo-shell";
import { DemoGraphiques } from "./demo-graphiques";
import { inter } from "../../police";

// Recette visuelle du design system (masterprompt §2) : désactivée en production.
// « _ui » est un dossier privé dans l'App Router : la page vit donc sous /dashboard/recette-ui (DECISIONS D24).
export default function RecetteUi() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div className={`adm ${inter.variable} min-h-screen bg-(--color-bg)`}>
    <div className="mx-auto max-w-[1200px] px-(--page-padding-x) pb-[120px] space-y-12 py-6">
      <DemoBase />
      <DemoGraphiques />
      <DemoIndex />
      <DemoShell />
    </div>
    </div>
  );
}
