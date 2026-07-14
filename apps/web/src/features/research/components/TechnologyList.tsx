import type { TechnologySummary } from '@island-empires/shared-types';
import { useMemo, useState } from 'react';
import { TechnologyCard } from './TechnologyCard';

type TechnologyListProps = {
  technologies: TechnologySummary[];
  categories: Array<{
    id: string;
    name: string;
    count: number;
    completed: number;
    available: number;
  }>;
  researchPoints: number;
  pendingTechnologyId?: string;
  onStart: (technologyId: string) => void;
};

export function TechnologyList({
  technologies,
  categories,
  researchPoints,
  pendingTechnologyId,
  onStart,
}: TechnologyListProps) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchText, setSearchText] = useState('');
  const normalizedSearch = searchText.trim().toLowerCase();
  const filteredTechnologies = useMemo(
    () =>
      technologies.filter((technology) => {
        const category = technology.category ?? technology.branch;
        const matchesCategory = selectedCategory === 'all' || category === selectedCategory;
        const matchesSearch =
          normalizedSearch.length === 0 ||
          [
            technology.name,
            technology.description,
            technology.branch,
            technology.category ?? '',
            ...(technology.unlocks ?? []),
            ...technology.requirements,
          ]
            .join(' ')
            .toLowerCase()
            .includes(normalizedSearch);

        return matchesCategory && matchesSearch;
      }),
    [normalizedSearch, selectedCategory, technologies],
  );

  return (
    <section className="game-surface game-frame rounded-lg p-5">
      <p className="text-[11px] font-black uppercase tracking-wide text-primary">Archive</p>
      <h2 className="mt-1 text-xl font-black text-text">Technologies</h2>
      <div className="mt-4 flex flex-col gap-3">
        <input
          type="search"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="Search technologies, unlocks, requirements..."
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${
              selectedCategory === 'all'
                ? 'border-primary bg-primary text-white'
                : 'border-border bg-surface text-muted hover:text-text'
            }`}
          >
            All {technologies.length}
          </button>
          {categories
            .filter((category) => category.count > 0)
            .map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategory(category.id)}
                className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${
                  selectedCategory === category.id
                    ? 'border-primary bg-primary text-white'
                    : 'border-border bg-surface text-muted hover:text-text'
                }`}
              >
                {category.name} {category.completed}/{category.count}
              </button>
            ))}
        </div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredTechnologies.map((technology) => (
          <TechnologyCard
            key={technology.id}
            technology={technology}
            researchPoints={researchPoints}
            isStarting={pendingTechnologyId === technology.id}
            onStart={() => onStart(technology.id)}
          />
        ))}
      </div>
      {filteredTechnologies.length === 0 ? (
        <p className="mt-4 rounded-md border border-border bg-surface/70 px-3 py-2 text-sm font-semibold text-muted">
          No technologies match this search.
        </p>
      ) : null}
    </section>
  );
}
