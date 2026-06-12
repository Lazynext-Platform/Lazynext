import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { VRButton, XR, Controllers, Hands, Interactive } from '@react-three/xr';
import * as THREE from 'three';

// Mock WASM Import: In the real implementation, this loads `lazynext-wasm`
const mockNLEState = {
  getTrackCount: () => 3,
  getProjectName: () => "Spatial Edit 001",
};

function VideoClip({ position, color }: { position: [number, number, number], color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHover] = useState(false);
  const [selected, setSelected] = useState(false);

  useFrame(() => {
    if (meshRef.current) {
      // Gentle floating animation
      meshRef.current.position.y += Math.sin(Date.now() / 1000) * 0.001;
    }
  });

  return (
    <Interactive
      onHover={() => setHover(true)}
      onBlur={() => setHover(false)}
      onSelect={() => setSelected(!selected)}
    >
      <mesh ref={meshRef} position={position} scale={selected ? 1.2 : 1}>
        <boxGeometry args={[1.5, 0.5, 0.1]} />
        <meshStandardMaterial 
          color={hovered ? '#22d3ee' : color} 
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
    </Interactive>
  );
}

function Timeline() {
  const numTracks = mockNLEState.getTrackCount();
  
  return (
    <group position={[0, 1.5, -2]}>
      {/* Track 1 */}
      <VideoClip position={[-1.0, 0.6, 0]} color="#18181b" />
      <VideoClip position={[1.0, 0.6, 0]} color="#18181b" />
      
      {/* Track 2 */}
      <VideoClip position={[0, 0, 0]} color="#27272a" />
      
      {/* Track 3 */}
      <VideoClip position={[-0.5, -0.6, 0]} color="#3f3f46" />
    </group>
  );
}

export default function App() {
  return (
    <>
      <VRButton />
      <Canvas>
        <XR>
          <Controllers />
          <Hands />
          
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1.5} />
          <spotLight position={[0, 5, 0]} angle={0.3} penumbra={1} intensity={2} color="#22d3ee" />

          <Timeline />
          
          <gridHelper args={[10, 10, '#3f3f46', '#18181b']} position={[0, 0, 0]} />
        </XR>
      </Canvas>
    </>
  );
}
