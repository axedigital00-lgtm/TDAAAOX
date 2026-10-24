// Adresse et téléphone du marchand dans les pieds de page courts de la vitrine.
// Rien d'affiché si aucun des deux n'est renseigné (Paramètres).
export function CoordonneesPied({ adresse, telephone }: { adresse?: string | null; telephone?: string | null }) {
  if (!adresse && !telephone) return null;
  return (
    <p className="mb-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
      {adresse && <span>{adresse}</span>}
      {telephone && <a href={`tel:${telephone.replace(/\s/g, "")}`} className="hover:underline">{telephone}</a>}
    </p>
  );
}
