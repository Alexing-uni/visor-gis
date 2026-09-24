import { useLayoutEffect, useRef, useState } from 'react';
import type { Layer } from '../model/Layer.ts';
import type { Selection } from '../types.ts';
export function FeaturePopup({ selection, layer, close }: { selection: Selection; layer: Layer; close: () => void }) {
  const element = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const [position, setPosition] = useState({ x: selection.x, y: selection.y });
  const clamp = (x: number, y: number) => {
    const popup = element.current, parent = popup?.parentElement;
    if (!popup || !parent) return { x, y };
    return { x: Math.max(8, Math.min(x, parent.clientWidth - popup.offsetWidth - 8)), y: Math.max(8, Math.min(y, parent.clientHeight - popup.offsetHeight - 8)) };
  };
  useLayoutEffect(() => { setPosition(clamp(selection.x + 10, selection.y + 10)); }, [selection]);
  const attributes = layer.attributes(selection.feature);
  return <div ref={element} className="popup" role="dialog" aria-label="Propiedades de la entidad" style={{ left: position.x, top: position.y }}>
    <div className="popup-heading" onPointerDown={event => {
      if ((event.target as HTMLElement).closest('button')) return;
      drag.current = { x: event.clientX, y: event.clientY, left: position.x, top: position.y };
      event.currentTarget.setPointerCapture(event.pointerId);
    }} onPointerMove={event => { if (drag.current) setPosition(clamp(drag.current.left + event.clientX - drag.current.x, drag.current.top + event.clientY - drag.current.y)); }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
      <strong>{layer.name}</strong><button onClick={close} aria-label="Cerrar propiedades">×</button></div>
    <dl className="attributes">{attributes.map(attribute => <div className="attribute" key={attribute.label}><dt>{attribute.label}</dt><dd>{attribute.value}</dd></div>)}</dl>
    {!attributes.length && <p>La entidad no contiene atributos configurados para esta capa.</p>}
    <div className="popup-hint">Arrastra la cabecera para mover este panel.</div>
  </div>;
}
