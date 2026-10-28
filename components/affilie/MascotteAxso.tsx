// Mascotte Axso (le chariot souriant du logo, /logo.png recadré) pour les écrans vides de l'espace affilié.
export function MascotteAxso({ hauteur = 80 }: { hauteur?: number }) {
  return (
    <div className="mx-auto mb-4 overflow-hidden" style={{ height: hauteur, width: Math.round(hauteur * 1.05) }} aria-hidden>
      <img src="/logo.png" alt="" className="w-auto max-w-none" style={{ height: hauteur }} />
    </div>
  );
}
