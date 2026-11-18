// Chargement d'une page de l'espace affilié : squelette sobre (le menu reste affiché).
export default function ChargementAffilie() {
  return (
    <div className="space-y-4 motion-safe:animate-pulse" aria-busy="true">
      <div className="h-7 w-48 bg-gray-200 rounded-xl" />
      <div className="h-36 bg-gray-200 rounded-2xl" />
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-24 bg-white border border-gray-100 rounded-2xl" />)}
      </div>
      <div className="h-56 bg-white border border-gray-100 rounded-2xl" />
    </div>
  );
}
