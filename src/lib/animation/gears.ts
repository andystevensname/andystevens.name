import { svgEl, SVG_NS } from './svg.js';

interface GearInfo {
  assemblyEl: SVGGElement;
  wrapEl: SVGGElement;
  pathEl: SVGPathElement;
  circleEl: SVGCircleElement;
  teeth: number;
  diametralPitch: number;
  pitchDiameter: number;
  rotation: number;
  cx: number;
  cy: number;
  scaleRatio: number;
}

export function createGears(canvas: SVGSVGElement, group: SVGGElement, gearsContainer: Element) {
  const colors = ['#D500F9', '#00B0FF', '#FF1744'];
  const teethCounts = [18, 36, 52];
  const gears: GearInfo[] = [];
  const pinionStep = 0.25;
  let scaleRatio: number | undefined;

  function measurePath(d: string) {
    const tmp = document.createElementNS(SVG_NS, 'path') as SVGPathElement;
    tmp.setAttribute('d', d);
    tmp.setAttribute('visibility', 'hidden');
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
    const pathEl = document.createElementNS(SVG_NS, 'path') as SVGPathElement;
    pathEl.setAttribute('d', d);
    pathEl.setAttribute('fill', 'transparent');
    pathEl.setAttribute('stroke', colors[i]);
    pathEl.setAttribute('stroke-width', '5');
    pathEl.setAttribute('opacity', '0.7');

    const circleEl = svgEl<SVGCircleElement>('circle', {
      cx: '0', cy: '0',
      r: String((scaledWidth - 60) / 2),
      fill: 'transparent',
      stroke: colors[i],
      'stroke-width': '15',
    });

    wrapEl.appendChild(pathEl);
    assemblyEl.appendChild(wrapEl);
    assemblyEl.appendChild(circleEl);
    group.appendChild(assemblyEl);

    const gear: GearInfo = {
      assemblyEl, wrapEl, pathEl, circleEl,
      teeth, diametralPitch, pitchDiameter,
      rotation: 0, cx, cy, scaleRatio,
    };
    applyGearTransform(gear);
    gears.push(gear);
  }

  function place() {
    const [g0, g1, g2] = gears;
    const x1 = 50, y1 = 547.5;
    g1.assemblyEl.setAttribute('transform', `translate(${x1},${y1})`);

    const x0 = x1 + ((g1.pitchDiameter + g0.pitchDiameter) / 2) * Math.cos(-(5 * (360 / 36)) * (Math.PI / 180));
    const y0 = y1 + ((g1.pitchDiameter + g0.pitchDiameter) / 2) * Math.sin(-(5 * (360 / 36)) * (Math.PI / 180));
    g0.assemblyEl.setAttribute('transform', `translate(${x0},${y0})`);

    const x2 = x0 + ((g2.pitchDiameter + g0.pitchDiameter) / 2) * Math.cos((13 * (360 / 18) - 0.25) * (Math.PI / 180));
    const y2 = y0 + ((g2.pitchDiameter + g0.pitchDiameter) / 2) * Math.sin((13 * (360 / 18) - 0.25) * (Math.PI / 180));
    g2.assemblyEl.setAttribute('transform', `translate(${x2},${y2})`);
  }

  return {
    animate(frameCount: number, startFrame: number, endFrame: number) {
      if (frameCount < startFrame || frameCount > endFrame) return;
      if (gears.length !== gearsContainer.children.length) {
        for (let i = 0; i < gearsContainer.children.length; i++) create(i, gearsContainer.children[i]);
        place();
      }

      const pinionRPM = pinionStep * 60 * 60;

      gears[0].rotation += pinionStep * (Math.PI / 180);
      if (gears[0].rotation >= Math.PI * 2) gears[0].rotation = 0;
      applyGearTransform(gears[0]);

      const gear1Step = (pinionRPM * gears[0].teeth) / gears[1].teeth / 60 / 60;
      gears[1].rotation -= gear1Step * (Math.PI / 180);
      if (gears[1].rotation <= -(Math.PI * 2)) gears[1].rotation = 0;
      applyGearTransform(gears[1]);

      const gear2Step = (pinionRPM * gears[0].teeth) / gears[2].teeth / 60 / 60;
      gears[2].rotation -= gear2Step * (Math.PI / 180);
      if (gears[2].rotation <= -(Math.PI * 2)) gears[2].rotation = 0;
      applyGearTransform(gears[2]);
    },
    destroy() {
      for (const g of gears) g.assemblyEl.remove();
      gears.length = 0;
      scaleRatio = undefined;
    },
  };
}
