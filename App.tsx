import React, { useState, useCallback } from 'react';
import type { AnimationClip } from 'three';
import AnimationStateEditor from './components/AnimationStateEditor';
import ModelViewer from './components/ModelViewer';
import type { Parameter, ModelConfig } from './types';

export default function App() {
  const [animations, setAnimations] = useState<AnimationClip[]>([]);
  const [activePreview, setActivePreview] = useState<string | null>(null);
  const [activeState, setActiveState] = useState<string | null>(null);
  const [transitionDuration, setTransitionDuration] = useState(0.5);
  
  // Model configuration is now centralized here for easy swapping.
  const [modelConfig] = useState<ModelConfig>({
    url: 'https://threejs.org/examples/models/gltf/Soldier.glb',
    position: [0, -1, 0],
    scale: 1,
  });

  const [parameters, setParameters] = useState<Parameter[]>([
    { id: 'param-speed', name: 'speed', type: 'float', value: 0, min: 0, max: 10 },
  ]);

  const handleAnimationsLoaded = useCallback((loadedAnimations: AnimationClip[]) => {
    // Logic is now more robust. It prefers 'Idle' but falls back to the first animation.
    const idleAnim = loadedAnimations.find(a => a.name === 'Idle');
    if (idleAnim) {
      setActiveState(idleAnim.name);
    } else if (loadedAnimations.length > 0) {
      setActiveState(loadedAnimations[0].name);
    }
    setAnimations(loadedAnimations);
  }, []);

  const handleSetActiveState = useCallback((name: string | null, duration: number = 0.5) => {
    setActiveState(name);
    setTransitionDuration(duration);
  }, []);

  const currentAnimation = activePreview || activeState;
  
  const parameterValues = React.useMemo(() => 
    parameters.reduce((acc, p) => {
      acc[p.name] = p.value;
      return acc;
    }, {} as Record<string, number | boolean>), 
  [parameters]);

  return (
    <div className="flex h-screen w-screen bg-slate-900 text-slate-200 font-sans overflow-hidden">
      <div className="w-full md:w-3/5 lg:w-2/3 h-full border-r-2 border-slate-800">
        <AnimationStateEditor 
          animations={animations}
          onPreview={setActivePreview}
          activePreviewName={activePreview}
          onSetActiveState={handleSetActiveState}
          activeStateName={activeState}
          parameters={parameters}
          setParameters={setParameters}
          parameterValues={parameterValues}
        />
      </div>
      <div className="hidden md:block md:w-2/5 lg:w-1/3 h-full">
        <ModelViewer 
          modelConfig={modelConfig}
          onAnimationsLoaded={handleAnimationsLoaded}
          activeAnimationName={currentAnimation}
          activePreviewName={activePreview}
          transitionDuration={transitionDuration}
        />
      </div>
    </div>
  );
}