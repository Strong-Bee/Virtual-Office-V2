'use client';

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Billboard, Grid, OrbitControls, Text } from '@react-three/drei';
import type { Group } from 'three';
import { AIEmployee, MapObjectItem, OfficeMapData, PlayerPresence } from '@/src/types';

const STATUS_COLORS: Record<AIEmployee['status'], string> = {
  WORKING: '#10b981',
  THINKING: '#a855f7',
  IN_MEETING: '#3b82f6',
  PROCESSING: '#8b5cf6',
  WAITING_APPROVAL: '#f59e0b',
  PAUSED: '#64748b',
  ERROR: '#ef4444',
};

function OfficeObject({ object }: { object: MapObjectItem }) {
  const colors: Partial<Record<MapObjectItem['type'], string>> = {
    computer: '#0ea5e9',
    desk: '#64748b',
    meeting_table: '#2563eb',
    whiteboard: '#e2e8f0',
    coffee_machine: '#b45309',
    server_rack: '#059669',
    bookshelf: '#7c3aed',
    plant: '#16a34a',
    sofa: '#4f46e5',
    printer: '#6b7280',
    tv: '#0891b2',
  };

  return (
    <mesh
      position={[
        object.x + object.width / 2,
        0.35,
        object.y + object.height / 2,
      ]}
      castShadow
    >
      <boxGeometry args={[object.width * 0.8, 0.7, object.height * 0.8]} />
      <meshStandardMaterial color={colors[object.type] || '#475569'} />
    </mesh>
  );
}

function RobotAvatar({
  position,
  color,
  label,
  bubble,
}: {
  position: [number, number, number];
  color: string;
  label: string;
  bubble?: { text: string; expiresAt: number };
}) {
  const bubbleRef = useRef<Group>(null);
  useFrame(() => {
    if (bubbleRef.current) {
      bubbleRef.current.visible = Boolean(
        bubble && Date.now() < bubble.expiresAt
      );
    }
  });

  return (
    <group position={position}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.48, 0.38, 0.34]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.72, 0]} castShadow>
        <boxGeometry args={[0.62, 0.48, 0.44]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.72, 0.228]}>
        <boxGeometry args={[0.48, 0.28, 0.025]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      {[-0.12, 0.12].map((x) => (
        <mesh key={x} position={[x, 0.75, 0.25]}>
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshStandardMaterial
            color="#67e8f9"
            emissive="#0891b2"
            emissiveIntensity={1.5}
          />
        </mesh>
      ))}
      <mesh position={[0, 1.02, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.14, 8]} />
        <meshStandardMaterial color="#cbd5e1" />
      </mesh>
      <mesh position={[0, 1.11, 0]} castShadow>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshStandardMaterial
          color="#22d3ee"
          emissive="#0891b2"
          emissiveIntensity={1.5}
        />
      </mesh>
      <Text
        position={[0, 1.35, 0]}
        fontSize={0.16}
        anchorX="center"
        anchorY="bottom"
        color="#f1f5f9"
        outlineWidth={0.015}
        outlineColor="#020617"
      >
        {label}
      </Text>
      <Billboard ref={bubbleRef} visible={false} position={[0, 1.7, 0]}>
        <mesh>
          <planeGeometry args={[1.9, 0.6]} />
          <meshBasicMaterial color="#07111f" />
        </mesh>
        <Text
          position={[0, 0, 0.02]}
          fontSize={0.12}
          maxWidth={1.7}
          textAlign="center"
          anchorX="center"
          anchorY="middle"
          color="#f8fafc"
        >
          {bubble?.text || ''}
        </Text>
      </Billboard>
    </group>
  );
}

export function VirtualOffice3DView({
  officeMap,
  aiEmployees,
  players,
  localPlayerPos,
  currentUserId,
  speechBubbles,
}: {
  officeMap: OfficeMapData;
  aiEmployees: AIEmployee[];
  players: Record<string, PlayerPresence>;
  localPlayerPos: { x: number; y: number };
  currentUserId: string;
  speechBubbles: Record<string, { text: string; expiresAt: number }>;
}) {
  const center = [officeMap.width / 2, 0, officeMap.height / 2] as const;

  return (
    <div className="absolute inset-0" aria-label="Virtual Office 3D view">
      <Canvas
        shadows
        camera={{ position: [center[0] + 9, 14, center[2] + 12], fov: 42 }}
      >
        <color attach="background" args={['#020617']} />
        <ambientLight intensity={0.75} />
        <directionalLight
          castShadow
          position={[officeMap.width / 2, 18, officeMap.height / 2]}
          intensity={2}
        />
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={center}
          receiveShadow
        >
          <planeGeometry args={[officeMap.width, officeMap.height]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        {officeMap.rooms.map((room) => (
          <mesh
            key={room.id}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[
              room.x + room.width / 2,
              0.015,
              room.y + room.height / 2,
            ]}
            receiveShadow
          >
            <planeGeometry args={[room.width, room.height]} />
            <meshStandardMaterial
              color={room.floorColor || '#1e293b'}
              transparent
              opacity={0.7}
            />
          </mesh>
        ))}
        <Grid
          position={[center[0], 0.025, center[2]]}
          args={[officeMap.width, officeMap.height]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#334155"
          sectionSize={4}
          sectionThickness={1}
          sectionColor="#475569"
          fadeDistance={80}
          infiniteGrid={false}
        />
        {officeMap.objects.map((object) => (
          <OfficeObject key={object.id} object={object} />
        ))}
        {aiEmployees.map((employee) => (
          <RobotAvatar
            key={employee.id}
            position={[employee.x / 32, 0, employee.y / 32]}
            color={STATUS_COLORS[employee.status] || '#10b981'}
            label={employee.name}
            bubble={speechBubbles[employee.id]}
          />
        ))}
        {Object.values(players)
          .filter((player) => player.uid !== currentUserId)
          .map((player) => (
            <RobotAvatar
              key={player.uid}
              position={[player.x / 32, 0, player.y / 32]}
              color={player.avatarColor || '#3b82f6'}
              label={player.displayName}
            />
          ))}
        <RobotAvatar
          position={[localPlayerPos.x / 32, 0, localPlayerPos.y / 32]}
          color="#10b981"
          label="You"
        />
        <OrbitControls
          makeDefault
          target={center}
          minDistance={5}
          maxDistance={80}
          maxPolarAngle={Math.PI / 2.05}
        />
      </Canvas>
    </div>
  );
}
