// Client script 8 (B4, I-073). Imported only by src/pages/body-map.astro, and only while the page is open
// (ARCHITECTURE §B12). A thin DOM layer: the maths is src/lib/bodymap-view.ts, the state, storage and wire are
// src/lib/bodymap.ts, the report and PDF are src/lib/bodymap-pdf.ts. All strings are bodymap.text.
// Health information stays in this page's memory, one localStorage entry (24 hours) and the one send. Nothing is logged,
// put in the URL, or sent to analytics (the page loads none).
import { bodymap, artName, type PinTypeKey, type View } from '../data/bodymap.ts';
import { buildPayload, createStore, dateWindow, sendMap, validate, type FieldError, type SendResult } from '../lib/bodymap.ts';
import { boxOf, initialView, panBy, pinRadius, toCanvas, toNorm, zoomAt, type Matrix, type ViewState } from '../lib/bodymap-view.ts';
import { DEFAULT_COLORS, buildPdf, buildReport, toBase64, type PdfColors, type Rgb } from '../lib/bodymap-pdf.ts';

const t = bodymap.text;
const SVG_NS = 'http://www.w3.org/2000/svg';
const TAP_SLOP = 8; // px of movement under which a touch is a tap
const PIN_PX = 13; // pin radius on screen, at every zoom
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
  const figures = JSON.parse(stage.dataset.figures ?? '{}') as Record<string, string>;

  let storage: Storage | null = null;
  try {
    storage = window.localStorage;
  } catch {
    storage = null; // blocked: the marks stay in memory
  }
  const store = createStore({ storage, now: () => Date.now(), random: (b) => crypto.getRandomValues(b) });

  // Thin slice: the front of the chosen figure, and the one mark type, pain.
  const currentView: View = 'front';
  const markType: PinTypeKey = 'pain';
  let view: ViewState = initialView();
  let sending = false;

  // The figure loaded once, so a send made offline can still draw it into the PDF.
  const images = new Map<string, HTMLImageElement>();
  const figureUrl = () => figures[artName(store.state.figure, currentView)] ?? '';
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

  function renderPins(): void {
    pinLayer.replaceChildren();
    const m = matrix();
    if (!m) return;
    const r = pinRadius(PIN_PX, m);
    state().pins.forEach((p, i) => {
      if (p.view !== currentView) return;
      const cx = p.x * bodymap.viewBox.width;
      const cy = p.y * bodymap.viewBox.height;
      const g = document.createElementNS(SVG_NS, 'g');
      const c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('class', `bm-pin bm-pin--${p.type}`);
      c.setAttribute('cx', String(cx));
      c.setAttribute('cy', String(cy));
      c.setAttribute('r', String(r));
      c.setAttribute('stroke-width', String(pinRadius(2, m)));
      const n = document.createElementNS(SVG_NS, 'text');
      n.setAttribute('class', 'bm-pin-n');
      n.setAttribute('x', String(cx));
      n.setAttribute('y', String(cy));
      n.setAttribute('font-size', String(pinRadius(12, m)));
      n.textContent = String(i + 1);
      g.append(c, n);
      pinLayer.append(g);
    });
  }
  const state = () => store.state;

  function applyView(): void {
    const b = boxOf(view);
    svg.setAttribute('viewBox', `${b.x} ${b.y} ${b.w} ${b.h}`);
    renderPins();
  }

  function renderMarks(): void {
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

  function placeMark(clientX: number, clientY: number): void {
    if (sending) return; // what is being sent is what the client sees: no edits until the reply
    const m = matrix();
    if (!m) return;
    const c = toCanvas(m, clientX, clientY);
    const [nx, ny] = toNorm(c.x, c.y);
    if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return; // the letterbox beside the figure
    if (!store.addPin({ view: currentView, x: nx, y: ny, type: markType })) return;
    renderPins();
    renderMarks();
    q<HTMLElement>('bm-empty-err').hidden = true;
    clearStatus();
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
    pointers.delete(e.pointerId);
    if (e.type === 'pointerup' && wasOne && !moved && !pinched) placeMark(e.clientX, e.clientY);
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
    nameInput.value = '';
    dateInput.value = '';
    view = initialView();
    confirm.hidden = true;
    showErrors([]);
    clearStatus();
    applyView();
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
      pin: Object.fromEntries(bodymap.pinTypes.map((p) => [p.key, read(p.token, DEFAULT_COLORS.pin[p.key])])) as PdfColors['pin'],
      halo: read('pin-halo', DEFAULT_COLORS.halo),
      edge: read('pin-edge', DEFAULT_COLORS.edge),
      text: read('ink', DEFAULT_COLORS.text),
      rule: read('bodymap-figure', DEFAULT_COLORS.rule),
    };
    probe.remove();
    return colors;
  }

  async function figureJpeg() {
    const im = await preload(figureUrl());
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
      const image = await figureJpeg();
      const pdf = buildPdf(state(), sentAt, { [currentView]: image }, { siteName, colors: readColors() });
      const payload = buildPayload({ ...state(), id }, buildReport(state(), sentAt), toBase64(pdf));
      result = await sendMap({ fetch: (url, init) => fetch(url, init), url: endpoint, payload });
    } catch {
      result = 'server'; // the report could not be built (nothing was sent); the marks are still here
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
  applyView();
  renderMarks();
  void preload(figureUrl()).catch(() => undefined);
}

start();
