import { Squelette, SqueletteListe } from "@/components/ui";

export default function CommandesLoading() {
  return (
    <div className="space-y-5">
      <Squelette className="h-8 w-40" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }, (_, i) => <Squelette key={i} className="h-24" />)}
      </div>
      <Squelette className="h-10 w-full max-w-xl" />
      <SqueletteListe lignes={8} libelle="Chargement des commandes…" />
    </div>
  );
}
