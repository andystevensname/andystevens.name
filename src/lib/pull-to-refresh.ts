// Pull-to-refresh: sets --ptr-pull on <html>. CSS does the rest.

let y = 0, active = false;
const h = document.documentElement;

const set = (px: number) => h.style.setProperty('--ptr-pull', `${px}px`);
const clear = () => { h.style.removeProperty('--ptr-pull'); h.classList.remove('ptr-active'); };

const release = () => {
  if (!active) return;
  active = false;
  h.classList.remove('ptr-active');
  if (parseFloat(getComputedStyle(h).getPropertyValue('--ptr-pull')) >= 80) {
    h.classList.add('ptr-refreshing');
    location.reload();
  } else clear();
};

document.addEventListener('touchstart', e => {
  if (scrollY < 1 && e.touches.length === 1) { y = e.touches[0].clientY; active = true; h.classList.add('ptr-active'); }
}, { passive: true });

document.addEventListener('touchmove', e => {
  if (!active) return;
  if (scrollY > 1) { release(); return; }
  const d = (e.touches[0].clientY - y) * .4;
  if (d < 0) { release(); return; }
  e.preventDefault();
  set(Math.min(d, 120));
}, { passive: false });

document.addEventListener('touchend', release);
document.addEventListener('touchcancel', release);
