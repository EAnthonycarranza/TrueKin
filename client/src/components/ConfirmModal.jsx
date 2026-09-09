/**
 * ConfirmModal — the "are you sure?" dialog for destructive admin actions.
 *
 * Lifted out of Products so Orders could reuse it rather than growing a second
 * copy of the same 100 lines of styles.
 *
 * Behaviour worth keeping: clicking the backdrop or pressing Escape cancels,
 * but both are ignored while the action is in flight, so a stray click cannot
 * dismiss the dialog mid-delete and leave the admin unsure whether it happened.
 */
import { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({
  open,
  title,
  children,
  confirmLabel = 'Delete',
  busyLabel = 'Deleting…',
  cancelLabel = 'Cancel',
  busy = false,
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === 'Escape' && !busy) onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  // Move focus onto the dialog so the keyboard is not left back on the page.
  useEffect(() => { if (open) confirmRef.current?.focus(); }, [open]);

  if (!open) return null;

  return (
    <div style={styles.overlay} onClick={() => !busy && onCancel()}>
      <div
        style={styles.modal}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <button style={styles.closeBtn} onClick={() => !busy && onCancel()} aria-label="Close">
          <X size={18} />
        </button>

        <div style={styles.iconWrap}><AlertTriangle size={32} color="#dc2626" /></div>

        <h2 style={styles.title}>{title}</h2>
        <div style={styles.message}>{children}</div>

        <div style={styles.actions}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button ref={confirmRef} className="btn btn-danger" style={{ flex: 1 }} onClick={onConfirm} disabled={busy}>
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16,
  },
  modal: {
    background: '#fff', borderRadius: 16, padding: '32px 28px 24px', maxWidth: 420, width: '100%',
    position: 'relative', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', animation: 'fadeIn 0.2s ease',
  },
  closeBtn: {
    position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer',
    color: '#9ca3af', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  iconWrap: {
    width: 64, height: 64, borderRadius: '50%', background: '#fef2f2',
    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
  },
  title: { fontSize: 20, fontWeight: 700, textAlign: 'center', marginBottom: 8, color: '#111' },
  message: { fontSize: 14, lineHeight: 1.6, color: '#6b7280', textAlign: 'center', marginBottom: 24 },
  actions: { display: 'flex', gap: 12 },
};
