import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useProgress, Html, Grid, Environment } from '@react-three/drei';
import type { AnimationClip } from 'three';
import { Model } from './Model';
import type { ModelConfig } from '../types';

interface ModelViewerProps {
  modelConfig: ModelConfig;
  onAnimationsLoaded: (animations: AnimationClip[]) => void;
  activeAnimationName: string | null;
  activePreviewName: string | null;
  transitionDuration: number;
}

function Loader() {
  const { progress } = useProgress();
  return <Html center className="text-slate-300">{progress.toFixed(1)} % loaded</Html>;
}

export default function ModelViewer({ modelConfig, onAnimationsLoaded, activeAnimationName, activePreviewName, transitionDuration }: ModelViewerProps) {
  return (
    <div className="relative h-full w-full bg-slate-900">
        <Canvas
            camera={{ position: [2, 2, 4], fov: 50 }}
            shadows
        >
            <color attach="background" args={['#0f172a']} />
            <ambientLight intensity={0.5} />
            <directionalLight 
                position={[5, 10, 7.5]} 
                intensity={1.5} 
                castShadow 
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
            />
            <Suspense fallback={<Loader />}>
                <Environment preset="city" />
                <Model 
                  modelConfig={modelConfig}
                  onAnimationsLoaded={onAnimationsLoaded}
                  activeAnimationName={activeAnimationName}
                  transitionDuration={transitionDuration}
                />
            </Suspense>
            <Grid 
                position={[0, -1.001, 0]}
                infiniteGrid 
                cellSize={0.5} 
                cellThickness={0.5} 
                sectionSize={2} 
                sectionThickness={1} 
                fadeDistance={25}
                cellColor="#334155"
                sectionColor="#475569"
            />
            <mesh rotation={[-0.5 * Math.PI, 0, 0]} position={[0, -1, 0]} receiveShadow>
                <planeGeometry args={[100, 100]} />
                <shadowMaterial transparent opacity={0.4} />
            </mesh>
            <OrbitControls />
        </Canvas>
        {activePreviewName && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/50 backdrop-blur-sm text-slate-200 px-4 py-2 rounded-lg text-sm font-semibold pointer-events-none border border-slate-700">
                Previewing: <span className="font-bold text-teal-300">{activePreviewName}</span>
            </div>
        )}
    </div>
  );
}