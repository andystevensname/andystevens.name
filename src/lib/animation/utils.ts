export function randomNumber(max: number, min: number, whole = true): number {
  if (whole) return Math.floor(Math.random() * (max - min)) + min;
  return Math.random() * (max - min) + min;
}

export function fade(
  objects: SVGElement[],
  direction: number,
  frameCount: number,
  start: number,
  end: number
): void {
  if (frameCount < start || frameCount > end) return;
  for (const obj of objects) {
    const current = parseFloat(obj.getAttribute('opacity') ?? '1');
    if (direction === 1) {
      if (current < 1) obj.setAttribute('opacity', Math.min(1, current + 0.1).toFixed(2));
    } else {
      if (current > 0) obj.setAttribute('opacity', Math.max(0, current - 0.1).toFixed(2));
    }
  }
}

export function handleTimer(timeOut: number, frameCount: number, timerLine: SVGLineElement): void {
  const pctBar = ((frameCount % timeOut) / timeOut) * 130;
  timerLine.setAttribute('x2', String(130 - pctBar));
}
