import { randomNumber } from './utils.js';
import { svgEl } from './svg.js';

interface Vertex {
  x: number;
  y: number;
  ogx: number;
  jitter?: number;
  dir?: number;
}

interface PoetryItem {
  polyEl: SVGPolygonElement;
  vertices: Vertex[];
  tx: number;
  ty: number;
  rotation: number;
}

export function createPoetry(group: SVGGElement, width = 400) {
  const items: PoetryItem[] = [];
  const maxW = width;
  const minW = width / 4;
  const line = { x: 20, y: -30, height: 40, minWidth: minW, maxWidth: maxW };
  const step = 60;

  function pointsStr(verts: Vertex[]): string {
    return verts.map(v => `${v.x},${v.y}`).join(' ');
  }

  function create(i: number) {
    const width = randomNumber(line.maxWidth, line.minWidth);
    const halfW = width / 2;
    const halfH = line.height / 2;
    const vertices: Vertex[] = [
      { x: -halfW, y: -halfH, ogx: -halfW },
      { x:  halfW, y: -halfH, ogx:  halfW },
      { x:  halfW, y:  halfH, ogx:  halfW },
      { x: -halfW, y:  halfH, ogx: -halfW },
    ];
    const tx = halfW + line.x;
    const ty = line.y + i * step;
    const rotation = randomNumber(5, -5);
    const polyEl = svgEl<SVGPolygonElement>('polygon', {
      points: pointsStr(vertices),
      class: 'anim-poetry',
      stroke: 'none',
      opacity: String(randomNumber(75, 30) / 100),
      transform: `translate(${tx}, ${ty}) rotate(${rotation})`,
    });
    group.appendChild(polyEl);
    items.push({ polyEl, vertices, tx, ty, rotation });
  }

  function populate() {
    const target = Math.floor(document.documentElement.clientHeight / step);
    while (items.length <= target) create(items.length);
  }

  return {
    animate(frameCount: number, startFrame: number, endFrame: number) {
      if (frameCount < startFrame || frameCount > endFrame || frameCount % 3 !== 0) return;
      populate();
      for (const item of items) {
        let changed = false;
        for (const v of item.vertices) {
          if (v.jitter !== undefined && v.dir !== undefined) {
            v.x += v.dir;
            if (v.x === v.ogx + v.jitter) v.dir *= -1;
            if (v.x === v.ogx) { delete v.jitter; delete v.dir; }
          } else {
            let jitter = 0;
            while (jitter === 0) jitter = randomNumber(6, -6);
            v.jitter = jitter;
            v.dir = jitter > 0 ? 1 : -1;
          }
          changed = true;
        }
        if (changed) item.polyEl.setAttribute('points', pointsStr(item.vertices));
      }
    },
    destroy() {
      for (const item of items) item.polyEl.remove();
      items.length = 0;
    },
  };
}
