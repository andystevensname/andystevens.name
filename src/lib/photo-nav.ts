// Abort previous page-load's listeners (especially the keydown listener
// on document, which otherwise accumulates across photo-page navigations
// and fires N clicks per arrow-key press).
let photoNavController: AbortController | null = null;

document.addEventListener('astro:page-load', async () => {
  photoNavController?.abort();
  photoNavController = new AbortController();
  const { signal } = photoNavController;

  // Caption drawer (runs on all photo pages)
  const caption = document.querySelector('.photo-caption') as HTMLElement | null;
  const toggle = document.querySelector('.photo-caption-toggle') as HTMLButtonElement | null;
  if (caption && toggle) {
    const textContent = caption.querySelector('.photo-caption-text') as HTMLElement | null;
    if (textContent && textContent.scrollHeight > caption.clientHeight) {
      toggle.style.display = '';

      const collapsedHeight = caption.clientHeight;

      function toggleCaption() {
        caption!.toggleAttribute('data-expanded');
        const expanded = caption!.hasAttribute('data-expanded');
        if (expanded) {
          caption!.style.height = 'auto';
          const expandedHeight = Math.min(caption!.scrollHeight, window.innerHeight * 0.33);
          caption!.style.height = expandedHeight + 'px';
          caption!.style.top = -(expandedHeight - collapsedHeight) + 'px';
        } else {
          caption!.style.height = '';
          caption!.style.top = '';
        }
        toggle!.setAttribute('aria-label', expanded ? 'Collapse caption' : 'Expand caption');
      }

      toggle.addEventListener('click', toggleCaption, { signal });

      // Swipe up/down on caption to expand/collapse
      let captionStartY = 0;
      caption.addEventListener('touchstart', (e: TouchEvent) => {
        captionStartY = e.touches[0].clientY;
      }, { passive: true, signal });
      caption.addEventListener('touchend', (e: TouchEvent) => {
        const dy = e.changedTouches[0].clientY - captionStartY;
        if (Math.abs(dy) < 30) return;
        if (dy < 0 && !caption!.hasAttribute('data-expanded')) toggleCaption();
        if (dy > 0 && caption!.hasAttribute('data-expanded')) toggleCaption();
      }, { signal });
    }
  }

  // Album navigation (only when ?album= param is present)
  const nav = document.getElementById('photo-nav') as HTMLElement | null;
  const prevLink = document.getElementById('photo-prev') as HTMLAnchorElement | null;
  const nextLink = document.getElementById('photo-next') as HTMLAnchorElement | null;
  const counter = document.getElementById('photo-counter') as HTMLElement | null;
  const viewer = document.getElementById('photo-viewer') as HTMLElement | null;
  const albumLink = document.getElementById('photo-album') as HTMLAnchorElement | null;
  const albumTitle = document.getElementById('photo-album-title') as HTMLElement | null;
  if (!nav || !prevLink || !nextLink || !counter || !viewer || !albumLink || !albumTitle) return;

  const params = new URLSearchParams(window.location.search);
  const albumSlug = params.get('album');
  if (!albumSlug) return;

  const cacheKey = `album-photos-${albumSlug}`;
  const currentSlug = window.location.pathname.replace(/^\/photos\//, '').replace(/\/$/, '');

  async function loadAlbumData(): Promise<{ photos: string[]; title: string }> {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);

    try {
      const res = await fetch(`/albums/${albumSlug}.json`);
      if (!res.ok) return { photos: [], title: '' };
      const data = await res.json();
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
      return data;
    } catch {
      return { photos: [], title: '' };
    }
  }

  const { photos, title } = await loadAlbumData();

  // If the user navigated away while the fetch was in flight, the
  // signal is aborted and our DOM references are stale. Bail out rather
  // than mutate detached elements.
  if (signal.aborted) return;
  if (photos.length < 2) return;

  const idx = photos.indexOf(currentSlug);
  if (idx === -1) return;

  const prevIdx = idx > 0 ? idx - 1 : photos.length - 1;
  const nextIdx = idx < photos.length - 1 ? idx + 1 : 0;

  albumLink.href = `/albums/${albumSlug}/`;
  albumTitle.textContent = title;
  prevLink.href = `/photos/${photos[prevIdx]}/?album=${albumSlug}`;
  nextLink.href = `/photos/${photos[nextIdx]}/?album=${albumSlug}`;
  counter.textContent = `${idx + 1} / ${photos.length}`;
  nav.style.display = '';

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') prevLink.click();
    if (e.key === 'ArrowRight') nextLink.click();
  }, { signal });

  let startX = 0;
  let startY = 0;
  viewer.addEventListener('touchstart', (e: TouchEvent) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true, signal });
  viewer.addEventListener('touchend', (e: TouchEvent) => {
    const touch = e.changedTouches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
    if (dx > 0) prevLink.click();
    else nextLink.click();
  }, { signal });
});
