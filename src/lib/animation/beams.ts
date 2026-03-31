import { randomNumber } from './utils.js';
import { svgEl } from './svg.js';

interface Controller {
  peak: number;
  length: number;
  speed: number;
  travel: number;
  frameCount: number;
}

interface Beam {
  el: SVGPolygonElement;
  controller: Controller;
  x1: number;
  x2: number;
}

export function createBeams(group: SVGGElement, height: number, width = 400) {
  const beams: Beam[] = [];

  function createController(): Controller {
    return {
      peak: randomNumber(0.7, 0.1, false),
      length: randomNumber(180, 30, false),
      speed: randomNumber(0.1, 0.01, false),
      travel: randomNumber(0.5, -0.5, false),
      frameCount: 0,
    };
  }

  const topX = width * 0.66;

  function create() {
    const x1 = randomNumber(width, 0);
    const x2 = randomNumber(width, 0);
    const el = svgEl<SVGPolygonElement>('polygon', {
      points: `${topX},0 ${x1},${height} ${x2},${height}`,
      fill: '#FFEB3B',
      stroke: 'none',
      opacity: '0',
    });
    group.appendChild(el);
    beams.push({ el, controller: createController(), x1, x2 });
  }

  return {
    animate(frameCount: number, startFrame: number, endFrame: number) {
      if (frameCount < startFrame || frameCount > endFrame || frameCount % 3 !== 0) return;
      while (beams.length < 10) create();
      for (const beam of beams) {
        const c = beam.controller;
        c.frameCount++;
        let opacity = parseFloat(beam.el.getAttribute('opacity') ?? '0');
        if (c.frameCount > c.length / 2) {
          opacity -= c.speed;
        } else if (opacity <= c.peak) {
          opacity += c.speed;
        }
        if (opacity <= 0) {
          opacity = 0;
          beam.controller = createController();
        }
        beam.el.setAttribute('opacity', String(opacity));
        beam.x1 = Math.max(0, Math.min(width, beam.x1 + c.travel));
        beam.x2 = Math.max(0, Math.min(width, beam.x2 + c.travel));
        beam.el.setAttribute('points', `${topX},0 ${beam.x1},${height} ${beam.x2},${height}`);
      }
    },
    destroy() {
      for (const b of beams) b.el.remove();
      beams.length = 0;
    },
  };
}
