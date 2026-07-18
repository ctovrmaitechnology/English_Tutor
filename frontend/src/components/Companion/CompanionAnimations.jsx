import { memo, useEffect, useRef, Suspense, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import CompanionEvents from './CompanionEvents';

const TALKING_STATES = new Set(['ai_talking', 'challenge_started', 'clicked', 'hover_wave']);

// ── Removed all useGLTF.preload() calls — they loaded all 6 GLBs
// into GPU memory simultaneously, causing GL_OUT_OF_MEMORY crashes.
// Now only the model needed for the current state loads on demand.

// ─────────────────────────────────────────────────────────────────
// Talking Avatar (Plays the speech/talking animation)
// ─────────────────────────────────────────────────────────────────
function TalkingAvatarModel() {
  const outerGroup = useRef();
  const innerGroup = useRef();
  const { scene, animations } = useGLTF('/talking.glb');
  const { actions, names } = useAnimations(animations, innerGroup);

  useEffect(() => {
    if (!scene) return;
    scene.rotation.set(0, 0, 0);
    scene.updateMatrixWorld(true);
  }, [scene]);

  useEffect(() => {
    if (!names.length) return;
    const clipName = names[0];
    const action = actions[clipName];
    if (!action) return;

    action.setLoop(THREE.LoopRepeat, Infinity);
    action.setEffectiveTimeScale(0.8);
    action.setEffectiveWeight(1);
    action.reset().play();

    return () => { action.stop(); };
  }, [actions, names]);

  // Clean up morph targets on unmount
  useEffect(() => {
    return () => {
      if (!scene) return;
      scene.traverse((child) => {
        if (child.isMesh && child.morphTargetDictionary && child.morphTargetInfluences) {
          const dict = child.morphTargetDictionary;
          Object.keys(dict).forEach((key) => {
            child.morphTargetInfluences[dict[key]] = 0;
          });
        }
      });
    };
  }, [scene]);

  // Animate mouth/lip targets dynamically to simulate talking
  useFrame((state) => {
    if (!scene) return;
    const time = state.clock.getElapsedTime();
    const mouthOpen = (Math.sin(time * 16) * 0.45 + 0.45) * (0.6 + Math.random() * 0.4);
    const jawOpen   = mouthOpen * 0.8;
    const visemeAE  = (Math.sin(time * 12) * 0.3 + 0.3) * mouthOpen;
    const visemeO   = (Math.cos(time * 10) * 0.3 + 0.3) * mouthOpen;

    scene.traverse((child) => {
      if (child.isMesh && child.morphTargetDictionary && child.morphTargetInfluences) {
        const dict = child.morphTargetDictionary;
        if ('mouthOpen'  in dict) child.morphTargetInfluences[dict['mouthOpen']]  = mouthOpen;
        if ('jawOpen'    in dict) child.morphTargetInfluences[dict['jawOpen']]    = jawOpen;
        if ('mouthSmile' in dict) child.morphTargetInfluences[dict['mouthSmile']] = 0.15;
        if ('viseme_aa'  in dict) child.morphTargetInfluences[dict['viseme_aa']]  = mouthOpen;
        if ('viseme_O'   in dict) child.morphTargetInfluences[dict['viseme_O']]   = visemeO;
        if ('viseme_E'   in dict) child.morphTargetInfluences[dict['viseme_E']]   = visemeAE;
        if ('viseme_I'   in dict) child.morphTargetInfluences[dict['viseme_I']]   = visemeAE * 0.5;
        if ('viseme_U'   in dict) child.morphTargetInfluences[dict['viseme_U']]   = visemeO  * 0.5;
      }
    });
  });

  return (
    <group ref={outerGroup} rotation={[0, 0, 0]}>
      <group ref={innerGroup} scale={[150, 150, 150]} position={[0, -0.8, 0]}>
        <primitive object={scene} dispose={null} />
      </group>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────
// Standing Avatar (Plays the idle standing breathing animation)
// ─────────────────────────────────────────────────────────────────
function StandingAvatarModel() {
  const outerGroup = useRef();
  const innerGroup = useRef();
  const { scene, animations } = useGLTF('/standing.glb');
  const { actions, names } = useAnimations(animations, innerGroup);

  useEffect(() => {
    if (!scene) return;
    scene.rotation.set(0, 0, 0);
    scene.updateMatrixWorld(true);
  }, [scene]);

  useEffect(() => {
    if (!names.length) return;
    const clipName = names[0];
    const action = actions[clipName];
    if (!action) return;

    action.setLoop(THREE.LoopRepeat, Infinity);
    action.setEffectiveTimeScale(0.4);
    action.setEffectiveWeight(1);
    action.reset().play();

    return () => { action.stop(); };
  }, [actions, names]);

  return (
    <group ref={outerGroup} rotation={[0, 0, 0]}>
      <group ref={innerGroup} scale={[150, 150, 150]} position={[0, -0.8, 0]}>
        <primitive object={scene} dispose={null} />
      </group>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────
// Victory/Celebration Avatar (Plays the victory dance)
// ─────────────────────────────────────────────────────────────────
function VictoryAvatarModel() {
  const outerGroup = useRef();
  const innerGroup = useRef();
  const { scene, animations } = useGLTF('/victory.glb');
  const { actions, names } = useAnimations(animations, innerGroup);

  useEffect(() => {
    if (!scene) return;
    scene.rotation.set(0, 0, 0);
    scene.updateMatrixWorld(true);
  }, [scene]);

  useEffect(() => {
    if (!names.length) return;
    const clipName = names[0];
    const action = actions[clipName];
    if (!action) return;

    action.setLoop(THREE.LoopRepeat, Infinity);
    action.setEffectiveTimeScale(0.9);
    action.setEffectiveWeight(1);
    action.reset().play();

    return () => { action.stop(); };
  }, [actions, names]);

  return (
    <group ref={outerGroup} rotation={[0, 0, 0]}>
      <group ref={innerGroup} scale={[150, 150, 150]} position={[0, -0.8, 0]}>
        <primitive object={scene} dispose={null} />
      </group>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────
// Chicken Dance Avatar
// ─────────────────────────────────────────────────────────────────
function ChickenDanceAvatarModel() {
  const outerGroup = useRef();
  const innerGroup = useRef();
  const { scene, animations } = useGLTF('/chicken_dance.glb');
  const { actions, names } = useAnimations(animations, innerGroup);

  useEffect(() => {
    if (!scene) return;
    scene.rotation.set(0, 0, 0);
    scene.updateMatrixWorld(true);
  }, [scene]);

  useEffect(() => {
    if (!names.length) return;
    const clipName = names[0];
    const action = actions[clipName];
    if (!action) return;

    action.setLoop(THREE.LoopRepeat, Infinity);
    action.setEffectiveTimeScale(0.95);
    action.setEffectiveWeight(1);
    action.reset().play();

    return () => { action.stop(); };
  }, [actions, names]);

  return (
    <group ref={outerGroup} rotation={[0, 0, 0]}>
      <group ref={innerGroup} scale={[150, 150, 150]} position={[0, -0.8, 0]}>
        <primitive object={scene} dispose={null} />
      </group>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────
// Dance 2 Avatar
// ─────────────────────────────────────────────────────────────────
function Dance2AvatarModel() {
  const outerGroup = useRef();
  const innerGroup = useRef();
  const { scene, animations } = useGLTF('/dance_2.glb');
  const { actions, names } = useAnimations(animations, innerGroup);

  useEffect(() => {
    if (!scene) return;
    scene.rotation.set(0, 0, 0);
    scene.updateMatrixWorld(true);
  }, [scene]);

  useEffect(() => {
    if (!names.length) return;
    const clipName = names[0];
    const action = actions[clipName];
    if (!action) return;

    action.setLoop(THREE.LoopRepeat, Infinity);
    action.setEffectiveTimeScale(0.9);
    action.setEffectiveWeight(1);
    action.reset().play();

    return () => { action.stop(); };
  }, [actions, names]);

  return (
    <group ref={outerGroup} rotation={[0, 0, 0]}>
      <group ref={innerGroup} scale={[150, 150, 150]} position={[0, -0.8, 0]}>
        <primitive object={scene} dispose={null} />
      </group>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────
// Hello/Wave Avatar (Plays the hello/wave animation)
// ─────────────────────────────────────────────────────────────────
function HelloAvatarModel() {
  const outerGroup = useRef();
  const innerGroup = useRef();
  const { scene, animations } = useGLTF('/hello.glb');
  const { actions, names, mixer } = useAnimations(animations, innerGroup);

  useEffect(() => {
    if (!scene) return;
    scene.rotation.set(0, 0, 0);
    scene.updateMatrixWorld(true);
  }, [scene]);

  useEffect(() => {
    if (!names.length) return;
    const clipName = names[0];
    const action = actions[clipName];
    if (!action) return;

    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.setEffectiveTimeScale(0.9);
    action.setEffectiveWeight(1);
    action.reset().play();

    const handleFinished = (e) => {
      if (e.action === action) {
        CompanionEvents.emit('WAVE_FINISHED');
      }
    };

    mixer.addEventListener('finished', handleFinished);

    return () => {
      mixer.removeEventListener('finished', handleFinished);
      action.stop();
    };
  }, [actions, names, mixer]);

  return (
    <group ref={outerGroup} rotation={[0, 0, 0]}>
      <group ref={innerGroup} scale={[150, 150, 150]} position={[0, -0.8, 0]}>
        <primitive object={scene} dispose={null} />
      </group>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────
// Switcher — only the matching component mounts, others are unmounted
// key prop on each ensures full cleanup when switching models
// ─────────────────────────────────────────────────────────────────
function AvatarModel({ state }) {
  if (state === 'victory' || state === 'ai_happy' || state === 'assessment_submitted' || state === 'badge_unlocked') {
    return <VictoryAvatarModel key="victory" />;
  }
  if (state === 'chicken_dance') {
    return <ChickenDanceAvatarModel key="chicken" />;
  }
  if (state === 'dance_2') {
    return <Dance2AvatarModel key="dance2" />;
  }
  if (state === 'hello' || state === 'hover_wave') {
    return <HelloAvatarModel key="hello" />;
  }
  if (TALKING_STATES.has(state)) {
    return <TalkingAvatarModel key="talking" />;
  }
  return <StandingAvatarModel key="standing" />;
}

// ─────────────────────────────────────────────────────────────────
// Loading fallback
// ─────────────────────────────────────────────────────────────────
function LoadingFallback() {
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '8px',
    }}>
      <div style={{
        width: '48px', height: '48px', borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 35%, #60a5fa, #2563eb)',
        animation: 'glb-pulse 1.4s ease-in-out infinite',
        boxShadow: '0 0 18px rgba(37,99,235,0.4)',
      }} />
      <span style={{ fontSize: '10px', color: '#94a3b8', letterSpacing: '0.04em' }}>Loading…</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// WebGL context lost — shows a retry button instead of blank screen
// ─────────────────────────────────────────────────────────────────
function ContextLostOverlay({ onRetry }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '10px',
    }}>
      <span style={{ fontSize: '36px' }}>🤖</span>
      <button
        onClick={onRetry}
        style={{
          background: '#3b82f6', color: '#fff', border: 'none',
          borderRadius: '8px', padding: '8px 16px',
          fontSize: '12px', fontWeight: 600, cursor: 'pointer',
        }}
      >
        Reload Character
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main exported component
// ─────────────────────────────────────────────────────────────────
const CompanionAnimations = memo(function CompanionAnimations({ state = 'idle' }) {
  const [contextLost, setContextLost] = useState(false);
  const [canvasKey, setCanvasKey]     = useState(0);

  const handleRetry = () => {
    setContextLost(false);
    setCanvasKey(k => k + 1); // remount Canvas fresh with a new WebGL context
  };

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
          gl={{
            alpha: true,
            antialias: true,
            powerPreference: 'default',        // was 'high-performance' — reduced GPU pressure
            failIfMajorPerformanceCaveat: false,
          }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
            gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // was 2 — reduced
          }}
          onContextLost={() => setContextLost(true)}
        >
          <ambientLight intensity={2.5} />
          <directionalLight position={[2, 3, 3]} intensity={3} />
          <directionalLight position={[-2, 1, -1]} intensity={1.2} />
          <pointLight position={[0, 2, 2]} intensity={2} color="#bfdbfe" />

          <Suspense fallback={null}>
            <AvatarModel state={state} />
          </Suspense>
        </Canvas>
      </Suspense>
    </div>
  );
});

export default CompanionAnimations;