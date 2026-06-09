import { svgEl } from './svg.js';

interface GearInfo {
  assemblyEl: SVGGElement;
  wrapEl: SVGGElement;
  pathEl: SVGPathElement;
  circleEl: SVGCircleElement;
  teeth: number;
  diametralPitch: number;
  pitchDiameter: number;
  scaledWidth: number;
  rotation: number;
  cx: number;
  cy: number;
  scaleRatio: number;
  angularVelocity: number;
  direction: number;
}

export function createGears(canvas: SVGSVGElement, group: SVGGElement, gearsContainer: Element, width = 400) {
  const teethCounts = [18, 36, 52];
  const gears: GearInfo[] = [];
  let scaleRatio: number | undefined;
  let animationFrameId: number | null = null;
  let lastTimestamp: number | null = null;

  function measurePath(d: string) {
    const tmp = svgEl<SVGPathElement>('path', { d, visibility: 'hidden' });
    canvas.appendChild(tmp);
    const box = tmp.getBBox();
    canvas.removeChild(tmp);
    return { cx: box.x + box.width / 2, cy: box.y + box.height / 2, width: box.width };
  }

  function applyGearTransform(gear: GearInfo) {
    const deg = gear.rotation * (180 / Math.PI);
    gear.wrapEl.setAttribute(
      'transform',
      `rotate(${deg}) scale(${gear.scaleRatio}) translate(${-gear.cx},${-gear.cy})`
    );
  }

  function create(i: number, svgSource: Element) {
    const d = svgSource.querySelector('path')!.getAttribute('d')!;
    const { cx, cy, width } = measurePath(d);

    if (scaleRatio === undefined) scaleRatio = 200 / width;
    const scaledWidth = width * scaleRatio;
    const teeth = teethCounts[i];
    const diametralPitch = (teeth + 2) / scaledWidth;
    const pitchDiameter = scaledWidth - 2 / diametralPitch;

    const assemblyEl = svgEl<SVGGElement>('g');
    const wrapEl = svgEl<SVGGElement>('g');
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
    assemblyEl.appendChild(wrapEl);
    assemblyEl.appendChild(circleEl);
    group.appendChild(assemblyEl);

    // Calculate angular velocities for precise gear meshing
    // Base gear (gear 0) rotates at 15°/s
    const baseAngularVelocity = (15 * Math.PI) / 180; // 15°/s in radians
    let angularVelocity = baseAngularVelocity;
    let direction = 1;

    // Gear ratios based on teeth count
    if (i === 1) {
      // Gear 1 (36 teeth): half speed, opposite direction
      angularVelocity = baseAngularVelocity * (18 / 36);
      direction = -1;
    } else if (i === 2) {
      // Gear 2 (52 teeth): 18/52 speed, opposite direction
      angularVelocity = baseAngularVelocity * (18 / 52);
      direction = -1;
    }

    const gear: GearInfo = {
      assemblyEl, wrapEl, pathEl, circleEl,
      teeth, diametralPitch, pitchDiameter, scaledWidth,
      rotation: 0, cx, cy, scaleRatio,
      angularVelocity, direction
    };
    applyGearTransform(gear);
    gears.push(gear);
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

  function animateGears(timestamp: number) {
    // Advance by the real elapsed time, not a fixed 1/60 step, so gears
    // rotate at the same wall-clock speed regardless of display refresh
    // rate (the previous SMIL animation was duration-based and therefore
    // refresh-rate-independent — preserve that property here).
    if (lastTimestamp === null) lastTimestamp = timestamp;
    const dt = (timestamp - lastTimestamp) / 1000; // seconds
    lastTimestamp = timestamp;

    for (const gear of gears) {
      // angularVelocity is in radians/second
      gear.rotation += gear.angularVelocity * gear.direction * dt;
      applyGearTransform(gear);
    }

    animationFrameId = requestAnimationFrame(animateGears);
  }

  return {
    animate(frameCount: number, startFrame: number, endFrame: number) {
      if (frameCount < startFrame || frameCount > endFrame) return;
      if (gears.length !== gearsContainer.children.length) {
        for (let i = 0; i < gearsContainer.children.length; i++) create(i, gearsContainer.children[i]);
        place();

        // Start the animation loop
        if (!animationFrameId) {
          animationFrameId = requestAnimationFrame(animateGears);
        }
      }
    },
    destroy() {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      lastTimestamp = null;
      for (const g of gears) g.assemblyEl.remove();
      gears.length = 0;
      scaleRatio = undefined;
    },
  };
}
