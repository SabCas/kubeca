'use strict';

// Enlarge the real C2 screenshot; ordinary image links work without JavaScript.
(() => {
  const dialog = document.querySelector('.c2-gallery-dialog');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const preview = dialog.querySelector('img');
  const caption = dialog.querySelector('#c2-gallery-caption');
  const original = dialog.querySelector('.c2-gallery-original');

  document.querySelectorAll('.c2-showcase-screen[data-gallery-image]').forEach((link) => {
    link.addEventListener('click', (event) => {
      // Keep ordinary image links available for new tabs and browsers without dialogs.
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      preview.src = link.href;
      preview.alt = link.querySelector('img').alt;
      const isInterface = link.classList.contains('c2-showcase-screen');
      dialog.classList.toggle('c2-gallery-dialog-interface', isInterface);
      if (original) {
        original.hidden = !isInterface;
        original.href = link.href;
      }
      const label = link.closest('figure').querySelector('figcaption');
      caption.textContent = `${label.firstChild.textContent.trim()} · ${label.querySelector('small').textContent}`;
      dialog.showModal();
      document.documentElement.classList.add('c2-gallery-open');
    });
  });

  dialog.querySelector('.c2-gallery-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('c2-gallery-open');
  });
})();
