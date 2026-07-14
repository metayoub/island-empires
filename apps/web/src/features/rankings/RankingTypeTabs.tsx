type RankingTypeTabsProps<T extends string> = {
  options: Array<{ id: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
};

export function RankingTypeTabs<T extends string>({ options, value, onChange }: RankingTypeTabsProps<T>) {
  return (
    <div role="tablist" className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={value === option.id}
          onClick={() => onChange(option.id)}
          className={`rounded-md border px-3 py-2 text-sm font-bold ${
            value === option.id
              ? 'border-primary bg-primary text-white'
              : 'border-border bg-surface text-muted hover:text-text'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
