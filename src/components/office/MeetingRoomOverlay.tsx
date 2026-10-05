'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/src/store/useAppStore';
import { soundFX } from '@/src/lib/sound';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  PhoneOff,
  Users,
  PenTool,
  X,
} from 'lucide-react';

export function MeetingRoomOverlay() {
  const inMeetingRoom = useAppStore((s) => s.inMeetingRoom);
  const micEnabled = useAppStore((s) => s.micEnabled);
  const cameraEnabled = useAppStore((s) => s.cameraEnabled);
  const screenShareEnabled = useAppStore((s) => s.screenShareEnabled);
  const whiteboardOpen = useAppStore((s) => s.whiteboardOpen);
  const currentUser = useAppStore((s) => s.currentUser);
  const aiEmployees = useAppStore((s) => s.aiEmployees);

  const setInMeetingRoom = useAppStore((s) => s.setInMeetingRoom);
  const setMicEnabled = useAppStore((s) => s.setMicEnabled);
  const setCameraEnabled = useAppStore((s) => s.setCameraEnabled);
  const setScreenShareEnabled = useAppStore((s) => s.setScreenShareEnabled);
  const setWhiteboardOpen = useAppStore((s) => s.setWhiteboardOpen);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Camera stream handler
  useEffect(() => {
    let stream: MediaStream | null = null;
    async function startCamera() {
      if (!cameraEnabled || !inMeetingRoom) return;
      try {
        setMediaError(null);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: micEnabled,
        });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch {
        setMediaError(
          'Camera/Microphone permission declined or unavailable in sandbox. Using virtual avatar feed.'
        );
        setCameraEnabled(false);
      }
    }
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [cameraEnabled, micEnabled, inMeetingRoom, setCameraEnabled]);

  // Screen share handler
  useEffect(() => {
    let displayStream: MediaStream | null = null;
    async function startScreenShare() {
      if (!screenShareEnabled || !inMeetingRoom) return;
      try {
        displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = displayStream;
        }
      } catch {
        setScreenShareEnabled(false);
      }
    }
    startScreenShare();
    return () => {
      if (displayStream) {
        displayStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [screenShareEnabled, inMeetingRoom, setScreenShareEnabled]);

  if (!inMeetingRoom && !whiteboardOpen) return null;

  return (
    <div className="fixed inset-0 lg:inset-y-14 lg:left-60 lg:right-80 z-40 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      {whiteboardOpen ? (
        <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <PenTool className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">
                Boardroom Collaborative Strategy Whiteboard
              </h3>
            </div>
            <button
              onClick={() => setWhiteboardOpen(false)}
              className="p-1 text-slate-400 hover:text-white rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 bg-slate-950 flex-1 flex flex-col items-center">
            <canvas
              ref={canvasRef}
              width={780}
              height={420}
              onMouseDown={(e) => {
                setIsDrawing(true);
                const ctx = canvasRef.current?.getContext('2d');
                if (!ctx || !canvasRef.current) return;
                const rect = canvasRef.current.getBoundingClientRect();
                ctx.strokeStyle = '#10b981';
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
              }}
              onMouseMove={(e) => {
                if (!isDrawing || !canvasRef.current) return;
                const ctx = canvasRef.current.getContext('2d');
                if (!ctx) return;
                const rect = canvasRef.current.getBoundingClientRect();
                ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
                ctx.stroke();
              }}
              onMouseUp={() => setIsDrawing(false)}
              onMouseLeave={() => setIsDrawing(false)}
              className="bg-slate-900 border border-slate-800 rounded-lg cursor-crosshair w-full max-w-[780px]"
            />
            <div className="mt-3 flex items-center justify-between w-full max-w-[780px] text-xs text-slate-400">
              <span>Draw architecture diagrams or Q4 campaign flows with mouse/touch.</span>
              <button
                onClick={() => {
                  const ctx = canvasRef.current?.getContext('2d');
                  if (ctx && canvasRef.current) {
                    ctx.clearRect(
                      0,
                      0,
                      canvasRef.current.width,
                      canvasRef.current.height
                    );
                  }
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md"
              >
                Clear Canvas
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4 text-emerald-400" />
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Boardroom Alpha — Live Hybrid Meeting (WebRTC / SFU Ready)
                </h2>
                <p className="text-xs text-slate-400">
                  Human Supervisors & Autonomous Department Agents
                </p>
              </div>
            </div>
            <button
              onClick={() => setWhiteboardOpen(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg transition-colors whitespace-nowrap"
            >
              Open Whiteboard
            </button>
          </div>

          {mediaError && (
            <div className="px-6 py-2 bg-amber-950/60 border-b border-amber-800/40 text-xs text-amber-300">
              {mediaError}
            </div>
          )}

          {/* Video Grid */}
          <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-4 bg-slate-950/60">
            {/* Local Human Participant */}
            <div className="relative aspect-video bg-slate-900 border border-emerald-500/40 rounded-lg overflow-hidden flex flex-col items-center justify-center">
              {cameraEnabled ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-emerald-600 flex items-center justify-center text-lg font-bold text-white">
                  {(currentUser?.displayName || 'U')[0]}
                </div>
              )}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs bg-slate-950/80 px-2.5 py-1 rounded">
                <span className="font-medium text-white truncate">
                  {currentUser?.displayName || 'You'} (Supervisor)
                </span>
                <span className="text-emerald-400 font-mono">
                  {micEnabled ? '🎤 Live' : '🔇 Muted'}
                </span>
              </div>
            </div>

            {/* Screen Share Tile if active */}
            {screenShareEnabled && (
              <div className="relative aspect-video bg-slate-900 border border-cyan-500/50 rounded-lg overflow-hidden flex flex-col items-center justify-center">
                <video
                  ref={screenVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-contain"
                />
                <div className="absolute bottom-2 left-2 bg-slate-950/80 px-2.5 py-1 rounded text-xs text-cyan-300">
                  🖥 Your Screen Share
                </div>
              </div>
            )}

            {/* AI Department Representatives in Meeting */}
            {aiEmployees.slice(0, 4).map((ai) => (
              <div
                key={ai.id}
                className="relative aspect-video bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col items-center justify-center p-4"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-inner mb-2"
                  style={{ backgroundColor: ai.avatarColor }}
                >
                  🤖
                </div>
                <div className="text-xs font-semibold text-white">
                  {ai.name} AI
                </div>
                <div className="text-[11px] text-slate-400 truncate max-w-full">
                  {ai.role}
                </div>
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded font-mono tabular-nums">
                  <span>{ai.modelProvider}</span>
                  <span className="text-emerald-400">{ai.status}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Meeting Controls Bar */}
          <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex items-center justify-center gap-3">
            <button
              onClick={() => {
                soundFX.playClick();
                setMicEnabled(!micEnabled);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                micEnabled
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {micEnabled ? (
                <Mic className="w-4 h-4" />
              ) : (
                <MicOff className="w-4 h-4" />
              )}
              {micEnabled ? 'Mute Mic' : 'Unmute Mic'}
            </button>

            <button
              onClick={() => {
                soundFX.playClick();
                setCameraEnabled(!cameraEnabled);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                cameraEnabled
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {cameraEnabled ? (
                <Video className="w-4 h-4" />
              ) : (
                <VideoOff className="w-4 h-4" />
              )}
              {cameraEnabled ? 'Stop Video' : 'Start Video'}
            </button>

            <button
              onClick={() => {
                soundFX.playClick();
                setScreenShareEnabled(!screenShareEnabled);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                screenShareEnabled
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <MonitorUp className="w-4 h-4" />
              {screenShareEnabled ? 'Stop Sharing' : 'Share Screen'}
            </button>

            <button
              onClick={() => {
                soundFX.playMeetingLeave();
                setCameraEnabled(false);
                setScreenShareEnabled(false);
                setInMeetingRoom(false);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
            >
              <PhoneOff className="w-4 h-4" />
              Leave Meeting Room
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
