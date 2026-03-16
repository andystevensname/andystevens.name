import { randomNumber } from './utils.js';

export function createPoetry(two: any, group: any) {
  const paths: any[] = [];
  const line = { x: 20, y: -30, height: 40, minWidth: 100, maxWidth: 380 };
  const step = 60;

  function create(i: number) {
    const width = randomNumber(line.maxWidth, line.minWidth);
    const halfW = width / 2;
    const halfH = line.height / 2;
    const rect = two.makePath(-halfW, -halfH, halfW, -halfH, halfW, halfH, -halfW, halfH);
    rect.translation.set(halfW + line.x, line.y + i * step);
    rect.rotation = randomNumber(5, -5) * (Math.PI / 180);
    rect.noStroke().fill = 'red';
    rect.opacity = 0.75;
    for (let v = 0; v < 4; v++) {
      rect.vertices[v].ogx = rect.vertices[v].x;
    }
    paths.push(rect);
    group.add(rect);
  }

  function populate() {
    const target = Math.floor(document.documentElement.clientHeight / step);
    const current = paths.length;
    if (current < target) {
      for (let i = current; i <= target; i++) create(i);
    }
  }

  return {
    paths,
    animate(frameCount: number, startFrame: number, endFrame: number) {
      if (frameCount >= startFrame && frameCount <= endFrame && frameCount % 3 === 0) {
        populate();
        for (let i = 0; i < paths.length; i++) {
          for (let v = 0; v < 4; v++) {
            const vert = paths[i].vertices[v];
            if (Object.prototype.hasOwnProperty.call(vert, 'jitter')) {
              vert.x += vert.dir;
              if (vert.x === vert.ogx + vert.jitter) vert.dir = vert.dir * -1;
              if (vert.x === vert.ogx) { delete vert.jitter; delete vert.dir; }
            } else {
              let jitter = 0;
              while (jitter === 0) jitter = randomNumber(6, -6);
              vert.jitter = jitter;
              vert.dir = jitter > 0 ? 1 : -1;
            }
          }
        }
      }
    },
    destroy() {
      group.remove(paths);
      paths.length = 0;
    },
  };
}
