import { motion } from 'motion/react';

export function OnboardingIntro() {
  return (
    <motion.div
      key="onboarding-intro"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#3388FF]"
    >
      <motion.h1
        initial={{ scale: 0.8, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 12, duration: 1 }}
        className="text-5xl font-extrabold tracking-tight text-white"
      >
        With Run
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.8 }}
        className="mt-3 text-lg font-medium text-white/90"
      >
        당신의 러닝 메이트
      </motion.p>
    </motion.div>
  );
}
