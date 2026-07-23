import { useState, Suspense, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { useUser } from '../context/UserContext';

const CHARACTERS = [
  { id:'eva',   name:'Eva',   glb:'/Eva.glb',   color:'#6366f1', gradient:'linear-gradient(135deg,#4f46e5,#7c3aed)', available:true },
  { id:'zap',   name:'Zap',   glb:'/Zap.glb',   color:'#f59e0b', gradient:'linear-gradient(135deg,#d97706,#ef4444)', available:true },
  { id:'tecci', name:'Tecci', glb:'/Tecci.glb', color:'#10b981', gradient:'linear-gradient(135deg,#059669,#0891b2)', available:true },
  { id:'buffy', name:'Buffy', glb:'/Buffy.glb', color:'#ec4899', gradient:'linear-gradient(135deg,#db2777,#a855f7)', available:true },
];

function CharacterModel({ glb }) {
  const group = useRef();
  const { scene, animations } = useGLTF(glb);
  const { actions, names }    = useAnimations(animations, group);

  useEffect(() => {
    if (!scene) return;
    scene.rotation.set(0, 0, 0);
    scene.updateMatrixWorld(true);
  }, [scene]);

  useEffect(() => {
    if (!names.length) return;
    const action = actions[names[0]];
    if (!action) return;
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.setEffectiveTimeScale(0.4);
    action.setEffectiveWeight(1);
    action.reset().play();
    return () => action.stop();
  }, [actions, names]);

  return (
    <group ref={group} scale={[165, 165, 165]} position={[0, -0.9, 0]}>
      <primitive object={scene} dispose={null} />
    </group>
  );
}

function CharacterCanvas({ glb }) {
  return (
    <Canvas
      camera={{ fov:44, near:0.01, far:500, position:[0, 0.25, 2.8] }}
      gl={{ alpha:true, antialias:true, powerPreference:'default' }}
      onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); }}
      style={{ width:'100%', height:'100%' }}
    >
      <ambientLight intensity={2.5} />
      <directionalLight position={[2, 3, 3]} intensity={3} />
      <directionalLight position={[-2, 1, -1]} intensity={1.2} />
      <pointLight position={[0, 2, 2]} intensity={2} color="#bfdbfe" />
      <Suspense fallback={null}>
        <CharacterModel glb={glb} />
      </Suspense>
    </Canvas>
  );
}

function ComingSoonModel() {
  return (
    <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12 }}>
      <div style={{ fontSize:80, opacity:0.25 }}>🤖</div>
      <div style={{ fontSize:14, color:'rgba(255,255,255,0.3)', fontWeight:700, letterSpacing:2, textTransform:'uppercase' }}>Coming Soon</div>
    </div>
  );
}

export default function CharacterSelectScreen({ onComplete }) {
  const { updateCharacter } = useUser();
  const [index,   setIndex]   = useState(0);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const char = CHARACTERS[index];
  const total = CHARACTERS.length;

  const prev = () => setIndex(i => (i - 1 + total) % total);
  const next = () => setIndex(i => (i + 1) % total);

  const handleConfirm = async () => {
    if (!char.available) return;
    setSaving(true); setError('');
    try {
      await updateCharacter(char.id);
      onComplete(char.id);
    } catch {
      setError('Failed to save. Please try again.');
    } finally { setSaving(false); }
  };

  return (
    <div style={{
      minHeight:'100vh',
      background:'linear-gradient(135deg,#0f0c29,#302b63,#24243e)',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      fontFamily:"'Inter',-apple-system,sans-serif",
      padding:'24px',
      userSelect:'none',
    }}>

      {/* Header */}
      <div style={{ textAlign:'center', marginBottom:32 }}>
        <div style={{ fontSize:40, marginBottom:10 }}>🎮</div>
        <h1 style={{ fontSize:26, fontWeight:800, color:'#fff', margin:'0 0 8px' }}>
          Choose Your Learning Buddy
        </h1>
        <p style={{ fontSize:13, color:'rgba(255,255,255,0.5)', margin:0 }}>
          Your buddy guides you through every lesson and game. Change anytime in Profile.
        </p>
      </div>

      {/* Carousel */}
      <div style={{ display:'flex', alignItems:'center', gap:24, marginBottom:28 }}>

        {/* Left arrow */}
        <button
          onClick={prev}
          style={{
            width:52, height:52, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.15)',
            background:'rgba(255,255,255,0.08)', color:'#fff', fontSize:22,
            cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
            flexShrink:0, transition:'all 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.18)'}
          onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.08)'}
        >
          ‹
        </button>

        {/* Character - no box, just free standing */}
        <div style={{
          width:360, height:520,
          position:'relative',
          display:'flex', flexDirection:'column',
          transition:'all 0.3s ease',
        }}>
          {/* Coming soon badge */}
          {!char.available && (
            <div style={{
              position:'absolute', top:14, right:14, zIndex:2,
              background:'rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.5)',
              fontSize:10, fontWeight:700, padding:'3px 10px',
              borderRadius:20, letterSpacing:1.5, textTransform:'uppercase',
            }}>
              Coming Soon
            </div>
          )}

          {/* Glow under character */}
          <div style={{
            position:'absolute', bottom:60, left:'50%', transform:'translateX(-50%)',
            width:180, height:40, borderRadius:'50%',
            background:`radial-gradient(ellipse, ${char.color}40, transparent 70%)`,
            filter:'blur(12px)', zIndex:0,
          }} />

          {/* 3D model */}
          <div style={{ flex:1, position:'relative', zIndex:1 }}>
            {char.glb
              ? <CharacterCanvas key={char.id} glb={char.glb} />
              : <ComingSoonModel />
            }
          </div>

          {/* Name */}
          <div style={{ textAlign:'center', zIndex:1, position:'relative', paddingBottom:8 }}>
            <div style={{ fontSize:22, fontWeight:800, color:'#fff', letterSpacing:0.5 }}>
              {char.name}
            </div>
          </div>
        </div>

        {/* Right arrow */}
        <button
          onClick={next}
          style={{
            width:52, height:52, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.15)',
            background:'rgba(255,255,255,0.08)', color:'#fff', fontSize:22,
            cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
            flexShrink:0, transition:'all 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.18)'}
          onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.08)'}
        >
          ›
        </button>
      </div>

      {/* Dot indicators */}
      <div style={{ display:'flex', gap:8, marginBottom:28 }}>
        {CHARACTERS.map((c, i) => (
          <div
            key={i}
            onClick={() => setIndex(i)}
            style={{
              width: i === index ? 24 : 8,
              height:8, borderRadius:10, cursor:'pointer',
              background: i === index ? char.color : 'rgba(255,255,255,0.2)',
              transition:'all 0.2s ease',
            }}
          />
        ))}
      </div>

      {error && (
        <div style={{ background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.4)', borderRadius:10, padding:'10px 16px', color:'#fca5a5', fontSize:13, marginBottom:16, textAlign:'center' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Confirm button */}
      <button
        onClick={handleConfirm}
        disabled={saving || !char.available}
        style={{
          width:360, padding:'16px', borderRadius:14, border:'none',
          background: char.available ? char.gradient : 'rgba(255,255,255,0.1)',
          color: char.available ? '#fff' : 'rgba(255,255,255,0.3)',
          fontSize:16, fontWeight:800,
          cursor: !char.available ? 'not-allowed' : saving ? 'wait' : 'pointer',
          opacity: saving ? 0.7 : 1,
          boxShadow: char.available ? `0 4px 20px ${char.color}50` : 'none',
          transition:'all 0.2s',
        }}
      >
        {saving
          ? '⏳ Saving...'
          : !char.available
          ? `${char.name} — Coming Soon`
          : `Start with ${char.name} →`
        }
      </button>

      <p style={{ textAlign:'center', fontSize:11, color:'rgba(255,255,255,0.25)', marginTop:14 }}>
        You can change your buddy anytime from your Profile page
      </p>
    </div>
  );
}