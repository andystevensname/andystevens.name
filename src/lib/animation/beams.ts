import { randomNumber } from './utils.js';

export function createBeams(two: any, group: any) {
  const paths: any[] = [];

  function createController() {
    return {
      peak: randomNumber(0.7, 0.1, false),
      length: randomNumber(180, 30, false),
      speed: randomNumber(0.1, 0.01, false),
      travel: randomNumber(0.5, -0.5, false),
      frameCount: 0,
    };
  }

  function create() {
    const beam = two.makePath(
      300, 0,
      randomNumber(400, 0), two.height,
      randomNumber(400, 0), two.height,
    );
    beam.noStroke().fill = '#FFEB3B';
    beam.opacity = 0;
    beam.controller = createController();
    paths.push(beam);
    group.add(beam);
  }

  function populate(target: number) {
    if (paths.length < target) {
      const current = paths.length;
      for (let i = current; i < target; i++) create();
    }
  }

  return {
    paths,
    animate(frameCount: number, startFrame: number, endFrame: number) {
      if (frameCount >= startFrame && frameCount <= endFrame && frameCount % 3 === 0) {
        populate(10);
        for (let i = 0; i < paths.length; i++) {
          paths[i].controller.frameCount++;
          if (paths[i].controller.frameCount > paths[i].controller.length / 2) {
            paths[i].opacity -= paths[i].controller.speed;
          } else if (paths[i].opacity <= paths[i].controller.peak) {
            paths[i].opacity += paths[i].controller.speed;
          }
          paths[i].vertices[1].x += paths[i].controller.travel;
          paths[i].vertices[2].x += paths[i].controller.travel;
          if (paths[i].opacity <= 0) {
            paths[i].opacity = 0;
            paths[i].controller = createController();
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
