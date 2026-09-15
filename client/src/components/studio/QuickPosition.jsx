import { useId } from 'react';
import { QUICK_POSITIONS } from './quickPositioning';

export default function QuickPosition({ selected, disabled, onCommand }) {
  const prefix = useId();
  const locked = !!selected.locked;

  return (
    <section className="us-quick-position" aria-labelledby={`${prefix}-title`}>
      <div className="us-quick-position-copy">
        <h3 id={`${prefix}-title`}>Quick position</h3>
        <p id={`${prefix}-help`}>{locked ? 'Unlock this layer to position it.' : 'Place your artwork in one tap. Left and right are as you see them.'}</p>
        <span>Inside the print guide · scales down only if needed</span>
      </div>
      <div className="us-position-grid" role="group" aria-label="Quick artwork positions" aria-describedby={`${prefix}-help`}>
        {QUICK_POSITIONS.map(({ id, label, x, y }) => (
          <button
            key={id}
            type="button"
            className="us-position-button"
            aria-pressed={selected.quickPosition === id}
            disabled={disabled || locked}
            title={`Place artwork at ${label.toLowerCase()} inside the print area`}
            onClick={() => onCommand('position', id)}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              <rect x="1" y="1" width="20" height="20" rx="3" stroke="currentColor" opacity=".4" />
              <rect x={3 + x * 12} y={3 + y * 12} width="4" height="4" rx="1" fill="currentColor" />
            </svg>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
