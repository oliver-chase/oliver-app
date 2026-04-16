'use client';

type BadgeVariant =
  | 'identified'
  | 'pursuing'
  | 'won'
  | 'lost'
  | 'active'
  | 'complete'
  | 'open'
  | 'on-hold';

// 'on-hold' maps to CSS class app-badge-hold (source uses -hold, not -on-hold)
const VARIANT_CLASS: Record<BadgeVariant, string> = {
  identified: 'app-badge-identified',
  pursuing:   'app-badge-pursuing',
  won:        'app-badge-won',
  lost:       'app-badge-lost',
  active:     'app-badge-active',
  complete:   'app-badge-complete',
  open:       'app-badge-open',
  'on-hold':  'app-badge-hold',
};

interface AppBadgeProps {
  label: string;
  variant: BadgeVariant;
  clickable?: boolean;
  onClick?: () => void;
}

export default function AppBadge({ label, variant, clickable, onClick }: AppBadgeProps) {
  const className = [
    'app-badge',
    VARIANT_CLASS[variant],
    clickable ? 'app-badge--clickable' : undefined,
  ].filter(Boolean).join(' ');

  if (clickable) {
    return (
      <button
        className={className}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        type="button"
      >
        {label}
      </button>
    );
  }

  return <span className={className}>{label}</span>;
}
