// Swipe-to-dismiss for .popover-card bottom sheets via .popover-handle.
// Tracks pointer drag on the handle, translates the sheet, and snaps
// open or closed on release based on distance and velocity.

import { onPageLoad } from './page-load.js';

onPageLoad((signal) => {
  document.querySelectorAll<HTMLElement>('.popover-handle').forEach((handle) => {
    const card = handle.closest<HTMLElement>('.popover-card');
    if (!card) return;

    let startY = 0;
    let startTime = 0;
    let currentY = 0;
    let cardHeight = 0;

    handle.addEventListener('pointerdown', (e) => {
      // Only handle on mobile (handle is display:none on tablet+)
      if (getComputedStyle(handle).display === 'none') return;

      e.preventDefault();
      handle.setPointerCapture(e.pointerId);
      startY = e.clientY;
      startTime = Date.now();
      currentY = 0;
      cardHeight = card.offsetHeight;
      card.setAttribute('data-dragging', '');
    }, { signal });

    handle.addEventListener('pointermove', (e) => {
      if (!card.hasAttribute('data-dragging')) return;

      const dy = e.clientY - startY;
      // Only allow dragging down (positive dy)
      currentY = Math.max(0, dy);
      card.style.transform = `translateY(${currentY}px)`;
    }, { signal });

    handle.addEventListener('pointerup', (e) => {
      if (!card.hasAttribute('data-dragging')) return;

      card.removeAttribute('data-dragging');
      handle.releasePointerCapture(e.pointerId);

      const elapsed = Date.now() - startTime;
      const velocity = currentY / elapsed; // px/ms

      // Dismiss if dragged past 25% of sheet height or flicked fast
      if (currentY > cardHeight * 0.25 || velocity > 0.5) {
        card.style.transform = '';
        card.hidePopover();
      } else {
        // Snap back
        card.style.transform = '';
      }
    }, { signal });

    handle.addEventListener('pointercancel', () => {
      if (!card.hasAttribute('data-dragging')) return;
      card.removeAttribute('data-dragging');
      card.style.transform = '';
    }, { signal });
  });
});
