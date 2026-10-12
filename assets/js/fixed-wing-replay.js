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
  const introDuration = 3;
  const scenes = [
    [0, 'KUBECA / Fixed-wing demonstration', 'Visual navigation.', 'Automatic matching. Optional review.'],
    ...[
    [0, '01 / Automatic navigation', 'Navigation runs automatically.', 'Navigation and satellite matching run automatically.'],
    [5, '02 / Onboard imagery', 'See what the aircraft sees.', 'Onboard imagery supports automatic satellite matching.'],
    [10, '03 / Optional review', 'Inspect a match if needed.', 'Opening the comparison is optional. Matching runs automatically.'],
    [15.8, '04 / Optional comparison', 'Review camera and satellite.', 'Use recorded imagery and diagnostic links for optional visual inspection.'],
    [21.6, '05 / Overlay', 'Blend images for optional review.', 'Adjust opacity to inspect the automatic match.'],
    [26.5, '06 / Original frame', 'Inspect the original frame.', 'An optional view of the camera image and its satellite crop.'],
    [30.7, '07 / Automatic operation', 'Automatic matching continues.', 'Normal operation needs no comparison window.'],
    ].map(([time, ...text]) => [time + introDuration, ...text]),
  ];
  let currentScene = -1;
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
      if (!motion.matches && !video.paused) animation = caption.animate(
        [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 600, easing: 'cubic-bezier(.22,1,.36,1)' }
      );
    }
    const isIntro = time < introDuration;
    if (film.classList.contains('has-intro') !== isIntro) {
      film.classList.toggle('has-intro', isIntro);
      sizePicture();
    }
    const flightTime = time - introDuration;
    film.classList.toggle('has-comparison', flightTime >= 15.1 && flightTime < 30.05);
    progress.style.width = `${100 * Math.min(1, time / (video.duration || 38))}%`;
  }

  function sizePicture() {
    const bounds = stage.getBoundingClientRect();
    let width, height, left, top;
    if (document.fullscreenElement === stage) {
      const aspect = video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 16 / 9;
      width = Math.min(bounds.width, bounds.height * aspect);
      height = width / aspect;
      left = (bounds.width - width) / 2;
      top = (bounds.height - height) / 2;
    } else {
      const picture = video.getBoundingClientRect();
      width = picture.width;
      height = picture.height;
      left = picture.left - bounds.left - stage.clientLeft;
      top = picture.top - bounds.top - stage.clientTop;
    }
    stage.style.setProperty('--fixed-wing-picture-width', `${width}px`);
    stage.style.setProperty('--fixed-wing-picture-height', `${height}px`);
    stage.style.setProperty('--fixed-wing-picture-left', `${left}px`);
    stage.style.setProperty('--fixed-wing-picture-top', `${top}px`);
  }

  function tick() {
    render();
    frame = video.paused ? 0 : window.requestAnimationFrame(tick);
  }

  function update() {
    const cover = video.paused && video.currentTime < introDuration;
    film.classList.toggle('has-cover', cover);
    toggle.hidden = !cover;
    video.controls = !cover;
    fullscreen.hidden = !document.fullscreenEnabled || (cover && document.fullscreenElement !== stage);
    fullscreen.setAttribute('aria-label', document.fullscreenElement === stage ? 'Exit full screen' : 'Full screen');
  }

  function play() {
    video.play().catch(update);
  }

  toggle.addEventListener('click', play);
  fullscreen.addEventListener('click', () => {
    const request = document.fullscreenElement ? document.exitFullscreen() : stage.requestFullscreen();
    request.catch(() => {});
  });
  document.addEventListener('fullscreenchange', () => {
    update();
    sizePicture();
  });
  window.addEventListener('resize', sizePicture);
  video.addEventListener('loadedmetadata', sizePicture);
  video.addEventListener('play', () => {
    update();
    if (!frame) frame = window.requestAnimationFrame(tick);
  });
  video.addEventListener('pause', () => { update(); window.cancelAnimationFrame(frame); frame = 0; render(); });
  ['timeupdate', 'seeked', 'loadedmetadata'].forEach(event => video.addEventListener(event, () => { update(); render(); }));
  video.addEventListener('ended', update);
  video.addEventListener('error', () => {
    toggle.hidden = true;
    film.querySelector('[data-replay-error]').hidden = false;
  });
  motion.addEventListener('change', () => {
    if (motion.matches) { video.pause(); animation?.cancel(); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) video.pause(); });

  sizePicture();
  update();
  render();

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) video.pause();
    }, { threshold: .35 }).observe(video);
  }
})();
