// Map pages (I-054, decision I-055): the terrain shading is the heaviest file on /book and the zone pages,
// so ServiceMap ships it as data-href and this script sets href after the page's load event, and only once
// that map is on screen (on /book the maps stay hidden until a visitor picks a place). With JS off the
// maps show without terrain. No network beyond the image, no storage.
function start(): void {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      const img = e.target.querySelector<SVGImageElement>(':scope > image.terrain[data-href]');
      if (img?.dataset.href) img.setAttribute('href', img.dataset.href);
    }
  });
  for (const img of document.querySelectorAll<SVGImageElement>('image.terrain[data-href]')) {
    const svg = img.closest('svg');
    if (svg) io.observe(svg);
  }
}

if (document.readyState === 'complete') start();
else addEventListener('load', start, { once: true });
