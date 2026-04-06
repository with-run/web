// "2026-03-12T06:30:00" → "오전 6:30"
export function formatStartTime(startedAt: string): string {
  const date = new Date(startedAt);
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours < 12 ? '오전' : '오후';
  const h = hours % 12 || 12;
  return `${ampm} ${h}:${minutes}`;
}

// "2026-03-16" -> "3월 16일 활동"
export function formatDateLabel(dateStr: string): string {
  const [, month, day] = dateStr.split('-');
  return `${parseInt(month)}월 ${parseInt(day)}일 활동`;
}
