// The body map report and its PDF (B4 thin slice; B7 completes it). ARCHITECTURE §B12 Report and PDF.
// buildReport() is the JSON the script files beside the PDF; buildPdf() draws the PDF with src/lib/pdf.ts.
// Regions come from the lookup (B5), never from the zone files: this module imports none. Until B5, a mark's region is null
// and the PDF says "Unlabelled area". Pin colours come from the page (read from the CSS tokens) so no colour is set here.
import { bodymap, type PinTypeKey, type View } from '../data/bodymap.ts';
import { PdfWriter, textWidth, wrapText, type PdfPage } from './pdf.ts';
import type { BodyState, Pin } from './bodymap.ts';

export interface FigureImage { jpeg: Uint8Array; width: number; height: number }
export type Rgb = [number, number, number];
/** 0-1 channels. The page fills this from the CSS tokens (--pin-*, --pin-halo, --ink); these are only the fallback, and tests/bodymap-pdf.test.ts keeps them equal to tokens.css. */
export interface PdfColors { pin: Record<PinTypeKey, Rgb>; halo: Rgb; edge: Rgb; text: Rgb; rule: Rgb }
export const DEFAULT_COLORS: PdfColors = {
  pin: { pain: [0.612, 0.341, 0.224], discomfort: [0.765, 0.478, 0.357], injury: [0.071, 0.322, 0.271], numb: [0.043, 0.149, 0.125], avoid: [0.043, 0.149, 0.125] },
  halo: [0.953, 0.949, 0.941],
  edge: [0.043, 0.149, 0.125],
  text: [0.043, 0.149, 0.125],
  rule: [0.83, 0.84, 0.86],
};

export interface Report {
  v: 1;
  name: string;
  apptDate: string;
  figure: BodyState['figure'];
  /** ISO UTC time of the send */
  sent: string;
  pins: ReportPin[];
}
export interface ReportPin {
  n: number;
  view: View;
  x: number;
  y: number;
  type: PinTypeKey;
  region: string | null;
  intensity: number | null;
  note: string;
  star: boolean;
}

const round4 = (n: number) => Math.round(n * 10000) / 10000;

/** The record filed as JSON: the whole report, so the file reads on its own (I-145). The send id stays out of it. */
export function buildReport(s: Pick<BodyState, 'name' | 'apptDate' | 'figure' | 'pins'>, sentAt: Date): Report {
  return {
    v: 1,
    name: s.name.trim(),
    apptDate: s.apptDate,
    figure: s.figure,
    sent: sentAt.toISOString(),
    pins: s.pins.map((p, i) => ({ n: i + 1, view: p.view, x: round4(p.x), y: round4(p.y), type: p.type, region: null, intensity: p.intensity, note: p.note, star: p.star })),
  };
}

export function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function dateLabel(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${MONTHS[+m[2] - 1]} ${+m[3]}, ${m[1]}` : iso;
}
/** `2026-12-01 10:00` in Denver time, the same clock as the filed file names. */
function sentLabel(d: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Denver', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

const PAGE = { w: 612, h: 792, margin: 40, top: 56, bottom: 52 };
const HEAD_VALUE_X = 84; // the header's values line up in one column, wide enough for "Appointment:"
const FIG_H = 330; // the figure's height on the first page, in points
const LINE = 12.5;
const typeName = (k: PinTypeKey) => bodymap.text.types[k];

function pinLine(p: Pin, n: number): string {
  const parts = [typeName(p.type)];
  if (p.intensity) parts.push(bodymap.text.pdf.intensity.replace('{n}', String(p.intensity)));
  parts.push(bodymap.text.unlabelled); // B5 replaces this with the looked-up region
  if (p.note.trim()) parts.push(p.note.trim());
  return `${n}.  ${parts.join(' · ')}`;
}

export function buildPdf(
  s: Pick<BodyState, 'name' | 'apptDate' | 'figure' | 'pins'>,
  sentAt: Date,
  images: Partial<Record<View, FigureImage>>,
  opts: { siteName?: string; colors?: PdfColors } = {},
): Uint8Array {
  const t = bodymap.text.pdf;
  const c = opts.colors ?? DEFAULT_COLORS;
  const w = new PdfWriter();
  const index: Partial<Record<View, number>> = {};
  for (const v of bodymap.views) {
    const im = images[v];
    if (im) index[v] = w.addImage(im.jpeg, im.width, im.height);
  }
  const footer = t.footer.replace('{site}', opts.siteName ?? '').replace(/^\s*·\s*/, '');
  const pages: PdfPage[] = [];
  const newPage = () => {
    const p = w.addPage(PAGE.w, PAGE.h);
    pages.push(p);
    return p;
  };
  const ink = (p: PdfPage) => p.setFill(...c.text).setStroke(...c.text);

  // --- first page: header, then the figure on the left and the list on the right
  let page = newPage();
  ink(page).text(PAGE.margin, PAGE.top, t.title, { size: 18, bold: true });
  const head: [string, string][] = [
    [t.name, s.name.trim()],
    [t.appointment, dateLabel(s.apptDate)],
    [t.sent, sentLabel(sentAt)],
    [t.figure, bodymap.text.figures[s.figure]],
  ];
  let y = PAGE.top + 24;
  for (const [label, value] of head) {
    page.text(PAGE.margin, y, `${label}:`, { size: 10, bold: true }).text(PAGE.margin + HEAD_VALUE_X, y, value, { size: 10 });
    y += LINE + 1;
  }

  // The figure (front only until B7): a JPEG with the pins drawn on top as vector shapes.
  const view: View = 'front';
  const figTop = y + 14;
  const im = images[view];
  const figH = FIG_H;
  const figW = im ? (im.width / im.height) * figH : figH / 2;
  const figX = PAGE.margin;
  page.setStroke(...c.rule).setLineWidth(0.5);
  page.text(figX, figTop - 4, bodymap.text.views[view], { size: 9, bold: true });
  if (index[view] !== undefined) page.image(index[view]!, figX, figTop, figW, figH);
  else page.rect(figX, figTop, figW, figH, { fill: false, stroke: true });
  const numbered = s.pins.map((p, i) => ({ p, n: i + 1 }));
  for (const { p, n } of numbered) {
    if (p.view !== view) continue;
    const cx = figX + p.x * figW;
    const cy = figTop + p.y * figH;
    page.setFill(...c.pin[p.type]).setStroke(...c.halo).setLineWidth(1).circle(cx, cy, 7, { fill: true, stroke: true });
    page.setFill(...c.halo).text(cx - textWidth(String(n), 7, true) / 2, cy + 2.5, String(n), { size: 7, bold: true });
  }

  // --- the list: Priority, Avoid, Other marks. It starts beside the figure and runs on to further pages.
  let colX = figX + figW + 28;
  let colW = PAGE.w - PAGE.margin - colX;
  y = figTop;
  const limit = PAGE.h - PAGE.bottom;
  const room = (lines: number) => y + lines * LINE <= limit;
  const sections: [string, typeof numbered][] = [
    [t.priority, numbered.filter(({ p }) => p.star)],
    [t.avoid, numbered.filter(({ p }) => !p.star && p.type === 'avoid')],
    [t.other, numbered.filter(({ p }) => !p.star && p.type !== 'avoid')],
  ];
  const ensure = (lines: number) => {
    if (room(lines)) return;
    page = newPage();
    colX = PAGE.margin;
    colW = PAGE.w - 2 * PAGE.margin;
    y = PAGE.top;
  };
  if (!s.pins.length) {
    ink(page).text(colX, y + 10, bodymap.text.marksEmpty, { size: 10 });
  }
  for (const [heading, rows] of sections) {
    if (!rows.length) continue;
    ensure(3);
    ink(page).text(colX, y + 10, heading, { size: 11, bold: true });
    y += LINE + 6;
    for (const { p, n } of rows) {
      const lines = wrapText(pinLine(p, n), colW - 12, 9.5);
      ensure(lines.length);
      lines.forEach((ln, i) => {
        ink(page).text(colX + (i ? 12 : 0), y + 9, ln, { size: 9.5 });
        y += LINE;
      });
      y += 2;
    }
    y += 6;
  }

  // --- a footer line on every page
  pages.forEach((p, i) => {
    p.setFill(...c.text).text(PAGE.margin, PAGE.h - 28, footer, { size: 8 });
    const label = `${i + 1} / ${pages.length}`;
    p.text(PAGE.w - PAGE.margin - textWidth(label, 8), PAGE.h - 28, label, { size: 8 });
  });
  return w.build();
}
