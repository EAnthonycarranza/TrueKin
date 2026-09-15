import * as fabric from 'fabric';
import { BOARD, SURFACES, printRect, makeHistory, serializableDocument } from './studioDocument';
import { loadFabricAssetImage, loadFabricImageFromFile } from '../designer/designerHelpers';
import { createSnapSession, resetSnapSession, solveMoveSnap, solveAngleSnap } from './smartSnapping';
import { QUICK_POSITIONS, getQuickPosition, positionOffset, safePrintRect } from './quickPositioning';

const PROPS = ['studioId', 'studioName', 'studioLocked', 'assetTone', 'assetAltSrc', 'inkLocked'];
const uid = () => crypto.randomUUID();
const isText = o => ['textbox', 'i-text', 'text'].includes(o?.type?.toLowerCase());

function styleObject(o) {
  o.set({ cornerColor: '#fff', cornerStrokeColor: '#c8301f', borderColor: '#c8301f', cornerStyle: 'circle',
    cornerSize: 13, touchCornerSize: 28, transparentCorners: false, padding: 7, borderScaleFactor: 1.5 });
  o.studioId ||= uid();
  o.studioName ||= isText(o) ? o.text : o.type === 'image' ? 'Image' : 'Shape';
  const locked = !!o.studioLocked;
  o.set({ lockMovementX: locked, lockMovementY: locked, lockScalingX: locked, lockScalingY: locked, lockRotation: locked, hasControls: !locked });
  return o;
}

async function restoreObjects(surface, rect) {
  const objects = await fabric.util.enlivenObjects(surface?.objects || []);
  if (!objects.length && surface?.raster) {
    const { src, cropped } = surface.raster;
    const image = await fabric.FabricImage.fromURL(src, { crossOrigin: 'anonymous' });
    const r = cropped ? rect : { left: 0, top: 0, width: BOARD.width, height: BOARD.height };
    image.set({ originX: 'left', originY: 'top', left: r.left, top: r.top, scaleX: r.width / image.width, scaleY: r.height / image.height, studioName: 'Imported artwork' });
    objects.push(image);
  }
  return objects.map(styleObject);
}

function exportPrint(canvas, rect, multiplier = 3) {
  if (!canvas.getObjects().length) return null;
  return canvas.toDataURL({ format: 'png', ...rect, multiplier, enableRetinaScaling: false });
}

export default class CanvasEngine {
  constructor(element, document, onChange, onError, onSnap) {
    this.document = structuredClone(document);
    this.view = 'front';
    this.onChange = onChange;
    this.onError = onError;
    this.onSnap = onSnap;
    this.snapSession = createSnapSession();
    this.snapFeedback = null;
    this.loading = true;
    this.failed = false;
    this.disposed = false;
    this.histories = new Map();
    this.epoch = 0;
    this.snap = true;
    this.canvas = new fabric.Canvas(element, {
      width: BOARD.width, height: BOARD.height, backgroundColor: 'transparent',
      preserveObjectStacking: true, selection: true, enableRetinaScaling: true,
      selectionColor: 'rgba(200,48,31,.08)', selectionBorderColor: '#c8301f',
      stopContextMenu: true, fireRightClick: false,
    });
    this.canvas.upperCanvasEl.tabIndex = 0;
    this.canvas.upperCanvasEl.setAttribute('aria-label', 'Design canvas. Select artwork to move or resize it.');
    const selection = () => {
      this.clearSnapping();
      const active = this.selected;
      if (active?.type === 'activeselection') {
        active.studioLocked = active.getObjects().some(item => item.studioLocked);
        styleObject(active);
      }
      this.notify();
    };
    this.canvas.on('selection:created', selection);
    this.canvas.on('selection:updated', selection);
    this.canvas.on('selection:cleared', selection);
    this.canvas.on('object:modified', () => { this.finishSnapping(); this.commit(); });
    this.canvas.on('text:changed', () => { clearTimeout(this.textTimer); this.textTimer = setTimeout(() => this.commit(), 220); });
    this.canvas.on('mouse:down', () => {
      this.clearSnapping();
      if (!this.canvas.getActiveObject()?.isEditing) this.canvas.upperCanvasEl.focus({ preventScroll: true });
    });
    this.canvas.on('mouse:up', () => this.finishSnapping());
    this.canvas.on('object:moving', event => { this.snapMove(event); this.schedulePreview(); });
    this.canvas.on('object:rotating', event => { this.snapRotation(event); this.schedulePreview(); });
    this.canvas.on('object:scaling', () => { this.clearSnapping(); this.schedulePreview(); });
    this.ready = this.initialize();
  }

  get rect() { return printRect(this.document.productType, this.view); }
  get selected() { return this.canvas.getActiveObject(); }

  schedulePreview() {
    clearTimeout(this.previewTimer);
    this.previewTimer = setTimeout(() => this.sync(), 65);
  }

  publishSnap(value) {
    // Guide updates stay outside the document/history and the parent React tree.
    const key = JSON.stringify(value);
    if (key === this.snapFeedbackKey) return;
    this.snapFeedbackKey = key;
    this.snapFeedback = value;
    if (!this.disposed) this.onSnap?.(value);
  }

  clearSnapping() {
    clearTimeout(this.snapTimer);
    resetSnapSession(this.snapSession);
    this.snapTarget = null;
    this.publishSnap(null);
  }

  setSnap(enabled) {
    this.snap = !!enabled;
    if (!this.snap) this.clearSnapping();
  }

  prepareSnap(target) {
    if (!target || target.studioLocked || this.loading || this.failed || this.disposed) { this.clearSnapping(); return false; }
    clearTimeout(this.snapTimer);
    if (this.snapTarget !== target) { resetSnapSession(this.snapSession); this.snapTarget = target; }
    target.setCoords();
    return true;
  }

  snapMove({ target, e }) {
    if (!this.prepareSnap(target)) return;
    // A multi-selection snaps as one box, never against its own members.
    const active = new Set([target, ...this.canvas.getActiveObjects(), ...(target.type === 'activeselection' ? target.getObjects() : [])]);
    const peers = this.canvas.getObjects().filter(item => !active.has(item) && item.visible !== false && item.opacity !== 0).map(item => {
      item.setCoords();
      return { id: item.studioId, name: item.studioName, box: item.getBoundingRect() };
    });
    const result = solveMoveSnap({ box: target.getBoundingRect(), area: this.rect, peers, session: this.snapSession,
      scale: (this.displayWidth || 450) / BOARD.width, bypass: !this.snap || !!e?.altKey });
    if (result.dx || result.dy) {
      target.set({ left: target.left + result.dx, top: target.top + result.dy });
      target.setCoords();
    }
    this.publishSnap(result.guides.length ? { ...result, phase: 'dragging' } : null);
  }

  snapRotation({ target, e }) {
    if (!this.prepareSnap(target)) return;
    this.snapSession.x = this.snapSession.y = null;
    const result = solveAngleSnap({ angle: target.angle || 0, session: this.snapSession, bypass: !this.snap || !!e?.altKey });
    if (result.snapped) { target.rotate(result.angle); target.setCoords(); }
    this.publishSnap(result.snapped ? { angle: result.angle, label: result.label, guides: [], lockedAxes: [], phase: 'dragging' } : null);
  }

  finishSnapping() {
    resetSnapSession(this.snapSession);
    this.snapTarget = null;
    if (!this.snapFeedback) return;
    this.publishSnap({ ...this.snapFeedback, phase: 'settled' });
    clearTimeout(this.snapTimer);
    this.snapTimer = setTimeout(() => this.clearSnapping(), 1800);
  }

  showAlignment(value) {
    if (!this.snap) return;
    const r = this.rect;
    const horizontal = ['left', 'center', 'right'].includes(value);
    const center = value === 'center' || value === 'middle';
    const at = horizontal
      ? r.left + (value === 'left' ? 0 : value === 'right' ? r.width : r.width / 2)
      : r.top + (value === 'top' ? 0 : value === 'bottom' ? r.height : r.height / 2);
    const axis = horizontal ? 'x' : 'y';
    const label = center ? `Centered ${horizontal ? 'horizontally' : 'vertically'}` : `Aligned to print ${value}`;
    this.publishSnap({ label, lockedAxes: [axis], phase: 'settled', guides: [{ axis, at,
      from: horizontal ? r.top : r.left, to: horizontal ? r.top + r.height : r.left + r.width,
      kind: center ? 'center' : 'edge', label }] });
    this.finishSnapping();
  }

  positionArtwork(position) {
    clearTimeout(this.previewTimer);
    clearTimeout(this.textTimer);
    const object = this.selected;
    const safe = safePrintRect(this.rect);
    object.setCoords();
    const box = object.getBoundingRect();
    if (box.width > safe.width || box.height > safe.height) {
      const original = { x: object.scaleX, y: object.scaleY };
      // Measure the rendered bounds at each scale: rotated objects and uniform
      // strokes need not shrink in direct proportion to their bounding box.
      let low = 0, high = 1;
      for (let i = 0; i < 28; i++) {
        const factor = (low + high) / 2;
        object.set({ scaleX: original.x * factor, scaleY: original.y * factor });
        object.setCoords();
        const bounds = object.getBoundingRect();
        if (bounds.width <= safe.width && bounds.height <= safe.height) low = factor;
        else high = factor;
      }
      object.set({ scaleX: original.x * low, scaleY: original.y * low });
      object.setCoords();
    }
    const offset = positionOffset(object.getBoundingRect(), this.rect, position);
    object.set({ left: object.left + offset.x, top: object.top + offset.y });
  }

  showQuickPosition(position) {
    const r = this.rect, safe = safePrintRect(r);
    const label = `Placed ${position.label.toLowerCase()}`;
    this.publishSnap({ label, lockedAxes: ['x', 'y'], phase: 'settled', guides: [
      { axis: 'x', at: safe.left + safe.width * position.x, from: r.top, to: r.top + r.height, kind: position.x === .5 ? 'center' : 'edge', label },
      { axis: 'y', at: safe.top + safe.height * position.y, from: r.left, to: r.left + r.width, kind: position.y === .5 ? 'center' : 'edge', label },
    ] });
    this.finishSnapping();
  }

  async initialize() {
    try {
      // Materialize every saved surface once, so a back print is present in 3D
      // before a user visits the Back tab. No hidden interactive canvases.
      for (const s of SURFACES[this.document.productType]) {
        const rect = printRect(this.document.productType, s.id);
        const surface = this.document.surfaces[s.id];
        if (!surface?.objects?.length && !surface?.raster) continue;
        const temp = new fabric.StaticCanvas(null, { ...BOARD, enableRetinaScaling: false });
        try {
          const objects = await restoreObjects(surface, rect);
          if (this.disposed) return;
          temp.add(...objects);
          this.document.surfaces[s.id] = { objects: objects.map(o => o.toObject(PROPS)) };
          this.document.prints[s.id] = exportPrint(temp, rect);
        } finally { await temp.dispose(); }
      }
      if (!this.disposed) await this.loadView('front');
    } catch (error) { if (!this.disposed) { this.failed = true; this.loading = false; this.onError(error); this.notify(); } }
  }

  async loadView(view) {
    if (this.disposed) return;
    this.clearSnapping();
    if (!this.loading) this.sync();
    const previousView = this.view;
    const epoch = ++this.epoch;
    this.loading = true;
    this.view = view;
    this.notify();
    try {
      const objects = await restoreObjects(this.document.surfaces[view], this.rect);
      if (this.disposed || epoch !== this.epoch) { objects.forEach(o => o.dispose()); return; }
      this.canvas.discardActiveObject();
      this.canvas.clear();
      this.canvas.clipPath = new fabric.Rect({ ...this.rect, originX: 'left', originY: 'top', absolutePositioned: true, fill: '#000', strokeWidth: 0 });
      this.canvas.add(...objects);
      this.updateControlSizes();
      this.canvas.requestRenderAll();
      this.failed = false;
      this.loading = false;
      this.sync();
      this.histories.set(view, this.histories.get(view) || makeHistory(this.serializeSurface(), 30));
      this.notify();
    } catch (error) {
      if (epoch === this.epoch) {
        this.view = previousView;
        this.failed = true;
        this.loading = false;
        this.onError(error);
        this.notify();
      }
    }
  }

  serializeObject(object) {
    const data = object.toObject(PROPS);
    if (object.group?.type === 'activeselection') {
      // Store canvas-space transforms without dismantling a live drag selection.
      const t = fabric.util.qrDecompose(object.calcTransformMatrix());
      Object.assign(data, { originX: 'center', originY: 'center', left: t.translateX, top: t.translateY,
        angle: t.angle, scaleX: Math.abs(t.scaleX), scaleY: Math.abs(t.scaleY),
        flipX: t.scaleX < 0, flipY: t.scaleY < 0, skewX: t.skewX, skewY: 0 });
    }
    return data;
  }

  serializeSurface() { return JSON.stringify(this.canvas.getObjects().map(o => this.serializeObject(o))); }

  sync(notify = true) {
    if (this.loading || this.disposed || this.failed) return;
    this.document.surfaces[this.view] = { objects: JSON.parse(this.serializeSurface()) };
    this.document.prints[this.view] = exportPrint(this.canvas, this.rect);
    if (notify) this.notify();
  }

  commit() {
    if (this.loading || this.disposed || this.failed) return;
    this.sync(false);
    const history = this.histories.get(this.view);
    if (history) history.push(this.serializeSurface());
    else this.histories.set(this.view, makeHistory(this.serializeSurface(), 30));
    this.notify(true);
  }

  notify(changed = false) {
    if (this.disposed) return;
    const o = this.selected;
    const rect = this.rect;
    const box = o?.getBoundingRect();
    this.onChange({
      document: { ...this.document, prints: { ...this.document.prints } },
      loading: this.loading, error: this.failed, changed,
      canUndo: this.histories.get(this.view)?.canUndo || false,
      canRedo: this.histories.get(this.view)?.canRedo || false,
      layers: this.canvas.getObjects().map(item => ({ id: item.studioId, name: item.studioName, type: isText(item) ? 'text' : item.type, locked: !!item.studioLocked, hidden: item.visible === false })).reverse(),
      selected: o ? { id: o.studioId, type: isText(o) ? 'text' : o.type, text: o.text || '', name: o.studioName,
        fontFamily: o.fontFamily || 'Oswald', fontSize: o.fontSize || 48,
        fill: typeof o.fill === 'string' ? o.fill : '#181818', opacity: Math.round((o.opacity ?? 1) * 100),
        angle: Math.round(o.angle || 0), bold: o.fontWeight === 'bold', italic: o.fontStyle === 'italic',
        locked: !!o.studioLocked, width: Math.round((box?.width || 0) / rect.width * 100),
        quickPosition: getQuickPosition(box, rect),
        outside: box && (box.left < rect.left - 1 || box.top < rect.top - 1 || box.left + box.width > rect.left + rect.width + 1 || box.top + box.height > rect.top + rect.height + 1),
      } : null,
    });
  }

  add(object, name, fraction = .62) {
    if (this.loading || this.disposed || this.failed) { object.dispose?.(); return; }
    const r = this.rect;
    styleObject(object);
    object.studioName = name || object.studioName;
    object.set({ originX: 'center', originY: 'center', left: r.left + r.width / 2, top: r.top + r.height / 2 });
    const box = object.getBoundingRect();
    const scale = Math.min(r.width * fraction / box.width, r.height * fraction / box.height);
    object.scale((object.scaleX || 1) * scale);
    this.canvas.add(object);
    this.updateControlSizes();
    this.canvas.setActiveObject(object);
    this.canvas.requestRenderAll();
    this.commit();
  }

  addText(text = 'YOUR WORDS', font = 'Oswald', fill = '#181818') {
    this.add(new fabric.IText(text, { fontFamily: font, fontSize: 72, fill, fontWeight: 'bold', textAlign: 'center' }), text);
  }

  async addImage(source, name) {
    const epoch = this.epoch;
    const object = source instanceof File ? await loadFabricImageFromFile(fabric, source) : await loadFabricAssetImage(fabric, source);
    if (this.disposed || epoch !== this.epoch) { object.dispose(); return; }
    this.add(object, name || source.name || 'Image');
  }

  addShape(kind, fill) {
    const props = { fill, strokeWidth: 0 };
    let object;
    if (kind === 'circle') object = new fabric.Circle({ ...props, radius: 100 });
    else if (kind === 'triangle') object = new fabric.Triangle({ ...props, width: 200, height: 180 });
    else if (kind === 'star') {
      const points = Array.from({ length: 10 }, (_, i) => { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? 44 : 100; return { x: Math.cos(a) * r, y: Math.sin(a) * r }; });
      object = new fabric.Polygon(points, props);
    } else if (kind === 'badge') {
      const points = Array.from({ length: 24 }, (_, i) => { const a = i * Math.PI / 12, r = i % 2 ? 84 : 100; return { x: Math.cos(a) * r, y: Math.sin(a) * r }; });
      object = new fabric.Polygon(points, props);
    } else object = new fabric.Rect({ ...props, width: 220, height: kind === 'line' ? 14 : 150, rx: kind === 'rounded' ? 28 : 0, ry: kind === 'rounded' ? 28 : 0 });
    this.add(object, `${kind[0].toUpperCase()}${kind.slice(1)}`);
  }

  addDefinedShape(definition, fill) {
    const object = definition.create(fabric);
    object.set({ fill });
    this.add(object, definition.label);
  }

  update(values) {
    if (this.loading || this.disposed || this.failed) return;
    const object = this.selected;
    if (!object || object.studioLocked) return;
    this.clearSnapping();
    object.set(values);
    if (object.type === 'activeselection' && values.opacity !== undefined) {
      object.set({ opacity: 1 });
      object.getObjects().forEach(item => item.set({ opacity: values.opacity }));
    }
    if (values.text !== undefined) object.studioName = values.text || 'Text';
    object.setCoords();
    this.canvas.requestRenderAll();
    this.commit();
  }

  command(action, value) {
    if (this.loading || this.disposed || this.failed) return;
    const position = action === 'position' ? QUICK_POSITIONS.find(item => item.id === value) : null;
    if (action === 'position' && !position) return;
    this.clearSnapping();
    const c = this.canvas, o = this.selected;
    if (action === 'select') { const item = c.getObjects().find(x => x.studioId === value); if (item) c.setActiveObject(item); c.requestRenderAll(); this.notify(); return; }
    if (action === 'deselect') { c.discardActiveObject(); c.requestRenderAll(); return; }
    if (action === 'selectAll') { c.setActiveObject(new fabric.ActiveSelection(c.getObjects().filter(x => !x.studioLocked), { canvas: c })); c.requestRenderAll(); return; }
    if (action === 'clear') { c.discardActiveObject(); c.remove(...c.getObjects()); this.commit(); return; }
    if (!o) return;
    if (action === 'position' && (o.studioLocked || (o.type === 'activeselection' && o.getObjects().some(item => item.studioLocked)))) return;
    if (o.type === 'activeselection' && ['lock', 'visibility', 'duplicate', 'forward', 'backward'].includes(action)) {
      const members = c.getObjects().filter(item => o.getObjects().includes(item));
      if (action === 'duplicate') {
        const epoch = this.epoch;
        fabric.util.enlivenObjects(members.map(item => this.serializeObject(item))).then(copies => {
          if (this.disposed || epoch !== this.epoch || members.some(item => !c.getObjects().includes(item))) { copies.forEach(copy => copy.dispose()); return; }
          copies.forEach(copy => {
            copy.studioId = uid(); copy.studioName = `${copy.studioName} copy`;
            copy.set({ left: copy.left + 18, top: copy.top + 18, studioLocked: false });
            styleObject(copy); c.add(copy);
          });
          c.discardActiveObject();
          c.setActiveObject(new fabric.ActiveSelection(copies, { canvas: c }));
          this.updateControlSizes(); c.requestRenderAll(); this.commit();
        }).catch(this.onError);
        return;
      }
      const locked = !o.studioLocked;
      c.discardActiveObject();
      if (action === 'lock') members.forEach(item => { item.studioLocked = locked; styleObject(item); });
      else if (action === 'visibility') members.forEach(item => item.set({ visible: o.visible === false }));
      else if (!o.studioLocked && action === 'forward') [...members].reverse().forEach(item => c.bringObjectForward(item));
      else if (!o.studioLocked && action === 'backward') members.forEach(item => c.sendObjectBackwards(item));
      c.requestRenderAll(); this.commit();
      return;
    }
    if (action === 'lock') {
      const locked = !o.studioLocked;
      o.set({ studioLocked: locked, lockMovementX: locked, lockMovementY: locked, lockScalingX: locked, lockScalingY: locked, lockRotation: locked, hasControls: !locked });
    } else if (action === 'visibility') o.set({ visible: o.visible === false });
    else if (action === 'delete') { const objects = c.getActiveObjects().filter(x => !x.studioLocked); c.discardActiveObject(); c.remove(...objects); }
    else if (action === 'duplicate') {
      const epoch = this.epoch;
      o.clone(PROPS).then(copy => {
        if (this.disposed || epoch !== this.epoch || !c.getObjects().includes(o)) { copy.dispose(); return; }
        copy.studioId = uid(); copy.studioName = `${o.studioName} copy`;
        copy.set({ left: o.left + 18, top: o.top + 18, studioLocked: false });
        styleObject(copy); c.add(copy); this.updateControlSizes(); c.setActiveObject(copy); c.requestRenderAll(); this.commit();
      }).catch(this.onError);
      return;
    } else if (o.studioLocked) return;
    else if (action === 'forward') c.bringObjectForward(o);
    else if (action === 'backward') c.sendObjectBackwards(o);
    else if (action === 'flip') o.set({ flipX: !o.flipX });
    else if (action === 'nudge') o.set({ left: o.left + value[0], top: o.top + value[1] });
    else if (action === 'position') this.positionArtwork(position);
    else if (action === 'size') {
      const r = this.rect, box = o.getBoundingRect();
      const factor = Math.min(r.width * value / box.width, r.height * value / box.height);
      o.set({ scaleX: o.scaleX * factor, scaleY: o.scaleY * factor });
      o.setPositionByOrigin(new fabric.Point(r.left + r.width / 2, r.top + r.height / 2), 'center', 'center');
    } else if (action === 'align') {
      const r = this.rect, b = o.getBoundingRect();
      const x = value === 'left' ? r.left - b.left : value === 'right' ? r.left + r.width - b.left - b.width : value === 'center' ? r.left + r.width / 2 - b.left - b.width / 2 : 0;
      const y = value === 'top' ? r.top - b.top : value === 'bottom' ? r.top + r.height - b.top - b.height : value === 'middle' ? r.top + r.height / 2 - b.top - b.height / 2 : 0;
      o.set({ left: o.left + x, top: o.top + y });
    }
    o.setCoords(); c.requestRenderAll(); this.commit();
    if (action === 'align') this.showAlignment(value);
    if (action === 'position') this.showQuickPosition(position);
  }

  async history(direction) {
    const history = this.histories.get(this.view);
    if (!history || this.loading) return;
    this.document.surfaces[this.view] = { objects: JSON.parse(direction === 'undo' ? history.undo() : history.redo()) };
    this.loading = true;
    await this.loadView(this.view);
    this.notify(true);
  }

  setColor(color) {
    if (!/^#[0-9a-f]{6}$/i.test(color)) return;
    this.document.garmentColor = color;
    this.document.tshirtColor = color;
    this.notify(true);
  }

  getDocument() { this.sync(false); return serializableDocument(this.document); }

  retry() {
    this.loading = true;
    this.notify();
    this.ready = this.initialize();
    return this.ready;
  }

  resize(width) {
    if (!width || this.disposed) return;
    if (width !== this.displayWidth) this.clearSnapping();
    this.displayWidth = width;
    this.canvas.setDimensions({ width: `${width}px`, height: `${width * BOARD.height / BOARD.width}px` }, { cssOnly: true });
    this.updateControlSizes();
    this.canvas.calcOffset();
  }

  updateControlSizes() {
    const ratio = BOARD.width / (this.displayWidth || 450);
    this.canvas.getObjects().forEach(o => o.set({ cornerSize: 11 * ratio, touchCornerSize: 26 * ratio, padding: 5 * ratio, borderScaleFactor: ratio }));
  }

  dispose() {
    this.clearSnapping();
    this.disposed = true; this.epoch++;
    clearTimeout(this.previewTimer); clearTimeout(this.textTimer);
    return this.canvas.dispose();
  }
}
