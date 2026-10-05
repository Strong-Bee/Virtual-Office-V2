'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import gsap from 'gsap';
import { motion } from 'motion/react';
import { useAppStore } from '@/src/store/useAppStore';
import { syncPlayerPresence, updateAIEmployeeState } from '@/src/lib/firestore-actions';
import { soundFX } from '@/src/lib/sound';
import { AIEmployee, MapObjectItem } from '@/src/types';
import {
  Box,
  Compass,
  ListChecks,
  MessageSquare,
  Minus,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  Sparkles,
  Video,
  Volume2,
  ZoomIn,
} from 'lucide-react';
import { CharacterAnimationPreview } from '@/src/components/office/CharacterAnimationPreview';
import { VirtualOffice3DView } from '@/src/components/office/VirtualOffice3DView';

const AI_STATUS_COLOR: Record<AIEmployee['status'], string> = {
  WORKING: '#10b981',
  THINKING: '#a855f7',
  IN_MEETING: '#3b82f6',
  PROCESSING: '#8b5cf6',
  WAITING_APPROVAL: '#f59e0b',
  PAUSED: '#64748b',
  ERROR: '#ef4444',
};

const MAP_OBJECT_COLOR: Partial<Record<MapObjectItem['type'], number>> = {
  desk: 0x475569,
  computer: 0x1e293b,
  meeting_table: 0x1e3a8a,
  whiteboard: 0xf8fafc,
  coffee_machine: 0x78350f,
  server_rack: 0x064e3b,
  bookshelf: 0x4c1d95,
  tv: 0x0f172a,
  sofa: 0x312e81,
  printer: 0x374151,
  plant: 0x14532d,
};

const MAP_OBJECT_ICON: Partial<Record<MapObjectItem['type'], string>> = {
  desk: '🪑',
  computer: '💻',
  meeting_table: '🎥',
  whiteboard: '📋',
  coffee_machine: '☕',
  server_rack: '🖧',
  bookshelf: '📚',
  tv: '📊',
  sofa: '🛋️',
  printer: '🖨️',
  plant: '🌿',
};

const hexToNumber = (value: string, fallback = 0x10b981) => {
  const parsed = Number.parseInt(value.replace('#', ''), 16);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export function VirtualOfficeCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<PIXI.Container | null>(null);
  const touchDirRef = useRef({ dx: 0, dy: 0 });
  const keysRef = useRef(new Set<string>());
  const zoomRef = useRef(1);

  const currentUser = useAppStore((state) => state.currentUser);
  const officeMap = useAppStore((state) => state.officeMap);
  const aiEmployees = useAppStore((state) => state.aiEmployees);
  const players = useAppStore((state) => state.players);
  const localPlayerPos = useAppStore((state) => state.localPlayerPos);
  const nearbyAIEmployee = useAppStore((state) => state.nearbyAIEmployee);
  const nearbyObject = useAppStore((state) => state.nearbyObject);
  const inMeetingRoom = useAppStore((state) => state.inMeetingRoom);

  const setLocalPlayerPos = useAppStore((state) => state.setLocalPlayerPos);
  const setNearbyAIEmployee = useAppStore((state) => state.setNearbyAIEmployee);
  const setNearbyObject = useAppStore((state) => state.setNearbyObject);
  const setSelectedAIEmployeeId = useAppStore((state) => state.setSelectedAIEmployeeId);
  const setSelectedDepartmentId = useAppStore((state) => state.setSelectedDepartmentId);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const setInMeetingRoom = useAppStore((state) => state.setInMeetingRoom);
  const setWhiteboardOpen = useAppStore((state) => state.setWhiteboardOpen);

  const [viewMode, setViewMode] = useState<'2D' | '3D'>('2D');
  const [cameraZoom, setCameraZoom] = useState(1);
  const [canvasError, setCanvasError] = useState<string | null>(null);
  const [aiContextMenuOpen, setAiContextMenuOpen] = useState(false);
  const [coffeeToast, setCoffeeToast] = useState<string | null>(null);

  const stateRef = useRef({
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
  }, [officeMap, aiEmployees, players, currentUser, localPlayerPos.status, inMeetingRoom]);

  const updateZoom = useCallback((value: number) => {
    const zoom = Math.round(Math.min(2, Math.max(0.5, value)) * 10) / 10;
    zoomRef.current = zoom;
    setCameraZoom(zoom);
    if (worldRef.current) {
      gsap.killTweensOf(worldRef.current.scale);
      gsap.to(worldRef.current.scale, {
        x: zoom,
        y: zoom,
        duration: 0.2,
        ease: 'power2.out',
      });
    }
  }, []);

  const handleInteract = useCallback(() => {
    soundFX.playClick();
    const currentNearbyAI = useAppStore.getState().nearbyAIEmployee;
    const currentNearbyObj = useAppStore.getState().nearbyObject;

    if (currentNearbyAI) {
      setSelectedAIEmployeeId(currentNearbyAI.id);
      setSelectedDepartmentId(currentNearbyAI.departmentId);
      setAiContextMenuOpen(true);
      return;
    }

    if (!currentNearbyObj) return;
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
        setCoffeeToast('Fresh espresso brewed! Team focus +15%.');
        window.setTimeout(() => setCoffeeToast(null), 3500);
        break;
      default:
        setActiveTab('AI_CONTROL_CENTER');
    }
  }, [
    setActiveTab,
    setInMeetingRoom,
    setSelectedAIEmployeeId,
    setSelectedDepartmentId,
    setWhiteboardOpen,
  ]);

  useEffect(() => {
    if (viewMode !== '2D' || !containerRef.current) return;

    let cancelled = false;
    let app: PIXI.Application | null = null;
    let tick: ((ticker: PIXI.Ticker) => void) | null = null;
    let onWheel: ((event: WheelEvent) => void) | null = null;
    let onKeyDown: ((event: KeyboardEvent) => void) | undefined;
    let onKeyUp: ((event: KeyboardEvent) => void) | undefined;
    const heldKeys = keysRef.current;

    const setup = async () => {
      const application = new PIXI.Application();
      await application.init({
        resizeTo: containerRef.current!,
        backgroundColor: 0x0b0f19,
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
      });

      if (cancelled || !containerRef.current) {
        application.destroy(true);
        return;
      }

      app = application;
      application.canvas.setAttribute('aria-label', 'Interactive 2D Virtual Office');
      application.canvas.setAttribute('role', 'img');
      containerRef.current.appendChild(application.canvas);
      setCanvasError(null);

      const mapData = stateRef.current.map;
      const worldWidth = mapData.width * mapData.tileSize;
      const worldHeight = mapData.height * mapData.tileSize;
      const world = new PIXI.Container();
      world.scale.set(zoomRef.current);
      worldRef.current = world;
      application.stage.addChild(world);

      const makeText = (
        text: string,
        fontSize: number,
        fill: string,
        bold = false
      ) =>
        new PIXI.Text({
          text,
          style: {
            fontFamily: 'sans-serif',
            fontSize,
            fill,
            fontWeight: bold ? 'bold' : 'normal',
          },
        });

      const background = new PIXI.Graphics()
        .rect(0, 0, worldWidth, worldHeight)
        .fill({ color: 0x0b0f19 })
        .stroke({ color: 0x1e293b, width: 2 })
      world.addChild(background);

      const floorGrid = new PIXI.Graphics().setStrokeStyle({
        width: 1,
        color: 0x1e293b,
        alpha: 0.35,
      });
      for (let x = 0; x <= worldWidth; x += mapData.tileSize) {
        floorGrid.moveTo(x, 0).lineTo(x, worldHeight);
      }
      for (let y = 0; y <= worldHeight; y += mapData.tileSize) {
        floorGrid.moveTo(0, y).lineTo(worldWidth, y);
      }
      floorGrid.stroke();
      world.addChild(floorGrid);

      for (const room of mapData.rooms) {
        const x = room.x * mapData.tileSize;
        const y = room.y * mapData.tileSize;
        const width = room.width * mapData.tileSize;
        const height = room.height * mapData.tileSize;
        const color = hexToNumber(room.floorColor, 0x172033);
        const floor = new PIXI.Graphics()
          .roundRect(x + 2, y + 2, width - 4, height - 4, 6)
          .fill({ color, alpha: 0.75 })
          .stroke({ color: 0x334155, width: 2, alpha: 0.9 });
        world.addChild(floor);

        const roomLabel = makeText(room.name.toUpperCase(), 11, '#94a3b8', true);
        roomLabel.position.set(x + 12, y + 8);
        world.addChild(roomLabel);
      }

      for (const portal of mapData.portals) {
        const x = portal.sourceX * mapData.tileSize + 16;
        const y = portal.sourceY * mapData.tileSize + 16;
        const ring = new PIXI.Graphics()
          .circle(0, 0, 14)
          .fill({ color: 0x06b6d4, alpha: 0.25 })
          .stroke({ color: 0x22d3ee, width: 2, alpha: 0.9 });
        ring.position.set(x, y);
        world.addChild(ring);
        gsap.to(ring, {
          alpha: 0.45,
          duration: 0.9,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
        const label = makeText(`⚡ ${portal.label}`, 10, '#67e8f9');
        label.anchor.set(0.5);
        label.position.set(x, y - 22);
        world.addChild(label);
      }

      for (const object of mapData.objects) {
        const x = object.x * mapData.tileSize;
        const y = object.y * mapData.tileSize;
        const width = object.width * mapData.tileSize;
        const height = object.height * mapData.tileSize;
        const graphic = new PIXI.Graphics()
          .roundRect(x + 2, y + 2, width - 4, height - 4, 5)
          .fill({ color: MAP_OBJECT_COLOR[object.type] || 0x334155, alpha: 0.95 })
          .stroke({ color: 0x64748b, width: 1.5, alpha: 0.9 });
        world.addChild(graphic);
        const icon = makeText(MAP_OBJECT_ICON[object.type] || '📦', 14, '#ffffff');
        icon.anchor.set(0.5);
        icon.position.set(x + width / 2, y + height / 2);
        world.addChild(icon);
      }

      const playerContainer = new PIXI.Container();
      playerContainer.position.set(6 * mapData.tileSize, 5 * mapData.tileSize);
      const playerRing = new PIXI.Graphics()
        .circle(0, 0, 125)
        .fill({ color: 0x10b981, alpha: 0.05 })
        .stroke({ color: 0x10b981, width: 1, alpha: 0.22 });
      gsap.to(playerRing, {
        alpha: 0.65,
        duration: 1.2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
      playerContainer.addChild(playerRing);
      playerContainer.addChild(
        new PIXI.Graphics()
          .ellipse(0, 12, 11, 5)
          .fill({ color: 0x000000, alpha: 0.45 })
      );
      playerContainer.addChild(
        new PIXI.Graphics()
          .circle(0, 0, 13)
          .fill(hexToNumber(stateRef.current.avatarColor))
          .stroke({ color: 0xffffff, width: 2, alpha: 0.9 })
      );
      const playerName = makeText(
        `${stateRef.current.displayName} (You)`,
        11,
        '#f8fafc',
        true
      );
      playerName.anchor.set(0.5);
      playerName.position.y = -24;
      playerContainer.addChild(playerName);
      const directionIndicator = new PIXI.Graphics().circle(0, 9, 3.5).fill(0xffffff);
      playerContainer.addChild(directionIndicator);
      world.addChild(playerContainer);

      type AIEntry = {
        container: PIXI.Container;
        statusDot: PIXI.Graphics;
        statusLabel: PIXI.Text;
        baseX: number;
        baseY: number;
        phase: number;
      };
      type RemoteEntry = {
        container: PIXI.Container;
        targetX: number;
        targetY: number;
      };
      const aiEntries = new Map<string, AIEntry>();
      const remoteEntries = new Map<string, RemoteEntry>();
      let lastSyncTime = 0;
      let lastIdleTime = Date.now();
      let lastFootstepTime = 0;
      let currentDirection = 'DOWN';

      const handleKeyDown = (event: KeyboardEvent) => {
        const target = event.target;
        if (
          target instanceof HTMLElement &&
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
        ) {
          return;
        }
        const key = event.key.toLowerCase();
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
          event.preventDefault();
        }
        heldKeys.add(key);
        if (key === 'e' && !event.repeat) handleInteract();
      };
      const handleKeyUp = (event: KeyboardEvent) => {
        heldKeys.delete(event.key.toLowerCase());
      };
      onKeyDown = handleKeyDown;
      onKeyUp = handleKeyUp;
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);

      const collides = (nextX: number, nextY: number) => {
        const currentMap = stateRef.current.map;
        const radius = 11;
        if (
          nextX < radius ||
          nextY < radius ||
          nextX > currentMap.width * currentMap.tileSize - radius ||
          nextY > currentMap.height * currentMap.tileSize - radius
        ) {
          return true;
        }
        return currentMap.objects.some((object) => {
          if (!object.collidable) return false;
          const x = object.x * currentMap.tileSize + 2;
          const y = object.y * currentMap.tileSize + 2;
          const width = object.width * currentMap.tileSize - 4;
          const height = object.height * currentMap.tileSize - 4;
          return (
            nextX + radius > x &&
            nextX - radius < x + width &&
            nextY + radius > y &&
            nextY - radius < y + height
          );
        });
      };

      const addAvatar = (
        x: number,
        y: number,
        color: string,
        label: string,
        radius = 12
      ) => {
        const container = new PIXI.Container();
        container.position.set(x, y);
        container.addChild(
          new PIXI.Graphics()
            .ellipse(0, 12, 11, 5)
            .fill({ color: 0x000000, alpha: 0.4 })
        );
        container.addChild(
          new PIXI.Graphics()
            .circle(0, 0, radius)
            .fill(hexToNumber(color, 0x3b82f6))
            .stroke({ color: 0xe2e8f0, width: 2, alpha: 0.9 })
        );
        const name = makeText(label, 11, '#f1f5f9', true);
        name.anchor.set(0.5);
        name.position.y = -24;
        container.addChild(name);
        world.addChild(container);
        return container;
      };

      tick = (ticker) => {
        const currentState = stateRef.current;
        const delta = Math.min(ticker.deltaMS, 50) / 1000;
        const speed = 175 * delta;
        let dx = touchDirRef.current.dx * speed;
        let dy = touchDirRef.current.dy * speed;
        const keys = heldKeys;
        const typing =
          document.activeElement instanceof HTMLElement &&
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(
            document.activeElement.tagName
          );

        if (!typing) {
          if (keys.has('a') || keys.has('arrowleft')) dx -= speed;
          if (keys.has('d') || keys.has('arrowright')) dx += speed;
          if (keys.has('w') || keys.has('arrowup')) dy -= speed;
          if (keys.has('s') || keys.has('arrowdown')) dy += speed;
        }
        if (dx !== 0 && dy !== 0) {
          dx *= 0.7071;
          dy *= 0.7071;
        }

        let moved = false;
        if (dx !== 0 && !collides(playerContainer.x + dx, playerContainer.y)) {
          playerContainer.x += dx;
          moved = true;
        }
        if (dy !== 0 && !collides(playerContainer.x, playerContainer.y + dy)) {
          playerContainer.y += dy;
          moved = true;
        }
        if (dx < 0) currentDirection = 'LEFT';
        else if (dx > 0) currentDirection = 'RIGHT';
        else if (dy < 0) currentDirection = 'UP';
        else if (dy > 0) currentDirection = 'DOWN';
        directionIndicator.position.set(
          currentDirection === 'LEFT' ? -9 : currentDirection === 'RIGHT' ? 9 : 0,
          currentDirection === 'UP' ? -9 : currentDirection === 'DOWN' ? 9 : 0
        );

        const px = playerContainer.x;
        const py = playerContainer.y;
        if (moved) {
          lastIdleTime = Date.now();
          if (ticker.lastTime - lastFootstepTime > 290) {
            soundFX.playFootstep();
            lastFootstepTime = ticker.lastTime;
          }
          for (const portal of currentState.map.portals) {
            const portalX = portal.sourceX * currentState.map.tileSize + 16;
            const portalY = portal.sourceY * currentState.map.tileSize + 16;
            if (Math.hypot(px - portalX, py - portalY) < 18) {
              playerContainer.position.set(
                portal.destinationX * currentState.map.tileSize + 16,
                portal.destinationY * currentState.map.tileSize + 16
              );
              soundFX.playNotification();
              break;
            }
          }
        }

        let roomId = 'room_lobby';
        for (const room of currentState.map.rooms) {
          const x = room.x * currentState.map.tileSize;
          const y = room.y * currentState.map.tileSize;
          if (
            px >= x &&
            px <= x + room.width * currentState.map.tileSize &&
            py >= y &&
            py <= y + room.height * currentState.map.tileSize
          ) {
            roomId = room.id;
            break;
          }
        }
        if (
          roomId === 'room_meeting' &&
          !useAppStore.getState().inMeetingRoom &&
          moved
        ) {
          setInMeetingRoom(true);
          soundFX.playMeetingJoin();
        }

        const idleElapsed = Date.now() - lastIdleTime;
        const nextStatus =
          idleElapsed > 90000 && currentState.status === 'AVAILABLE'
            ? 'AWAY'
            : moved && currentState.status === 'AWAY'
              ? 'AVAILABLE'
              : currentState.status;

        let closestAI: AIEmployee | null = null;
        let minAiDist = 68;
        for (const ai of currentState.ais) {
          let entry = aiEntries.get(ai.id);
          if (!entry) {
            const container = addAvatar(
              ai.x,
              ai.y,
              ai.avatarColor,
              `🤖 ${ai.name}`,
              12
            );
            const dot = new PIXI.Graphics().circle(11, -11, 5).fill(
              hexToNumber(AI_STATUS_COLOR[ai.status])
            );
            container.addChild(dot);
            const label = makeText(ai.status.replace('_', ' '), 9, '#cbd5e1');
            label.anchor.set(0.5);
            label.position.y = 20;
            container.addChild(label);
            entry = {
              container,
              statusDot: dot,
              statusLabel: label,
              baseX: ai.x,
              baseY: ai.y,
              phase: Math.random() * Math.PI * 2,
            };
            aiEntries.set(ai.id, entry);
          }
          if (ai.status !== 'PAUSED') {
            entry.container.x = entry.baseX + Math.sin(ticker.lastTime / 1200 + entry.phase) * 8;
          }
          entry.statusDot.clear().circle(11, -11, 5).fill(
            hexToNumber(AI_STATUS_COLOR[ai.status])
          );
          entry.statusLabel.text = ai.status.replace('_', ' ');
          const distance = Math.hypot(px - entry.container.x, py - entry.container.y);
          if (distance < minAiDist) {
            minAiDist = distance;
            closestAI = ai;
          }
        }
        if (
          closestAI?.id !==
          useAppStore.getState().nearbyAIEmployee?.id
        ) {
          setNearbyAIEmployee(closestAI);
          if (!closestAI) setAiContextMenuOpen(false);
        }

        let closestObject: {
          id: string;
          label: string;
          actionType?: string;
        } | null = null;
        let minObjectDist = 60;
        for (const object of currentState.map.objects) {
          if (!object.interactive) continue;
          const x = (object.x + object.width / 2) * currentState.map.tileSize;
          const y = (object.y + object.height / 2) * currentState.map.tileSize;
          const distance = Math.hypot(px - x, py - y);
          if (distance < minObjectDist) {
            minObjectDist = distance;
            closestObject = {
              id: object.id,
              label: object.label,
              actionType: object.actionType,
            };
          }
        }
        if (closestObject?.id !== useAppStore.getState().nearbyObject?.id) {
          setNearbyObject(closestObject);
        }

        const remotePlayers = currentState.remotePlayers;
        for (const remote of Object.values(remotePlayers)) {
          if (remote.uid === currentState.uid) continue;
          let entry = remoteEntries.get(remote.uid);
          if (!entry) {
            entry = {
              container: addAvatar(
                remote.x,
                remote.y,
                remote.avatarColor || '#3b82f6',
                remote.displayName
              ),
              targetX: remote.x,
              targetY: remote.y,
            };
            remoteEntries.set(remote.uid, entry);
          }
          entry.targetX = remote.x;
          entry.targetY = remote.y;
          entry.container.x += (entry.targetX - entry.container.x) * 0.18;
          entry.container.y += (entry.targetY - entry.container.y) * 0.18;
        }
        for (const [uid, entry] of remoteEntries) {
          if (!remotePlayers[uid]) {
            world.removeChild(entry.container);
            entry.container.destroy({ children: true });
            remoteEntries.delete(uid);
          }
        }

        const zoom = world.scale.x || 1;
        const viewportWidth = application.screen.width / zoom;
        const viewportHeight = application.screen.height / zoom;
        const minCameraX = Math.min(worldWidth / 2, viewportWidth / 2);
        const maxCameraX = Math.max(worldWidth / 2, worldWidth - viewportWidth / 2);
        const minCameraY = Math.min(worldHeight / 2, viewportHeight / 2);
        const maxCameraY = Math.max(worldHeight / 2, worldHeight - viewportHeight / 2);
        const cameraX = Math.max(minCameraX, Math.min(maxCameraX, px));
        const cameraY = Math.max(minCameraY, Math.min(maxCameraY, py));
        world.position.set(
          application.screen.width / 2 - cameraX * zoom,
          application.screen.height / 2 - cameraY * zoom
        );

        if (
          (moved && ticker.lastTime - lastSyncTime > 250) ||
          nextStatus !== currentState.status
        ) {
          lastSyncTime = ticker.lastTime;
          const position = {
            x: Math.round(px),
            y: Math.round(py),
            roomId,
            status: nextStatus,
          };
          setLocalPlayerPos(position);
          if (currentState.uid !== 'local_guest') {
            void syncPlayerPresence({
              uid: currentState.uid,
              displayName: currentState.displayName,
              role: currentState.role,
              avatarColor: currentState.avatarColor,
              x: px,
              y: py,
              direction: currentDirection as 'UP' | 'DOWN' | 'LEFT' | 'RIGHT',
              status: nextStatus,
              roomId,
              inCall: currentState.inCall,
            });
          }
        }
      };
      application.ticker.add(tick);

      onWheel = (event) => {
        event.preventDefault();
        updateZoom(zoomRef.current - Math.sign(event.deltaY) * 0.1);
      };
      application.canvas.addEventListener('wheel', onWheel, { passive: false });
    };

    void setup().catch((error: unknown) => {
      setCanvasError(
        error instanceof Error ? error.message : 'Failed to start PixiJS renderer.'
      );
    });

    return () => {
      cancelled = true;
      if (onKeyDown) window.removeEventListener('keydown', onKeyDown);
      if (onKeyUp) window.removeEventListener('keyup', onKeyUp);
      if (app && tick) app.ticker.remove(tick);
      if (app && onWheel) app.canvas.removeEventListener('wheel', onWheel);
      if (app) {
        app.destroy(true);
        app = null;
      }
      worldRef.current = null;
      heldKeys.clear();
      touchDirRef.current = { dx: 0, dy: 0 };
    };
  }, [
    handleInteract,
    setActiveTab,
    setInMeetingRoom,
    setLocalPlayerPos,
    setNearbyAIEmployee,
    setNearbyObject,
    updateZoom,
    viewMode,
  ]);

  const MAX_PROXIMITY_DISTANCE = 220;
  const nearbyEntitiesWithVolume = aiEmployees
    .map((ai) => {
      const distance = Math.hypot(localPlayerPos.x - ai.x, localPlayerPos.y - ai.y);
      return {
        id: ai.id,
        name: `🤖 ${ai.name}`,
        role: ai.role,
        volume: Math.round(Math.max(0, 1 - distance / MAX_PROXIMITY_DISTANCE) * 100),
      };
    })
    .filter((item) => item.volume > 0)
    .sort((a, b) => b.volume - a.volume);
  const currentRoom = officeMap.rooms.find((room) => room.id === localPlayerPos.roomId);

  return (
    <div className="relative h-full w-full select-none overflow-hidden bg-slate-950">
      {viewMode === '2D' ? (
        <>
          <div ref={containerRef} className="h-full w-full" />
          {canvasError && (
            <div role="alert" className="absolute inset-0 flex items-center justify-center bg-slate-950/90 p-6 text-sm text-rose-300">
              PixiJS renderer error: {canvasError}
            </div>
          )}
        </>
      ) : (
        <VirtualOffice3DView
          officeMap={officeMap}
          aiEmployees={aiEmployees}
          players={players}
          localPlayerPos={localPlayerPos}
          currentUserId={currentUser?.uid || 'local_guest'}
        />
      )}

      <div className="absolute left-3 top-3 flex max-w-[calc(100%-14rem)] items-center gap-2.5 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 backdrop-blur-md sm:left-4 sm:top-4">
        <Compass className="h-4 w-4 shrink-0 text-emerald-400" />
        <div className="min-w-0 text-xs">
          <div className="truncate font-semibold text-slate-100">
            {currentRoom?.name || 'Main Corridor'}
          </div>
          <div className="truncate font-mono text-[11px] tabular-nums text-slate-400">
            Grid ({Math.round(localPlayerPos.x / 32)},{' '}
            {Math.round(localPlayerPos.y / 32)}) · WASD / D-pad
          </div>
        </div>
      </div>

      <div className="absolute right-3 top-3 flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/90 p-1 backdrop-blur-md sm:right-4 sm:top-4">
        <button
          type="button"
          onClick={() => setViewMode((mode) => (mode === '2D' ? '3D' : '2D'))}
          aria-label={`Switch to ${viewMode === '2D' ? '3D' : '2D'} view`}
          className="flex h-11 items-center gap-1 rounded-md px-2 text-xs text-slate-200 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          <Box className="h-4 w-4" />
          {viewMode}
        </button>
        {viewMode === '2D' && (
          <>
            <button
              type="button"
              onClick={() => updateZoom(cameraZoom - 0.1)}
              disabled={cameraZoom <= 0.5}
              aria-label="Perkecil tampilan"
              className="flex h-11 w-11 items-center justify-center rounded-md text-slate-200 hover:bg-slate-800 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-10 text-center font-mono text-xs tabular-nums text-slate-200" aria-live="polite">
              {Math.round(cameraZoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => updateZoom(cameraZoom + 0.1)}
              disabled={cameraZoom >= 2}
              aria-label="Perbesar tampilan"
              className="flex h-11 w-11 items-center justify-center rounded-md text-slate-200 hover:bg-slate-800 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => updateZoom(1)}
              disabled={cameraZoom === 1}
              aria-label="Atur ulang zoom"
              className="flex h-11 w-11 items-center justify-center rounded-md text-slate-200 hover:bg-slate-800 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {viewMode === '2D' && (
        <div className="absolute bottom-4 left-4 z-20 grid grid-cols-3 gap-1.5 rounded-2xl border border-slate-700/80 bg-slate-900/90 p-2 shadow-xl backdrop-blur-md lg:hidden">
          <div />
          <button
            type="button"
            aria-label="Move up"
            onPointerDown={() => (touchDirRef.current = { dx: 0, dy: -1 })}
            onPointerUp={() => (touchDirRef.current = { dx: 0, dy: 0 })}
            onPointerLeave={() => (touchDirRef.current = { dx: 0, dy: 0 })}
            onPointerCancel={() => (touchDirRef.current = { dx: 0, dy: 0 })}
            className="h-11 w-11 rounded-xl bg-slate-800 text-sm font-bold text-white active:bg-emerald-600"
          >
            ▲
          </button>
          <div />
          {[
            { label: 'Move left', dx: -1, dy: 0, icon: '◀' },
            { label: 'Move down', dx: 0, dy: 1, icon: '▼' },
            { label: 'Move right', dx: 1, dy: 0, icon: '▶' },
          ].map((direction) => (
            <button
              key={direction.label}
              type="button"
              aria-label={direction.label}
              onPointerDown={() =>
                (touchDirRef.current = { dx: direction.dx, dy: direction.dy })
              }
              onPointerUp={() => (touchDirRef.current = { dx: 0, dy: 0 })}
              onPointerLeave={() => (touchDirRef.current = { dx: 0, dy: 0 })}
              onPointerCancel={() => (touchDirRef.current = { dx: 0, dy: 0 })}
              className="h-11 w-11 rounded-xl bg-slate-800 text-sm font-bold text-white active:bg-emerald-600"
            >
              {direction.icon}
            </button>
          ))}
        </div>
      )}

      {nearbyEntitiesWithVolume.length > 0 && (
        <div className="absolute left-1/2 top-20 hidden -translate-x-1/2 items-center gap-3 rounded-lg border border-emerald-500/30 bg-slate-900/90 px-4 py-2 backdrop-blur-md xl:flex">
          <Volume2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400">Proximity:</span>
            {nearbyEntitiesWithVolume.slice(0, 3).map((entity) => (
              <span key={entity.id} className="font-mono tabular-nums text-slate-100">
                {entity.name} ({entity.volume}%)
              </span>
            ))}
          </div>
        </div>
      )}

      {coffeeToast && (
        <div className="absolute left-1/2 top-16 -translate-x-1/2 rounded-lg border border-amber-500/40 bg-amber-950/95 px-4 py-2 text-xs font-medium text-amber-200">
          {coffeeToast}
        </div>
      )}

      {(nearbyAIEmployee || nearbyObject) && !aiContextMenuOpen && (
        <div className="absolute bottom-20 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-emerald-500/50 bg-slate-900/95 px-5 py-2.5 shadow-xl">
          <span className="rounded bg-emerald-500 px-2 py-0.5 font-mono text-xs font-bold text-slate-950">
            E
          </span>
          <span className="text-xs font-medium text-slate-100">
            {nearbyAIEmployee
              ? `Interact with 🤖 ${nearbyAIEmployee.name} (${nearbyAIEmployee.role})`
              : `Interact with ${nearbyObject?.label}`}
          </span>
          <button
            onClick={handleInteract}
            className="ml-2 whitespace-nowrap rounded bg-slate-800 px-3 py-1 text-xs font-medium text-emerald-400 hover:bg-slate-700"
          >
            Open Menu
          </button>
        </div>
      )}

      {nearbyAIEmployee && aiContextMenuOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.16 }}
          className="absolute bottom-20 left-1/2 z-30 max-h-[70%] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-md"
        >
          <div className="flex items-start justify-between border-b border-slate-800 pb-3">
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
              className="rounded px-2 py-1 text-xs text-slate-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              Close
            </button>
          </div>

          <div className="flex items-center justify-between py-2.5 font-mono text-xs tabular-nums text-slate-300">
            <span>Status: {nearbyAIEmployee.status}</span>
            <span>KPI: {nearbyAIEmployee.performanceScore}%</span>
            <span>
              Budget: ${nearbyAIEmployee.spentToday} / $
              {nearbyAIEmployee.dailyBudget}
            </span>
          </div>

          <CharacterAnimationPreview />
          <div className="grid grid-cols-2 gap-2 pt-3">
            <button
              onClick={() => {
                setSelectedAIEmployeeId(nearbyAIEmployee.id);
                setActiveTab('AI_CONTROL_CENTER');
                setAiContextMenuOpen(false);
              }}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Chat & Direct AI
            </button>
            <button
              onClick={() => {
                setSelectedAIEmployeeId(nearbyAIEmployee.id);
                setActiveTab('TASK_BOARD');
                setAiContextMenuOpen(false);
              }}
              className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-slate-100 hover:bg-slate-700"
            >
              <ListChecks className="h-3.5 w-3.5" />
              Assign / View Tasks
            </button>
            <button
              onClick={() => {
                setSelectedDepartmentId(nearbyAIEmployee.departmentId);
                setActiveTab('AI_STANDUP');
                setAiContextMenuOpen(false);
              }}
              className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-slate-100 hover:bg-slate-700"
            >
              <Video className="h-3.5 w-3.5" />
              Start AI Standup
            </button>
            <button
              onClick={() => {
                const status =
                  nearbyAIEmployee.status === 'PAUSED' ? 'WORKING' : 'PAUSED';
                void updateAIEmployeeState(nearbyAIEmployee, { status });
                setAiContextMenuOpen(false);
              }}
              className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-amber-300 hover:bg-slate-700"
            >
              {nearbyAIEmployee.status === 'PAUSED' ? (
                <PlayCircle className="h-3.5 w-3.5" />
              ) : (
                <PauseCircle className="h-3.5 w-3.5" />
              )}
              {nearbyAIEmployee.status === 'PAUSED' ? 'Resume AI' : 'Pause AI'}
            </button>
            <button
              onClick={() => {
                setSelectedAIEmployeeId(nearbyAIEmployee.id);
                setActiveTab('AI_GOVERNANCE');
                setAiContextMenuOpen(false);
              }}
              className="col-span-2 flex items-center justify-center gap-2 rounded-lg bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Supervisor Controls
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
