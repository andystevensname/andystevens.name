// Pull-to-refresh: sets --ptr-pull and --ptr-progress on <html>. CSS does the rest.

let y = 0, active = false;
const h = document.documentElement;

const set = (px: number) => {
  h.style.setProperty('--ptr-pull', `${px}px`);
  h.style.setProperty('--ptr-progress', String(Math.min(px / 80, 1.5)));
};

const clear = () => {
  h.style.removeProperty('--ptr-pull');
  h.style.removeProperty('--ptr-progress');
};

const release = () => {
  if (!active) return;
  active = false;
  if (parseFloat(getComputedStyle(h).getPropertyValue('--ptr-progress')) >= 1) {
    h.classList.add('ptr-refreshing');
    location.reload();
  } else {
    h.classList.replace('ptr-active', 'ptr-releasing');
    set(0);
    setTimeout(() => { h.classList.remove('ptr-releasing'); clear(); }, 300);
  }
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
