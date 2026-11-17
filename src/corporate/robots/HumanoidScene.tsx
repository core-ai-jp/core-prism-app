import { useEffect, useRef, useState } from 'react';
import { Hand, RotateCcw, X } from 'lucide-react';
import { mountHumanoidScene, type HumanoidController, type HumanoidFocus, type HumanoidPhase } from './mountHumanoidScene';
import data from '../robotsContent.json';

type Part = (typeof data.scene.parts)[number] & { id: HumanoidFocus };
const parts = data.scene.parts as Part[];
const spots = parts.filter(p => p.id !== 'full') as Array<Part & { id: Exclude<HumanoidFocus, 'full'> }>;

export default function HumanoidScene() {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<HumanoidController | null>(null);
  const anchorEls = useRef<Partial<Record<Exclude<HumanoidFocus, 'full'>, HTMLButtonElement | null>>>({});
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [phase, setPhase] = useState<HumanoidPhase>('boot');
  const [focus, setFocus] = useState<HumanoidFocus>('full');
  const [touched, setTouched] = useState(false);
  const [reduced] = useState(() => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let controller: HumanoidController | undefined;
    let disposed = false;
    const fail = () => { if (!disposed) { controller?.dispose(); api.current = null; setFailed(true); setReady(false); } };
    const frame = requestAnimationFrame(() => {
      try {
        controller = mountHumanoidScene(container, {
          onReady: () => { if (!disposed) setReady(true); },
          onFailure: fail,
          onPhase: next => { if (!disposed) setPhase(next); },
          onFocus: next => { if (!disposed) setFocus(next); },
        });
        api.current = controller;
      } catch { fail(); }
    });
    return () => { disposed = true; cancelAnimationFrame(frame); controller?.dispose(); api.current = null; };
  }, []);
  useEffect(() => { if (ready) api.current?.setAnchors(anchorEls.current); }, [ready]);
  if (failed) return <p className="robots-scene-hint" role="status">{data.scene.fallback}</p>;
  const current = parts.find(p => p.id === focus) ?? parts[0];
  const choose = (id: HumanoidFocus) => { setTouched(true); api.current?.focus(id); };
  return <>
    <div ref={host} className="robots-canvas" data-phase={phase} style={{ visibility: ready ? 'visible' : 'hidden' }} onPointerDown={() => setTouched(true)}>
      {spots.map(spot => <button key={spot.id} type="button" ref={el => { anchorEls.current[spot.id] = el; }} className="robots-spot" data-show="false" onClick={() => choose(spot.id)} aria-label={`${spot.label}を見る`}>
        <span className="robots-spot-dot" aria-hidden="true" /><span className="robots-spot-label">{spot.short}</span>
      </button>)}
    </div>
    {ready && <>
      <div className="robots-hud" aria-hidden="true"><i /><i /><i /><i /></div>
      <p className="robots-status-pill" data-phase={phase} role="status"><span aria-hidden="true" />{phase === 'boot' ? data.scene.booting : `${data.scene.online} · ${data.scene.hudLabel}`}</p>
      {!touched && phase === 'online' && <p className="robots-gesture-hint">{data.scene.gestureHint}</p>}
      {focus !== 'full' && <aside className="robots-part-card" key={current.id} aria-live="polite">
        <p className="robots-part-kicker">{current.kicker}</p><h3>{current.title}</h3><p>{current.body}</p>
        <button type="button" onClick={() => choose('full')} aria-label={data.scene.close}><X size={16} aria-hidden="true" /></button>
      </aside>}
      <div className="robots-controls" role="group" aria-label="3D構想モデルの操作">
        <div className="robots-focus" role="group" aria-label={data.scene.focusLabel}>
          {parts.map(p => <button key={p.id} type="button" aria-pressed={focus === p.id} onClick={() => choose(p.id)}><span className="robots-control-long">{p.label}</span><span className="robots-control-short">{p.short}</span></button>)}
        </div>
        {!reduced && <button type="button" className="robots-action" onClick={() => { setTouched(true); api.current?.greet(); }} aria-label={data.scene.greet}><Hand size={16} aria-hidden="true" /><span className="robots-control-long">{data.scene.greet}</span><span className="robots-control-short">{data.scene.greetShort}</span></button>}
        <button type="button" className="robots-action" onClick={() => api.current?.replay()} aria-label={data.scene.replay} title={data.scene.replay}><RotateCcw size={16} aria-hidden="true" /></button>
      </div>
    </>}
  </>;
}
