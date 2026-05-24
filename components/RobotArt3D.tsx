"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, RoundedBox } from "@react-three/drei";
import * as THREE from "three";

/**
 * Robot composed from primitive geometries — no external GLB needed.
 * Visually echoes the hero.png character: white plastic body, dark
 * screen face with amber glowing eyes, antenna with amber tip, two
 * arms holding a small bowl with a soft amber glow inside.
 */
function Robot() {
  const groupRef = useRef<THREE.Group>(null);
  const antennaRef = useRef<THREE.Group>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  const bowlGlowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    // Idle bob
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(t * 1.4) * 0.045;
    }
    // Antenna sway
    if (antennaRef.current) {
      antennaRef.current.rotation.z = Math.sin(t * 1.1) * 0.12;
    }
    // Eye + bowl emissive pulse
    const eyePulse = 1.0 + Math.sin(t * 2.2) * 0.35;
    const bowlPulse = 0.4 + Math.sin(t * 1.6) * 0.15;
    const leftMat = leftEyeRef.current?.material as THREE.MeshStandardMaterial | undefined;
    const rightMat = rightEyeRef.current?.material as THREE.MeshStandardMaterial | undefined;
    const bowlMat = bowlGlowRef.current?.material as THREE.MeshStandardMaterial | undefined;
    if (leftMat) leftMat.emissiveIntensity = eyePulse;
    if (rightMat) rightMat.emissiveIntensity = eyePulse;
    if (bowlMat) bowlMat.emissiveIntensity = bowlPulse;
  });

  return (
    <group ref={groupRef}>
      {/* Body */}
      <RoundedBox
        args={[1.15, 1.05, 0.95]}
        radius={0.18}
        smoothness={6}
        position={[0, -0.15, 0]}
      >
        <meshStandardMaterial color="#f5f5f4" roughness={0.45} metalness={0.05} />
      </RoundedBox>

      {/* Head */}
      <RoundedBox
        args={[1.05, 0.9, 0.9]}
        radius={0.18}
        smoothness={6}
        position={[0, 0.78, 0]}
      >
        <meshStandardMaterial color="#f5f5f4" roughness={0.45} metalness={0.05} />
      </RoundedBox>

      {/* Face screen (dark inset on the front of the head) */}
      <RoundedBox
        args={[0.86, 0.66, 0.06]}
        radius={0.12}
        smoothness={4}
        position={[0, 0.78, 0.46]}
      >
        <meshStandardMaterial color="#0a0a0a" roughness={0.28} metalness={0.4} />
      </RoundedBox>

      {/* Eyes */}
      <mesh ref={leftEyeRef} position={[-0.2, 0.8, 0.5]}>
        <sphereGeometry args={[0.09, 24, 24]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#fbbf24"
          emissiveIntensity={1.1}
          roughness={0.2}
        />
      </mesh>
      <mesh ref={rightEyeRef} position={[0.2, 0.8, 0.5]}>
        <sphereGeometry args={[0.09, 24, 24]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#fbbf24"
          emissiveIntensity={1.1}
          roughness={0.2}
        />
      </mesh>

      {/* Antenna (rooted at the top of the head, swaying group) */}
      <group ref={antennaRef} position={[0, 1.23, 0]}>
        <mesh position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.36, 16]} />
          <meshStandardMaterial color="#e5e5e5" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.42, 0]}>
          <sphereGeometry args={[0.075, 20, 20]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#fbbf24"
            emissiveIntensity={0.95}
            roughness={0.2}
          />
        </mesh>
      </group>

      {/* Arms */}
      <mesh position={[-0.62, -0.06, 0.18]} rotation={[0, 0, -0.32]}>
        <cylinderGeometry args={[0.08, 0.08, 0.55, 16]} />
        <meshStandardMaterial color="#f5f5f4" roughness={0.45} />
      </mesh>
      <mesh position={[0.62, -0.06, 0.18]} rotation={[0, 0, 0.32]}>
        <cylinderGeometry args={[0.08, 0.08, 0.55, 16]} />
        <meshStandardMaterial color="#f5f5f4" roughness={0.45} />
      </mesh>

      {/* Hands */}
      <RoundedBox
        args={[0.2, 0.2, 0.2]}
        radius={0.06}
        smoothness={4}
        position={[-0.48, -0.34, 0.44]}
      >
        <meshStandardMaterial color="#f5f5f4" roughness={0.45} />
      </RoundedBox>
      <RoundedBox
        args={[0.2, 0.2, 0.2]}
        radius={0.06}
        smoothness={4}
        position={[0.48, -0.34, 0.44]}
      >
        <meshStandardMaterial color="#f5f5f4" roughness={0.45} />
      </RoundedBox>

      {/* Bowl wall (open-top truncated cone) */}
      <mesh position={[0, -0.4, 0.58]} rotation={[Math.PI, 0, 0]}>
        <cylinderGeometry args={[0.32, 0.22, 0.22, 32, 1, true]} />
        <meshStandardMaterial
          color="#fafaf9"
          roughness={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Bowl floor disc (the soft amber glow inside the bowl) */}
      <mesh
        ref={bowlGlowRef}
        position={[0, -0.5, 0.58]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[0.21, 32]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#fbbf24"
          emissiveIntensity={0.45}
        />
      </mesh>

      {/* Base / feet */}
      <mesh position={[0, -0.78, 0]}>
        <cylinderGeometry args={[0.55, 0.62, 0.16, 32]} />
        <meshStandardMaterial color="#e5e5e5" roughness={0.5} />
      </mesh>
    </group>
  );
}

export function RobotArt3D() {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0.35, 3.4], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 4, 5]} intensity={1.1} />
      <directionalLight position={[-4, 2, -3]} intensity={0.4} color="#bcd0ff" />
      <pointLight color="#fbbf24" intensity={0.7} position={[0, -0.6, 0.7]} distance={1.6} />

      <Robot />

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        autoRotate
        autoRotateSpeed={0.6}
        minPolarAngle={Math.PI / 3.2}
        maxPolarAngle={Math.PI / 1.8}
        target={[0, 0.05, 0]}
      />
    </Canvas>
  );
}
