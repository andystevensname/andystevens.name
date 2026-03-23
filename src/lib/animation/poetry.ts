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
  groupEl: SVGGElement;
  polyEl: SVGPolygonElement;
  vertices: Vertex[];
}

export function createPoetry(group: SVGGElement, width = 400) {
  const items: PoetryItem[] = [];
  const maxW = width - 40;
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
    const rotation = randomNumber(5, -5);
    const groupEl = svgEl<SVGGElement>('g', {
      transform: `translate(${halfW + line.x}, ${line.y + i * step}) rotate(${rotation})`,
      opacity: '0.75',
    });
    const polyEl = svgEl<SVGPolygonElement>('polygon', {
      points: pointsStr(vertices),
      fill: 'red',
      stroke: 'none',
    });
    groupEl.appendChild(polyEl);
    group.appendChild(groupEl);
    items.push({ groupEl, polyEl, vertices });
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
      for (const item of items) item.groupEl.remove();
      items.length = 0;
    },
  };
}
