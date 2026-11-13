// A small hand-written PDF writer for the body map report (B4, ARCHITECTURE §B12 Report and PDF). Built-in Helvetica
// (WinAnsi), lines, filled shapes and JPEG images; no dependency. Coordinates are points from the TOP LEFT of the page,
// y down. Letters outside Latin-1 print as "?" in the PDF only. No document info is written (no title, author or date).

/** Helvetica advance widths (1000 units per em) for ASCII 32-126; everything else is measured as 556. */
const W = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584,
  584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278,
  278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500,
  500, 334, 260, 334, 584,
];
const BOLD = 1.06; // Helvetica-Bold is a little wider; used for short headings only

/** Latin-1 text for the WinAnsi font: NFC first, controls become spaces, anything beyond U+00FF becomes "?". */
export function winAnsi(s: string): string {
  let out = '';
  for (const ch of s.normalize('NFC')) {
    const c = ch.codePointAt(0)!;
    if (c < 32) out += ' ';
    else if (c >= 127 && c <= 159) out += '?';
    else out += c <= 255 ? ch : '?';
  }
  return out;
}

export function textWidth(s: string, size: number, bold = false): number {
  let w = 0;
  for (const ch of winAnsi(s)) {
    const c = ch.charCodeAt(0);
    w += c >= 32 && c <= 126 ? W[c - 32] : 556;
  }
  return (w / 1000) * size * (bold ? BOLD : 1);
}

/** Greedy word wrap to `max` points. A word wider than the box is broken by characters. Always returns at least one line. */
export function wrapText(text: string, max: number, size: number, bold = false): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  const push = () => {
    if (line) lines.push(line);
    line = '';
  };
  for (let word of words) {
    while (textWidth(word, size, bold) > max) {
      push();
      let n = 1;
      while (n < word.length && textWidth(word.slice(0, n + 1), size, bold) <= max) n++;
      lines.push(word.slice(0, n));
      word = word.slice(n);
    }
    if (!word) continue;
    if (!line) line = word;
    else if (textWidth(`${line} ${word}`, size, bold) <= max) line += ` ${word}`;
    else {
      push();
      line = word;
    }
  }
  push();
  return lines.length ? lines : [''];
}

const num = (n: number) => (Math.round(n * 1000) / 1000).toString();
const latin1 = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0) & 255);

/** A string literal for a content stream: ASCII only, anything else as an octal escape. */
function literal(s: string): string {
  let out = '';
  for (const ch of winAnsi(s)) {
    const c = ch.charCodeAt(0);
    if (ch === '\\' || ch === '(' || ch === ')') out += `\\${ch}`;
    else if (c < 32 || c > 126) out += `\\${c.toString(8).padStart(3, '0')}`;
    else out += ch;
  }
  return `(${out})`;
}

interface Paint { fill?: boolean; stroke?: boolean }

export class PdfPage {
  readonly ops: string[] = [];
  readonly usedImages = new Set<number>();
  readonly width: number;
  readonly height: number;
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  private y(y: number) {
    return this.height - y;
  }
  private paint({ fill = true, stroke = false }: Paint) {
    return fill && stroke ? 'B' : stroke ? 'S' : fill ? 'f' : 'n';
  }

  setFill(r: number, g: number, b: number) {
    this.ops.push(`${num(r)} ${num(g)} ${num(b)} rg`);
    return this;
  }
  setStroke(r: number, g: number, b: number) {
    this.ops.push(`${num(r)} ${num(g)} ${num(b)} RG`);
    return this;
  }
  setLineWidth(w: number) {
    this.ops.push(`${num(w)} w`);
    return this;
  }
  /** `y` is the text's baseline. */
  text(x: number, y: number, s: string, o: { size?: number; bold?: boolean } = {}) {
    const size = o.size ?? 10;
    this.ops.push(`BT /${o.bold ? 'F2' : 'F1'} ${num(size)} Tf ${num(x)} ${num(this.y(y))} Td ${literal(s)} Tj ET`);
    return this;
  }
  line(x1: number, y1: number, x2: number, y2: number) {
    this.ops.push(`${num(x1)} ${num(this.y(y1))} m ${num(x2)} ${num(this.y(y2))} l S`);
    return this;
  }
  rect(x: number, y: number, w: number, h: number, p: Paint = {}) {
    this.ops.push(`${num(x)} ${num(this.y(y + h))} ${num(w)} ${num(h)} re ${this.paint(p)}`);
    return this;
  }
  circle(cx: number, cy: number, r: number, p: Paint = {}) {
    const k = 0.5522847498 * r;
    const [x, y] = [cx, this.y(cy)];
    this.ops.push(
      `${num(x + r)} ${num(y)} m ` +
        `${num(x + r)} ${num(y + k)} ${num(x + k)} ${num(y + r)} ${num(x)} ${num(y + r)} c ` +
        `${num(x - k)} ${num(y + r)} ${num(x - r)} ${num(y + k)} ${num(x - r)} ${num(y)} c ` +
        `${num(x - r)} ${num(y - k)} ${num(x - k)} ${num(y - r)} ${num(x)} ${num(y - r)} c ` +
        `${num(x + k)} ${num(y - r)} ${num(x + r)} ${num(y - k)} ${num(x + r)} ${num(y)} c h ${this.paint(p)}`,
    );
    return this;
  }
  polygon(points: [number, number][], p: Paint = {}) {
    if (points.length < 3) return this;
    const path = points.map(([x, y], i) => `${num(x)} ${num(this.y(y))} ${i ? 'l' : 'm'}`).join(' ');
    this.ops.push(`${path} h ${this.paint(p)}`);
    return this;
  }
  /** Draws image `index` (from addImage) into the box. */
  image(index: number, x: number, y: number, w: number, h: number) {
    this.usedImages.add(index);
    this.ops.push(`q ${num(w)} 0 0 ${num(h)} ${num(x)} ${num(this.y(y + h))} cm /Im${index} Do Q`);
    return this;
  }
}

export class PdfWriter {
  private images: { data: Uint8Array; w: number; h: number }[] = [];
  private pages: PdfPage[] = [];

  /** JPEG bytes (baseline, 3 components) and their pixel size. Returns the index for page.image(). */
  addImage(jpeg: Uint8Array, width: number, height: number): number {
    this.images.push({ data: jpeg, w: width, h: height });
    return this.images.length - 1;
  }
  addPage(width = 612, height = 792): PdfPage {
    const page = new PdfPage(width, height);
    this.pages.push(page);
    return page;
  }

  build(): Uint8Array {
    // Object numbers: 1 catalog, 2 page tree, 3 and 4 fonts, then the images, then a page and its content per page.
    const imageBase = 5;
    const pageBase = imageBase + this.images.length;
    const pageNo = (i: number) => pageBase + i * 2;
    const chunks: Uint8Array[] = [];
    const offsets: number[] = [];
    let size = 0;
    const put = (b: Uint8Array | string) => {
      const bytes = typeof b === 'string' ? latin1(b) : b;
      chunks.push(bytes);
      size += bytes.length;
    };
    const obj = (n: number, head: string, stream?: Uint8Array | string) => {
      offsets[n] = size;
      if (stream === undefined) put(`${n} 0 obj\n${head}\nendobj\n`);
      else {
        const bytes = typeof stream === 'string' ? latin1(stream) : stream;
        put(`${n} 0 obj\n${head.replace(/>>$/, '')} /Length ${bytes.length} >>\nstream\n`);
        put(bytes);
        put('\nendstream\nendobj\n');
      }
    };

    put('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, `<< /Type /Pages /Count ${this.pages.length} /Kids [${this.pages.map((_, i) => `${pageNo(i)} 0 R`).join(' ')}] >>`);
    obj(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    obj(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    this.images.forEach((im, i) => {
      obj(imageBase + i, `<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode >>`, im.data);
    });
    this.pages.forEach((p, i) => {
      const xobjects = [...p.usedImages].map((n) => `/Im${n} ${imageBase + n} 0 R`).join(' ');
      const resources = `<< /Font << /F1 3 0 R /F2 4 0 R >>${xobjects ? ` /XObject << ${xobjects} >>` : ''} >>`;
      obj(pageNo(i), `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(p.width)} ${num(p.height)}] /Resources ${resources} /Contents ${pageNo(i) + 1} 0 R >>`);
      obj(pageNo(i) + 1, '<< >>', p.ops.join('\n'));
    });

    const count = pageBase + this.pages.length * 2;
    const xref = size;
    let table = `xref\n0 ${count}\n0000000000 65535 f \n`;
    for (let n = 1; n < count; n++) table += `${String(offsets[n]).padStart(10, '0')} 00000 n \n`;
    put(`${table}trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

    const out = new Uint8Array(size);
    let at = 0;
    for (const c of chunks) {
      out.set(c, at);
      at += c.length;
    }
    return out;
  }
}
