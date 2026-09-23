/**
 * Formats a telemetry or activity log timestamp into an explicit human-readable
 * time format paired with a relative elapsed indicator (e.g. "10:11:02 AM (2m ago)").
 *
 * @param isoOrMs ISO string, date string, or millisecond epoch number
 * @returns Formatted timestamp with relative indicator, or fallback string
 */
export const formatTelemetryTime = (isoOrMs?: string | number | null): string => {
  if (!isoOrMs) return 'Just now';

  let d: Date;
  if (typeof isoOrMs === 'number') {
    d = new Date(isoOrMs);
  } else if (typeof isoOrMs === 'string') {
    const trimmed = isoOrMs.trim();
    if (/^\d{10,16}$/.test(trimmed)) {
      d = new Date(Number(trimmed));
    } else {
      d = new Date(trimmed);
    }
  } else {
    d = new Date(isoOrMs as any);
  }

  if (isNaN(d.getTime())) {
    return String(isoOrMs);
  }

  const timeStr = d.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  let rel = 'just now';
  if (diffSec >= 86400) {
    const days = Math.floor(diffSec / 86400);
    rel = `${days}d ago`;
  } else if (diffSec >= 3600) {
    const hours = Math.floor(diffSec / 3600);
    rel = `${hours}h ago`;
  } else if (diffSec >= 60) {
    const mins = Math.floor(diffSec / 60);
    rel = `${mins}m ago`;
  } else if (diffSec > 5) {
    rel = `${diffSec}s ago`;
  }

  return `${timeStr} (${rel})`;
};
