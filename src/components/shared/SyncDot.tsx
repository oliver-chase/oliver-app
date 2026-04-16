type SyncStatus = 'syncing' | 'ok' | 'err';

interface SyncDotProps {
  status: SyncStatus;
}

export default function SyncDot({ status }: SyncDotProps) {
  return <div className={`sync-dot ${status}`} id="sync-dot" aria-hidden="true" />;
}
