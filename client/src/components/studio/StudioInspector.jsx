import { useId } from 'react';
import {
  AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical,
  AlignStartHorizontal, AlignStartVertical, ArrowDown, ArrowLeft, ArrowRight,
  ArrowUp, ArrowDownToLine, ArrowUpToLine, Bold, Copy, FlipHorizontal2,
  Italic, LockKeyhole, Maximize, MousePointer2, RotateCcw, Trash2, UnlockKeyhole,
} from 'lucide-react';
import { FONT_OPTIONS } from '../designer/designerConstants';

const ALIGNMENTS = [
  ['left', 'Align left', AlignStartVertical],
  ['center', 'Center horizontally', AlignCenterVertical],
  ['right', 'Align right', AlignEndVertical],
  ['top', 'Align top', AlignStartHorizontal],
  ['middle', 'Center vertically', AlignCenterHorizontal],
  ['bottom', 'Align bottom', AlignEndHorizontal],
];
const NUDGES = [
  ['Move left', [-5, 0], ArrowLeft], ['Move up', [0, -5], ArrowUp],
  ['Move down', [0, 5], ArrowDown], ['Move right', [5, 0], ArrowRight],
];

function colorInputValue(fill) {
  if (/^#[0-9a-f]{6}$/i.test(fill)) return fill;
  if (/^#[0-9a-f]{3}$/i.test(fill)) return `#${fill.slice(1).split('').map(value => value + value).join('')}`;
  return '#181818';
}

export default function StudioInspector({ selected, onUpdate, onCommand }) {
  const prefix = useId();
  if (!selected) return (
    <section className="us-inspector" aria-label="Artwork properties">
      <MousePointer2 size={22} aria-hidden="true" />
      <strong>Make it yours</strong>
      <p>Select artwork on your design to change its color, size, and position.</p>
    </section>
  );

  const locked = !!selected.locked;
  const text = selected.type === 'text';
  const image = selected.type === 'image';
  const updateNumber = (event, key, min, max, divisor = 1) => {
    const value = event.target.valueAsNumber;
    if (Number.isFinite(value)) onUpdate({ [key]: Math.min(max, Math.max(min, value)) / divisor });
  };
  const iconButton = (label, Icon, action, value) => (
    <button key={label} type="button" className="us-icon-button" aria-label={label} title={label} disabled={locked} onClick={() => onCommand(action, value)}>
      <Icon size={17} aria-hidden="true" />
    </button>
  );

  return (
    <section className="us-inspector" aria-label="Selected artwork properties">
      <div className="us-field-row">
        <strong>{text ? 'Text' : image ? 'Image' : selected.type === 'activeselection' ? 'Selected artwork' : 'Shape'} settings</strong>
        <button type="button" className="us-button" aria-pressed={locked} onClick={() => onCommand('lock')}>
          {locked ? <UnlockKeyhole size={15} aria-hidden="true" /> : <LockKeyhole size={15} aria-hidden="true" />}
          {locked ? 'Unlock' : 'Lock'}
        </button>
      </div>

      {locked && <p className="us-warning" role="status">This layer is locked. Unlock it to make changes.</p>}
      {selected.outside && (
        <div className="us-warning" role="status">
          <p>Part of this artwork is outside the print area and will be cropped.</p>
          <button type="button" className="us-button" disabled={locked} onClick={() => onCommand('size', 0.94)}><Maximize size={15} aria-hidden="true" /> Fit in print area</button>
        </div>
      )}

      {text && (
        <>
          <div className="us-field">
            <label className="us-label" htmlFor={`${prefix}-text`}>Your text</label>
            <textarea id={`${prefix}-text`} rows={3} value={selected.text} disabled={locked} onChange={event => onUpdate({ text: event.target.value })} />
          </div>
          <div className="us-field">
            <label className="us-label" htmlFor={`${prefix}-font`}>Font</label>
            <select id={`${prefix}-font`} value={selected.fontFamily} disabled={locked} onChange={event => onUpdate({ fontFamily: event.target.value })}>
              {!FONT_OPTIONS.some(font => font.value === selected.fontFamily) && <option value={selected.fontFamily}>{selected.fontFamily}</option>}
              {FONT_OPTIONS.map(font => <option key={font.value} value={font.value}>{font.label}</option>)}
            </select>
          </div>
          <div className="us-field-row">
            <div className="us-field">
              <label className="us-label" htmlFor={`${prefix}-font-size`}>Font size</label>
              <input id={`${prefix}-font-size`} type="number" inputMode="numeric" min={6} max={600} step={1} value={selected.fontSize} disabled={locked} onChange={event => updateNumber(event, 'fontSize', 6, 600)} />
            </div>
            <div className="us-segmented" role="group" aria-label="Text style">
              <button type="button" className="us-icon-button" aria-label="Bold text" title="Bold" aria-pressed={selected.bold} disabled={locked} onClick={() => onUpdate({ fontWeight: selected.bold ? 'normal' : 'bold' })}><Bold size={18} aria-hidden="true" /></button>
              <button type="button" className="us-icon-button" aria-label="Italic text" title="Italic" aria-pressed={selected.italic} disabled={locked} onClick={() => onUpdate({ fontStyle: selected.italic ? 'normal' : 'italic' })}><Italic size={18} aria-hidden="true" /></button>
            </div>
          </div>
        </>
      )}

      {!image && selected.type !== 'activeselection' && (
        <div className="us-field-row">
          <label className="us-label" htmlFor={`${prefix}-fill`}>{text ? 'Text color' : 'Fill color'}</label>
          <input id={`${prefix}-fill`} type="color" value={colorInputValue(selected.fill)} disabled={locked} onChange={event => onUpdate({ fill: event.target.value })} />
          <span>{selected.fill}</span>
        </div>
      )}

      <div className="us-field">
        <div className="us-field-row"><label className="us-label" htmlFor={`${prefix}-opacity`}>Opacity</label><output htmlFor={`${prefix}-opacity`}>{selected.opacity}%</output></div>
        <input id={`${prefix}-opacity`} type="range" min={0} max={100} step={1} value={selected.opacity} disabled={locked} onChange={event => updateNumber(event, 'opacity', 0, 100, 100)} />
      </div>

      <div className="us-field-row">
        <div className="us-field">
          <label className="us-label" htmlFor={`${prefix}-angle`}>Rotation (°)</label>
          <input id={`${prefix}-angle`} type="number" inputMode="decimal" min={-360} max={360} step={1} value={selected.angle} disabled={locked} onChange={event => updateNumber(event, 'angle', -360, 360)} />
        </div>
        <button type="button" className="us-button" disabled={locked} onClick={() => onUpdate({ angle: 0 })}><RotateCcw size={15} aria-hidden="true" /> Reset</button>
      </div>

      <div className="us-field">
        <span className="us-label">Artwork size</span>
        <div className="us-segmented" role="group" aria-label="Artwork size presets">
          {[[0.25, 'Small'], [0.5, 'Medium'], [0.75, 'Large'], [0.94, 'Fit']].map(([size, label]) => <button key={label} type="button" className="us-button" disabled={locked} onClick={() => onCommand('size', size)}>{label}</button>)}
        </div>
      </div>
      <div className="us-field">
        <span className="us-label">Align in print area</span>
        <div className="us-control-grid" role="group" aria-label="Align artwork">{ALIGNMENTS.map(([value, label, Icon]) => iconButton(label, Icon, 'align', value))}</div>
      </div>
      <div className="us-field">
        <span className="us-label">Nudge</span>
        <div className="us-control-grid" role="group" aria-label="Nudge artwork">{NUDGES.map(([label, value, Icon]) => iconButton(label, Icon, 'nudge', value))}</div>
      </div>
      <div className="us-control-grid" role="group" aria-label="Layer actions">
        <button type="button" className="us-button" disabled={locked} onClick={() => onCommand('forward')}><ArrowUpToLine size={15} aria-hidden="true" /> Forward</button>
        <button type="button" className="us-button" disabled={locked} onClick={() => onCommand('backward')}><ArrowDownToLine size={15} aria-hidden="true" /> Backward</button>
        <button type="button" className="us-button" disabled={locked} onClick={() => onCommand('flip')}><FlipHorizontal2 size={15} aria-hidden="true" /> Flip</button>
        <button type="button" className="us-button" disabled={locked} onClick={() => onCommand('duplicate')}><Copy size={15} aria-hidden="true" /> Duplicate</button>
      </div>
      <button type="button" className="us-button us-danger" disabled={locked} onClick={() => onCommand('delete')}><Trash2 size={16} aria-hidden="true" /> Delete artwork</button>
    </section>
  );
}
