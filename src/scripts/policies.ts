// Client script 2. Imported only by pages/client-policies.astro (docs/build/ARCHITECTURE.md §B9).
// The page works without it: each section is a native <details>. This adds Expand all / Collapse all,
// opens the section named in the URL hash, and opens everything for print. No storage, no network.

const sections = () => Array.from(document.querySelectorAll<HTMLDetailsElement>('details.policy'));

const controls = document.querySelector<HTMLElement>('.policies-controls');
controls?.removeAttribute('hidden');

document.querySelector('[data-policies="expand"]')?.addEventListener('click', () => {
  for (const d of sections()) d.open = true;
});
document.querySelector('[data-policies="collapse"]')?.addEventListener('click', () => {
  for (const d of sections()) d.open = false;
});

function openHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (!id) return;
  const target = sections().find((d) => d.id === id);
  if (!target) return;
  target.open = true;
  target.scrollIntoView();
}
openHash();
window.addEventListener('hashchange', openHash);

// Print opens every section; afterprint puts back the ones that were closed.
let closedBeforePrint: HTMLDetailsElement[] = [];
window.addEventListener('beforeprint', () => {
  closedBeforePrint = sections().filter((d) => !d.open);
  for (const d of closedBeforePrint) d.open = true;
});
window.addEventListener('afterprint', () => {
  for (const d of closedBeforePrint) d.open = false;
  closedBeforePrint = [];
});
