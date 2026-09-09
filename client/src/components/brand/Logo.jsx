/**
 * TRUEKIN brand marks
 *
 *  <ShieldMark />   TK monogram inside the shield — the primary logomark.
 *  <Wordmark />     TRUEKIN wordmark.
 *  <KnotMark />     Interlocking weave emblem.
 *  <LockupMark />   Shield + wordmark, horizontal, as one piece of artwork.
 *  <Logo />         Convenience combo: shield + wordmark side-by-side.
 *
 * These render the real brand artwork rather than hand-drawn SVG paths, but
 * they are NOT <img> tags: the artwork is used as a CSS mask over a
 * `currentColor` background.
 *
 * That matters because callers tint these marks for the surface they sit on —
 * `color: '#f4f1ea'` on the dark hero card, `'#fff'` on the red collection
 * tile, `var(--ink)` on light chrome, plus `opacity` for watermarks. An <img>
 * cannot be recoloured, so swapping to one would have broken every dark-surface
 * placement. Masking keeps the exact silhouette of the artwork while leaving
 * `color` and `opacity` working exactly as before, so no call site had to change.
 *
 * The masks are alpha-only PNGs generated from the source art, trimmed to their
 * bounds and flattened to black, which is why they are a few tens of KB.
 */

const MASK = {
  shield: '/design-assets/brand/masks/shield.png',
  wordmark: '/design-assets/brand/masks/wordmark.png',
  weave: '/design-assets/brand/masks/weave.png',
  lockup: '/design-assets/brand/masks/lockup.png',
  stack: '/design-assets/brand/masks/lockup-stacked.png',
};

/** width / height of each mask, so height-driven marks size correctly. */
const ASPECT = {
  shield: 0.9206,
  wordmark: 3.4286,
  weave: 1.0323,
  lockup: 3.0356,
  stack: 1.1228,
};

/**
 * `contain` keeps the artwork's own proportions inside whatever box the caller
 * asks for, so a square `size` never stretches a non-square mark.
 */
function maskStyle(src) {
  return {
    backgroundColor: 'currentColor',
    WebkitMaskImage: `url("${src}")`,
    maskImage: `url("${src}")`,
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskPosition: 'center',
    maskPosition: 'center',
    WebkitMaskSize: 'contain',
    maskSize: 'contain',
  };
}

export function ShieldMark({
  size = 36,
  title = 'Truekin',
  className = '',
  style,
  // Accepted and ignored: the old hand-drawn shield faked its inner band with a
  // solid cut-out shape, which needed to match the surface behind it. The real
  // artwork carries that counter in its own alpha, so nothing to fill.
  // eslint-disable-next-line no-unused-vars
  cutoutColor,
}) {
  return (
    <span
      role="img"
      aria-label={title}
      className={className}
      style={{ display: 'inline-block', width: size, height: size, ...maskStyle(MASK.shield), ...style }}
    />
  );
}

export function Wordmark({ height = 22, className = '', style, color = 'currentColor' }) {
  return (
    <span
      role="img"
      aria-label="Truekin"
      className={className}
      style={{
        display: 'inline-block',
        height,
        width: height * ASPECT.wordmark,
        ...maskStyle(MASK.wordmark),
        backgroundColor: color,
        ...style,
      }}
    />
  );
}

export function KnotMark({ size = 60, title = 'Eternal knot', className = '', style }) {
  return (
    <span
      role="img"
      aria-label={title}
      className={className}
      style={{ display: 'inline-block', width: size, height: size, ...maskStyle(MASK.weave), ...style }}
    />
  );
}

/** Shield and wordmark as a single piece of artwork, correctly kerned. */
export function LockupMark({ height = 28, title = 'Truekin', className = '', style }) {
  return (
    <span
      role="img"
      aria-label={title}
      className={className}
      style={{
        display: 'inline-block',
        height,
        width: height * ASPECT.lockup,
        ...maskStyle(MASK.lockup),
        ...style,
      }}
    />
  );
}

/** Shield stacked over the wordmark — squarer than LockupMark, for tiles. */
export function StackMark({ size = 78, title = 'Truekin', className = '', style }) {
  return (
    <span
      role="img"
      aria-label={title}
      className={className}
      style={{ display: 'inline-block', width: size, height: size, ...maskStyle(MASK.stack), ...style }}
    />
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
