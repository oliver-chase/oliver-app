type SyncStatus = 'syncing' | 'ok' | 'err';

interface SyncDotProps {
  status: SyncStatus;
}

export default function SyncDot({ status }: SyncDotProps) {
  return <span className={`sync-dot ${status}`} aria-hidden="true" />;
}
