'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { AvatarCall } from '@runwayml/avatars-react';
import { Suspense } from 'react';

const avatarId = process.env.NEXT_PUBLIC_KARTUPELIS_AVATAR_ID;

function BG() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} />
      <mesh>
        <sphereGeometry args={[1.7, 64, 64]} />
        <meshStandardMaterial wireframe />
      </mesh>
      <OrbitControls autoRotate autoRotateSpeed={1.2} enableZoom={false} />
    </>
  );
}

export default function Page() {
  return (
    <main style={{ minHeight: '100vh', position: 'relative' }}>
      <Canvas style={{ position: 'fixed', inset: 0 }}>
        <Suspense fallback={null}>
          <BG />
        </Suspense>
      </Canvas>

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'grid',
          placeItems: 'center',
          paddingTop: '12vh',
        }}
      >
        <div
          style={{
            width: 'min(92vw, 720px)',
            padding: 24,
            backdropFilter: 'blur(10px)',
            background: 'rgba(0,0,0,.45)',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,.15)',
          }}
        >
          <h1 style={{ margin: '0 0 12px' }}>Kartupelis — Realtime</h1>
          <p style={{ margin: '0 0 24px', color: 'rgba(255,255,255,.75)' }}>
            Say hi and see Kartupelis talk back.
          </p>

          <AvatarCall
            avatarId={avatarId}
            connectUrl="/api/avatar/session"
            style={{ width: '100%' }}
          />
        </div>
      </div>
    </main>
  );
}
