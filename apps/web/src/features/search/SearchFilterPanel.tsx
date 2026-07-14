import type { ReactNode } from 'react';
import { Button, Card } from '../../components/ui';

type SearchFilterPanelProps = {
  children: ReactNode;
  onSubmit: () => void;
  isLoading?: boolean;
};

export function SearchFilterPanel({ children, onSubmit, isLoading }: SearchFilterPanelProps) {
  return (
    <Card className="p-4">
      <form
        className="grid gap-3 md:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        {children}
        <div className="flex items-end">
          <Button type="submit" disabled={isLoading}>
            Search
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function FilterInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-bold text-text">
      {label}
      <input
        className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
