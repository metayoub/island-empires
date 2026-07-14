import { Tooltip } from './Tooltip';

type HelpIconProps = {
  label: string;
};

export function HelpIcon({ label }: HelpIconProps) {
  return (
    <Tooltip label={label}>
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-surface-strong text-[10px] font-bold text-muted">
        ?
      </span>
    </Tooltip>
  );
}
