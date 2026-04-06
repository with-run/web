import { MapPin } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';

import type { CircleMode } from '@/shared/hooks/useRunCircleMap';

const MODE_BUTTONS: {
  mode: CircleMode;
  label: string;
  dx: number;
  dy: number;
}[] = [
  { mode: 'USER_LOCATION', label: '내 위치', dx: -50, dy: -24 },
  { mode: 'AREA_EXPLORE', label: '지역 탐색', dx: 0, dy: 70 },
];

type RunCircleRadialMenuProps = {
  circleMode: CircleMode;
  onCircleModeChange: (mode: CircleMode) => void;
  onUserLocationSelect?: () => void;
};

export function RunCircleRadialMenu({
  circleMode,
  onCircleModeChange,
  onUserLocationSelect,
}: RunCircleRadialMenuProps) {
  const [radialOpen, setRadialOpen] = useState(false);

  return (
    <div className="absolute right-4 top-20 z-20">
      {radialOpen && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => setRadialOpen(false)}
        />
      )}

      <button
        onClick={() => setRadialOpen((v) => !v)}
        className={`flex h-10 w-10 items-center justify-center rounded-full border shadow-lg ${
          radialOpen
            ? 'border-primary-1 bg-primary-1 text-white'
            : 'border-border-default bg-surface-default text-fg-primary'
        }`}
      >
        <MapPin size={18} />
      </button>

      <AnimatePresence>
        {radialOpen &&
          MODE_BUTTONS.map(({ mode, label, dx, dy }) => (
            <motion.button
              key={mode}
              initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
              animate={{ x: dx, y: dy, opacity: 1, scale: 1 }}
              exit={{ x: 0, y: 0, opacity: 0, scale: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className={`absolute right-0 top-0 flex h-8 items-center justify-center whitespace-nowrap rounded-full border px-2 text-xs font-medium shadow-lg ${
                circleMode === mode
                  ? 'border-primary-1 bg-primary-1 text-white'
                  : 'border-border-default bg-surface-default text-fg-primary'
              }`}
              onClick={() => {
                onCircleModeChange(mode);
                if (mode === 'USER_LOCATION') {
                  onUserLocationSelect?.();
                }
                setRadialOpen(false);
              }}
            >
              {label}
            </motion.button>
          ))}
      </AnimatePresence>
    </div>
  );
}
