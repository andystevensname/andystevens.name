// Pull-to-refresh: touch gesture at top of page triggers reload.
// Visual indicator via --pull-progress custom property on <html>,
// styled by html::before in CSS. Zero DOM elements added.

const THRESHOLD = 80;

let startY = 0;
let pulling = false;
const html = document.documentElement;

function reset() {
  pulling = false;
  html.style.removeProperty('--pull-progress');
}

document.addEventListener('touchstart', (e) => {
  if (window.scrollY === 0 && e.touches.length === 1) {
    startY = e.touches[0].clientY;
    pulling = true;
  }
}, { passive: true });

document.addEventListener('touchmove', (e) => {
  if (!pulling) return;
  if (window.scrollY > 0) { reset(); return; }
  const dy = (e.touches[0].clientY - startY) * 0.5;
  if (dy < 0) { reset(); return; }
  html.style.setProperty('--pull-progress', String(Math.min(dy / THRESHOLD, 1.5)));
}, { passive: true });

document.addEventListener('touchend', () => {
  if (pulling && parseFloat(html.style.getPropertyValue('--pull-progress') || '0') >= 1) {
    html.style.setProperty('--pull-progress', '1');
    html.classList.add('refreshing');
    window.location.reload();
  } else {
    reset();
  }
});

document.addEventListener('touchcancel', reset);
