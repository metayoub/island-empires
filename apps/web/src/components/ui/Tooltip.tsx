import { useId, useState, type ReactNode } from 'react';

type TooltipProps = {
  label: string;
  children: ReactNode;
};

export function Tooltip({ label, children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipId = useId();

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <span
        tabIndex={0}
        aria-describedby={tooltipId}
        className="cursor-help border-b border-dotted border-muted"
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
      >
        {children}
      </span>
      {isVisible ? (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-10 mb-2 w-max max-w-xs -translate-x-1/2 rounded bg-text px-2 py-1 text-xs font-medium text-white shadow-lg"
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}
