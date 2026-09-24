import { useEffect, useState } from 'react';
import { Button, Card, ColorPicker, Input, Slider, Switch, Tooltip } from 'antd';
import type { LayerConfig, LayerPatch } from '../types.ts';

type Props = {
  config: LayerConfig; count?: number; error?: string; busy: boolean; first: boolean; last: boolean;
  edit: (patch: LayerPatch) => void; fit: () => void; move: (direction: number) => void;
  drop: (id: string) => void;
};
function Range({ label, value, min, max, step, unit = '', commit, disabled }: {
  label: string; value: number; min: number; max: number; step: number; unit?: string; disabled: boolean; commit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return <div className="slider-row"><label>{label}</label><Slider ariaLabelForHandle={label} min={min} max={max} step={step} value={draft} disabled={disabled}
    onChange={setDraft} onChangeComplete={next => { if (next !== value) commit(next); }}/><output>{Math.round(draft * 100) / 100}{unit}</output></div>;
}
export function LayerCard({ config, count, error, busy, first, last, edit, fit, move, drop }: Props) {
  const [name, setName] = useState(config.name);
  useEffect(() => setName(config.name), [config.name]);
  const saveName = () => { const next = name.trim(); if (!next) setName(config.name); else if (next !== config.name) edit({ name: next }); };
  return <Card size="small" className="layer-card" data-layer-id={config.id}
    onDragOver={event => { if (!busy) event.preventDefault(); }}
    onDrop={event => { event.preventDefault(); const id = event.dataTransfer.getData('text/plain'); if (id && !busy) drop(id); }}
    title={<div className="layer-title"><span className="drag-handle" draggable={!busy} title="Arrastrar capa" onDragStart={event => event.dataTransfer.setData('text/plain', config.id)}>⠿</span>
      <Input variant="borderless" aria-label={`Nombre de ${config.id}`} maxLength={100} value={name} disabled={busy} onChange={event => setName(event.target.value)} onBlur={saveName} onPressEnter={event => event.currentTarget.blur()}/></div>}
    extra={<Switch size="small" aria-label={`Mostrar ${config.name}`} checked={config.visible} disabled={busy} onChange={visible => edit({ visible })}/> }>
    <div className="layer-meta"><span>{config.kind === 'point' ? 'Puntos' : config.kind === 'line' ? 'Polilíneas' : 'Polígonos'} · {count === undefined ? '…' : count.toLocaleString('es-ES')}</span><span>{config.crs}</span></div>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="row"><label>Borde</label><ColorPicker value={config.stroke} disabled={busy} onChangeComplete={color => edit({ stroke: color.toHexString() })}/>
      {config.kind !== 'line' && <><label>Relleno</label><ColorPicker value={config.fill} disabled={busy} onChangeComplete={color => edit({ fill: color.toHexString() })}/></>}</div>
    <Range label="Grosor" value={config.width} min={0.5} max={20} step={0.5} unit=" px" disabled={busy} commit={width => edit({ width })}/>
    {config.kind === 'point' && <Range label="Radio" value={config.radius} min={1} max={20} step={1} unit=" px" disabled={busy} commit={radius => edit({ radius })}/>}
    <Range label="Opacidad" value={Math.round(config.opacity * 100)} min={0} max={100} step={5} unit="%" disabled={busy} commit={opacity => edit({ opacity: opacity / 100 })}/>
    <div className="actions"><Tooltip title="Subir capa"><Button size="small" aria-label={`Subir ${config.name}`} disabled={first || busy} onClick={() => move(-1)}>↑</Button></Tooltip>
      <Tooltip title="Bajar capa"><Button size="small" aria-label={`Bajar ${config.name}`} disabled={last || busy} onClick={() => move(1)}>↓</Button></Tooltip>
      <Button size="small" onClick={fit} disabled={!count || Boolean(error)}>Encuadrar</Button></div>
  </Card>;
}
