import { Timer } from '../../../components/ui/Timer';

type ConstructionOverlayProps = {
  finishesAt: string;
  onComplete: () => void;
};

export function ConstructionOverlay({ finishesAt, onComplete }: ConstructionOverlayProps) {
  return (
    <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-lg bg-primary/20 backdrop-blur-[1px]">
      <span aria-hidden="true" className="absolute inset-x-[18%] bottom-[16%] h-3 rounded-full bg-text/20" />
      <span
        aria-hidden="true"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-surface/95 text-base shadow-md ring-2 ring-primary/40"
      >
        🔨
      </span>
      <span className="rounded-full bg-surface/95 px-2 py-0.5 shadow-md ring-1 ring-border">
        <Timer finishesAt={finishesAt} onComplete={onComplete} />
      </span>
    </span>
  );
}
