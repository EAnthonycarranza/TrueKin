// Positions are viewed from the editor, not the wearer's left/right.
export const QUICK_POSITIONS = [
  { id: 'top-left', label: 'Top left', x: 0, y: 0 },
  { id: 'top-center', label: 'Top center', x: .5, y: 0 },
  { id: 'top-right', label: 'Top right', x: 1, y: 0 },
  { id: 'middle-left', label: 'Middle left', x: 0, y: .5 },
  { id: 'center', label: 'Center', x: .5, y: .5 },
  { id: 'middle-right', label: 'Middle right', x: 1, y: .5 },
  { id: 'bottom-left', label: 'Bottom left', x: 0, y: 1 },
  { id: 'bottom-center', label: 'Bottom center', x: .5, y: 1 },
  { id: 'bottom-right', label: 'Bottom right', x: 1, y: 1 },
];
const CENTER_FIRST_POSITIONS = [...QUICK_POSITIONS].sort((a, b) => Math.abs(a.x - .5) + Math.abs(a.y - .5) - Math.abs(b.x - .5) - Math.abs(b.y - .5));

export function safePrintRect(rect) {
  return { left: rect.left + rect.width * .03, top: rect.top + rect.height * .03,
    width: rect.width * .94, height: rect.height * .94 };
}

export function positionOffset(box, rect, position) {
  const safe = safePrintRect(rect);
  return { x: safe.left + (safe.width - box.width) * position.x - box.left,
    y: safe.top + (safe.height - box.height) * position.y - box.top };
}

export function getQuickPosition(box, rect, epsilon = .5) {
  if (!box || ![box.left, box.top, box.width, box.height].every(Number.isFinite)) return null;
  const safe = safePrintRect(rect);
  if (box.width > safe.width + epsilon || box.height > safe.height + epsilon) return null;
  // Prefer center when artwork fills an axis, where multiple placements coincide.
  return CENTER_FIRST_POSITIONS
    .find(position => { const offset = positionOffset(box, rect, position); return Math.abs(offset.x) <= epsilon && Math.abs(offset.y) <= epsilon; })?.id || null;
}
