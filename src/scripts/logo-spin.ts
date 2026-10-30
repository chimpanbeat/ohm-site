// Home only (step V): a plain click on the header logo spins it once instead of reloading Home.
// Elsewhere the logo is an ordinary link. No network, no storage.
const logo = document.querySelector<HTMLAnchorElement>('.site-header__logo');

logo?.addEventListener('click', (e) => {
  if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return; // let the browser open a tab
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; // the link reloads as normal
  e.preventDefault();
  if (logo.classList.contains('is-spinning')) return;
  logo.classList.add('is-spinning');
  logo.addEventListener('animationend', () => logo.classList.remove('is-spinning'), { once: true });
});
