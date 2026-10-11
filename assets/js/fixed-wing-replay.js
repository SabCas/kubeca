'use strict';

(() => {
  const film = document.querySelector('[data-fixed-wing-replay]');
  if (!film) return;

  const video = film.querySelector('video');
  const toggle = film.querySelector('[data-replay-toggle]');
  const fullscreen = film.querySelector('[data-replay-fullscreen]');
  const stage = film.querySelector('.replay-stage');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const caption = film.querySelector('[data-replay-caption]');
  const title = film.querySelector('[data-replay-title]');
  const copy = film.querySelector('[data-replay-copy]');
  const step = film.querySelector('[data-replay-step]');
  const progress = film.querySelector('[data-replay-progress]');
  const scenes = [
    [0, '01 / Automatic navigation', 'Navigation runs automatically.', 'Navigation and satellite matching run automatically.'],
    [5, '02 / Onboard imagery', 'See what the aircraft sees.', 'Onboard imagery supports automatic satellite matching.'],
    [10, '03 / Optional review', 'Inspect a match if needed.', 'Opening the comparison is optional. Matching runs automatically.'],
    [15.8, '04 / Optional comparison', 'Review camera and satellite.', 'Use recorded imagery and diagnostic links for optional visual inspection.'],
    [21.6, '05 / Overlay', 'Blend images for optional review.', 'Adjust opacity to inspect the automatic match.'],
    [26.5, '06 / Original frame', 'Inspect the original frame.', 'An optional view of the camera image and its satellite crop.'],
    [30.7, '07 / Automatic operation', 'Automatic matching continues.', 'Normal operation needs no comparison window.'],
  ];
  let started = false;
  let currentScene = 0;
  let animation = null;
  let frame = 0;

  function render() {
    const time = video.currentTime;
    let nextScene = 0;
    scenes.forEach((scene, index) => { if (time >= scene[0]) nextScene = index; });
    if (nextScene !== currentScene) {
      currentScene = nextScene;
      const [, label, heading, description] = scenes[nextScene];
      step.textContent = label;
      title.textContent = heading;
      copy.textContent = description;
      animation?.cancel();
      if (!motion.matches) animation = caption.animate(
        [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 600, easing: 'cubic-bezier(.22,1,.36,1)' }
      );
    }
    film.classList.toggle('has-comparison', time >= 15.1 && time < 30.05);
    progress.style.width = `${100 * Math.min(1, time / (video.duration || 35))}%`;
  }

  function tick() {
    render();
    frame = video.paused ? 0 : window.requestAnimationFrame(tick);
  }

  function update() {
    toggle.textContent = video.paused ? 'Play replay' : 'Pause replay';
  }

  function play() {
    started = true;
    video.play().catch(update);
  }

  toggle.hidden = false;
  toggle.addEventListener('click', () => video.paused ? play() : video.pause());
  fullscreen.hidden = !document.fullscreenEnabled;
  fullscreen.addEventListener('click', () => {
    const request = document.fullscreenElement ? document.exitFullscreen() : stage.requestFullscreen();
    request.catch(() => {});
  });
  document.addEventListener('fullscreenchange', () => {
    fullscreen.textContent = document.fullscreenElement ? 'Exit full screen' : 'Full screen';
  });
  video.addEventListener('play', () => {
    started = true;
    update();
    if (!frame) frame = window.requestAnimationFrame(tick);
  });
  video.addEventListener('pause', () => { update(); window.cancelAnimationFrame(frame); frame = 0; render(); });
  video.addEventListener('timeupdate', render);
  video.addEventListener('seeked', render);
  video.addEventListener('loadedmetadata', render);
  video.addEventListener('error', () => {
    toggle.hidden = true;
    film.querySelector('[data-replay-error]').hidden = false;
  });
  motion.addEventListener('change', () => {
    if (motion.matches) { video.pause(); animation?.cancel(); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) video.pause(); });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) video.pause();
      else if (!started && !motion.matches && !navigator.connection?.saveData && !document.hidden) play();
    }, { threshold: .35 }).observe(video);
  }
})();
