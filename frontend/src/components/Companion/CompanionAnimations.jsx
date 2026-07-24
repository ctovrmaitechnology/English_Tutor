import { memo, useEffect, useRef, Suspense, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import CompanionEvents from './CompanionEvents';

const TALKING_STATES = new Set(['ai_talking', 'challenge_started', 'clicked', 'hover_wave']);

// ── Character animation path map ──────────────────────────────────────────────
// Add new characters here as their GLB files become available.
// Each character needs: standing, talking, hello, victory, chicken_dance, dance_2
const CHARACTER_PATHS = {
  eva: {
    standing: '/Eva.glb',
    talking: '/Evatalking.glb',
    hello: '/Evahello.glb',
    victory: '/Evavictory.glb',
    chicken_dance: '/Evachicken_dance.glb',
    dance_2: '/Evadance_2.glb',
  },
  zap: {
    standing: '/Zap.glb',
    talking: '/Zap.glb',
    hello: '/Zap.glb',
    victory: '/Zap.glb',
    chicken_dance: '/Zap.glb',
    dance_2: '/Zap.glb',
  },
  tecci: {
    standing: '/Tecci.glb',
    talking: '/Tecci.glb',
    hello: '/Tecci.glb',
    victory: '/Tecci.glb',
    chicken_dance: '/Tecci.glb',
    dance_2: '/Tecci.glb',
  },
  buffy: {
    standing: '/Buffy.glb',
    talking: '/Buffy.glb',
    hello: '/Buffy.glb',
    victory: '/Buffy.glb',
    chicken_dance: '/Buffy.glb',
    dance_2: '/Buffy.glb',
  },
  shadow: {
    standing: '/shadow.glb',
    talking: '/shadow.glb',
    hello: '/shadow.glb',
    victory: '/shadow.glb',
    chicken_dance: '/shadow.glb',
    dance_2: '/shadow.glb',
    _fallback: '/Eva.glb',
  },
  nova: {
    standing: '/nova.glb',
    talking: '/nova.glb',
    hello: '/nova.glb',
    victory: '/nova.glb',
    chicken_dance: '/nova.glb',
    dance_2: '/nova.glb',
    _fallback: '/Eva.glb',
  },
  titan: {
    standing: '/titan.glb',
    talking: '/titan.glb',
    hello: '/titan.glb',
    victory: '/titan.glb',
    chicken_dance: '/titan.glb',
    dance_2: '/titan.glb',
    _fallback: '/Eva.glb',
  },
};

export const KENZA_PATHS = {
  standing: '/kenzaidle11.glb',
  talking: '/kenzatalk2glb.glb',
  hello: '/kenzagreeting%20.glb',
  happy: '/kenzahappy%20.glb',
  waving: '/kenzawaving%20.glb',
  idle2: '/kenzaidle2%20.glb',
  angry: '/kenzaanger.glb',
};

function getPath(character, animation) {
  if (!character || character === 'kenza' || !CHARACTER_PATHS[character]) {
    return KENZA_PATHS[animation] || KENZA_PATHS.standing;
  }
  const paths = CHARACTER_PATHS[character] || CHARACTER_PATHS.eva;
  return paths[animation] || paths._fallback || KENZA_PATHS[animation] || KENZA_PATHS.standing;
}

// ── Generic Avatar Model ───────────────────────────────────────────────────────
// One reusable component for all animations — handles loop/once/talking states
function AvatarModel({ path, loop = true, speed = 0.8, onFinished, isTalking = false }) {
  const outerGroup = useRef();
  const innerGroup = useRef();
  const { scene, animations } = useGLTF(path);
  const { actions, names, mixer } = useAnimations(animations, innerGroup);

  useEffect(() => {
    if (!scene) return;
    scene.rotation.set(0, 0, 0);
    scene.updateMatrixWorld(true);
  }, [scene]);

  useEffect(() => {
    if (!names.length) return;
    const action = actions[names[0]];
    if (!action) return;
    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    if (!loop) action.clampWhenFinished = true;
    action.setEffectiveTimeScale(speed);
    action.setEffectiveWeight(1);
    action.reset().play();

    if (!loop && onFinished && mixer) {
      const handle = (e) => { if (e.action === action) onFinished(); };
      mixer.addEventListener('finished', handle);
      return () => { mixer.removeEventListener('finished', handle); action.stop(); };
    }
    return () => { action.stop(); };
  }, [actions, names, loop, speed, onFinished, mixer]);

  // Animate mouth for talking state
  useFrame((state) => {
    if (!isTalking || !scene) return;
    const time = state.clock.getElapsedTime();
    const mouthOpen = (Math.sin(time * 16) * 0.45 + 0.45) * (0.6 + Math.random() * 0.4);
    const jawOpen = mouthOpen * 0.8;
    const visemeAE = (Math.sin(time * 12) * 0.3 + 0.3) * mouthOpen;
    const visemeO = (Math.cos(time * 10) * 0.3 + 0.3) * mouthOpen;

    scene.traverse((child) => {
      if (child.isMesh && child.morphTargetDictionary && child.morphTargetInfluences) {
        const d = child.morphTargetDictionary;
        if ('mouthOpen' in d) child.morphTargetInfluences[d['mouthOpen']] = mouthOpen;
        if ('jawOpen' in d) child.morphTargetInfluences[d['jawOpen']] = jawOpen;
        if ('mouthSmile' in d) child.morphTargetInfluences[d['mouthSmile']] = 0.15;
        if ('viseme_aa' in d) child.morphTargetInfluences[d['viseme_aa']] = mouthOpen;
        if ('viseme_O' in d) child.morphTargetInfluences[d['viseme_O']] = visemeO;
        if ('viseme_E' in d) child.morphTargetInfluences[d['viseme_E']] = visemeAE;
        if ('viseme_I' in d) child.morphTargetInfluences[d['viseme_I']] = visemeAE * 0.5;
        if ('viseme_U' in d) child.morphTargetInfluences[d['viseme_U']] = visemeO * 0.5;
      }
    });
  });

  // Cleanup morph targets on unmount
  useEffect(() => {
    return () => {
      if (!scene) return;
      scene.traverse((child) => {
        if (child.isMesh && child.morphTargetDictionary && child.morphTargetInfluences) {
          const dict = child.morphTargetDictionary;
          Object.keys(dict).forEach(key => {
            child.morphTargetInfluences[dict[key]] = 0;
          });
        }
      });
    };
  }, [scene]);

  const isKenza = path && path.toLowerCase().includes('kenza');
  const scale = isKenza ? [1.3, 1.3, 1.3] : [150, 150, 150];
  const positionY = isKenza ? -1.0 : -0.8;

  return (
    <group ref={outerGroup}>
      <group ref={innerGroup} scale={scale} position={[0, positionY, 0]}>
        <primitive object={scene} dispose={null} />
      </group>
    </group>
  );
}

// ── State → animation mapping ──────────────────────────────────────────────────
function CharacterModel({ state, character }) {
  const char = character || 'kenza';

  if (state === 'victory' || state === 'ai_happy' || state === 'assessment_submitted' || state === 'badge_unlocked') {
    return <AvatarModel key={`victory-${char}`} path={getPath(char, 'victory')} speed={0.9} />;
  }
  if (state === 'chicken_dance') {
    return <AvatarModel key={`chicken-${char}`} path={getPath(char, 'chicken_dance')} speed={0.95} />;
  }
  if (state === 'dance_2') {
    return <AvatarModel key={`dance2-${char}`} path={getPath(char, 'dance_2')} speed={0.9} />;
  }
  if (state === 'hello' || state === 'hover_wave') {
    return (
      <AvatarModel
        key={`hello-${char}`}
        path={getPath(char, 'hello')}
        loop={false}
        speed={0.9}
        onFinished={() => CompanionEvents.emit('WAVE_FINISHED')}
      />
    );
  }
  if (TALKING_STATES.has(state)) {
    return <AvatarModel key={`talking-${char}`} path={getPath(char, 'talking')} speed={0.8} isTalking />;
  }
  return <AvatarModel key={`standing-${char}`} path={getPath(char, 'standing')} speed={0.4} />;
}

// Preload core character GLB assets so they render instantly with 0ms latency
[
  '/Eva.glb',
  '/Evatalking.glb',
  '/Evahello.glb',
  '/Evavictory.glb',
  '/Zap.glb',
  '/Tecci.glb',
  '/Buffy.glb',
  '/kenzaidle11.glb',
  '/kenzatalk2glb.glb',
].forEach(path => {
  try {
    useGLTF.preload(path);
  } catch (e) { }
});

// ── Loading / Error fallbacks ─────────────────────────────────────────────────
function LoadingFallback() {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      <div style={{
        width: 60, height: 60, borderRadius: '50%',
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 30, color: '#fff',
        boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
        animation: 'glb-pulse 1.2s ease-in-out infinite'
      }}>
        🤖
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#6366f1', letterSpacing: '0.04em' }}>Loading Character…</span>
    </div>
  );
}

function ContextLostOverlay({ onRetry }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      <span style={{ fontSize: 36 }}>🤖</span>
      <button onClick={onRetry} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
        Reload Character
      </button>
    </div>
  );
}

// ── Main exported component ───────────────────────────────────────────────────
const CompanionAnimations = memo(function CompanionAnimations({ state = 'idle', character = 'eva' }) {
  const [contextLost, setContextLost] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);

  const handleRetry = () => { setContextLost(false); setCanvasKey(k => k + 1); };

  if (contextLost) {
    return (
      <div className={`panda-graphic-wrapper panda-state--${state}`}>
        <ContextLostOverlay onRetry={handleRetry} />
      </div>
    );
  }

  return (
    <div className={`panda-graphic-wrapper panda-state--${state}`}>
      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          key={canvasKey}
          camera={{ fov: 45, near: 0.01, far: 500, position: [0, 0.3, 2.8] }}
          gl={{ alpha: true, antialias: true, powerPreference: 'high-performance', failIfMajorPerformanceCaveat: false }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
            gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
          }}
          onContextLost={() => setContextLost(true)}
        >
          <ambientLight intensity={2.5} />
          <directionalLight position={[2, 3, 3]} intensity={3} />
          <directionalLight position={[-2, 1, -1]} intensity={1.2} />
          <pointLight position={[0, 2, 2]} intensity={2} color="#bfdbfe" />
          <Suspense fallback={null}>
            <CharacterModel state={state} character={character} />
          </Suspense>
        </Canvas>
      </Suspense>
    </div>
  );
});

export default CompanionAnimations;