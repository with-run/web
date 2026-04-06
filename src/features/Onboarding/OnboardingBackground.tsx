import { motion } from 'motion/react';

type OnboardingBackgroundProps = {
  isMoving: boolean;
};

export function OnboardingBackground({
  isMoving,
}: OnboardingBackgroundProps) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#A9D179]">
      <svg
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid slice"
        viewBox="-50 100 500 1000"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <linearGradient id="trackGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D95850" />
            <stop offset="100%" stopColor="#C44840" />
          </linearGradient>
          <linearGradient id="grassGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#A9D179" />
            <stop offset="100%" stopColor="#95BC68" />
          </linearGradient>
          <linearGradient id="shadowGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#80A159" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#95BC68" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Dynamic Grass Base */}
        <rect x="-1000" y="-1000" width="3000" height="3000" fill="url(#grassGradient)" />

        <g transform="rotate(26, 250, 500)">
          {/* Track Drop Shadow (Adds depth) */}
          <path
            d="M -1000 305 L 2000 305 L 2000 730 L -1000 730 Z"
            fill="url(#shadowGradient)"
          />

          {/* Main Track Surface */}
          <path
            d="M -1000 280 L 2000 280 L 2000 680 L -1000 680 Z"
            fill="url(#trackGradient)"
          />

          {/* Top thick border */}
          <line
            x1="-1000"
            y1="284"
            x2="2000"
            y2="284"
            stroke="#FFFFFF"
            strokeWidth="8"
            opacity="0.9"
          />

          {/* Bottom thick border */}
          <line
            x1="-1000"
            y1="676"
            x2="2000"
            y2="676"
            stroke="#FFFFFF"
            strokeWidth="8"
            opacity="0.9"
          />

          {/* Lane dividers */}
          {[380, 480, 580].map((y) => (
            <motion.line
              key={y}
              x1="-1000"
              y1={y}
              x2="2000"
              y2={y}
              stroke="#FFFFFF"
              strokeWidth="4"
              strokeDasharray="40 40"
              opacity="0.9"
              animate={
                isMoving
                  ? { strokeDashoffset: [0, 80] }
                  : { strokeDashoffset: 0 }
              }
              transition={{
                repeat: isMoving ? Infinity : 0,
                repeatType: 'loop',
                duration: 0.45,
                ease: 'linear',
              }}
            />
          ))}

          {/* Motion lines in grass to enhance the speed feeling */}
          <motion.g
            animate={isMoving ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {[
              { x: 1200, y: 220, w: 150, c: '#BBEA8D', sw: 6, dur: 1.4, del: 0 },
              { x: 900, y: 130, w: 250, c: '#BBEA8D', sw: 8, dur: 1.8, del: 0.3 },
              { x: 1400, y: 700, w: 100, c: '#80A159', sw: 8, dur: 1.5, del: 0.1 },
              { x: 1000, y: 820, w: 200, c: '#80A159', sw: 6, dur: 1.2, del: 0.6 },
              { x: 1600, y: 280, w: 120, c: '#BBEA8D', sw: 5, dur: 1.6, del: 0.8 },
              { x: 1300, y: 780, w: 180, c: '#80A159', sw: 7, dur: 1.3, del: 0.4 },
            ].map((line, i) => (
              <motion.line
                key={i}
                x1={line.x}
                y1={line.y}
                x2={line.x + line.w}
                y2={line.y}
                stroke={line.c}
                strokeWidth={line.sw}
                strokeLinecap="round"
                animate={isMoving ? { x: [0, -3000] } : { x: 0 }}
                transition={{
                  repeat: isMoving ? Infinity : 0,
                  repeatType: 'loop',
                  duration: line.dur,
                  ease: 'linear',
                  delay: line.del,
                }}
              />
            ))}
          </motion.g>
        </g>
      </svg>
    </div>
  );
}
