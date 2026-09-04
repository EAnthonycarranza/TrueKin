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
 * Editable apparel shapes. Every shape is a real Fabric object, so color,
 * outline, opacity, scale, and rotation stay editable after insertion.
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
  {
    id: 'ellipse',
    label: 'Wide Oval',
    icon: '⬭',
    create: (fabric) => new fabric.Ellipse({ rx: 58, ry: 36, fill: '#0a0a0a', left: 165, top: 205, strokeWidth: 0 }),
  },
  {
    id: 'pill',
    label: 'Pill',
    icon: '▰',
    create: (fabric) => new fabric.Rect({ width: 120, height: 52, rx: 26, ry: 26, fill: '#0a0a0a', left: 165, top: 210, strokeWidth: 0 }),
  },
  {
    id: 'arch',
    label: 'Arch',
    icon: '⌂',
    create: (fabric) => new fabric.Path(
      'M 0 100 L 0 50 A 50 50 0 0 1 100 50 L 100 100 Z',
      { fill: '#0a0a0a', left: 175, top: 185, strokeWidth: 0 }
    ),
  },
  {
    id: 'shield_modern',
    label: 'Modern Shield',
    icon: '⛨',
    create: (fabric) => new fabric.Path(
      'M 50 0 L 95 15 L 92 52 C 89 76 72 92 50 100 C 28 92 11 76 8 52 L 5 15 Z',
      { fill: '#0a0a0a', left: 175, top: 185, strokeWidth: 0 }
    ),
  },
  {
    id: 'heritage_cross',
    label: 'Heritage Cross',
    icon: '✠',
    create: (fabric) => new fabric.Path(
      'M 34 0 L 66 0 L 62 32 L 96 28 L 96 62 L 62 58 L 66 100 L 34 100 L 38 58 L 4 62 L 4 28 L 38 32 Z',
      { fill: '#0a0a0a', left: 175, top: 185, strokeWidth: 0 }
    ),
  },
  {
    id: 'chevron',
    label: 'Chevron',
    icon: '⌄',
    create: (fabric) => new fabric.Path(
      'M 0 18 L 50 58 L 100 18 L 100 46 L 50 86 L 0 46 Z',
      { fill: '#0a0a0a', left: 175, top: 195, strokeWidth: 0 }
    ),
  },
  {
    id: 'ribbon',
    label: 'Heritage Ribbon',
    icon: '➖',
    create: (fabric) => new fabric.Path(
      'M 0 20 L 16 20 L 16 8 L 84 8 L 84 20 L 100 20 L 90 35 L 100 50 L 84 50 L 84 62 L 16 62 L 16 50 L 0 50 L 10 35 Z',
      { fill: '#0a0a0a', left: 175, top: 205, strokeWidth: 0 }
    ),
  },
  {
    id: 'sunburst',
    label: 'Sunburst',
    icon: '✺',
    create: (fabric) => {
      const points = [];
      for (let i = 0; i < 32; i++) {
        const angle = (2 * Math.PI * i) / 32 - Math.PI / 2;
        const radius = i % 2 === 0 ? 52 : 30;
        points.push({ x: 52 + radius * Math.cos(angle), y: 52 + radius * Math.sin(angle) });
      }
      return new fabric.Polygon(points, { fill: '#0a0a0a', left: 173, top: 185, strokeWidth: 0 });
    },
  },
  {
    id: 'spark_burst',
    label: 'Spark Burst',
    icon: '✧',
    create: (fabric) => {
      const points = [];
      for (let i = 0; i < 16; i++) {
        const angle = (2 * Math.PI * i) / 16 - Math.PI / 2;
        const radius = i % 2 === 0 ? 52 : 16;
        points.push({ x: 52 + radius * Math.cos(angle), y: 52 + radius * Math.sin(angle) });
      }
      return new fabric.Polygon(points, { fill: '#0a0a0a', left: 173, top: 185, strokeWidth: 0 });
    },
  },
  {
    id: 'ticket_badge',
    label: 'Ticket Badge',
    icon: '▱',
    create: (fabric) => new fabric.Path(
      'M 12 0 L 88 0 C 88 10 94 16 104 16 L 104 64 C 94 64 88 70 88 80 L 12 80 C 12 70 6 64 -4 64 L -4 16 C 6 16 12 10 12 0 Z',
      { fill: '#0a0a0a', left: 173, top: 198, strokeWidth: 0 }
    ),
  },
  {
    id: 'wave',
    label: 'Wave',
    icon: '≋',
    create: (fabric) => new fabric.Path(
      'M 0 58 C 18 22 40 22 56 50 C 72 76 88 70 104 38 C 92 84 65 94 46 66 C 28 40 16 54 0 82 Z',
      { fill: '#0a0a0a', left: 173, top: 195, strokeWidth: 0 }
    ),
  },
  {
    id: 'double_pennant',
    label: 'Double Pennant',
    icon: '◀▶',
    create: (fabric) => new fabric.Path(
      'M 0 8 L 50 20 L 100 8 L 88 50 L 100 92 L 50 80 L 0 92 L 12 50 Z',
      { fill: '#0a0a0a', left: 175, top: 190, strokeWidth: 0 }
    ),
  },
];

/** Ready-to-use design assets: polished artwork, brand marks, and dedicated shapes. */
export const CLIPART_CATEGORIES = [
  {
    name: 'Studio Picks',
    items: [
      {
        label: 'Kingdom Lion',
        src: '/design-assets/generated/kingdom-lion.png',
        thumbnail: '/design-assets/generated/thumbnails/kingdom-lion.png',
      },
      {
        label: 'Botanical Cross',
        src: '/design-assets/generated/botanical-cross.png',
        thumbnail: '/design-assets/generated/thumbnails/botanical-cross.png',
      },
      {
        label: 'Mountain Pilgrimage',
        src: '/design-assets/generated/mountain-pilgrimage.png',
        thumbnail: '/design-assets/generated/thumbnails/mountain-pilgrimage.png',
      },
      {
        label: 'Spirit Flame',
        src: '/design-assets/generated/spirit-flame.png',
        thumbnail: '/design-assets/generated/thumbnails/spirit-flame.png',
      },
      {
        label: 'Armor of God',
        src: '/design-assets/generated/armor-of-god.png',
        thumbnail: '/design-assets/generated/thumbnails/armor-of-god.png',
      },
      {
        label: 'Anchor of Hope',
        src: '/design-assets/generated/anchor-of-hope.png',
        thumbnail: '/design-assets/generated/thumbnails/anchor-of-hope.png',
      },
      {
        label: 'Sacred Heart',
        src: '/design-assets/generated/sacred-heart.png',
        thumbnail: '/design-assets/generated/thumbnails/sacred-heart.png',
      },
      {
        label: 'Mustard Tree',
        src: '/design-assets/generated/mustard-tree.png',
        thumbnail: '/design-assets/generated/thumbnails/mustard-tree.png',
      },
      {
        label: 'Victory Eagle',
        src: '/design-assets/generated/victory-eagle.png',
        thumbnail: '/design-assets/generated/thumbnails/victory-eagle.png',
      },
      {
        label: 'Desert Witness',
        src: '/design-assets/generated/desert-witness.png',
        thumbnail: '/design-assets/generated/thumbnails/desert-witness.png',
      },
    ],
  },
  {
    name: 'Shapes',
    items: SHAPE_DEFS.map(({ id, label, icon }) => ({
      label,
      icon,
      shapeId: id,
    })),
  },
  {
    name: 'Truekin',
    items: [
      { label: 'Shield · Ink', src: '/design-assets/brand/truekin-shield-ink.svg' },
      { label: 'Shield · Bone', src: '/design-assets/brand/truekin-shield-bone.svg', previewBackground: '#1b1b1b' },
      { label: 'Logo · Ink', src: '/design-assets/brand/truekin-lockup-ink.svg' },
      { label: 'Logo · Bone', src: '/design-assets/brand/truekin-lockup-bone.svg', previewBackground: '#1b1b1b' },
      { label: 'Eternal Knot', src: '/design-assets/brand/truekin-knot-ink.svg' },
    ],
  },
  {
    name: 'Nature',
    items: [
      { label: 'Botanical Cross', src: '/design-assets/generated/botanical-cross.png', thumbnail: '/design-assets/generated/thumbnails/botanical-cross.png' },
      { label: 'Mountain Pilgrimage', src: '/design-assets/generated/mountain-pilgrimage.png', thumbnail: '/design-assets/generated/thumbnails/mountain-pilgrimage.png' },
      { label: 'Mustard Tree', src: '/design-assets/generated/mustard-tree.png', thumbnail: '/design-assets/generated/thumbnails/mustard-tree.png' },
      { label: 'Desert Witness', src: '/design-assets/generated/desert-witness.png', thumbnail: '/design-assets/generated/thumbnails/desert-witness.png' },
    ],
  },
  {
    name: 'Sports',
    items: [
      { label: 'Winged Basketball', src: '/design-assets/generated/winged-basketball.png', thumbnail: '/design-assets/generated/thumbnails/winged-basketball.png' },
      { label: 'Champion Panther', src: '/design-assets/generated/champion-panther.png', thumbnail: '/design-assets/generated/thumbnails/champion-panther.png' },
      { label: 'Victory Eagle', src: '/design-assets/generated/victory-eagle.png', thumbnail: '/design-assets/generated/thumbnails/victory-eagle.png' },
    ],
  },
  {
    name: 'Symbols',
    items: [
      { label: 'Freedom Chain', src: '/design-assets/generated/freedom-chain.png', thumbnail: '/design-assets/generated/thumbnails/freedom-chain.png' },
      { label: 'Kinship Hands', src: '/design-assets/generated/kinship-hands.png', thumbnail: '/design-assets/generated/thumbnails/kinship-hands.png' },
      { label: 'Anchor of Hope', src: '/design-assets/generated/anchor-of-hope.png', thumbnail: '/design-assets/generated/thumbnails/anchor-of-hope.png' },
      { label: 'Sacred Heart', src: '/design-assets/generated/sacred-heart.png', thumbnail: '/design-assets/generated/thumbnails/sacred-heart.png' },
      { label: 'Armor of God', src: '/design-assets/generated/armor-of-god.png', thumbnail: '/design-assets/generated/thumbnails/armor-of-god.png' },
      { label: 'Spirit Flame', src: '/design-assets/generated/spirit-flame.png', thumbnail: '/design-assets/generated/thumbnails/spirit-flame.png' },
    ],
  },
  {
    name: 'Food',
    items: [
      { label: 'Campfire Coffee', src: '/design-assets/generated/campfire-coffee.png', thumbnail: '/design-assets/generated/thumbnails/campfire-coffee.png' },
      { label: 'Hot Honey', src: '/design-assets/generated/hot-honey.png', thumbnail: '/design-assets/generated/thumbnails/hot-honey.png' },
    ],
  },
  {
    name: 'Emoji',
    items: [
      { label: 'Sunshine Mascot', src: '/design-assets/generated/sunshine-mascot.png', thumbnail: '/design-assets/generated/thumbnails/sunshine-mascot.png' },
      { label: 'Flame Mascot', src: '/design-assets/generated/flame-mascot.png', thumbnail: '/design-assets/generated/thumbnails/flame-mascot.png' },
      { label: 'Heart Mascot', src: '/design-assets/generated/heart-mascot.png', thumbnail: '/design-assets/generated/thumbnails/heart-mascot.png' },
      { label: 'Moon Mascot', src: '/design-assets/generated/moon-mascot.png', thumbnail: '/design-assets/generated/thumbnails/moon-mascot.png' },
      { label: 'Star Mascot', src: '/design-assets/generated/star-mascot.png', thumbnail: '/design-assets/generated/thumbnails/star-mascot.png' },
      { label: 'Storm Cloud', src: '/design-assets/generated/storm-cloud-mascot.png', thumbnail: '/design-assets/generated/thumbnails/storm-cloud-mascot.png' },
      { label: 'Kingdom Smile', src: '/design-assets/generated/kingdom-smile.png', thumbnail: '/design-assets/generated/thumbnails/kingdom-smile.png' },
    ],
  },
  {
    name: 'Western',
    items: [
      { label: 'Desert Witness', src: '/design-assets/generated/desert-witness.png', thumbnail: '/design-assets/generated/thumbnails/desert-witness.png' },
      { label: 'Crowned Longhorn', src: '/design-assets/generated/crowned-longhorn.png', thumbnail: '/design-assets/generated/thumbnails/crowned-longhorn.png' },
      { label: 'Lightning Boot', src: '/design-assets/generated/lightning-boot.png', thumbnail: '/design-assets/generated/thumbnails/lightning-boot.png' },
      { label: 'Desert Rattler', src: '/design-assets/generated/desert-rattler.png', thumbnail: '/design-assets/generated/thumbnails/desert-rattler.png' },
      { label: 'Midnight Stallion', src: '/design-assets/generated/midnight-stallion.png', thumbnail: '/design-assets/generated/thumbnails/midnight-stallion.png' },
      { label: 'Lucky Horseshoe', src: '/design-assets/generated/lucky-horseshoe.png', thumbnail: '/design-assets/generated/thumbnails/lucky-horseshoe.png' },
    ],
  },
];
