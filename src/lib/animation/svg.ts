export const SVG_NS = 'http://www.w3.org/2000/svg';

export function svgEl<T extends SVGElement>(
  tag: string,
  attrs: Record<string, string | number> = {}
): T {
  const el = document.createElementNS(SVG_NS, tag) as T;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}
