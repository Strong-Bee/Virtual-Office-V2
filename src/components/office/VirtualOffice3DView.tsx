'use client';

import { Canvas } from '@react-three/fiber';
import { Grid, OrbitControls } from '@react-three/drei';
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

export function VirtualOffice3DView({
  officeMap,
  aiEmployees,
  players,
  localPlayerPos,
  currentUserId,
}: {
  officeMap: OfficeMapData;
  aiEmployees: AIEmployee[];
  players: Record<string, PlayerPresence>;
  localPlayerPos: { x: number; y: number };
  currentUserId: string;
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
          <mesh
            key={employee.id}
            position={[employee.x / 32, 0.45, employee.y / 32]}
            castShadow
          >
            <capsuleGeometry args={[0.28, 0.5, 4, 8]} />
            <meshStandardMaterial
              color={STATUS_COLORS[employee.status] || '#10b981'}
            />
          </mesh>
        ))}
        {Object.values(players)
          .filter((player) => player.uid !== currentUserId)
          .map((player) => (
            <mesh
              key={player.uid}
              position={[player.x / 32, 0.4, player.y / 32]}
              castShadow
            >
              <capsuleGeometry args={[0.25, 0.45, 4, 8]} />
              <meshStandardMaterial color={player.avatarColor || '#3b82f6'} />
            </mesh>
          ))}
        <mesh
          position={[localPlayerPos.x / 32, 0.45, localPlayerPos.y / 32]}
          castShadow
        >
          <capsuleGeometry args={[0.28, 0.5, 4, 8]} />
          <meshStandardMaterial color="#10b981" />
        </mesh>
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
