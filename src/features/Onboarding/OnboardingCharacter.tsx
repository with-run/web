import { useRive } from '@rive-app/react-canvas';
import { motion } from 'motion/react';

type OnboardingCharacterProps = {
  state: OnboardingCharacterState;
};

type OnboardingCharacterState = 'login' | 'form';

export function OnboardingCharacter({ state }: OnboardingCharacterProps) {
  const containerVariants = {
    login: { y: -200, scale: 3 },
    form: { y: -200, scale: 3 },
  };

  const { RiveComponent } = useRive({
    src: '/rive/withrun_character.riv',
    artboard: 'main',
    animations: 'running',
    autoplay: true,
  });

  return (
    <motion.div
      variants={containerVariants}
      initial={false}
      animate={state}
      className="relative z-10 flex flex-col items-center justify-center"
    >
      <div className="relative h-64 w-40">
        <RiveComponent className="h-full w-full" />
      </div>
    </motion.div>
  );
}
