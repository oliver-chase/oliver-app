'use client';

interface AppChipProps {
  label: string;
  onRemove?: () => void;
  className?: string;
}

export default function AppChip({ label, onRemove, className }: AppChipProps) {
  const classes = ['app-chip', className].filter(Boolean).join(' ');

  return (
    <span className={classes}>
      {label}
      {onRemove && (
        <button
          className="app-chip-remove"
          title="Remove"
          aria-label={`Remove ${label}`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          {'\u00d7'}
        </button>
      )}
    </span>
  );
}
