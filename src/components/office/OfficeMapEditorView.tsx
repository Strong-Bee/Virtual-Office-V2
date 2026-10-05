'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/src/store/useAppStore';
import { saveOfficeMapToFirestore } from '@/src/lib/firestore-actions';
import { soundFX } from '@/src/lib/sound';
import { MapObjectItem } from '@/src/types';
import { Save, RotateCcw, Trash2, Plus, Grid } from 'lucide-react';

const PALETTE_ITEMS: {
  type: MapObjectItem['type'];
  label: string;
  icon: string;
  w: number;
  h: number;
  interactive: boolean;
  actionType?: MapObjectItem['actionType'];
}[] = [
  {
    type: 'computer',
    label: 'AI Workstation Desk',
    icon: '💻',
    w: 2,
    h: 1,
    interactive: true,
    actionType: 'OPEN_AI_CENTER',
  },
  {
    type: 'desk',
    label: 'Supervisor Executive Desk',
    icon: '🪑',
    w: 2,
    h: 1,
    interactive: true,
    actionType: 'OPEN_AI_CENTER',
  },
  {
    type: 'meeting_table',
    label: 'Conference Call Table',
    icon: '🎥',
    w: 4,
    h: 2,
    interactive: true,
    actionType: 'OPEN_MEETING',
  },
  {
    type: 'whiteboard',
    label: 'Collaborative Whiteboard',
    icon: '📋',
    w: 3,
    h: 1,
    interactive: true,
    actionType: 'OPEN_WHITEBOARD',
  },
  {
    type: 'coffee_machine',
    label: 'Espresso Barista Station',
    icon: '☕',
    w: 2,
    h: 1,
    interactive: true,
    actionType: 'BREW_COFFEE',
  },
  {
    type: 'server_rack',
    label: 'NVIDIA DGX AI Server Rack',
    icon: '🖧',
    w: 2,
    h: 1,
    interactive: true,
    actionType: 'VIEW_METRICS',
  },
  {
    type: 'bookshelf',
    label: 'Knowledge Vault Bookshelf',
    icon: '📚',
    w: 2,
    h: 1,
    interactive: true,
    actionType: 'OPEN_DOCS',
  },
  {
    type: 'plant',
    label: 'Office Botanical Plant',
    icon: '🌿',
    w: 1,
    h: 1,
    interactive: false,
  },
];

export function OfficeMapEditorView() {
  const officeMap = useAppStore((s) => s.officeMap);
  const setOfficeMap = useAppStore((s) => s.setOfficeMap);

  const [selectedPaletteIndex, setSelectedPaletteIndex] = useState(0);
  const [history, setHistory] = useState<MapObjectItem[][]>([]);
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);
  const [nextIdSeq, setNextIdSeq] = useState(1000);

  const handlePlaceObjectOnTile = (tileX: number, tileY: number) => {
    soundFX.playClick();
    const existingIdx = officeMap.objects.findIndex(
      (o) =>
        tileX >= o.x &&
        tileX < o.x + o.width &&
        tileY >= o.y &&
        tileY < o.y + o.height
    );

    setHistory((prev) => [...prev.slice(-15), officeMap.objects]);

    // If clicking an existing object, remove it; otherwise snap-place selected item
    if (existingIdx !== -1) {
      const updated = officeMap.objects.filter((_, idx) => idx !== existingIdx);
      setOfficeMap({ ...officeMap, objects: updated });
      return;
    }

    const template = PALETTE_ITEMS[selectedPaletteIndex];
    const newObj: MapObjectItem = {
      id: `obj_${tileX}_${tileY}_${nextIdSeq}`,
      type: template.type,
      label: template.label,
      x: tileX,
      y: tileY,
      width: template.w,
      height: template.h,
      collidable: true,
      interactive: template.interactive,
      actionType: template.actionType,
      roomId: 'room_lobby',
    };

    setNextIdSeq((s) => s + 1);
    setOfficeMap({
      ...officeMap,
      objects: [...officeMap.objects, newObj],
    });
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prevObjects = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setOfficeMap({ ...officeMap, objects: prevObjects });
  };

  const handleSaveMap = async () => {
    setSaving(true);
    soundFX.playClick();
    try {
      await saveOfficeMapToFirestore(officeMap);
      setSavedBanner(true);
      soundFX.playNotification();
      setTimeout(() => setSavedBanner(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="text-xs text-slate-400">
            Interactive 2D Spatial Architect & Snap-to-Grid Builder
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Virtual Office Map Editor — {officeMap.name}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Click any empty grid cell to place the selected object. Click an
            existing object on the grid to delete it.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-medium text-slate-200 rounded-lg transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Undo ({history.length})
          </button>
          <button
            onClick={handleSaveMap}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white rounded-lg transition-colors whitespace-nowrap"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving to Firestore...' : 'Save Office Layout'}
          </button>
        </div>
      </div>

      {savedBanner && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-lg text-xs text-emerald-300">
          ✓ Office map layout saved and synchronized across all connected
          multiplayer clients.
        </div>
      )}

      {/* Object Palette */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {PALETTE_ITEMS.map((item, idx) => (
          <button
            key={item.type}
            onClick={() => setSelectedPaletteIndex(idx)}
            className={`p-3 rounded-xl border text-left transition-all ${
              selectedPaletteIndex === idx
                ? 'bg-emerald-950/40 border-emerald-500 text-white'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="text-lg mb-1">{item.icon}</div>
            <div className="text-xs font-semibold truncate">{item.label}</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              Size: {item.w}x{item.h} tiles
            </div>
          </button>
        ))}
      </div>

      {/* Interactive 2D Tile Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-x-auto">
        <div
          className="relative bg-slate-950 border border-slate-800 mx-auto"
          style={{
            width: officeMap.width * 24,
            height: officeMap.height * 24,
          }}
        >
          {/* Room Zones Preview */}
          {officeMap.rooms.map((room) => (
            <div
              key={room.id}
              className="absolute border border-slate-700/80 rounded pointer-events-none flex items-start p-1.5"
              style={{
                left: room.x * 24,
                top: room.y * 24,
                width: room.width * 24,
                height: room.height * 24,
                backgroundColor: room.floorColor,
              }}
            >
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                {room.name}
              </span>
            </div>
          ))}

          {/* Placed Objects */}
          {officeMap.objects.map((obj) => (
            <div
              key={obj.id}
              title={`${obj.label} (Click to remove)`}
              className="absolute z-10 bg-emerald-900/60 border border-emerald-400/80 rounded flex items-center justify-center text-xs pointer-events-none"
              style={{
                left: obj.x * 24,
                top: obj.y * 24,
                width: obj.width * 24,
                height: obj.height * 24,
              }}
            >
              <span className="truncate px-1 text-[10px] font-mono text-white">
                {obj.type}
              </span>
            </div>
          ))}

          {/* Clickable Grid Cells */}
          {Array.from({ length: officeMap.height }).map((_, row) =>
            Array.from({ length: officeMap.width }).map((__, col) => (
              <button
                key={`${col}_${row}`}
                type="button"
                onClick={() => handlePlaceObjectOnTile(col, row)}
                className="absolute z-20 border border-slate-800/20 hover:bg-emerald-500/25 hover:border-emerald-400 transition-colors"
                style={{
                  left: col * 24,
                  top: row * 24,
                  width: 24,
                  height: 24,
                }}
                aria-label={`Grid cell ${col}, ${row}`}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
