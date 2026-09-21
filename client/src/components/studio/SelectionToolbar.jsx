import { useEffect, useRef, useState } from 'react';
import {
  AlignCenterHorizontal, AlignCenterVertical, ArrowDownToLine, ArrowUpToLine,
  Copy, Ellipsis, FlipHorizontal2, LockKeyhole, Trash2, UnlockKeyhole, X,
} from 'lucide-react';

export default function SelectionToolbar({ selected, disabled, onCommand }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeOutside = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [menuOpen]);

  if (!selected) return null;

  const locked = disabled || selected.locked;
  const act = (action, value) => {
    setMenuOpen(false);
    onCommand(action, value);
  };
  const label = selected.type === 'text' ? 'Text' : selected.type === 'image' ? 'Image' : selected.type === 'activeselection' ? 'Multiple items' : 'Shape';
  const icon = (name, Icon, action, value, inactive = locked) => (
    <button type="button" aria-label={name} title={name} disabled={inactive} onClick={() => act(action, value)}>
      <Icon size={17} aria-hidden="true" />
    </button>
  );

  return <div className="us-selection-toolbar" role="toolbar" aria-label="Selected artwork actions">
    <span className="us-selection-toolbar-label">{label}</span>
    {icon(selected.locked ? 'Unlock layer' : 'Lock layer', selected.locked ? UnlockKeyhole : LockKeyhole, 'lock', undefined, disabled)}
    {icon('Duplicate artwork', Copy, 'duplicate')}
    {icon('Delete artwork', Trash2, 'delete')}
    <div className="us-selection-more" ref={menuRef}>
      <button type="button" aria-label="More selection actions" title="More actions" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><Ellipsis size={18} aria-hidden="true" /></button>
      {menuOpen && <div className="us-selection-menu" role="group" aria-label="More selection actions">
        <button type="button" disabled={locked} onClick={() => act('align', 'center')}><AlignCenterHorizontal size={16} /> Center horizontally</button>
        <button type="button" disabled={locked} onClick={() => act('align', 'middle')}><AlignCenterVertical size={16} /> Center vertically</button>
        <button type="button" disabled={locked} onClick={() => act('forward')}><ArrowUpToLine size={16} /> Bring forward</button>
        <button type="button" disabled={locked} onClick={() => act('backward')}><ArrowDownToLine size={16} /> Send backward</button>
        <button type="button" disabled={locked} onClick={() => act('flip')}><FlipHorizontal2 size={16} /> Flip horizontally</button>
        <button type="button" onClick={() => act('deselect')}><X size={16} /> Deselect</button>
      </div>}
    </div>
  </div>;
}
