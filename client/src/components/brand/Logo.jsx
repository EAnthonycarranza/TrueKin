/**
 * TRUEKIN brand marks
 *
 *  <ShieldMark />   TK monogram inside a pointed shield — the primary logomark.
 *  <Wordmark />     TRUEKIN industrial wordmark (Anton / condensed caps).
 *  <KnotMark />     Interlocking eternal-knot emblem — a faith motif.
 *  <Logo />         Convenience combo: shield + wordmark side-by-side.
 *
 *  All marks are monochrome SVG and inherit `currentColor`, so they can be
 *  flipped for light / dark surfaces with just a CSS `color`.
 */

export function ShieldMark({ size = 36, title = 'Truekin', className = '', style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      className={className}
      style={style}
      fill="none"
    >
      <title>{title}</title>
      {/* Outer shield outline */}
      <path
        d="M32 2 L58 10 V32 C58 46 46 56 32 62 C18 56 6 46 6 32 V10 Z"
        fill="currentColor"
      />
      {/* Inner shield cut-out (creates the banded silhouette) */}
      <path
        d="M32 8 L52 14 V31 C52 42.5 42.5 51 32 56 C21.5 51 12 42.5 12 31 V14 Z"
        fill="var(--bg, #f4f1ea)"
      />
      {/* Interlocked TK monogram */}
      {/* T bar */}
      <rect x="19" y="19" width="22" height="4.5" fill="currentColor" />
      {/* T stem */}
      <rect x="27" y="19" width="4.5" height="26" fill="currentColor" />
      {/* K stem */}
      <rect x="35" y="22" width="4.5" height="23" fill="currentColor" />
      {/* K upper diagonal */}
      <path d="M39.5 32 L47 23 L44.5 21 L37 30 Z" fill="currentColor" />
      {/* K lower diagonal */}
      <path d="M39.5 32 L47 44 L44.5 46 L37 34 Z" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({ height = 22, className = '', style, color = 'currentColor' }) {
  // Anton-like condensed wordmark rendered as text so it scales perfectly
  return (
    <span
      className={className}
      style={{
        fontFamily: "'Anton', 'Archivo Black', 'Bebas Neue', sans-serif",
        fontSize: height,
        lineHeight: 1,
        letterSpacing: '0.08em',
        color,
        textTransform: 'uppercase',
        display: 'inline-block',
        ...style,
      }}
    >
      TRUEKIN
    </span>
  );
}

export function KnotMark({ size = 60, title = 'Eternal knot', className = '', style }) {
  // Interlocking hexagonal knot with triquetra-like woven bands
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label={title}
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>{title}</title>
      {/* Outer hexagon frame */}
      <polygon points="60,6 110,34 110,86 60,114 10,86 10,34" />
      {/* Woven inner bands — three interlocking loops */}
      <path d="M60 22 C 84 34, 84 70, 60 98 C 36 70, 36 34, 60 22 Z" />
      <path d="M24 40 C 48 52, 84 52, 96 40 C 84 70, 48 70, 24 40 Z" />
      <path d="M24 80 C 36 52, 84 52, 96 80 C 72 92, 48 92, 24 80 Z" />
      {/* Center dot */}
      <circle cx="60" cy="60" r="3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Logo({
  size = 34,
  showWordmark = true,
  wordmarkHeight,
  gap = 10,
  className = '',
  style,
}) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap,
        color: 'currentColor',
        ...style,
      }}
      aria-label="Truekin"
    >
      <ShieldMark size={size} />
      {showWordmark && <Wordmark height={wordmarkHeight ?? Math.round(size * 0.62)} />}
    </span>
  );
}

export default Logo;
