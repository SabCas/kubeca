'use strict';

(() => {
  const preview = document.querySelector('[data-c2-input-preview]');
  const command = preview?.querySelector('[data-c2-command]');
  if (!command) return;

  const example = command.textContent.trim();
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let started = false;
  let frame = 0;
  let observer = null;

  function finish() {
    window.cancelAnimationFrame(frame);
    command.textContent = example;
    preview.dataset.typingState = 'complete';
    observer?.disconnect();
  }

  function type() {
    if (motion.matches || preview.dataset.typingState === 'complete') {
      finish();
      return;
    }
    const beginning = performance.now() + 400;
    let lastLength = -1;
    preview.dataset.typingState = 'typing';
    function tick(now) {
      const progress = Math.max(0, Math.min(1, (now - beginning) / 2800));
      const length = Math.floor(progress * example.length);
      if (length !== lastLength) {
        command.textContent = example.slice(0, length);
        lastLength = length;
      }
      if (progress < 1) frame = window.requestAnimationFrame(tick);
      else finish();
    }
    frame = window.requestAnimationFrame(tick);
  }

  motion.addEventListener('change', () => { if (motion.matches) finish(); });
  if (motion.matches || !('IntersectionObserver' in window)) {
    finish();
    return;
  }
  command.textContent = '';
  preview.dataset.typingState = 'waiting';
  observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting || entry.intersectionRatio < .6 || started) return;
    started = true;
    observer.disconnect();
    const image = preview.querySelector('img');
    Promise.resolve(image?.decode()).catch(() => {}).then(type);
  }, { threshold: .6 });
  observer.observe(preview);
})();
