document.addEventListener('astro:page-load', () => {
  // Album navigation (only when ?album= param is present)
  const nav = document.getElementById('photo-nav');
  const prevLink = document.getElementById('photo-prev') as HTMLAnchorElement | null;
  const nextLink = document.getElementById('photo-next') as HTMLAnchorElement | null;
  const counter = document.getElementById('photo-counter');
  const viewer = document.getElementById('photo-viewer');
  const albumLink = document.getElementById('photo-album') as HTMLAnchorElement | null;
  const albumTitle = document.getElementById('photo-album-title');
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

  loadAlbumData().then(({ photos, title }) => {
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
    });

    let startX = 0;
    let startY = 0;
    viewer.addEventListener('touchstart', (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });
    viewer.addEventListener('touchend', (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
      if (dx > 0) prevLink.click();
      else nextLink.click();
    });
  });
});
