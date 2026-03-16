export function randomNumber(max: number, min: number, whole = true): number {
  if (whole) return Math.floor(Math.random() * (max - min)) + min;
  return Math.random() * (max - min) + min;
}

export function fade(
  objects: any[],
  direction: number,
  frameCount: number,
  start: number,
  end: number,
): void {
  if (frameCount >= start && frameCount <= end) {
    for (let i = 0; i < objects.length; i++) {
      if (direction === 1) {
        if (objects[i].opacity < 1) objects[i].opacity += 0.1;
        else if (objects[i].opacity > 1) objects[i].opacity = Math.floor(objects[i].opacity);
      } else {
        if (objects[i].opacity > 0) objects[i].opacity -= 0.1;
        else if (objects[i].opacity < 0) objects[i].opacity = Math.floor(objects[i].opacity);
      }
    }
  }
}

export function handleTimer(timeOut: number, frameCount: number, timerLine: any): void {
  const modulo = frameCount % timeOut;
  const pctTime = modulo / timeOut;
  const pctBar = pctTime * 130;
  timerLine.vertices[1].x = 130 - pctBar;
}
