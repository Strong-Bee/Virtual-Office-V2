'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/src/store/useAppStore';
import { syncPlayerPresence } from '@/src/lib/firestore-actions';
import { soundFX } from '@/src/lib/sound';
import {
  AIEmployee,
  Direction,
  MapObjectItem,
  OfficeMapData,
  PlayerPresence,
} from '@/src/types';
import {
  Sparkles,
  Video,
  MessageSquare,
  ListChecks,
  PauseCircle,
  PlayCircle,
  Sliders,
  Compass,
  Volume2,
} from 'lucide-react';
import { updateAIEmployeeState } from '@/src/lib/firestore-actions';

const AI_STATUS_COLOR: Record<AIEmployee['status'], string> = {
  WORKING: '#10b981',
  THINKING: '#a855f7',
  IN_MEETING: '#3b82f6',
  PROCESSING: '#8b5cf6',
  WAITING_APPROVAL: '#f59e0b',
  PAUSED: '#64748b',
  ERROR: '#ef4444',
};

export function VirtualOfficeCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const phaserGameRef = useRef<unknown>(null);

  const currentUser = useAppStore((s) => s.currentUser);
  const officeMap = useAppStore((s) => s.officeMap);
  const aiEmployees = useAppStore((s) => s.aiEmployees);
  const players = useAppStore((s) => s.players);
  const localPlayerPos = useAppStore((s) => s.localPlayerPos);
  const nearbyAIEmployee = useAppStore((s) => s.nearbyAIEmployee);
  const nearbyObject = useAppStore((s) => s.nearbyObject);
  const inMeetingRoom = useAppStore((s) => s.inMeetingRoom);

  const setLocalPlayerPos = useAppStore((s) => s.setLocalPlayerPos);
  const setNearbyAIEmployee = useAppStore((s) => s.setNearbyAIEmployee);
  const setNearbyObject = useAppStore((s) => s.setNearbyObject);
  const setSelectedAIEmployeeId = useAppStore((s) => s.setSelectedAIEmployeeId);
  const setSelectedDepartmentId = useAppStore((s) => s.setSelectedDepartmentId);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const setInMeetingRoom = useAppStore((s) => s.setInMeetingRoom);
  const setWhiteboardOpen = useAppStore((s) => s.setWhiteboardOpen);

  const [aiContextMenuOpen, setAiContextMenuOpen] = useState(false);
  const [coffeeToast, setCoffeeToast] = useState<string | null>(null);
  const touchDirRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  // Refs to hold latest state for Phaser update loop without re-creating game instance
  const stateRef = useRef<{
    map: OfficeMapData;
    ais: AIEmployee[];
    remotePlayers: Record<string, PlayerPresence>;
    uid: string;
    displayName: string;
    role: string;
    avatarColor: string;
    status: PlayerPresence['status'];
    inCall: boolean;
  }>({
    map: officeMap,
    ais: aiEmployees,
    remotePlayers: players,
    uid: currentUser?.uid || 'local_guest',
    displayName: currentUser?.displayName || 'Supervisor',
    role: currentUser?.role || 'DEPARTMENT_SUPERVISOR',
    avatarColor: currentUser?.avatarColor || '#10b981',
    status: localPlayerPos.status,
    inCall: inMeetingRoom,
  });

  useEffect(() => {
    stateRef.current = {
      map: officeMap,
      ais: aiEmployees,
      remotePlayers: players,
      uid: currentUser?.uid || 'local_guest',
      displayName: currentUser?.displayName || 'Supervisor',
      role: currentUser?.role || 'DEPARTMENT_SUPERVISOR',
      avatarColor: currentUser?.avatarColor || '#10b981',
      status: localPlayerPos.status,
      inCall: inMeetingRoom,
    };
  }, [
    officeMap,
    aiEmployees,
    players,
    currentUser,
    localPlayerPos.status,
    inMeetingRoom,
  ]);

  useEffect(() => {
    let isMounted = true;

    async function initPhaser() {
      if (!containerRef.current || phaserGameRef.current) return;
      const PhaserModule = await import('phaser');
      const Phaser = PhaserModule.default || PhaserModule;
      if (!isMounted || !containerRef.current) return;

      class OfficeScene extends Phaser.Scene {
        private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
        private wasd!: {
          W: Phaser.Input.Keyboard.Key;
          A: Phaser.Input.Keyboard.Key;
          S: Phaser.Input.Keyboard.Key;
          D: Phaser.Input.Keyboard.Key;
          E: Phaser.Input.Keyboard.Key;
        };
        private playerContainer!: Phaser.GameObjects.Container;
        private playerBodyCircle!: Phaser.GameObjects.Arc;
        private playerStatusDot!: Phaser.GameObjects.Arc;
        private playerDirIndicator!: Phaser.GameObjects.Arc;
        private proximityRing!: Phaser.GameObjects.Arc;

        private aiContainers: Map<
          string,
          {
            container: Phaser.GameObjects.Container;
            statusDot: Phaser.GameObjects.Arc;
            statusLabel: Phaser.GameObjects.Text;
            baseX: number;
            baseY: number;
            phase: number;
          }
        > = new Map();

        private remoteContainers: Map<
          string,
          {
            container: Phaser.GameObjects.Container;
            targetX: number;
            targetY: number;
            statusDot: Phaser.GameObjects.Arc;
          }
        > = new Map();

        private lastSyncTime = 0;
        private lastFootstepTime = 0;
        private lastIdleTime = Date.now();
        private currentDir: Direction = 'DOWN';

        constructor() {
          super({ key: 'OfficeScene' });
        }

        create() {
          const mapData = stateRef.current.map;
          const worldWidth = mapData.width * mapData.tileSize;
          const worldHeight = mapData.height * mapData.tileSize;

          this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
          this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);

          // 1. Draw Floor & Grid
          const bgGraphics = this.add.graphics();
          bgGraphics.fillStyle(0x0b0f19, 1);
          bgGraphics.fillRect(0, 0, worldWidth, worldHeight);

          // Draw Room Zones
          for (const room of mapData.rooms) {
            const rx = room.x * mapData.tileSize;
            const ry = room.y * mapData.tileSize;
            const rw = room.width * mapData.tileSize;
            const rh = room.height * mapData.tileSize;
            const colorNum = parseInt(room.floorColor.replace('#', ''), 16);

            bgGraphics.fillStyle(colorNum, 0.85);
            bgGraphics.fillRoundedRect(rx, ry, rw, rh, 6);
            bgGraphics.lineStyle(2, 0x334155, 0.9);
            bgGraphics.strokeRoundedRect(rx, ry, rw, rh, 6);

            this.add
              .text(rx + 12, ry + 8, room.name.toUpperCase(), {
                fontFamily: 'monospace',
                fontSize: '11px',
                color: '#94a3b8',
                fontStyle: 'bold',
              })
              .setDepth(1);
          }

          // Subtle tile lines
          bgGraphics.lineStyle(1, 0x1e293b, 0.35);
          for (let x = 0; x <= worldWidth; x += mapData.tileSize) {
            bgGraphics.lineBetween(x, 0, x, worldHeight);
          }
          for (let y = 0; y <= worldHeight; y += mapData.tileSize) {
            bgGraphics.lineBetween(0, y, worldWidth, y);
          }

          // 2. Draw Portals
          for (const portal of mapData.portals) {
            const px = portal.sourceX * mapData.tileSize + 16;
            const py = portal.sourceY * mapData.tileSize + 16;
            const portalRing = this.add.circle(px, py, 14, 0x06b6d4, 0.25);
            portalRing.setStrokeStyle(2, 0x22d3ee, 0.9);
            this.tweens.add({
              targets: portalRing,
              scaleX: 1.25,
              scaleY: 1.25,
              alpha: 0.5,
              duration: 900,
              yoyo: true,
              repeat: -1,
            });
            this.add
              .text(px, py - 22, `⚡ ${portal.label}`, {
                fontFamily: 'sans-serif',
                fontSize: '10px',
                color: '#67e8f9',
                backgroundColor: '#0f172acc',
                padding: { x: 4, y: 2 },
              })
              .setOrigin(0.5);
          }

          // 3. Draw Interactive & Collidable Objects
          const objGraphics = this.add.graphics();
          for (const obj of mapData.objects) {
            this.renderMapObject(objGraphics, obj, mapData.tileSize);
          }

          // 4. Local Player Avatar Container
          const startX = 6 * mapData.tileSize;
          const startY = 5 * mapData.tileSize;

          this.proximityRing = this.add.circle(0, 0, 125, 0x10b981, 0.05);
          this.proximityRing.setStrokeStyle(1, 0x10b981, 0.22);

          const shadow = this.add.ellipse(0, 12, 22, 10, 0x000000, 0.45);
          const colorInt = parseInt(
            stateRef.current.avatarColor.replace('#', ''),
            16
          );
          this.playerBodyCircle = this.add.circle(0, 0, 13, colorInt, 1);
          this.playerBodyCircle.setStrokeStyle(2, 0xffffff, 0.9);

          this.playerDirIndicator = this.add.circle(0, 9, 3.5, 0xffffff, 0.95);
          this.playerStatusDot = this.add.circle(10, -10, 4.5, 0x10b981, 1);
          this.playerStatusDot.setStrokeStyle(1.5, 0x0f172a, 1);

          const nameTag = this.add
            .text(0, -24, `${stateRef.current.displayName} (You)`, {
              fontFamily: 'sans-serif',
              fontSize: '11px',
              fontStyle: 'bold',
              color: '#f8fafc',
              backgroundColor: '#0f172ae6',
              padding: { x: 6, y: 2 },
            })
            .setOrigin(0.5);

          this.playerContainer = this.add.container(startX, startY, [
            this.proximityRing,
            shadow,
            this.playerBodyCircle,
            this.playerDirIndicator,
            this.playerStatusDot,
            nameTag,
          ]);
          this.playerContainer.setDepth(20);

          this.cameras.main.startFollow(
            this.playerContainer,
            true,
            0.12,
            0.12
          );

          // 5. Keyboard Input
          if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.wasd = this.input.keyboard.addKeys({
              W: Phaser.Input.Keyboard.KeyCodes.W,
              A: Phaser.Input.Keyboard.KeyCodes.A,
              S: Phaser.Input.Keyboard.KeyCodes.S,
              D: Phaser.Input.Keyboard.KeyCodes.D,
              E: Phaser.Input.Keyboard.KeyCodes.E,
            }) as {
              W: Phaser.Input.Keyboard.Key;
              A: Phaser.Input.Keyboard.Key;
              S: Phaser.Input.Keyboard.Key;
              D: Phaser.Input.Keyboard.Key;
              E: Phaser.Input.Keyboard.Key;
            };

            this.wasd.E.on('down', () => {
              this.handleInteractKey();
            });
          }
        }

        private renderMapObject(
          g: Phaser.GameObjects.Graphics,
          obj: MapObjectItem,
          tileSize: number
        ) {
          const x = obj.x * tileSize;
          const y = obj.y * tileSize;
          const w = obj.width * tileSize;
          const h = obj.height * tileSize;

          let fill = 0x334155;
          let stroke = 0x64748b;
          let iconText = '📦';

          switch (obj.type) {
            case 'desk':
              fill = 0x475569;
              stroke = 0x94a3b8;
              iconText = '🪑';
              break;
            case 'computer':
              fill = 0x1e293b;
              stroke = 0x38bdf8;
              iconText = '💻';
              break;
            case 'meeting_table':
              fill = 0x1e3a8a;
              stroke = 0x60a5fa;
              iconText = '🎥';
              break;
            case 'whiteboard':
              fill = 0xf8fafc;
              stroke = 0x38bdf8;
              iconText = '📋';
              break;
            case 'coffee_machine':
              fill = 0x78350f;
              stroke = 0xf59e0b;
              iconText = '☕';
              break;
            case 'server_rack':
              fill = 0x064e3b;
              stroke = 0x10b981;
              iconText = '🖧';
              break;
            case 'bookshelf':
              fill = 0x4c1d95;
              stroke = 0xa78bfa;
              iconText = '📚';
              break;
            case 'tv':
              fill = 0x0f172a;
              stroke = 0x22d3ee;
              iconText = '📊';
              break;
            case 'plant':
              fill = 0x14532d;
              stroke = 0x4ade80;
              iconText = '🌿';
              break;
            case 'sofa':
              fill = 0x312e81;
              stroke = 0x818cf8;
              iconText = '🛋️';
              break;
            case 'printer':
              fill = 0x374151;
              stroke = 0x9ca3af;
              iconText = '🖨️';
              break;
          }

          g.fillStyle(fill, 0.95);
          g.fillRoundedRect(x + 2, y + 2, w - 4, h - 4, 5);
          g.lineStyle(1.5, stroke, 0.9);
          g.strokeRoundedRect(x + 2, y + 2, w - 4, h - 4, 5);

          this.add
            .text(x + w / 2, y + h / 2, iconText, {
              fontSize: '14px',
            })
            .setOrigin(0.5)
            .setDepth(5);
        }

        private isCollidingWithObjects(nextX: number, nextY: number): boolean {
          const mapData = stateRef.current.map;
          const radius = 11;

          if (
            nextX < radius ||
            nextY < radius ||
            nextX > mapData.width * mapData.tileSize - radius ||
            nextY > mapData.height * mapData.tileSize - radius
          ) {
            return true;
          }

          for (const obj of mapData.objects) {
            if (!obj.collidable) continue;
            const ox = obj.x * mapData.tileSize + 2;
            const oy = obj.y * mapData.tileSize + 2;
            const ow = obj.width * mapData.tileSize - 4;
            const oh = obj.height * mapData.tileSize - 4;

            if (
              nextX + radius > ox &&
              nextX - radius < ox + ow &&
              nextY + radius > oy &&
              nextY - radius < oy + oh
            ) {
              return true;
            }
          }
          return false;
        }

        private handleInteractKey() {
          soundFX.playClick();
          const currentNearbyAI = useAppStore.getState().nearbyAIEmployee;
          const currentNearbyObj = useAppStore.getState().nearbyObject;

          if (currentNearbyAI) {
            setSelectedAIEmployeeId(currentNearbyAI.id);
            setSelectedDepartmentId(currentNearbyAI.departmentId);
            setAiContextMenuOpen(true);
            return;
          }

          if (currentNearbyObj) {
            switch (currentNearbyObj.actionType) {
              case 'OPEN_MEETING':
                setInMeetingRoom(true);
                soundFX.playMeetingJoin();
                break;
              case 'OPEN_WHITEBOARD':
                setWhiteboardOpen(true);
                break;
              case 'OPEN_AI_CENTER':
                setActiveTab('AI_CONTROL_CENTER');
                break;
              case 'OPEN_DOCS':
                setActiveTab('DEPARTMENTS');
                break;
              case 'VIEW_METRICS':
                setActiveTab('ADMIN_ANALYTICS');
                break;
              case 'BREW_COFFEE':
                soundFX.playNotification();
                setCoffeeToast(
                  '☕ Fresh Specialty Espresso brewed! Team focus +15%.'
                );
                setTimeout(() => setCoffeeToast(null), 3500);
                break;
              default:
                setActiveTab('AI_CONTROL_CENTER');
            }
          }
        }

        update(time: number, delta: number) {
          if (!this.playerContainer) return;

          // Ignore movement keys if typing inside an input/textarea
          const activeEl = document.activeElement;
          const isTyping =
            activeEl &&
            (activeEl.tagName === 'INPUT' ||
              activeEl.tagName === 'TEXTAREA' ||
              activeEl.tagName === 'SELECT');

          const speed = 175 * (delta / 1000);
          let dx = touchDirRef.current.dx * speed;
          let dy = touchDirRef.current.dy * speed;

          if (touchDirRef.current.dx < 0) this.currentDir = 'LEFT';
          else if (touchDirRef.current.dx > 0) this.currentDir = 'RIGHT';
          else if (touchDirRef.current.dy < 0) this.currentDir = 'UP';
          else if (touchDirRef.current.dy > 0) this.currentDir = 'DOWN';

          if (!isTyping && this.cursors && this.wasd) {
            if (this.cursors.left.isDown || this.wasd.A.isDown) {
              dx -= speed;
              this.currentDir = 'LEFT';
            } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
              dx += speed;
              this.currentDir = 'RIGHT';
            }

            if (this.cursors.up.isDown || this.wasd.W.isDown) {
              dy -= speed;
              this.currentDir = 'UP';
            } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
              dy += speed;
              this.currentDir = 'DOWN';
            }
          }

          // Normalize diagonal movement
          if (dx !== 0 && dy !== 0) {
            dx *= 0.7071;
            dy *= 0.7071;
          }

          let moved = false;
          if (dx !== 0) {
            const candidateX = this.playerContainer.x + dx;
            if (!this.isCollidingWithObjects(candidateX, this.playerContainer.y)) {
              this.playerContainer.x = candidateX;
              moved = true;
            }
          }
          if (dy !== 0) {
            const candidateY = this.playerContainer.y + dy;
            if (!this.isCollidingWithObjects(this.playerContainer.x, candidateY)) {
              this.playerContainer.y = candidateY;
              moved = true;
            }
          }

          // Direction indicator dot offset
          if (this.currentDir === 'UP')
            this.playerDirIndicator.setPosition(0, -9);
          if (this.currentDir === 'DOWN')
            this.playerDirIndicator.setPosition(0, 9);
          if (this.currentDir === 'LEFT')
            this.playerDirIndicator.setPosition(-9, 0);
          if (this.currentDir === 'RIGHT')
            this.playerDirIndicator.setPosition(9, 0);

          const mapData = stateRef.current.map;
          const px = this.playerContainer.x;
          const py = this.playerContainer.y;

          // Check Portal Teleportation
          if (moved) {
            this.lastIdleTime = Date.now();
            if (time - this.lastFootstepTime > 290) {
              soundFX.playFootstep();
              this.lastFootstepTime = time;
            }

            for (const portal of mapData.portals) {
              const portalX = portal.sourceX * mapData.tileSize + 16;
              const portalY = portal.sourceY * mapData.tileSize + 16;
              const dist = Math.hypot(px - portalX, py - portalY);
              if (dist < 18) {
                this.playerContainer.x =
                  portal.destinationX * mapData.tileSize + 16;
                this.playerContainer.y =
                  portal.destinationY * mapData.tileSize + 16;
                soundFX.playNotification();
                break;
              }
            }
          }

          // Determine current room
          let detectedRoomId = 'room_lobby';
          for (const r of mapData.rooms) {
            const rx = r.x * mapData.tileSize;
            const ry = r.y * mapData.tileSize;
            const rw = r.width * mapData.tileSize;
            const rh = r.height * mapData.tileSize;
            if (px >= rx && px <= rx + rw && py >= ry && py <= ry + rh) {
              detectedRoomId = r.id;
              break;
            }
          }

          // Auto-toggle Meeting Room UI when entering/leaving Boardroom Alpha
          if (
            detectedRoomId === 'room_meeting' &&
            !useAppStore.getState().inMeetingRoom &&
            moved
          ) {
            setInMeetingRoom(true);
            soundFX.playMeetingJoin();
          }

          // Automatic Away detection after 90 seconds idle
          const idleElapsed = Date.now() - this.lastIdleTime;
          const currentStatus = stateRef.current.status;
          let nextStatus = currentStatus;
          if (idleElapsed > 90000 && currentStatus === 'AVAILABLE') {
            nextStatus = 'AWAY';
          } else if (moved && currentStatus === 'AWAY') {
            nextStatus = 'AVAILABLE';
          }

          // Update AI Employee Sprites & Check Proximity to AI
          let closestAI: AIEmployee | null = null;
          let minAiDist = 68;

          for (const ai of stateRef.current.ais) {
            let entry = this.aiContainers.get(ai.id);
            if (!entry) {
              const shadow = this.add.ellipse(0, 12, 22, 10, 0x000000, 0.45);
              const bodyColor = parseInt(ai.avatarColor.replace('#', ''), 16);
              const body = this.add.rectangle(0, 0, 24, 24, bodyColor, 1);
              body.setStrokeStyle(2, 0xffffff, 0.9);

              const botBadge = this.add
                .text(0, 0, '🤖', { fontSize: '13px' })
                .setOrigin(0.5);

              const statusColor = parseInt(
                (AI_STATUS_COLOR[ai.status] || '#10b981').replace('#', ''),
                16
              );
              const statusDot = this.add.circle(11, -11, 5, statusColor, 1);
              statusDot.setStrokeStyle(1.5, 0x0f172a, 1);

              const nameTag = this.add
                .text(0, -25, `🤖 ${ai.name}`, {
                  fontFamily: 'sans-serif',
                  fontSize: '11px',
                  fontStyle: 'bold',
                  color: '#f8fafc',
                  backgroundColor: '#0f172ae6',
                  padding: { x: 5, y: 2 },
                })
                .setOrigin(0.5);

              const statusLabel = this.add
                .text(0, 20, ai.status, {
                  fontFamily: 'monospace',
                  fontSize: '9px',
                  color: '#cbd5e1',
                  backgroundColor: '#0f172acc',
                  padding: { x: 4, y: 1 },
                })
                .setOrigin(0.5);

              const container = this.add.container(ai.x, ai.y, [
                shadow,
                body,
                botBadge,
                statusDot,
                nameTag,
                statusLabel,
              ]);
              container.setDepth(15);

              entry = {
                container,
                statusDot,
                statusLabel,
                baseX: ai.x,
                baseY: ai.y,
                phase: Math.random() * Math.PI * 2,
              };
              this.aiContainers.set(ai.id, entry);
            }

            // Gentle autonomous patrol animation when not paused
            if (ai.status !== 'PAUSED') {
              const offset = Math.sin(time / 1200 + entry.phase) * 8;
              entry.container.x = entry.baseX + offset;
            }
            const statusHex = parseInt(
              (AI_STATUS_COLOR[ai.status] || '#10b981').replace('#', ''),
              16
            );
            entry.statusDot.setFillStyle(statusHex, 1);
            entry.statusLabel.setText(ai.status.replace('_', ' '));

            const d = Math.hypot(
              px - entry.container.x,
              py - entry.container.y
            );
            if (d < minAiDist) {
              minAiDist = d;
              closestAI = ai;
            }
          }

          if (closestAI?.id !== useAppStore.getState().nearbyAIEmployee?.id) {
            setNearbyAIEmployee(closestAI);
            if (!closestAI) {
              setAiContextMenuOpen(false);
            }
          }

          // Check Proximity to Interactive Furniture Objects
          let closestObj: {
            id: string;
            label: string;
            actionType?: string;
          } | null = null;
          let minObjDist = 60;

          for (const obj of mapData.objects) {
            if (!obj.interactive) continue;
            const ox = (obj.x + obj.width / 2) * mapData.tileSize;
            const oy = (obj.y + obj.height / 2) * mapData.tileSize;
            const d = Math.hypot(px - ox, py - oy);
            if (d < minObjDist) {
              minObjDist = d;
              closestObj = {
                id: obj.id,
                label: obj.label,
                actionType: obj.actionType,
              };
            }
          }

          if (closestObj?.id !== useAppStore.getState().nearbyObject?.id) {
            setNearbyObject(closestObj);
          }

          // Update Remote Multiplayer Avatars with LERP Interpolation
          const remoteMap = stateRef.current.remotePlayers;
          const myUid = stateRef.current.uid;

          Object.values(remoteMap).forEach((rp) => {
            if (rp.uid === myUid) return;
            let rem = this.remoteContainers.get(rp.uid);
            if (!rem) {
              const shadow = this.add.ellipse(0, 12, 22, 10, 0x000000, 0.4);
              const cInt = parseInt(
                (rp.avatarColor || '#3b82f6').replace('#', ''),
                16
              );
              const body = this.add.circle(0, 0, 13, cInt, 1);
              body.setStrokeStyle(2, 0xe2e8f0, 0.9);
              const statusDot = this.add.circle(10, -10, 4.5, 0x10b981, 1);
              const label = this.add
                .text(0, -24, rp.displayName, {
                  fontFamily: 'sans-serif',
                  fontSize: '11px',
                  color: '#f1f5f9',
                  backgroundColor: '#0f172acc',
                  padding: { x: 5, y: 2 },
                })
                .setOrigin(0.5);

              const container = this.add.container(rp.x, rp.y, [
                shadow,
                body,
                statusDot,
                label,
              ]);
              container.setDepth(18);
              rem = {
                container,
                targetX: rp.x,
                targetY: rp.y,
                statusDot,
              };
              this.remoteContainers.set(rp.uid, rem);
            } else {
              rem.targetX = rp.x;
              rem.targetY = rp.y;
            }

            // Smooth interpolation (LERP)
            rem.container.x += (rem.targetX - rem.container.x) * 0.18;
            rem.container.y += (rem.targetY - rem.container.y) * 0.18;
          });

          // Throttled Firestore Presence Sync (never every frame; max every 250ms when moving)
          if (
            (moved && time - this.lastSyncTime > 250) ||
            nextStatus !== currentStatus
          ) {
            this.lastSyncTime = time;
            setLocalPlayerPos({
              x: Math.round(px),
              y: Math.round(py),
              roomId: detectedRoomId,
              status: nextStatus,
            });

            if (stateRef.current.uid !== 'local_guest') {
              syncPlayerPresence({
                uid: stateRef.current.uid,
                displayName: stateRef.current.displayName,
                role: stateRef.current.role,
                avatarColor: stateRef.current.avatarColor,
                x: px,
                y: py,
                direction: this.currentDir,
                status: nextStatus,
                roomId: detectedRoomId,
                inCall: stateRef.current.inCall,
              });
            }
          }
        }
      }

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: containerRef.current.clientWidth || 960,
        height: containerRef.current.clientHeight || 640,
        backgroundColor: '#0b0f19',
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { x: 0, y: 0 },
            debug: false,
          },
        },
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: [OfficeScene],
      };

      phaserGameRef.current = new Phaser.Game(config);
    }

    initPhaser();

    return () => {
      isMounted = false;
      if (phaserGameRef.current) {
        (phaserGameRef.current as { destroy: (removeCanvas: boolean) => void }).destroy(
          true
        );
        phaserGameRef.current = null;
      }
    };
  }, [
    setActiveTab,
    setInMeetingRoom,
    setLocalPlayerPos,
    setNearbyAIEmployee,
    setNearbyObject,
    setSelectedAIEmployeeId,
    setSelectedDepartmentId,
    setWhiteboardOpen,
  ]);

  // Calculate proximity audio attenuation for nearby human & AI entities
  const MAX_PROXIMITY_DISTANCE = 220;
  const nearbyEntitiesWithVolume = aiEmployees
    .map((ai) => {
      const distance = Math.sqrt(
        Math.pow(localPlayerPos.x - ai.x, 2) +
          Math.pow(localPlayerPos.y - ai.y, 2)
      );
      const volume = Math.max(0, 1 - distance / MAX_PROXIMITY_DISTANCE);
      return {
        id: ai.id,
        name: `🤖 ${ai.name}`,
        role: ai.role,
        distance: Math.round(distance),
        volume: Math.round(volume * 100),
      };
    })
    .filter((item) => item.volume > 0)
    .sort((a, b) => b.volume - a.volume);

  const currentRoomObj = officeMap.rooms.find(
    (r) => r.id === localPlayerPos.roomId
  );

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden select-none">
      {/* Phaser 2D Canvas Mount */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Top-Left Spatial HUD: Current Room & Coordinates */}
      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex items-center gap-2.5 bg-slate-900/90 border border-slate-800 px-3 py-2 rounded-lg backdrop-blur-md max-w-[calc(100vw-24px)]">
        <Compass className="w-4 h-4 text-emerald-400 shrink-0" />
        <div className="text-xs truncate">
          <div className="font-semibold text-slate-100 truncate">
            {currentRoomObj?.name || 'Main Corridor'}
          </div>
          <div className="text-slate-400 font-mono tabular-nums text-[11px] truncate">
            Grid ({Math.round(localPlayerPos.x / 32)},{' '}
            {Math.round(localPlayerPos.y / 32)}) · WASD / Touch D-Pad
          </div>
        </div>
      </div>

      {/* Mobile & Tablet Touch D-Pad Controls (Visible on touch/mobile viewports) */}
      <div className="lg:hidden absolute bottom-4 left-4 z-20 flex items-center gap-3">
        <div className="grid grid-cols-3 gap-1.5 bg-slate-900/90 border border-slate-700/80 p-2 rounded-2xl backdrop-blur-md shadow-xl">
          <div />
          <button
            type="button"
            onTouchStart={() => {
              touchDirRef.current = { dx: 0, dy: -1 };
            }}
            onTouchEnd={() => {
              touchDirRef.current = { dx: 0, dy: 0 };
            }}
            onMouseDown={() => {
              touchDirRef.current = { dx: 0, dy: -1 };
            }}
            onMouseUp={() => {
              touchDirRef.current = { dx: 0, dy: 0 };
            }}
            className="w-11 h-11 rounded-xl bg-slate-800 active:bg-emerald-600 text-white font-bold text-sm flex items-center justify-center select-none"
          >
            ▲
          </button>
          <div />
          <button
            type="button"
            onTouchStart={() => {
              touchDirRef.current = { dx: -1, dy: 0 };
            }}
            onTouchEnd={() => {
              touchDirRef.current = { dx: 0, dy: 0 };
            }}
            onMouseDown={() => {
              touchDirRef.current = { dx: -1, dy: 0 };
            }}
            onMouseUp={() => {
              touchDirRef.current = { dx: 0, dy: 0 };
            }}
            className="w-11 h-11 rounded-xl bg-slate-800 active:bg-emerald-600 text-white font-bold text-sm flex items-center justify-center select-none"
          >
            ◀
          </button>
          <button
            type="button"
            onTouchStart={() => {
              touchDirRef.current = { dx: 0, dy: 1 };
            }}
            onTouchEnd={() => {
              touchDirRef.current = { dx: 0, dy: 0 };
            }}
            onMouseDown={() => {
              touchDirRef.current = { dx: 0, dy: 1 };
            }}
            onMouseUp={() => {
              touchDirRef.current = { dx: 0, dy: 0 };
            }}
            className="w-11 h-11 rounded-xl bg-slate-800 active:bg-emerald-600 text-white font-bold text-sm flex items-center justify-center select-none"
          >
            ▼
          </button>
          <button
            type="button"
            onTouchStart={() => {
              touchDirRef.current = { dx: 1, dy: 0 };
            }}
            onTouchEnd={() => {
              touchDirRef.current = { dx: 0, dy: 0 };
            }}
            onMouseDown={() => {
              touchDirRef.current = { dx: 1, dy: 0 };
            }}
            onMouseUp={() => {
              touchDirRef.current = { dx: 0, dy: 0 };
            }}
            className="w-11 h-11 rounded-xl bg-slate-800 active:bg-emerald-600 text-white font-bold text-sm flex items-center justify-center select-none"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Top-Center Proximity Voice Attenuation HUD */}
      {nearbyEntitiesWithVolume.length > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-900/90 border border-emerald-500/30 px-4 py-2 rounded-lg backdrop-blur-md">
          <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400">Proximity Field:</span>
            {nearbyEntitiesWithVolume.slice(0, 3).map((ent) => (
              <span
                key={ent.id}
                className="text-slate-100 font-mono tabular-nums"
              >
                {ent.name} ({ent.volume}% vol)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Coffee Barista Toast */}
      {coffeeToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-amber-950/95 border border-amber-500/40 text-amber-200 px-4 py-2 rounded-lg text-xs font-medium shadow-lg">
          {coffeeToast}
        </div>
      )}

      {/* Bottom Interactive Prompt Banner ("Press E to interact") */}
      {(nearbyAIEmployee || nearbyObject) && !aiContextMenuOpen && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-900/95 border border-emerald-500/50 px-5 py-2.5 rounded-lg shadow-xl">
          <span className="px-2 py-0.5 bg-emerald-500 text-slate-950 font-mono font-bold text-xs rounded">
            E
          </span>
          <span className="text-xs font-medium text-slate-100">
            {nearbyAIEmployee
              ? `Interact with 🤖 ${nearbyAIEmployee.name} (${nearbyAIEmployee.role})`
              : `Interact with ${nearbyObject?.label}`}
          </span>
          <button
            onClick={() => {
              soundFX.playClick();
              if (nearbyAIEmployee) {
                setSelectedAIEmployeeId(nearbyAIEmployee.id);
                setSelectedDepartmentId(nearbyAIEmployee.departmentId);
                setAiContextMenuOpen(true);
              } else if (nearbyObject) {
                if (nearbyObject.actionType === 'OPEN_MEETING') {
                  setInMeetingRoom(true);
                } else if (nearbyObject.actionType === 'OPEN_WHITEBOARD') {
                  setWhiteboardOpen(true);
                } else {
                  setActiveTab('AI_CONTROL_CENTER');
                }
              }
            }}
            className="ml-2 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-medium rounded transition-colors whitespace-nowrap"
          >
            Open Menu
          </button>
        </div>
      )}

      {/* AI Employee Spatial Context Menu Modal (Triggered by E near AI) */}
      {nearbyAIEmployee && aiContextMenuOpen && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-[calc(100vw-2rem)] max-w-md bg-slate-900/95 border border-slate-700 rounded-xl p-4 shadow-2xl backdrop-blur-md z-30">
          <div className="flex items-start justify-between pb-3 border-b border-slate-800">
            <div>
              <div className="text-sm font-semibold text-white">
                🤖 {nearbyAIEmployee.name}
              </div>
              <div className="text-xs text-slate-400">
                {nearbyAIEmployee.role} · {nearbyAIEmployee.modelProvider} ·
                Level {nearbyAIEmployee.autonomyLevel}
              </div>
            </div>
            <button
              onClick={() => setAiContextMenuOpen(false)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1"
            >
              Esc
            </button>
          </div>

          <div className="py-2.5 text-xs text-slate-300 flex items-center justify-between font-mono tabular-nums">
            <span>Status: {nearbyAIEmployee.status}</span>
            <span>·</span>
            <span>KPI: {nearbyAIEmployee.performanceScore}%</span>
            <span>·</span>
            <span>
              Budget: ${nearbyAIEmployee.spentToday} / $
              {nearbyAIEmployee.dailyBudget}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={() => {
                setSelectedAIEmployeeId(nearbyAIEmployee.id);
                setActiveTab('AI_CONTROL_CENTER');
                setAiContextMenuOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Chat & Direct AI
            </button>
            <button
              onClick={() => {
                setSelectedAIEmployeeId(nearbyAIEmployee.id);
                setActiveTab('TASK_BOARD');
                setAiContextMenuOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
            >
              <ListChecks className="w-3.5 h-3.5" />
              Assign / View Tasks
            </button>
            <button
              onClick={() => {
                setSelectedDepartmentId(nearbyAIEmployee.departmentId);
                setActiveTab('AI_STANDUP');
                setAiContextMenuOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
            >
              <Video className="w-3.5 h-3.5" />
              Start AI Standup
            </button>
            <button
              onClick={() => {
                const nextStatus =
                  nearbyAIEmployee.status === 'PAUSED' ? 'WORKING' : 'PAUSED';
                updateAIEmployeeState(nearbyAIEmployee, { status: nextStatus });
                setAiContextMenuOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
            >
              {nearbyAIEmployee.status === 'PAUSED' ? (
                <>
                  <PlayCircle className="w-3.5 h-3.5" />
                  Resume AI Agent
                </>
              ) : (
                <>
                  <PauseCircle className="w-3.5 h-3.5" />
                  Pause AI Agent
                </>
              )}
            </button>
            <button
              onClick={() => {
                setSelectedAIEmployeeId(nearbyAIEmployee.id);
                setActiveTab('AI_GOVERNANCE');
                setAiContextMenuOpen(false);
              }}
              className="col-span-2 flex items-center justify-center gap-2 px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
            >
              <Sliders className="w-3.5 h-3.5" />
              Supervisor Controls: Autonomy, Permissions & Budget
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
