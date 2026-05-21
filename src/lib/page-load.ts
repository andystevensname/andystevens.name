// Runs `handler` on every Astro view-transition page load, passing a fresh
// AbortSignal. The previous load's controller is aborted first, so any
// listener registered with `{ signal }` is torn down automatically and
// won't accumulate on persistent targets (document, window, persisted
// elements) across navigations.
export function onPageLoad(handler: (signal: AbortSignal) => void): void {
  let controller: AbortController | null = null;
  document.addEventListener('astro:page-load', () => {
    controller?.abort();
    controller = new AbortController();
    handler(controller.signal);
  });
}
