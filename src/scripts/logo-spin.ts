// Home only (step V): a plain click on the header logo spins it once while Home is scrolled to the top,
// and scrolls back to the top when it is not. Either way it never reloads Home.
// Elsewhere the logo is an ordinary link. No network, no storage.
const logo = document.querySelector<HTMLAnchorElement>('.site-header__logo');
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const atTop = () => window.scrollY < 2;

logo?.addEventListener('click', (e) => {
  if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return; // let the browser open a tab
  if (!atTop()) {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
    return;
  }
  if (reduced()) return; // the link reloads as normal
  e.preventDefault();
  if (logo.classList.contains('is-spinning')) return;
  logo.classList.add('is-spinning');
  logo.addEventListener('animationend', () => logo.classList.remove('is-spinning'), { once: true });
});
