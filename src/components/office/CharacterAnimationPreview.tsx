'use client';

import { useState } from 'react';
import { useRive } from '@rive-app/react-canvas';

function RiveAvatar({ src }: { src: string }) {
  const { RiveComponent } = useRive({ src, autoplay: true });
  return (
    <RiveComponent
      className="h-20 w-20 rounded-lg bg-slate-950"
      aria-label="Rive animated avatar"
    />
  );
}

export function CharacterAnimationPreview() {
  const [riveSource, setRiveSource] = useState('');

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-950/70 p-3">
      <h3 className="text-xs font-semibold text-slate-200">
        Character Animation Runtimes
      </h3>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] text-slate-400">
        <div className="space-y-1">
          {riveSource ? (
            <RiveAvatar src={riveSource} />
          ) : (
            <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-slate-700">
              Robot Rive asset needed
            </div>
          )}
          <label className="block">
            Robot Rive .riv URL
            <input
              value={riveSource}
              onChange={(event) => setRiveSource(event.target.value)}
              placeholder="/avatars/robot-agent.riv"
              className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200"
            />
          </label>
        </div>
        <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-slate-700 p-2 text-center">
          Spine runtime needs a license and exported skeleton assets.
        </div>
        <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-slate-700 p-2 text-center">
          Live2D needs the licensed Cubism SDK and a model.
        </div>
      </div>
    </section>
  );
}
