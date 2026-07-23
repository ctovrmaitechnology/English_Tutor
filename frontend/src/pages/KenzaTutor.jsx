import React, { Suspense, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

const KENZA = {
  standing: '/kenzaidle11.glb',
  talking:  '/kenzatalk2glb.glb',
  hello:    '/kenzagreeting%20.glb',
  happy:    '/kenzahappy%20.glb',
  waving:   '/kenzawaving%20.glb',
  idle2:    '/kenzaidle2%20.glb',
  angry:    '/kenzaanger.glb',
};

// 4. Preload all GLB models at module scope
Object.values(KENZA).forEach((path) => {
  try {
    useGLTF.preload(path);
  } catch (e) {
    console.warn(`Failed to preload GLB model at ${path}:`, e);
  }
});

class KenzaErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('KenzaTutor WebGL Canvas failed to render, displaying fallback:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 24,
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          color: '#fff',
          fontSize: 48,
          boxShadow: '0 8px 24px rgba(99,102,241,0.25)',
        }}>
          🤖
        </div>
      );
    }
    return this.props.children;
  }
}

function KenzaModel({ animPath, visible }) {
  const group = useRef();
  const { scene, animations } = useGLTF(animPath);
  const { actions, names }    = useAnimations(animations, group);

  // 1 & 3. Disable frustum culling & fix material transparency/depthWrite to prevent disappearing mesh
  useEffect(() => {
    if (!scene) return;
    scene.rotation.set(0, 0, 0);
    scene.updateMatrixWorld(true);
    scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.frustumCulled = false;
        if (obj.material) {
          obj.material.transparent = false;
          obj.material.depthWrite = true;
        }
      }
    });
  }, [scene]);

  // 2. Smooth animation transitions with fadeOut/fadeIn crossfading
  useEffect(() => {
    if (!visible) {
      Object.values(actions).forEach((action) => action?.stop());
      return;
    }
    if (!names.length) return;
    const currentAction = actions[names[0]];
    if (!currentAction) return;

    Object.values(actions).forEach((action) => {
      if (action && action !== currentAction) {
        action.fadeOut(0.3);
      }
    });

    currentAction
      .reset()
      .setLoop(THREE.LoopRepeat, Infinity)
      .setEffectiveTimeScale(0.7)
      .setEffectiveWeight(1)
      .fadeIn(0.3)
      .play();

    return () => {
      currentAction?.fadeOut(0.3);
    };
  }, [actions, names, visible]);

  return (
    <group ref={group} scale={[1.3, 1.3, 1.3]} position={[0, -0.9, 0]} visible={visible}>
      <primitive object={scene} dispose={null} />
    </group>
  );
}

function KenzaFallback() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 24,
      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      color: '#fff',
      fontSize: 48,
      boxShadow: '0 8px 24px rgba(99,102,241,0.25)',
      animation: 'glb-pulse 1.2s ease-in-out infinite'
    }}>
      👩‍🏫
    </div>
  );
}

// Unique list of model paths to keep pre-mounted
const UNIQUE_KENZA_PATHS = Array.from(new Set(Object.values(KENZA)));

function KenzaCanvas({ animPath }) {
  return (
    <Canvas
      // 5. Generous near and far clipping planes
      camera={{ fov: 44, near: 0.01, far: 1000, position: [0, 0.3, 2.6] }}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        try {
          gl.setClearColor(0x000000, 0);
          gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        } catch (e) {
          console.warn('Canvas initialization failed:', e);
        }
      }}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={2.5} />
      <directionalLight position={[2, 3, 3]} intensity={3} />
      <directionalLight position={[-2, 1, -1]} intensity={1.2} />
      <pointLight position={[0, 2, 2]} intensity={2} color="#fde68a" />
      <Suspense fallback={null}>
        {/* 4. Keep all models mounted and toggle visibility to eliminate flicker/disappearances */}
        {UNIQUE_KENZA_PATHS.map((path) => (
          <KenzaModel key={path} animPath={path} visible={animPath === path} />
        ))}
      </Suspense>
    </Canvas>
  );
}

export default function KenzaTutor({ state = 'standing', size = '200px' }) {
  const animPath = KENZA[state] || KENZA.standing;

  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <KenzaErrorBoundary>
        <Suspense fallback={<KenzaFallback />}>
          <KenzaCanvas animPath={animPath} />
        </Suspense>
      </KenzaErrorBoundary>
    </div>
  );
}

export { KENZA };