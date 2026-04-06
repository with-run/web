import { Activity } from 'lucide-react';

import type { HealthSample } from '@/apis/runningSessions';
import { cn } from '@/shared/utils';

type HeartRateSectionProps = {
  samples: HealthSample[];
};

export function HeartRateSection({ samples }: HeartRateSectionProps) {
  const rates = samples.map((s) => s.heartRate).filter((r) => r > 0);

  if (rates.length === 0) return null;

  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const avg = Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);

  const W = 300;
  const H = 64;
  const PAD = 4;
  const points =
    rates.length >= 2
      ? rates
          .map((hr, i) => {
            const x = PAD + (i / (rates.length - 1)) * (W - PAD * 2);
            const y = H - PAD - ((hr - min) / (max - min || 1)) * (H - PAD * 2);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(' ')
      : null;

  return (
    <div className="bg-secondary-2 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Activity size={16} className="text-primary" />
        <span className="caption-b text-fg-inverse">심박수 변동</span>
      </div>

      <div className="flex gap-3 mb-4">
        {[
          { label: '최소', value: String(min), highlight: false },
          { label: '평균', value: String(avg), highlight: true },
          { label: '최대', value: String(max), highlight: false },
        ].map(({ label, value, highlight }) => (
          <div
            key={label}
            className="flex-1 flex flex-col items-center gap-1 bg-secondary-3 rounded-xl py-3"
          >
            <span className="caption-r text-secondary-5">{label}</span>
            <span className={cn('h3-b', highlight ? 'text-primary' : 'text-fg-inverse')}>
              {value}
            </span>
            <span className="caption-r text-secondary-5">bpm</span>
          </div>
        ))}
      </div>

      {points && (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: 64 }}
          preserveAspectRatio="none"
        >
          <polyline
            points={points}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      )}
    </div>
  );
}
