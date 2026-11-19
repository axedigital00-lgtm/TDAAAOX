// Carte du fil de l'Accueil (FeedCard §8.1.5) : vignette, pastille d'état, titre, texte, action.
// ponytail: pas de ✕ de masquage tant que le fil ne contient que des étapes (elles conditionnent la vente) ;
// l'ajouter (localStorage) avec les premières cartes de recommandation.
export function CarteFil({ vignette, pastille, titre, texte, action }: {
  vignette: React.ReactNode; pastille?: string; titre: string; texte: React.ReactNode; action: React.ReactNode;
}) {
  return (
    <article className="flex flex-col rounded-(--radius-2xl) bg-(--color-surface) p-2 shadow-(--shadow-card)">
      <div className="relative h-[140px] overflow-hidden rounded-(--radius-lg) bg-(--color-surface-selected)">
        {vignette}
        {pastille && (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-(--radius-md) bg-[rgba(48,48,48,.85)] px-2 py-0.5 text-[12px] font-[550] text-white">
            <i className="size-2.5 rounded-full border-[1.5px] border-[#bbb]" aria-hidden />{pastille}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col px-2 pt-3 pb-1.5">
        <h3 className="mb-1 text-[13px] font-[650] text-(--color-text-strong)">{titre}</h3>
        <div className="text-[12px] leading-[17px] text-(--color-text-secondary)">{texte}</div>
        <div className="mt-auto pt-3.5">{action}</div>
      </div>
    </article>
  );
}
