'use strict';

// Reserve the complete caption layout while revealing its letters in sequence.
(() => {
  function create(film) {
    const video = film.querySelector('video');
    const caption = film.querySelector('[data-replay-caption]');
    const fields = [...caption.querySelectorAll('[data-replay-title], [data-replay-copy]')];
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let letters = [];
    let revealed = 0;
    let signature = '';

    function finish() {
      cancelAnimationFrame(frame);
      frame = 0;
      letters.forEach(letter => { letter.style.opacity = '1'; });
      letters = [];
      caption.dataset.typing = 'complete';
    }

    function reveal(animate = !video.paused && !video.seeking, force = false) {
      const nextSignature = fields.map(field => field.textContent).join('\n');
      const changed = nextSignature !== signature;
      signature = nextSignature;
      finish();
      if (!animate || motion.matches || (!changed && !force)) return;

      fields.forEach(field => {
        if (getComputedStyle(field).display === 'none') return;
        const fragment = document.createDocumentFragment();
        field.textContent.split(/(\s+)/u).forEach(part => {
          if (!part || /^\s+$/u.test(part)) {
            fragment.append(part);
            return;
          }
          const word = document.createElement('span');
          word.className = 'replay-caption-word';
          [...part].forEach(character => {
            const letter = document.createElement('span');
            letter.className = 'replay-caption-letter';
            letter.textContent = character;
            letter.style.opacity = '0';
            word.append(letter);
            letters.push(letter);
          });
          fragment.append(word);
        });
        field.replaceChildren(fragment);
      });
      if (!letters.length) return;

      caption.dataset.typing = 'running';
      revealed = 0;
      const start = performance.now() + 80;
      const duration = Math.min(1100, Math.max(380, letters.length * 18));
      function tick(now) {
        const count = Math.min(letters.length, Math.max(0,
          Math.floor((now - start) / duration * letters.length)));
        while (revealed < count) letters[revealed++].style.opacity = '1';
        if (count === letters.length) finish();
        else frame = requestAnimationFrame(tick);
      }
      frame = requestAnimationFrame(tick);
    }

    video.addEventListener('pause', finish);
    video.addEventListener('seeking', finish);
    motion.addEventListener('change', finish);
    document.addEventListener('visibilitychange', () => { if (document.hidden) finish(); });

    // Introduce the cover once when it enters view; replay captions use scene timing.
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting || entry.intersectionRatio < .35) return;
        observer.disconnect();
        if (video.paused && video.currentTime < .1) reveal(true, true);
      }, { threshold: .35 });
      observer.observe(video);
    }
    return { reveal };
  }
  window.KubecaReplayCaptions = { create };
})();
