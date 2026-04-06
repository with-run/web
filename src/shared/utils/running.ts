export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatPace(secPerKm: number): string {
  if (secPerKm <= 0) return `--'--"`;
  const mins = Math.floor(secPerKm / 60);
  const secs = secPerKm % 60;
  return `${mins}'${String(secs).padStart(2, '0')}"`;
}
