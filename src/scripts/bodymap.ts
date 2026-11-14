// Client script 8 (B4, I-073). Imported only by src/pages/body-map.astro, and only while the page is open
// (ARCHITECTURE §B12). A thin DOM layer: the maths is src/lib/bodymap-view.ts, the state, storage and wire are
// src/lib/bodymap.ts, the report and PDF are src/lib/bodymap-pdf.ts. All strings are bodymap.text.
// Health information stays in this page's memory, one localStorage entry (24 hours) and the one send. Nothing is logged,
// put in the URL, or sent to analytics (the page loads none).
import { bodymap, artName, type PinTypeKey, type Sex, type View } from '../data/bodymap.ts';
import { buildPayload, createStore, dateWindow, sendMap, validate, type FieldError, type SendResult } from '../lib/bodymap.ts';
import { boxOf, initialView, panBy, pinRadius, toCanvas, toNorm, toScreen, zoomAt, type Matrix, type ViewState } from '../lib/bodymap-view.ts';
import { glyphOutlinePath, glyphPath, marker } from '../lib/bodymap-shapes.ts';
import { DEFAULT_COLORS, buildPdf, buildReport, toBase64, type PdfColors, type Rgb } from '../lib/bodymap-pdf.ts';
import { describePin, type Located, type ZoneFile } from '../lib/bodymap-zones.ts';

// The zone files (B5), found by one glob on the folder like the art. Only the lookup reads them; nothing here draws a zone.
const zoneFiles = import.meta.glob('../data/bodymap-zones/*.json', { eager: true, import: 'default' }) as Record<string, ZoneFile>;
const zoneFileFor = (sex: string, view: View): ZoneFile | undefined => zoneFiles[`../data/bodymap-zones/${artName(sex as 'female' | 'male', view)}.json`];
const NO_ZONE: Located = { zone: null, zoneName: null, region: null, regionName: null, side: null };

const t = bodymap.text;
const SVG_NS = 'http://www.w3.org/2000/svg';
const TAP_SLOP = 8; // px of movement under which a touch is a tap
// Marks (§B12 Marker), all in screen px and constant at every zoom. A mark that isn't open is its type's glyph, 18 px across, in a
// 3 px halo and a 1 px edge; the open one is the map-pin (head 28 px, 40 px to the point) holding the glyph at 14 px.
const GLYPH_PX = 18;
const GLYPH_UNITS = 14;
const HEAD_GLYPH_PX = 14;
const HALO_PX = 3;
const EDGE_PX = 1;
const RIM_PX = 1.5; // injury's dark edge, inside the halo
const HIT_PX = 22; // a 44 px circle
const BUTTON_ZOOM = 1.5;
const PDF_PX = { w: 600, h: 1200 }; // the figure as drawn into the PDF

const q = <T extends Element>(id: string) => document.getElementById(id) as unknown as T;

function today(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function start(): void {
  const app = q<HTMLElement>('bm');
  if (!app) return;
  const form = q<HTMLFormElement>('bm-form');
  const stage = q<HTMLElement>('bm-stage');
  const svg = q<SVGSVGElement>('bm-figure');
  const art = q<SVGImageElement>('bm-art');
  const pinLayer = q<SVGGElement>('bm-pins');
  const nameInput = q<HTMLInputElement>('bm-name');
  const dateInput = q<HTMLInputElement>('bm-date');
  const sendBtn = q<HTMLButtonElement>('bm-send');
  const retryBtn = q<HTMLButtonElement>('bm-retry');
  const statusEl = q<HTMLElement>('bm-status');
  const marksTitle = q<HTMLElement>('bm-marks-title');
  const marksEmpty = q<HTMLElement>('bm-empty');
  const marksList = q<HTMLUListElement>('bm-marks');
  const confirm = q<HTMLElement>('bm-confirm');
  const done = q<HTMLElement>('bm-done');
  const endpoint = form.dataset.endpoint ?? '';
  const siteName = form.dataset.siteName ?? '';
  // The art map: each figure-view's `{ webp, svg }` (B6, §B12 Art). The SVG where the art query matches (a desktop with a fine
  // pointer), else the WebP when there is one, else the SVG. The PDF always draws from the SVG, whatever the page shows.
  const figures = JSON.parse(stage.dataset.figures ?? '{}') as Record<string, { webp: string | null; svg: string }>;
  const artFor = (name: string): string => {
    const a = figures[name];
    if (!a) return '';
    return window.matchMedia(bodymap.artQuery).matches ? a.svg : a.webp ?? a.svg;
  };
  const svgFor = (name: string): string => figures[name]?.svg ?? '';

  let storage: Storage | null = null;
  try {
    storage = window.localStorage;
  } catch {
    storage = null; // blocked: the marks stay in memory
  }
  const store = createStore({ storage, now: () => Date.now(), random: (b) => crypto.getRandomValues(b) });

  // The Front/Back toggle (B5, in the toolbar from B6) changes the figure's side and keeps every mark. The toolbar's type is the type
  // of the next mark (B6); the open mark is the map-pin (the last one placed or tapped, until the panel arrives in B6a).
  let currentView: View = 'front';
  let markType: PinTypeKey = 'pain';
  let openId: string | null = null;
  let view: ViewState = initialView();
  let sending = false;

  // The PDF's figure, loaded once from the SVG, so a send made offline can still draw it. Nothing preloads it: on a phone the
  // page shows the WebP and the SVG is first requested by Send.
  const images = new Map<string, HTMLImageElement>();
  const figureUrl = () => artFor(artName(store.state.figure, currentView));
  function preload(url: string): Promise<HTMLImageElement> {
    const have = images.get(url);
    if (have) return Promise.resolve(have);
    return new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => {
        images.set(url, im);
        resolve(im);
      };
      im.onerror = () => reject(new Error('figure'));
      im.src = url;
    });
  }

  const matrix = (): Matrix | null => {
    const m = svg.getScreenCTM();
    return m ? { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f } : null;
  };

  // --- drawing -------------------------------------------------------------------------------------------------------

  const state = () => store.state;

  // --- marks (§B12 Marker) ---------------------------------------------------------------------------------------------
  const el = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] => {
    const e = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
    return e;
  };
  const num = (n: number) => String(Math.round(n * 1000) / 1000);

  /** One outline drawn as the edge, the halo, (injury's dark rim) and the fill, from the outside in. `k` is screen px per path unit. */
  function outline(d: string, type: PinTypeKey, k: number, edgeD: string = d): SVGPathElement[] {
    const rim = type === 'injury' ? RIM_PX : 0;
    // `edgeD` is the glyph's outside edge: a hollow glyph keeps its hole, because the halo and edge are drawn round the outside only.
    const layers: SVGPathElement[] = [
      el('path', { d: edgeD, class: 'bm-pin-edge', 'stroke-width': num((2 * (rim + HALO_PX + EDGE_PX)) / k) }),
      el('path', { d: edgeD, class: 'bm-pin-halo', 'stroke-width': num((2 * (rim + HALO_PX)) / k) }),
    ];
    if (rim) layers.push(el('path', { d: edgeD, class: 'bm-pin-rim bm-pin-edge', 'stroke-width': num((2 * rim) / k) }));
    layers.push(el('path', { d, class: `bm-pin-fill bm-pin-fill--${type}` }));
    return layers;
  }

  /** A 5-point star on a cream disc, upper right of a mark: the starred sign (a 4-point numbness glyph never looks like it). */
  function starBadge(cx: number, cy: number): SVGGElement {
    const pts = Array.from({ length: 10 }, (_, i) => {
      const a = ((-90 + 36 * i) * Math.PI) / 180;
      const r = i % 2 === 0 ? 4 : 1.7;
      return `${num(cx + r * Math.cos(a))},${num(cy + r * Math.sin(a))}`;
    }).join(' ');
    const g = el('g', {});
    g.append(el('circle', { cx, cy, r: 6, class: 'bm-pin-star-disc', 'stroke-width': 1 }), el('polygon', { points: pts, class: 'bm-pin-star' }));
    return g;
  }

  /** Where a mark's hit circle is centred, in px from its spot: the map-pin's head sits above the point. */
  const hitOffsetY = (open: boolean) => (open ? marker.head.y : 0);

  function markEl(p: { x: number; y: number; type: PinTypeKey; star: boolean; id: string }, open: boolean, u: number): SVGGElement {
    const ty = bodymap.types.find((x) => x.key === p.type)!;
    const g = el('g', {
      class: 'bm-pin-g',
      transform: `translate(${num(p.x * bodymap.viewBox.width)} ${num(p.y * bodymap.viewBox.height)}) scale(${num(u)})`,
      'data-id': p.id,
      'data-type': p.type,
      'data-open': open ? 'true' : 'false',
      'data-x': num(p.x),
      'data-y': num(p.y),
    });
    if (open) {
      g.append(...outline(marker.path, p.type, 1));
      const inner = el('g', { transform: `translate(0 ${marker.head.y}) scale(${num(HEAD_GLYPH_PX / GLYPH_UNITS)})` });
      inner.append(el('path', { d: glyphPath(ty.shape), class: `bm-pin-on${p.type === 'injury' ? ' bm-pin-on--injury' : ''}` }));
      g.append(inner);
      if (p.star) g.append(starBadge(marker.head.r - 1, marker.head.y - marker.head.r + 1));
    } else {
      const k = GLYPH_PX / GLYPH_UNITS;
      const inner = el('g', { transform: `scale(${num(k)})` });
      inner.append(...outline(glyphPath(ty.shape), p.type, k, glyphOutlinePath(ty.shape)));
      g.append(inner);
      if (p.star) g.append(starBadge(GLYPH_PX / 2, -GLYPH_PX / 2));
    }
    return g;
  }

  function renderPins(): void {
    pinLayer.replaceChildren();
    const m = matrix();
    if (!m) return;
    const u = pinRadius(1, m);
    const here = state().pins.filter((p) => p.view === currentView);
    // The open mark last, so it is on top.
    for (const p of [...here.filter((q) => q.id !== openId), ...here.filter((q) => q.id === openId)]) pinLayer.append(markEl(p, p.id === openId, u));
  }

  /** The mark under a screen point, if any: the nearest hit circle (44 px, centred on the glyph or the map-pin's head). */
  function pinAt(clientX: number, clientY: number): string | null {
    const m = matrix();
    if (!m) return null;
    let best: { id: string; d: number } | null = null;
    for (const p of state().pins) {
      if (p.view !== currentView) continue;
      const s = toScreen(m, p.x * bodymap.viewBox.width, p.y * bodymap.viewBox.height);
      const d = Math.hypot(clientX - s.x, clientY - (s.y + hitOffsetY(p.id === openId)));
      if (d <= HIT_PX && (!best || d < best.d)) best = { id: p.id, d };
    }
    return best?.id ?? null;
  }

  // --- the toolbar: the type of the next mark, and the Front/Back counts ---------------------------------------------------
  const typeRadios = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="bm-type"]'));
  const typeName = q<HTMLElement>('bm-type-name');
  for (const r of typeRadios) {
    r.addEventListener('change', () => {
      if (!r.checked) return;
      markType = r.value as PinTypeKey;
      typeName.textContent = t.types[markType];
    });
  }
  function renderToolbar(): void {
    for (const b of tabs) {
      const v = b.dataset.view === 'back' ? 'back' : 'front';
      const n = state().pins.filter((p) => p.view === v).length;
      b.textContent = n ? t.viewCount.replace('{view}', t.views[v]).replace('{n}', String(n)) : t.views[v];
    }
  }

  function applyView(): void {
    const b = boxOf(view);
    svg.setAttribute('viewBox', `${b.x} ${b.y} ${b.w} ${b.h}`);
    renderPins();
  }

  /** What the report says about a pin: the lookup in this figure's zone file for the pin's own view (no file, no zone). */
  const describe = (p: { view: View; x: number; y: number; fromList: boolean }): Located => {
    const file = zoneFileFor(state().figure, p.view);
    return file ? describePin(file, p) : NO_ZONE;
  };

  const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('#bm-tabs .bm-tab'));
  const picker = Array.from(document.querySelectorAll<HTMLButtonElement>('#bm-figures .bm-tab'));
  function showView(next: View): void {
    currentView = next;
    for (const b of tabs) b.setAttribute('aria-pressed', String(b.dataset.view === next));
    for (const b of picker) b.setAttribute('aria-pressed', String(b.dataset.figure === state().figure));
    const url = figureUrl(); // the SVG on a desktop with a fine pointer, else the WebP when there is one (§B12 Art)
    if (url) art.setAttribute('href', url);
    svg.setAttribute('aria-label', t.figureLabel.replace('{figure}', t.figures[state().figure]).replace('{view}', t.views[next].toLowerCase()));
    view = initialView(); // each side starts unzoomed; the marks stay
    lastTap = null;
    applyView();
    renderToolbar();
  }
  for (const b of tabs) b.addEventListener('click', () => showView(b.dataset.view === 'back' ? 'back' : 'front'));

  // The figure picker (B5b): the marks stay where they are, each is looked up again in the new figure's zone file when the
  // report is built (describe reads the figure), and the send id is dropped because the figure is an edit (§B12 Retries).
  for (const b of picker) {
    b.addEventListener('click', () => {
      if (sending) return;
      const next: Sex = b.dataset.figure === 'male' ? 'male' : 'female';
      if (next === state().figure) return;
      store.setFigure(next);
      clearStatus();
      showView(currentView);
    });
  }

  function renderMarks(): void {
    renderToolbar();
    const pins = state().pins;
    marksTitle.textContent = t.marks.replace('{n}', String(pins.length));
    marksEmpty.hidden = pins.length > 0;
    marksList.replaceChildren(
      ...pins.map((p, i) => {
        const li = document.createElement('li');
        const label = document.createElement('span');
        label.textContent = `${i + 1}. ${t.types[p.type]}`;
        const rm = document.createElement('button');
        rm.type = 'button';
        rm.className = 'bm-btn bm-btn--text';
        rm.textContent = t.remove;
        rm.setAttribute('aria-label', `${t.remove} ${i + 1}`);
        rm.addEventListener('click', () => {
          if (sending) return;
          store.removePin(p.id);
          if (openId === p.id) openId = null;
          renderPins();
          renderMarks();
          clearStatus();
        });
        li.append(label, rm);
        return li;
      }),
    );
  }

  function setStatus(text: string, error = false): void {
    statusEl.textContent = text;
    statusEl.hidden = !text;
    statusEl.classList.toggle('bm-error', error);
  }
  const clearStatus = () => {
    if (sending) return;
    setStatus('');
    retryBtn.hidden = true;
  };
  function showErrors(errors: FieldError[]): void {
    const set = (id: string, input: HTMLElement | null, on: boolean) => {
      q<HTMLElement>(id).hidden = !on;
      input?.setAttribute('aria-invalid', String(on));
    };
    set('bm-name-err', nameInput, errors.includes('errName'));
    set('bm-date-err', dateInput, errors.includes('errDate'));
    set('bm-empty-err', null, errors.includes('errEmpty'));
  }

  // --- zoom and pan --------------------------------------------------------------------------------------------------

  const pointers = new Map<number, { x: number; y: number }>();
  let tapStart = { x: 0, y: 0 };
  let moved = false;
  let pinched = false;
  let lastDist = 0;
  let lastMid = { x: 0, y: 0 };
  const dist = () => {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const mid = () => {
    const [a, b] = [...pointers.values()];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };

  function placeMark(clientX: number, clientY: number): string | null {
    if (sending) return null; // what is being sent is what the client sees: no edits until the reply
    const m = matrix();
    if (!m) return null;
    const c = toCanvas(m, clientX, clientY);
    const [nx, ny] = toNorm(c.x, c.y);
    if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return null; // the letterbox beside the figure
    const pin = store.addPin({ view: currentView, x: nx, y: ny, type: markType });
    if (!pin) return null;
    openId = pin.id; // the last placed mark is the map-pin (until the details panel arrives in B6a)
    renderPins();
    renderMarks();
    q<HTMLElement>('bm-empty-err').hidden = true;
    clearStatus();
    return pin.id;
  }

  // Double tap zooms in on that spot (the first tap's mark is taken back); a quick two-finger tap zooms out. (Brian, Nov 13)
  const DOUBLE_TAP_MS = 320;
  const DOUBLE_TAP_PX = 30;
  const TWO_FINGER_MS = 280;
  let lastTap: { t: number; x: number; y: number; pin: string | null } | null = null;
  let twoDownAt = 0;
  let twoTravel = 0;
  function tapped(x: number, y: number): void {
    const now = performance.now();
    const m = matrix();
    if (lastTap && m && now - lastTap.t < DOUBLE_TAP_MS && Math.hypot(x - lastTap.x, y - lastTap.y) < DOUBLE_TAP_PX && !sending) {
      if (lastTap.pin) {
        store.removePin(lastTap.pin);
        if (openId === lastTap.pin) openId = null;
      }
      lastTap = null;
      view = zoomAt(view, 2, toCanvas(m, x, y));
      applyView();
      renderMarks();
      return;
    }
    // A tap on a mark opens it (it becomes the map-pin); it never adds a second mark on top of it.
    const hit = sending ? null : pinAt(x, y);
    if (hit) {
      openId = hit;
      renderPins();
      lastTap = { t: now, x, y, pin: null };
      return;
    }
    lastTap = { t: now, x, y, pin: placeMark(x, y) };
  }

  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    stage.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      tapStart = { x: e.clientX, y: e.clientY };
      moved = false;
      pinched = false;
    } else if (pointers.size === 2) {
      pinched = true;
      lastDist = dist();
      lastMid = mid();
      twoDownAt = performance.now();
      twoTravel = 0;
    }
  });
  stage.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const prev = { ...p };
    p.x = e.clientX;
    p.y = e.clientY;
    const m = matrix();
    if (!m) return;
    if (pointers.size === 2) {
      const d = dist();
      const md = mid();
      twoTravel += Math.abs(d - lastDist) + Math.hypot(md.x - lastMid.x, md.y - lastMid.y);
      if (lastDist > 0) view = zoomAt(view, d / lastDist, toCanvas(m, md.x, md.y));
      svg.setAttribute('viewBox', boxString());
      const after = matrix();
      if (after) view = panBy(view, md.x - lastMid.x, md.y - lastMid.y, after);
      lastDist = d;
      lastMid = md;
      applyView();
    } else if (pointers.size === 1 && !pinched) {
      let dx = e.clientX - prev.x;
      let dy = e.clientY - prev.y;
      if (!moved && Math.hypot(e.clientX - tapStart.x, e.clientY - tapStart.y) >= TAP_SLOP) {
        moved = true;
        dx = e.clientX - tapStart.x; // include the distance that decided it was a drag
        dy = e.clientY - tapStart.y;
      }
      if (moved) {
        view = panBy(view, dx, dy, m);
        applyView();
      }
    }
  });
  const end = (e: PointerEvent) => {
    if (!pointers.has(e.pointerId)) return;
    const wasOne = pointers.size === 1;
    const wasTwo = pointers.size === 2;
    const centre2 = wasTwo ? mid() : null;
    pointers.delete(e.pointerId);
    if (e.type === 'pointerup' && wasOne && !moved && !pinched) tapped(e.clientX, e.clientY);
    if (e.type === 'pointerup' && wasTwo && centre2 && !sending && performance.now() - twoDownAt < TWO_FINGER_MS && twoTravel < 12) {
      const m = matrix();
      if (m) {
        view = zoomAt(view, 0.5, toCanvas(m, centre2.x, centre2.y));
        applyView();
      }
    }
    if (pointers.size === 0) pinched = false;
  };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);
  stage.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const m = matrix();
      if (!m) return;
      view = zoomAt(view, Math.exp(-e.deltaY * 0.0015), toCanvas(m, e.clientX, e.clientY));
      applyView();
    },
    { passive: false },
  );
  // Safari's own pinch would zoom the whole page; inside the figure it is ours.
  for (const name of ['gesturestart', 'gesturechange', 'gestureend']) stage.addEventListener(name, (e) => e.preventDefault());
  stage.addEventListener('dragstart', (e) => e.preventDefault());

  const boxString = () => {
    const b = boxOf(view);
    return `${b.x} ${b.y} ${b.w} ${b.h}`;
  };
  const centre = () => ({ x: view.cx, y: view.cy });
  q<HTMLElement>('bm-zoom-in').addEventListener('click', () => {
    view = zoomAt(view, BUTTON_ZOOM, centre());
    applyView();
  });
  q<HTMLElement>('bm-zoom-out').addEventListener('click', () => {
    view = zoomAt(view, 1 / BUTTON_ZOOM, centre());
    applyView();
  });
  q<HTMLElement>('bm-zoom-reset').addEventListener('click', () => {
    view = initialView();
    applyView();
  });
  new ResizeObserver(() => renderPins()).observe(svg);

  // --- the form ------------------------------------------------------------------------------------------------------

  const w = dateWindow(today());
  dateInput.min = w.min;
  dateInput.max = w.max;
  nameInput.addEventListener('input', () => {
    store.setName(nameInput.value);
    clearFixed();
    clearStatus();
  });
  dateInput.addEventListener('change', () => {
    store.setApptDate(dateInput.value);
    clearFixed();
    clearStatus();
  });
  /** Hides an error once its field is fixed. It never raises one the visitor hasn't triggered by pressing Send. */
  function clearFixed(): void {
    const bad = validate(state(), today());
    const fix = (id: string, input: HTMLElement | null, key: FieldError) => {
      if (bad.includes(key)) return;
      q<HTMLElement>(id).hidden = true;
      input?.setAttribute('aria-invalid', 'false');
    };
    fix('bm-name-err', nameInput, 'errName');
    fix('bm-date-err', dateInput, 'errDate');
  }

  const startOver = q<HTMLButtonElement>('bm-start-over');
  startOver.addEventListener('click', () => {
    if (sending) return;
    confirm.hidden = false;
    q<HTMLElement>('bm-start-yes').focus();
  });
  q<HTMLElement>('bm-start-no').addEventListener('click', () => {
    confirm.hidden = true;
    startOver.focus();
  });
  q<HTMLElement>('bm-start-yes').addEventListener('click', () => {
    if (sending) return;
    store.startOver();
    openId = null;
    nameInput.value = '';
    dateInput.value = '';
    view = initialView();
    confirm.hidden = true;
    showErrors([]);
    clearStatus();
    showView(currentView); // Start over puts the figure back on Female, so the art and the picker follow
    renderMarks();
    startOver.focus();
  });

  /** The PDF colours, read from the CSS tokens so the report matches the page and no colour is set here. */
  function readColors(): PdfColors {
    const probe = document.createElement('span');
    probe.hidden = true;
    document.body.append(probe);
    const read = (token: string, fallback: Rgb): Rgb => {
      probe.style.color = '';
      probe.style.color = `var(--${token})`;
      const m = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(getComputedStyle(probe).color);
      return m ? [Number(m[1]) / 255, Number(m[2]) / 255, Number(m[3]) / 255] : fallback;
    };
    const colors: PdfColors = {
      pin: Object.fromEntries(bodymap.types.map((p) => [p.key, read(p.token, DEFAULT_COLORS.pin[p.key])])) as PdfColors['pin'],
      halo: read('pin-halo', DEFAULT_COLORS.halo),
      edge: read('pin-edge', DEFAULT_COLORS.edge),
      text: read('ink', DEFAULT_COLORS.text),
      rule: read('bodymap-figure', DEFAULT_COLORS.rule),
    };
    probe.remove();
    return colors;
  }

  async function figureJpeg(side: View) {
    // Always the SVG, so every PDF has the same figure on every device (a phone shows the WebP; Send fetches this, once per load).
    const im = await preload(svgFor(artName(store.state.figure, side)));
    const canvas = document.createElement('canvas');
    canvas.width = PDF_PX.w;
    canvas.height = PDF_PX.h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(im, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
    if (!blob) throw new Error('jpeg');
    return { jpeg: new Uint8Array(await blob.arrayBuffer()), width: canvas.width, height: canvas.height };
  }

  function finish(result: SendResult): void {
    if (result === 'ok') {
      store.sent();
      form.hidden = true;
      done.hidden = false;
      done.scrollIntoView({ block: 'start' });
      return;
    }
    setStatus(result === 'busy' ? t.errBusy : result === 'network' ? t.errNetwork : t.errServer, true);
    retryBtn.hidden = result !== 'network';
  }

  /** While a send is in flight the form is read-only, so the marks that go are the marks that were seen, and the reply clears exactly them. */
  function lockFields(on: boolean): void {
    nameInput.readOnly = on;
    dateInput.readOnly = on;
  }

  async function submit(): Promise<void> {
    if (sending) return;
    const errors = validate(state(), today());
    showErrors(errors);
    if (errors.length) {
      (errors[0] === 'errName' ? nameInput : errors[0] === 'errDate' ? dateInput : q<HTMLElement>('bm-empty-err')).scrollIntoView({ block: 'center' });
      if (errors[0] === 'errName') nameInput.focus();
      else if (errors[0] === 'errDate') dateInput.focus();
      return;
    }
    sending = true;
    lockFields(true);
    sendBtn.disabled = true;
    retryBtn.hidden = true;
    setStatus(t.sending);
    let result: SendResult = 'server';
    try {
      const sentAt = new Date();
      const id = store.sendId();
      const image = await figureJpeg('front'); // the PDF draws the front only until B7 (the list names every mark's zone)
      const pdf = buildPdf(state(), sentAt, { front: image }, { siteName, colors: readColors(), describe });
      const payload = buildPayload({ ...state(), id }, buildReport(state(), sentAt, describe), toBase64(pdf));
      result = await sendMap({ fetch: (url, init) => fetch(url, init), url: endpoint, payload });
    } catch (e) {
      // The figure's SVG couldn't be fetched (a phone shows the WebP, so Send is the first time it is needed): the same path as a
      // failed send, with the marks kept and Try again. Anything else means the report couldn't be built; nothing was sent.
      result = e instanceof Error && e.message === 'figure' ? 'network' : 'server';
    }
    sending = false;
    lockFields(false);
    sendBtn.disabled = false;
    finish(result);
  }
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    void submit();
  });
  retryBtn.addEventListener('click', () => void submit());

  // --- start ---------------------------------------------------------------------------------------------------------

  nameInput.value = state().name;
  dateInput.value = state().apptDate;
  app.hidden = false;
  showView(currentView); // a restored entry may hold the male figure: show its art and press its button
  renderMarks();
}

start();
