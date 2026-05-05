// Pull-to-refresh: morphs SVG #ptr-shape with a traveling bulge.

const THRESHOLD = 150, R = 18, N = 36;
let y = 0, active = false;

function buildPath(p: number): string {
  const ba = p * Math.PI * 2 - Math.PI / 2;
  let d = '';
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    const diff = Math.atan2(Math.sin(a - ba), Math.cos(a - ba));
    const r = R + Math.exp(-diff * diff * 6) * 4;
    d += `${i ? 'L' : 'M'}${(20 + r * Math.cos(a)).toFixed(2)} ${(20 + r * Math.sin(a)).toFixed(2)}`;
  }
  return d + 'Z';
}

function update(p: number) {
  const s = document.getElementById('ptr-shape') as SVGPathElement | null;
  if (!s) return;
  s.setAttribute('d', buildPath(p));
  s.style.fillOpacity = String(p);
  s.style.opacity = p > 0.05 ? '1' : '0';
}

document.addEventListener('touchstart', e => {
  if (scrollY < 1 && e.touches.length === 1) { y = e.touches[0].clientY; active = true; }
}, { passive: true });

document.addEventListener('touchmove', e => {
  if (!active) return;
  if (scrollY > 1 || e.touches[0].clientY - y < 0) { active = false; update(0); return; }
  update(Math.min((e.touches[0].clientY - y) / THRESHOLD, 1));
}, { passive: true });

document.addEventListener('touchend', e => {
  if (active && scrollY < 1 && e.changedTouches[0].clientY - y > THRESHOLD) {
    document.documentElement.classList.add('ptr-refreshing');
    location.reload();
  } else update(0);
  active = false;
});
