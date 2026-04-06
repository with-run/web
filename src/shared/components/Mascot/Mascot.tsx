import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import type { MascotProps } from './Mascot.types';

// 디자인 토큰 hex 매핑 (Three.js는 CSS 변수를 지원하지 않아 토큰 원천값 그대로 사용)
// --primary-1:   0 100% 62% → #FF3B3B
// --primary-4:   0 100% 85% → #FFB3B3
// --gray-90:     0 0%   14% → #232323
// --secondary-2: 0 0%   10% → #1A1A1A
// --secondary-6: 0 0%   96% → #F5F5F5
const COLORS = {
  brandRed: '#FF3B3B',
  snout: '#FFB3B3',
  dark: '#232323',
  shorts: '#1A1A1A',
  horn: '#F5F5F5',
} as const;

function Bull() {
  const group = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const speed = 15;

    if (leftArm.current) leftArm.current.rotation.x = Math.sin(t * speed) * 0.8;
    if (rightArm.current)
      rightArm.current.rotation.x = Math.cos(t * speed) * 0.8;
    if (leftLeg.current) leftLeg.current.rotation.x = Math.cos(t * speed) * 0.8;
    if (rightLeg.current)
      rightLeg.current.rotation.x = Math.sin(t * speed) * 0.8;

    if (group.current) {
      group.current.position.y = Math.sin(t * speed * 2) * 0.1 - 0.5;
      group.current.position.x = 0;
      group.current.rotation.y = -Math.PI / 4;
    }

    if (head.current) {
      head.current.rotation.x = Math.sin(t * speed * 2) * 0.05;
    }
  });

  return (
    <group ref={group} scale={1.1}>
      {/* Body (Red T-Shirt) */}
      <group>
        <mesh position={[0, 0.6, 0]}>
          <boxGeometry args={[0.8, 0.9, 0.5]} />
          <meshStandardMaterial color={COLORS.brandRed} />
        </mesh>
        <Text
          position={[0, 0.6, 0.26]}
          fontSize={0.15}
          color="white"
          anchorX="center"
          anchorY="middle"
          font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff"
        >
          {'With\nRun'}
        </Text>
      </group>

      {/* Head */}
      <group ref={head} position={[0, 1.3, 0]}>
        <mesh>
          <boxGeometry args={[0.7, 0.6, 0.6]} />
          <meshStandardMaterial color={COLORS.dark} />
        </mesh>
        {/* Snout */}
        <mesh position={[0, -0.15, 0.35]}>
          <boxGeometry args={[0.4, 0.25, 0.2]} />
          <meshStandardMaterial color={COLORS.snout} />
        </mesh>
        {/* Horns */}
        <mesh position={[-0.25, 0.4, 0]} rotation={[0, 0, 0.5]}>
          <coneGeometry args={[0.08, 0.4, 16]} />
          <meshStandardMaterial color={COLORS.horn} />
        </mesh>
        <mesh position={[0.25, 0.4, 0]} rotation={[0, 0, -0.5]}>
          <coneGeometry args={[0.08, 0.4, 16]} />
          <meshStandardMaterial color={COLORS.horn} />
        </mesh>
        {/* Eyes */}
        <mesh position={[-0.15, 0.1, 0.31]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color="white" />
        </mesh>
        <mesh position={[0.15, 0.1, 0.31]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color="white" />
        </mesh>
        <mesh position={[-0.15, 0.1, 0.35]}>
          <sphereGeometry args={[0.02, 16, 16]} />
          <meshStandardMaterial color="black" />
        </mesh>
        <mesh position={[0.15, 0.1, 0.35]}>
          <sphereGeometry args={[0.02, 16, 16]} />
          <meshStandardMaterial color="black" />
        </mesh>
      </group>

      {/* Arms */}
      <group ref={leftArm} position={[-0.5, 0.9, 0]}>
        <mesh position={[0, -0.3, 0]}>
          <boxGeometry args={[0.25, 0.7, 0.25]} />
          <meshStandardMaterial color={COLORS.dark} />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.27, 0.3, 0.27]} />
          <meshStandardMaterial color={COLORS.brandRed} />
        </mesh>
      </group>
      <group ref={rightArm} position={[0.5, 0.9, 0]}>
        <mesh position={[0, -0.3, 0]}>
          <boxGeometry args={[0.25, 0.7, 0.25]} />
          <meshStandardMaterial color={COLORS.dark} />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.27, 0.3, 0.27]} />
          <meshStandardMaterial color={COLORS.brandRed} />
        </mesh>
      </group>

      {/* Legs */}
      <group ref={leftLeg} position={[-0.25, 0.15, 0]}>
        <mesh position={[0, -0.4, 0]}>
          <boxGeometry args={[0.25, 0.8, 0.25]} />
          <meshStandardMaterial color={COLORS.dark} />
        </mesh>
        <mesh position={[0, -0.1, 0]}>
          <boxGeometry args={[0.27, 0.4, 0.27]} />
          <meshStandardMaterial color={COLORS.shorts} />
        </mesh>
      </group>
      <group ref={rightLeg} position={[0.25, 0.15, 0]}>
        <mesh position={[0, -0.4, 0]}>
          <boxGeometry args={[0.25, 0.8, 0.25]} />
          <meshStandardMaterial color={COLORS.dark} />
        </mesh>
        <mesh position={[0, -0.1, 0]}>
          <boxGeometry args={[0.27, 0.4, 0.27]} />
          <meshStandardMaterial color={COLORS.shorts} />
        </mesh>
      </group>
    </group>
  );
}

export function Mascot({ className }: MascotProps) {
  return (
    <div className={`relative cursor-pointer ${className ?? 'w-24 h-24'}`}>
      {/* Glow pulse (--primary-1 / 10%) */}
      <div
        className="absolute inset-0 rounded-full blur-xl animate-pulse"
        style={{ backgroundColor: 'hsl(var(--primary-1) / 10%)' }}
      />
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 4.5]} />
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        <spotLight
          position={[-10, 10, 5]}
          angle={0.3}
          penumbra={1}
          intensity={1}
          color={COLORS.brandRed}
        />
        <Bull />
      </Canvas>
    </div>
  );
}
