/**
 * Constants for the T-Shirt Designer (ported from vihanrs/t-shirt-designer-webapp).
 */

export const CANVAS_CONFIG = {
  width: 450,
  height: 500,
  backgroundColor: 'transparent',
};

export const TSHIRT_FRONT_PATH =
  'M 403.492188 739.769531 C 387.246094 739.769531 254.289062 739.105469 183.003906 728.164062 C 183.003906 728.164062 187.3125 587.5625 188.640625 535.828125 C 189.636719 483.765625 192.949219 330.5625 192.949219 330.5625 L 128.296875 381.964844 C 128.296875 381.964844 57.671875 329.238281 8.933594 244.015625 C 8.933594 244.015625 144.875 129.941406 174.050781 113.359375 C 204.886719 95.785156 300.375 70.25 300.375 70.25 C 300.375 70.25 341.160156 95.121094 405.152344 95.121094 L 406.808594 95.121094 C 470.136719 94.789062 509.925781 70.25 509.925781 70.25 C 509.925781 70.25 605.414062 95.785156 636.25 113.359375 C 665.425781 129.941406 801.367188 244.015625 801.367188 244.015625 C 752.628906 329.238281 682.003906 381.964844 682.003906 381.964844 L 617.351562 330.5625 C 617.351562 330.5625 620.667969 483.765625 621.992188 535.828125 C 623.320312 587.890625 627.628906 728.164062 627.628906 728.164062 C 551.371094 739.769531 405.480469 739.769531 405.480469 739.769531 Z M 403.492188 739.769531';

export const TSHIRT_BACK_PATH =
  'M 403.492188 739.769531 C 387.246094 739.769531 254.289062 739.105469 183.003906 728.164062 C 183.003906 728.164062 187.3125 587.5625 188.640625 535.828125 C 189.636719 483.765625 192.949219 330.5625 192.949219 330.5625 L 128.296875 381.964844 C 128.296875 381.964844 57.671875 329.238281 8.933594 244.015625 C 8.933594 244.015625 144.875 129.941406 174.050781 113.359375 C 204.886719 95.785156 300.375 70.25 300.375 70.25 C 300.375 70.25 354.160156 85.121094 405.152344 85.121094 L 406.808594 85.121094 C 457.136719 85.121094 509.925781 70.25 509.925781 70.25 C 509.925781 70.25 605.414062 95.785156 636.25 113.359375 C 665.425781 129.941406 801.367188 244.015625 801.367188 244.015625 C 752.628906 329.238281 682.003906 381.964844 682.003906 381.964844 L 617.351562 330.5625 C 617.351562 330.5625 620.667969 483.765625 621.992188 535.828125 C 623.320312 587.890625 627.628906 728.164062 627.628906 728.164062 C 551.371094 739.769531 405.480469 739.769531 405.480469 739.769531 Z M 403.492188 739.769531';

export const TSHIRT_COLORS = [
  '#FFFFFF', '#000000', '#929292', '#e02d27', '#1f40d3',
  '#43d31f', '#f7ec1e', '#f88d28', '#e524ef', '#1fd3ca',
  '#FFC0CB', '#8B4513',
];

export const DEFAULT_TEXT_CONFIG = {
  fontSize: 24,
  fontFamily: 'Arial',
  originX: 'center',
  originY: 'center',
  fill: '#000000',
};

/**
 * Mockup image URLs.
 */
export const MOCKUP_URLS = {
  front: '/mockups/front.svg',
  back: '/mockups/back.svg',
};

/**
 * Font options — organized by category.
 * Google Fonts are loaded via index.html <link> tag.
 */
export const FONT_OPTIONS = [
  // --- System / Clean ---
  { value: 'Arial', label: 'Arial', category: 'clean' },
  { value: 'Helvetica', label: 'Helvetica', category: 'clean' },
  { value: 'Verdana', label: 'Verdana', category: 'clean' },
  { value: 'Tahoma', label: 'Tahoma', category: 'clean' },
  { value: 'Trebuchet MS', label: 'Trebuchet MS', category: 'clean' },
  // --- Serif ---
  { value: 'Times New Roman', label: 'Times New Roman', category: 'serif' },
  { value: 'Georgia', label: 'Georgia', category: 'serif' },
  { value: 'Playfair Display', label: 'Playfair Display', category: 'serif' },
  // --- Mono ---
  { value: 'Courier New', label: 'Courier New', category: 'mono' },
  // --- Display / Bold ---
  { value: 'Impact', label: 'Impact', category: 'display' },
  { value: 'Bebas Neue', label: 'Bebas Neue', category: 'display' },
  { value: 'Oswald', label: 'Oswald', category: 'display' },
  { value: 'Anton', label: 'Anton', category: 'display' },
  { value: 'Alfa Slab One', label: 'Alfa Slab One', category: 'display' },
  { value: 'Bungee', label: 'Bungee', category: 'display' },
  { value: 'Bangers', label: 'Bangers', category: 'display' },
  { value: 'Righteous', label: 'Righteous', category: 'display' },
  { value: 'Concert One', label: 'Concert One', category: 'display' },
  { value: 'Luckiest Guy', label: 'Luckiest Guy', category: 'display' },
  { value: 'Titan One', label: 'Titan One', category: 'display' },
  { value: 'Rubik Mono One', label: 'Rubik Mono One', category: 'display' },
  { value: 'Black Ops One', label: 'Black Ops One', category: 'display' },
  { value: 'Protest Riot', label: 'Protest Riot', category: 'display' },
  // --- Script / Handwriting ---
  { value: 'Lobster', label: 'Lobster', category: 'script' },
  { value: 'Pacifico', label: 'Pacifico', category: 'script' },
  { value: 'Permanent Marker', label: 'Permanent Marker', category: 'script' },
  { value: 'Satisfy', label: 'Satisfy', category: 'script' },
  { value: 'Dancing Script', label: 'Dancing Script', category: 'script' },
  { value: 'Great Vibes', label: 'Great Vibes', category: 'script' },
  { value: 'Sacramento', label: 'Sacramento', category: 'script' },
  // --- Fun / Special ---
  { value: 'Creepster', label: 'Creepster', category: 'fun' },
  { value: 'Monoton', label: 'Monoton', category: 'fun' },
  { value: 'Press Start 2P', label: 'Press Start 2P', category: 'fun' },
  { value: 'Silkscreen', label: 'Silkscreen', category: 'fun' },
];

export const FONT_CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'clean', label: 'Clean' },
  { key: 'serif', label: 'Serif' },
  { key: 'display', label: 'Display' },
  { key: 'script', label: 'Script' },
  { key: 'fun', label: 'Fun' },
  { key: 'mono', label: 'Mono' },
];

/**
 * Shape definitions — each has a Fabric.js factory function name and default props.
 */
export const SHAPE_DEFS = [
  {
    id: 'circle',
    label: 'Circle',
    icon: '●',
    create: (fabric) => new fabric.Circle({ radius: 40, fill: '#3b82f6', left: 180, top: 200, strokeWidth: 0 }),
  },
  {
    id: 'rect',
    label: 'Rectangle',
    icon: '■',
    create: (fabric) => new fabric.Rect({ width: 100, height: 70, fill: '#3b82f6', left: 160, top: 200, rx: 0, ry: 0, strokeWidth: 0 }),
  },
  {
    id: 'roundedRect',
    label: 'Rounded Rect',
    icon: '▢',
    create: (fabric) => new fabric.Rect({ width: 100, height: 70, fill: '#3b82f6', left: 160, top: 200, rx: 12, ry: 12, strokeWidth: 0 }),
  },
  {
    id: 'triangle',
    label: 'Triangle',
    icon: '▲',
    create: (fabric) => new fabric.Triangle({ width: 80, height: 80, fill: '#3b82f6', left: 180, top: 200, strokeWidth: 0 }),
  },
  {
    id: 'diamond',
    label: 'Diamond',
    icon: '◆',
    create: (fabric) => new fabric.Rect({ width: 60, height: 60, fill: '#3b82f6', left: 200, top: 210, angle: 45, strokeWidth: 0 }),
  },
  {
    id: 'star5',
    label: '5-Point Star',
    icon: '★',
    create: (fabric) => {
      const points = [];
      for (let i = 0; i < 5; i++) {
        const outerAngle = (Math.PI / 2) + (2 * Math.PI * i) / 5;
        const innerAngle = outerAngle + Math.PI / 5;
        points.push({ x: 50 + 50 * Math.cos(outerAngle), y: 50 - 50 * Math.sin(outerAngle) });
        points.push({ x: 50 + 22 * Math.cos(innerAngle), y: 50 - 22 * Math.sin(innerAngle) });
      }
      return new fabric.Polygon(points, { fill: '#f59e0b', left: 170, top: 190, strokeWidth: 0 });
    },
  },
  {
    id: 'star4',
    label: '4-Point Star',
    icon: '✦',
    create: (fabric) => {
      const points = [];
      for (let i = 0; i < 4; i++) {
        const outerAngle = (Math.PI / 2) + (2 * Math.PI * i) / 4;
        const innerAngle = outerAngle + Math.PI / 4;
        points.push({ x: 50 + 50 * Math.cos(outerAngle), y: 50 - 50 * Math.sin(outerAngle) });
        points.push({ x: 50 + 18 * Math.cos(innerAngle), y: 50 - 18 * Math.sin(innerAngle) });
      }
      return new fabric.Polygon(points, { fill: '#f59e0b', left: 170, top: 190, strokeWidth: 0 });
    },
  },
  {
    id: 'hexagon',
    label: 'Hexagon',
    icon: '⬡',
    create: (fabric) => {
      const points = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        points.push({ x: 45 + 45 * Math.cos(angle), y: 45 + 45 * Math.sin(angle) });
      }
      return new fabric.Polygon(points, { fill: '#8b5cf6', left: 175, top: 195, strokeWidth: 0 });
    },
  },
  {
    id: 'pentagon',
    label: 'Pentagon',
    icon: '⬠',
    create: (fabric) => {
      const points = [];
      for (let i = 0; i < 5; i++) {
        const angle = (2 * Math.PI * i) / 5 - Math.PI / 2;
        points.push({ x: 45 + 45 * Math.cos(angle), y: 45 + 45 * Math.sin(angle) });
      }
      return new fabric.Polygon(points, { fill: '#8b5cf6', left: 175, top: 195, strokeWidth: 0 });
    },
  },
  {
    id: 'heart',
    label: 'Heart',
    icon: '♥',
    create: (fabric) => new fabric.Path(
      'M 50 30 C 50 20, 30 0, 10 10 C -10 20, -5 50, 50 90 C 105 50, 110 20, 90 10 C 70 0, 50 20, 50 30 Z',
      { fill: '#ef4444', left: 170, top: 190, scaleX: 0.8, scaleY: 0.8, strokeWidth: 0 }
    ),
  },
  {
    id: 'arrow_right',
    label: 'Arrow Right',
    icon: '→',
    create: (fabric) => new fabric.Path(
      'M 0 30 L 70 30 L 70 10 L 100 40 L 70 70 L 70 50 L 0 50 Z',
      { fill: '#10b981', left: 160, top: 210, scaleX: 0.9, scaleY: 0.9, strokeWidth: 0 }
    ),
  },
  {
    id: 'arrow_left',
    label: 'Arrow Left',
    icon: '←',
    create: (fabric) => new fabric.Path(
      'M 100 30 L 30 30 L 30 10 L 0 40 L 30 70 L 30 50 L 100 50 Z',
      { fill: '#10b981', left: 160, top: 210, scaleX: 0.9, scaleY: 0.9, strokeWidth: 0 }
    ),
  },
  {
    id: 'badge',
    label: 'Badge',
    icon: '⬟',
    create: (fabric) => {
      const points = [];
      for (let i = 0; i < 12; i++) {
        const angle = (2 * Math.PI * i) / 12 - Math.PI / 2;
        const r = i % 2 === 0 ? 50 : 38;
        points.push({ x: 50 + r * Math.cos(angle), y: 50 + r * Math.sin(angle) });
      }
      return new fabric.Polygon(points, { fill: '#f59e0b', left: 170, top: 190, strokeWidth: 0 });
    },
  },
  {
    id: 'cross',
    label: 'Cross',
    icon: '✚',
    create: (fabric) => new fabric.Path(
      'M 30 0 L 60 0 L 60 30 L 90 30 L 90 60 L 60 60 L 60 90 L 30 90 L 30 60 L 0 60 L 0 30 L 30 30 Z',
      { fill: '#ef4444', left: 170, top: 190, scaleX: 0.9, scaleY: 0.9, strokeWidth: 0 }
    ),
  },
  {
    id: 'crescent',
    label: 'Crescent',
    icon: '☽',
    create: (fabric) => new fabric.Path(
      'M 50 0 A 50 50 0 1 1 50 100 A 35 35 0 1 0 50 0 Z',
      { fill: '#6366f1', left: 180, top: 190, scaleX: 0.8, scaleY: 0.8, strokeWidth: 0 }
    ),
  },
  {
    id: 'lightning',
    label: 'Lightning',
    icon: '⚡',
    create: (fabric) => new fabric.Path(
      'M 45 0 L 20 45 L 35 45 L 15 90 L 65 35 L 48 35 L 70 0 Z',
      { fill: '#f59e0b', left: 180, top: 180, scaleX: 1.1, scaleY: 1.1, strokeWidth: 0 }
    ),
  },
];

/**
 * Clip art — organized by category. Each is a simple SVG path.
 */
export const CLIPART_CATEGORIES = [
  {
    name: 'Popular',
    items: [
      { label: 'Crown', path: 'M 5 70 L 5 30 L 25 50 L 50 10 L 75 50 L 95 30 L 95 70 Z', viewBox: '0 0 100 80', fill: '#f59e0b' },
      { label: 'Flame', path: 'M 50 0 C 50 0 70 25 70 45 C 70 55 65 65 60 70 C 65 60 60 50 50 50 C 40 50 35 60 40 70 C 35 65 30 55 30 45 C 30 25 50 0 50 0 Z', viewBox: '0 0 100 80', fill: '#ef4444' },
      { label: 'Trophy', path: 'M 20 10 L 80 10 L 80 20 C 80 20 90 20 90 35 C 90 45 80 50 80 50 L 80 50 C 75 60 65 65 55 68 L 55 75 L 65 80 L 35 80 L 45 75 L 45 68 C 35 65 25 60 20 50 C 20 50 10 45 10 35 C 10 20 20 20 20 20 Z', viewBox: '0 0 100 90', fill: '#f59e0b' },
      { label: 'Music Note', path: 'M 65 5 L 65 55 C 65 55 65 70 50 70 C 35 70 35 55 50 55 C 55 55 60 55 60 55 L 60 20 L 35 28 L 35 65 C 35 65 35 80 20 80 C 5 80 5 65 20 65 C 25 65 30 65 30 65 L 30 10 Z', viewBox: '0 0 70 85', fill: '#8b5cf6' },
      { label: 'Skull', path: 'M 50 5 C 25 5 10 20 10 40 C 10 55 15 65 25 70 L 25 80 L 35 80 L 35 72 L 45 72 L 45 80 L 55 80 L 55 72 L 65 72 L 65 80 L 75 80 L 75 70 C 85 65 90 55 90 40 C 90 20 75 5 50 5 Z M 35 35 A 8 8 0 1 1 35 51 A 8 8 0 1 1 35 35 M 65 35 A 8 8 0 1 1 65 51 A 8 8 0 1 1 65 35 M 40 58 L 60 58 L 55 65 L 45 65 Z', viewBox: '0 0 100 85', fill: '#1f2937' },
      { label: 'Paw Print', path: 'M 50 55 C 40 45 25 45 25 55 C 25 65 40 75 50 65 C 60 75 75 65 75 55 C 75 45 60 45 50 55 Z M 30 30 A 8 8 0 1 1 30 46 A 8 8 0 1 1 30 30 M 70 30 A 8 8 0 1 1 70 46 A 8 8 0 1 1 70 30 M 45 18 A 8 8 0 1 1 45 34 A 8 8 0 1 1 45 18 M 55 18 A 8 8 0 1 1 55 34 A 8 8 0 1 1 55 18', viewBox: '0 0 100 80', fill: '#92400e' },
    ],
  },
  {
    name: 'Nature',
    items: [
      { label: 'Sun', path: 'M 50 25 A 25 25 0 1 1 50 75 A 25 25 0 1 1 50 25 M 50 5 L 50 15 M 50 85 L 50 95 M 5 50 L 15 50 M 85 50 L 95 50 M 18 18 L 25 25 M 75 75 L 82 82 M 82 18 L 75 25 M 25 75 L 18 82', viewBox: '0 0 100 100', fill: '#f59e0b', stroke: '#f59e0b', strokeWidth: 4 },
      { label: 'Cloud', path: 'M 25 60 A 18 18 0 0 1 30 25 A 22 22 0 0 1 70 25 A 18 18 0 0 1 85 55 A 12 12 0 0 1 75 70 L 25 70 A 15 15 0 0 1 25 60 Z', viewBox: '0 0 100 80', fill: '#93c5fd' },
      { label: 'Tree', path: 'M 50 5 L 20 40 L 30 40 L 15 60 L 30 60 L 10 80 L 43 80 L 43 95 L 57 95 L 57 80 L 90 80 L 70 60 L 85 60 L 70 40 L 80 40 Z', viewBox: '0 0 100 100', fill: '#16a34a' },
      { label: 'Mountain', path: 'M 50 10 L 85 80 L 70 80 L 60 60 L 50 72 L 40 60 L 30 80 L 15 80 Z', viewBox: '0 0 100 90', fill: '#6b7280' },
      { label: 'Wave', path: 'M 0 50 C 15 30 30 70 50 50 C 70 30 85 70 100 50 L 100 90 L 0 90 Z', viewBox: '0 0 100 90', fill: '#3b82f6' },
      { label: 'Leaf', path: 'M 50 5 C 20 5 5 30 5 55 C 5 80 25 95 50 95 C 50 95 50 55 50 55 C 50 55 50 5 50 5 Z M 50 95 C 75 95 95 80 95 55 C 95 30 80 5 50 5', viewBox: '0 0 100 100', fill: '#22c55e' },
    ],
  },
  {
    name: 'Sports',
    items: [
      { label: 'Basketball', path: 'M 50 5 A 45 45 0 1 1 50 95 A 45 45 0 1 1 50 5 Z M 5 50 L 95 50 M 50 5 L 50 95 M 15 15 C 35 30 35 70 15 85 M 85 15 C 65 30 65 70 85 85', viewBox: '0 0 100 100', fill: 'none', stroke: '#f97316', strokeWidth: 3 },
      { label: 'Soccer Ball', path: 'M 50 5 A 45 45 0 1 1 50 95 A 45 45 0 1 1 50 5 Z M 50 20 L 35 35 L 40 55 L 60 55 L 65 35 Z', viewBox: '0 0 100 100', fill: '#1f2937', stroke: '#1f2937', strokeWidth: 2 },
      { label: 'Dumbbell', path: 'M 10 35 L 10 65 L 20 65 L 20 45 L 80 45 L 80 65 L 90 65 L 90 35 L 80 35 L 80 55 L 20 55 L 20 35 Z M 5 40 L 5 60 L 10 60 L 10 40 Z M 90 40 L 90 60 L 95 60 L 95 40 Z', viewBox: '0 0 100 100', fill: '#4b5563' },
      { label: 'Medal', path: 'M 35 5 L 25 35 L 50 25 L 75 35 L 65 5 Z M 50 30 A 25 25 0 1 1 50 80 A 25 25 0 1 1 50 30 Z M 50 38 A 17 17 0 1 1 50 72 A 17 17 0 1 1 50 38 Z', viewBox: '0 0 100 90', fill: '#f59e0b', stroke: '#d97706', strokeWidth: 1 },
    ],
  },
  {
    name: 'Symbols',
    items: [
      { label: 'Peace', path: 'M 50 5 A 45 45 0 1 1 50 95 A 45 45 0 1 1 50 5 Z M 50 5 L 50 95 M 50 50 L 20 80 M 50 50 L 80 80', viewBox: '0 0 100 100', fill: 'none', stroke: '#000', strokeWidth: 4 },
      { label: 'Infinity', path: 'M 50 50 C 35 30 10 30 10 50 C 10 70 35 70 50 50 C 65 30 90 30 90 50 C 90 70 65 70 50 50 Z', viewBox: '0 0 100 100', fill: 'none', stroke: '#6366f1', strokeWidth: 5 },
      { label: 'Yin Yang', path: 'M 50 5 A 45 45 0 1 1 50 95 A 45 45 0 1 1 50 5 Z M 50 5 A 22.5 22.5 0 0 1 50 50 A 22.5 22.5 0 0 0 50 95', viewBox: '0 0 100 100', fill: '#000', stroke: '#000', strokeWidth: 2 },
      { label: 'Anchor', path: 'M 50 15 A 10 10 0 1 1 50 35 A 10 10 0 1 1 50 15 M 50 35 L 50 85 M 20 85 A 30 30 0 0 0 80 85 M 30 60 L 70 60', viewBox: '0 0 100 100', fill: 'none', stroke: '#1e3a5f', strokeWidth: 5 },
      { label: 'Checkmark', path: 'M 15 50 L 40 75 L 85 20', viewBox: '0 0 100 100', fill: 'none', stroke: '#22c55e', strokeWidth: 8 },
      { label: 'X Mark', path: 'M 20 20 L 80 80 M 80 20 L 20 80', viewBox: '0 0 100 100', fill: 'none', stroke: '#ef4444', strokeWidth: 8 },
    ],
  },
  {
    name: 'Arrows',
    items: [
      { label: 'Up Arrow', path: 'M 50 5 L 85 45 L 60 45 L 60 90 L 40 90 L 40 45 L 15 45 Z', viewBox: '0 0 100 95', fill: '#3b82f6' },
      { label: 'Down Arrow', path: 'M 50 90 L 85 50 L 60 50 L 60 5 L 40 5 L 40 50 L 15 50 Z', viewBox: '0 0 100 95', fill: '#3b82f6' },
      { label: 'Curved Arrow', path: 'M 80 20 L 90 40 L 70 40 L 80 20 Z M 80 30 C 80 60 55 75 30 75 L 30 85 L 10 70 L 30 55 L 30 65 C 50 65 70 55 75 35', viewBox: '0 0 100 100', fill: '#10b981' },
      { label: 'Double Arrow', path: 'M 50 5 L 80 30 L 60 30 L 60 70 L 80 70 L 50 95 L 20 70 L 40 70 L 40 30 L 20 30 Z', viewBox: '0 0 100 100', fill: '#8b5cf6' },
    ],
  },
  {
    name: 'Banners',
    items: [
      { label: 'Ribbon', path: 'M 0 25 L 15 25 L 15 10 L 85 10 L 85 25 L 100 25 L 90 35 L 100 45 L 85 45 L 85 60 L 15 60 L 15 45 L 0 45 L 10 35 Z', viewBox: '0 0 100 70', fill: '#ef4444' },
      { label: 'Banner', path: 'M 5 15 L 95 15 L 95 55 L 50 70 L 5 55 Z', viewBox: '0 0 100 80', fill: '#3b82f6' },
      { label: 'Shield', path: 'M 50 5 L 90 20 L 90 50 C 90 75 70 90 50 95 C 30 90 10 75 10 50 L 10 20 Z', viewBox: '0 0 100 100', fill: '#6366f1' },
      { label: 'Scroll', path: 'M 15 15 C 5 15 5 30 15 30 L 15 70 C 5 70 5 85 15 85 L 85 85 C 95 85 95 70 85 70 L 85 30 C 95 30 95 15 85 15 Z', viewBox: '0 0 100 100', fill: '#f5f0e1', stroke: '#d4a574', strokeWidth: 2 },
    ],
  },
  {
    name: 'Food',
    items: [
      { label: 'Pizza', path: 'M 50 10 L 90 85 L 10 85 Z M 40 40 A 5 5 0 1 1 40 50 A 5 5 0 1 1 40 40 M 60 45 A 5 5 0 1 1 60 55 A 5 5 0 1 1 60 45 M 50 60 A 5 5 0 1 1 50 70 A 5 5 0 1 1 50 60', viewBox: '0 0 100 95', fill: '#f59e0b', stroke: '#d97706', strokeWidth: 2 },
      { label: 'Coffee', path: 'M 20 20 L 20 70 C 20 80 30 85 50 85 C 70 85 80 80 80 70 L 80 20 Z M 80 30 L 90 30 C 95 30 95 55 85 55 L 80 55 M 30 5 C 30 5 35 12 30 15 M 50 5 C 50 5 55 12 50 15 M 70 5 C 70 5 75 12 70 15', viewBox: '0 0 100 90', fill: '#92400e', stroke: '#78350f', strokeWidth: 2 },
      { label: 'Cupcake', path: 'M 25 50 L 35 90 L 65 90 L 75 50 Z M 50 10 C 30 10 20 25 25 45 C 25 50 30 50 35 48 C 40 52 45 52 50 48 C 55 52 60 52 65 48 C 70 50 75 50 75 45 C 80 25 70 10 50 10 Z', viewBox: '0 0 100 95', fill: '#ec4899' },
    ],
  },
  {
    name: 'Emoji',
    items: [
      { label: 'Smiley', path: 'M 50 5 A 45 45 0 1 1 50 95 A 45 45 0 1 1 50 5 M 35 38 A 5 5 0 1 1 35 48 A 5 5 0 1 1 35 38 M 65 38 A 5 5 0 1 1 65 48 A 5 5 0 1 1 65 38 M 30 60 C 30 75 70 75 70 60', viewBox: '0 0 100 100', fill: '#fbbf24', stroke: '#92400e', strokeWidth: 2 },
      { label: 'Heart Eyes', path: 'M 50 5 A 45 45 0 1 1 50 95 A 45 45 0 1 1 50 5 M 25 35 L 35 25 L 45 35 L 35 48 Z M 55 35 L 65 25 L 75 35 L 65 48 Z M 30 62 C 30 77 70 77 70 62', viewBox: '0 0 100 100', fill: '#fbbf24', stroke: '#92400e', strokeWidth: 2 },
      { label: 'Cool', path: 'M 50 5 A 45 45 0 1 1 50 95 A 45 45 0 1 1 50 5 M 15 38 L 45 38 L 42 48 L 18 48 Z M 55 38 L 85 38 L 82 48 L 58 48 Z M 30 65 C 35 75 65 75 70 65', viewBox: '0 0 100 100', fill: '#fbbf24', stroke: '#92400e', strokeWidth: 2 },
      { label: 'Fire', path: 'M 50 0 C 50 0 80 30 80 55 C 80 80 65 95 50 95 C 35 95 20 80 20 55 C 20 30 50 0 50 0 Z M 50 40 C 40 50 35 60 35 70 C 35 82 42 90 50 90 C 58 90 65 82 65 70 C 65 60 60 50 50 40 Z', viewBox: '0 0 100 100', fill: '#f97316' },
      { label: 'Thumbs Up', path: 'M 35 40 L 35 90 L 15 90 L 15 40 Z M 38 40 L 45 15 C 45 10 55 10 55 20 L 50 40 L 80 40 C 85 40 88 45 85 55 C 88 58 86 65 82 68 C 84 72 82 78 78 80 C 80 84 78 90 72 90 L 38 90 Z', viewBox: '0 0 95 95', fill: '#3b82f6' },
    ],
  },
];
