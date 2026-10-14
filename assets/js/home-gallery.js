'use strict';

(() => {
  const track = document.querySelector('#home-gallery-track');
  const controls = document.querySelector('.home-gallery-controls');
  if (track && controls) {
    const cards = Array.from(track.querySelectorAll('figure'));
    const previous = controls.querySelector('[data-gallery-previous]');
    const next = controls.querySelector('[data-gallery-next]');
    const status = controls.querySelector('.home-gallery-status');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const stride = () => cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : track.clientWidth;

    const update = () => {
      const step = stride();
      const maximum = track.scrollWidth - track.clientWidth;
      controls.hidden = maximum <= 2;
      track.tabIndex = controls.hidden ? -1 : 0;
      previous.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= maximum - 2;
      const first = Math.min(cards.length, Math.round(track.scrollLeft / step) + 1);
      const visible = Math.max(1, Math.floor((track.clientWidth + parseFloat(getComputedStyle(track).columnGap) + 1) / step));
      const last = Math.min(cards.length, first + visible - 1);
      const text = `${first === last ? first : `${first}–${last}`} / ${cards.length}`;
      if (status.textContent !== text) status.textContent = text;
    };
    const move = (direction) => track.scrollBy({
      left: direction * stride(),
      behavior: reducedMotion.matches ? 'instant' : 'smooth',
    });

    previous.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    track.addEventListener('keydown', (event) => {
      if (event.target !== track || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      move(event.key === 'ArrowRight' ? 1 : -1);
    });
    let frame;
    track.addEventListener('scroll', () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    }, { passive: true });
    if (typeof ResizeObserver === 'function') new ResizeObserver(update).observe(track);
    else window.addEventListener('resize', update);
    update();
  }

  const dialog = document.querySelector('.home-gallery-dialog');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const preview = dialog.querySelector('img');
  const caption = dialog.querySelector('#home-gallery-caption');

  document.querySelectorAll('[data-gallery-image]').forEach((link) => {
    link.addEventListener('click', (event) => {
      // Keep ordinary image links available for new tabs and browsers without dialogs.
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      preview.src = link.href;
      preview.alt = link.querySelector('img').alt;
      const label = link.closest('figure').querySelector('figcaption');
      caption.textContent = `${label.firstChild.textContent.trim()} · ${label.querySelector('small').textContent}`;
      dialog.showModal();
      document.documentElement.classList.add('home-gallery-open');
    });
  });

  dialog.querySelector('.home-gallery-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('home-gallery-open');
  });
})();
