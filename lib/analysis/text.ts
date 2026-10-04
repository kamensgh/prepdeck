/** Lowercase word tokens; splits "TCP/TLS" into ["tcp", "tls"]. */
export function tokens(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9']+/).filter(Boolean);
}

/** One transcript word as a bare lowercase token: " Like," → "like". */
export function wordToken(s: string): string {
  return s.toLowerCase().replace(/[^a-z']/g, '');
}

/** Seconds → "m:ss", rounded to the nearest second. */
export function formatClock(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
