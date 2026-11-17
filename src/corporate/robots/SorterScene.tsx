import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { mountSorterScene, type SorterController } from './mountSorterScene';
import data from '../robotsContent.json';

export default function SorterScene() {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<SorterController | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [wide, setWide] = useState(false);
  const playingRef = useRef(false);
  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let controller: SorterController | undefined;
    let disposed = false;
    const fail = () => { if (!disposed) { controller?.dispose(); api.current = null; setFailed(true); setReady(false); setPlaying(false); } };
    const frame = requestAnimationFrame(() => {
      try {
        controller = mountSorterScene(container, {
          onReady: () => { if (!disposed) setReady(true); },
          onFailure: fail,
          onStop: () => { playingRef.current = false; if (!disposed) setPlaying(false); },
          onView: next => { if (!disposed) setWide(next); },
        });
        api.current = controller;
      } catch { fail(); }
    });
    return () => { disposed = true; cancelAnimationFrame(frame); controller?.dispose(); api.current = null; };
  }, []);
  if (failed) return <p className="robots-scene-hint" role="status">{data.scene.fallback}</p>;
  return <>
    <div ref={host} className="robots-canvas" style={{ visibility: ready ? 'visible' : 'hidden' }} />
    {ready && <>
      <span className="robots-scene-hint">{wide ? data.scene.overviewHint : data.scene.detailHint}</span>
      <div className="robots-controls" role="group" aria-label="3D構想モデルの操作">
        <button type="button" onClick={() => api.current?.rotate(-1)} aria-label={data.scene.left}><ChevronLeft size={17} aria-hidden="true" /></button>
        <button type="button" onClick={() => api.current?.rotate(1)} aria-label={data.scene.right}><ChevronRight size={17} aria-hidden="true" /></button>
        <button type="button" aria-label={data.scene.reset} title={data.scene.reset} onClick={() => { api.current?.reset(); setWide(false); }}><RotateCcw size={17} aria-hidden="true" /></button>
        <button type="button" aria-label={wide ? data.scene.viewClose : data.scene.viewWide} aria-pressed={wide} onClick={() => { api.current?.view(!wide); setWide(!wide); }}><span className="robots-control-long">{wide ? data.scene.viewClose : data.scene.viewWide}</span><span className="robots-control-short">{wide ? data.scene.viewCloseShort : data.scene.viewWideShort}</span></button>
        <button type="button" aria-label={playing ? data.scene.pause : data.scene.play} aria-pressed={playing} onClick={() => { const next = api.current?.play(!playingRef.current) ?? false; playingRef.current = next; setPlaying(next); }}>
          {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}<span className="robots-control-long">{playing ? data.scene.pause : data.scene.play}</span><span className="robots-control-short">{playing ? data.scene.pauseShort : data.scene.playShort}</span>
        </button>
      </div>
    </>}
  </>;
}
