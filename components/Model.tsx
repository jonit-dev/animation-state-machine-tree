import React, { useEffect, useRef } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import type { GLTF } from 'three-stdlib';
import type { ModelConfig } from '../types';

interface ModelProps {
  modelConfig: ModelConfig;
  onAnimationsLoaded: (animations: THREE.AnimationClip[]) => void;
  activeAnimationName: string | null;
  transitionDuration: number;
}

type GLTFResult = GLTF & {
    nodes: {
        [key: string]: THREE.SkinnedMesh | THREE.Bone;
    };
    materials: {
        [key: string]: THREE.Material;
    };
};

export function Model({ modelConfig, onAnimationsLoaded, activeAnimationName, transitionDuration }: ModelProps) {
  const group = useRef<THREE.Group>(null);
  // The model URL is now dynamic, coming from props.
  const { scene, animations } = useGLTF(modelConfig.url) as unknown as GLTFResult;
  const { actions } = useAnimations(animations, group);
  const previousAction = useRef<THREE.AnimationAction | null>(null);

  useEffect(() => {
    if (animations.length > 0) {
      onAnimationsLoaded(animations);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animations]);

  useEffect(() => {
    scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
            object.castShadow = true;
        }
    });
  }, [scene]);

  useEffect(() => {
    const currentAction = activeAnimationName ? actions[activeAnimationName] : null;

    if (previousAction.current && previousAction.current !== currentAction) {
        previousAction.current.fadeOut(transitionDuration);
    }

    if (currentAction) {
        currentAction.reset().fadeIn(transitionDuration).play();
    }
    
    previousAction.current = currentAction || null;

  }, [actions, activeAnimationName, transitionDuration]);

  // Position and scale are now applied dynamically from props.
  return (
    <primitive 
      object={scene} 
      ref={group} 
      dispose={null} 
      position={modelConfig.position || [0, 0, 0]}
      scale={modelConfig.scale || 1}
      rotation={modelConfig.rotation || [0, 0, 0]}
    />
  );
}