// Client script 2. Imported only by pages/client-policies.astro (docs/build/ARCHITECTURE.md §B9).
// The page works without it: each section is a native <details>, and the shared `name` keeps one open at a
// time. This opens the section named in the URL hash, and opens everything for print. No storage, no network.

const sections = () => Array.from(document.querySelectorAll<HTMLDetailsElement>('details.policy'));

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

// Print opens every section. The shared name would close all but one, so it comes off for the print and
// goes back after, along with the sections that were closed.
const GROUP = 'policies';
let closedBeforePrint: HTMLDetailsElement[] = [];
window.addEventListener('beforeprint', () => {
  closedBeforePrint = sections().filter((d) => !d.open);
  for (const d of sections()) d.removeAttribute('name');
  for (const d of closedBeforePrint) d.open = true;
});
window.addEventListener('afterprint', () => {
  for (const d of closedBeforePrint) d.open = false;
  closedBeforePrint = [];
  for (const d of sections()) d.setAttribute('name', GROUP);
});
