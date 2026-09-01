import { svgEl } from './svg.js';
import { GEAR_PATHS } from './gear-paths.js';

interface GearInfo {
  assemblyEl: SVGGElement;
  spinEl: SVGGElement;
  wrapEl: SVGGElement;
  pathEl: SVGPathElement;
  circleEl: SVGCircleElement;
  teeth: number;
  diametralPitch: number;
  pitchDiameter: number;
  scaledWidth: number;
  degPerSecond: number;
  direction: number;
}

export function createGears(canvas: SVGSVGElement, group: SVGGElement, width = 400) {
  const teethCounts = [18, 36, 52];
  const gears: GearInfo[] = [];
  const spins: Animation[] = [];
  let scaleRatio: number | undefined;

  function measurePath(d: string) {
    const tmp = svgEl<SVGPathElement>('path', { d, visibility: 'hidden' });
    canvas.appendChild(tmp);
    const box = tmp.getBBox();
    canvas.removeChild(tmp);
    return { cx: box.x + box.width / 2, cy: box.y + box.height / 2, width: box.width };
  }

  function create(i: number) {
    const d = GEAR_PATHS[i];
    const { cx, cy, width: pathWidth } = measurePath(d);

    if (scaleRatio === undefined) scaleRatio = 200 / pathWidth;
    const scaledWidth = pathWidth * scaleRatio;
    const teeth = teethCounts[i];
    const diametralPitch = (teeth + 2) / scaledWidth;
    const pitchDiameter = scaledWidth - 2 / diametralPitch;

    const assemblyEl = svgEl<SVGGElement>('g');

    // Rotation lives on its own element so it can be a declarative Web
    // Animation instead of a per-frame transform rewrite. The composition
    // is unchanged from the old attribute string
    // `rotate(deg) scale(s) translate(-cx,-cy)`: spinEl supplies the
    // rotate, wrapEl the static scale + translate.
    //
    // transform-box/transform-origin are set explicitly so the rotation
    // pivots on this group's own local origin, matching SVG's rotate()
    // with no centre argument. Verified against the attribute form across
    // several translations, rotations and scales — the browser defaults
    // happen to agree today, but only the explicit pair is guaranteed.
    const spinEl = svgEl<SVGGElement>('g');
    spinEl.style.transformBox = 'view-box';
    spinEl.style.transformOrigin = '0 0';

    const wrapEl = svgEl<SVGGElement>('g', {
      transform: `scale(${scaleRatio}) translate(${-cx},${-cy})`,
    });

    const gearClass = `anim-gear-${i + 1}`;
    const pathEl = svgEl<SVGPathElement>('path', {
      d,
      class: gearClass,
      fill: 'transparent',
      'stroke-width': 5,
      opacity: 0.7,
    });

    const circleEl = svgEl<SVGCircleElement>('circle', {
      cx: '0', cy: '0',
      r: String((scaledWidth - 60) / 2),
      class: gearClass,
      fill: 'transparent',
      'stroke-width': '15',
    });

    wrapEl.appendChild(pathEl);
    spinEl.appendChild(wrapEl);
    assemblyEl.appendChild(spinEl);
    assemblyEl.appendChild(circleEl);
    group.appendChild(assemblyEl);

    // Angular velocities for precise gear meshing. Base gear (gear 0)
    // rotates at 15°/s; the others are geared down by their teeth ratio
    // and turn the other way.
    const baseDegPerSecond = 15;
    let degPerSecond = baseDegPerSecond;
    let direction = 1;

    if (i === 1) {
      degPerSecond = baseDegPerSecond * (18 / 36);
      direction = -1;
    } else if (i === 2) {
      degPerSecond = baseDegPerSecond * (18 / 52);
      direction = -1;
    }

    gears.push({
      assemblyEl, spinEl, wrapEl, pathEl, circleEl,
      teeth, diametralPitch, pitchDiameter, scaledWidth,
      degPerSecond, direction,
    });
  }

  function spin() {
    for (const gear of gears) {
      // One full turn per (360 / °-per-second) seconds, linear and
      // endless — exactly what the old requestAnimationFrame loop
      // integrated by hand, minus the per-frame main-thread work.
      const animation = gear.spinEl.animate(
        [{ transform: 'rotate(0deg)' }, { transform: `rotate(${360 * gear.direction}deg)` }],
        { duration: (360 / gear.degPerSecond) * 1000, iterations: Infinity, easing: 'linear' }
      );
      spins.push(animation);
    }
  }

  function place() {
    const [g0, g1, g2] = gears;

    // Calculate positions with gear 1 at origin
    const ox1 = 0, y1 = 547.5;
    const ox0 = ox1 + ((g1.pitchDiameter + g0.pitchDiameter) / 2) * Math.cos(-(5 * (360 / 36)) * (Math.PI / 180));
    const y0 = y1 + ((g1.pitchDiameter + g0.pitchDiameter) / 2) * Math.sin(-(5 * (360 / 36)) * (Math.PI / 180));
    const ox2 = ox0 + ((g2.pitchDiameter + g0.pitchDiameter) / 2) * Math.cos((13 * (360 / 18) - 0.25) * (Math.PI / 180));
    const y2 = y0 + ((g2.pitchDiameter + g0.pitchDiameter) / 2) * Math.sin((13 * (360 / 18) - 0.25) * (Math.PI / 180));

    // Find the rightmost edge across all gears
    const rightEdge = Math.max(
      ox1 + g1.scaledWidth / 2,
      ox0 + g0.scaledWidth / 2,
      ox2 + g2.scaledWidth / 2,
    );

    // Offset so rightmost edge aligns with container right edge
    const offset = width - rightEdge;
    const x1 = ox1 + offset;
    const x0 = ox0 + offset;
    const x2 = ox2 + offset;

    g1.assemblyEl.setAttribute('transform', `translate(${x1},${y1})`);
    g0.assemblyEl.setAttribute('transform', `translate(${x0},${y0})`);
    g2.assemblyEl.setAttribute('transform', `translate(${x2},${y2})`);
  }

  return {
    animate(frameCount: number, startFrame: number, endFrame: number) {
      if (frameCount < startFrame || frameCount > endFrame) return;
      if (gears.length !== GEAR_PATHS.length) {
        for (let i = 0; i < GEAR_PATHS.length; i++) create(i);
        place();
        spin();
      }
    },
    destroy() {
      for (const animation of spins) animation.cancel();
      spins.length = 0;
      for (const g of gears) g.assemblyEl.remove();
      gears.length = 0;
      scaleRatio = undefined;
    },
  };
}
