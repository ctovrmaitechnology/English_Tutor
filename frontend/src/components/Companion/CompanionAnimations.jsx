import { memo, useEffect, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import CompanionEvents from './CompanionEvents';

const TALKING_STATES = new Set(['ai_talking', 'challenge_started', 'clicked', 'hover_wave']);

// Preload all model resources
useGLTF.preload('/standing.glb');
useGLTF.preload('/talking.glb');
useGLTF.preload('/victory.glb');
useGLTF.preload('/chicken_dance.glb');
useGLTF.preload('/dance_2.glb');
useGLTF.preload('/hello.glb');




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
    const clipName = names[0]; // 'Armature|mixamo.com|Layer0'
    const action = actions[clipName];
    if (!action) return;

    action.setLoop(THREE.LoopRepeat, Infinity);
    // 0.8x speed for natural expressive hand gestures and body movement during speech
    action.setEffectiveTimeScale(0.8);
    action.setEffectiveWeight(1);
    action.reset().play();

    return () => {
      action.stop();
    };
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
    const clipName = names[0]; // 'Armature|mixamo.com|Layer0'
    const action = actions[clipName];
    if (!action) return;

    action.setLoop(THREE.LoopRepeat, Infinity);
    // 0.4x speed for a natural, relaxed breathing idle standing posture
    action.setEffectiveTimeScale(0.4);
    action.setEffectiveWeight(1);
    action.reset().play();

    return () => {
      action.stop();
    };
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

    return () => {
      action.stop();
    };
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

    return () => {
      action.stop();
    };
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

    return () => {
      action.stop();
    };
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
// Switcher Component
// ─────────────────────────────────────────────────────────────────
function AvatarModel({ state }) {
  if (state === 'victory' || state === 'ai_happy' || state === 'assessment_submitted' || state === 'badge_unlocked') {
    return <VictoryAvatarModel />;
  }
  if (state === 'chicken_dance') {
    return <ChickenDanceAvatarModel />;
  }
  if (state === 'dance_2') {
    return <Dance2AvatarModel />;
  }
  if (state === 'hello' || state === 'hover_wave') {
    return <HelloAvatarModel />;
  }
  if (TALKING_STATES.has(state)) {
    return <TalkingAvatarModel />;
  }
  return <StandingAvatarModel />;
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
// Main exported component
// ─────────────────────────────────────────────────────────────────
const CompanionAnimations = memo(function CompanionAnimations({ state = 'idle' }) {
  return (
    <div className={`panda-graphic-wrapper panda-state--${state}`}>
      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          camera={{ fov: 45, near: 0.01, far: 500, position: [0, 0.3, 2.8] }}
          gl={{
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance',
          }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
            gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
          }}
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
