'use strict';

(() => {
  const film = document.querySelector('[data-office-replay]');
  if (!film) return;
  const video = film.querySelector('video');
  const stage = film.querySelector('.replay-stage');
  const toggle = film.querySelector('[data-replay-toggle]');
  const fullscreen = film.querySelector('[data-replay-fullscreen]');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const caption = film.querySelector('[data-replay-caption]');
  let scenes = [];
  let currentScene = -1;
  let requestedScene = '';
  let frame = 0;
  let animation;
  let started = false;
  const decodedFrames = typeof video.requestVideoFrameCallback === 'function';

  function showScene(scene, index, layout) {
    currentScene = index;
    film.classList.toggle('has-intro', layout === 'intro');
    film.classList.toggle('has-plan', layout === 'plan');
    film.classList.toggle('has-generating', layout === 'generating');
    film.classList.toggle('has-evidence', layout === 'evidence');
    film.classList.toggle('has-failure', scene.outcome === 'failed');
    film.querySelector('[data-replay-step]').textContent = scene.label;
    film.querySelector('[data-replay-title]').textContent = scene.title;
    film.querySelector('[data-replay-copy]').textContent = scene.copy;
    sizePicture();
  }
  function changeScene(scene, index, layout) {
    const key = `${index}:${layout}`;
    if (key === requestedScene && !(video.paused && currentScene !== index)) return;
    requestedScene = key;
    animation?.cancel();
    const reveal = () => {
      if (requestedScene !== key) return;
      animation?.cancel();
      showScene(scene, index, layout);
      animation = motion.matches ? null : caption.animate(
        [{opacity: 0}, {opacity: 1}],
        {duration: 600, easing: 'cubic-bezier(.22,1,.36,1)'}
      );
    };
    // Hide the old caption before changing its dimensions or position. This
    // avoids a visible relocation when a planner or review window opens.
    if (!video.paused && !motion.matches && currentScene >= 0) {
      animation = caption.animate([{opacity: 1}, {opacity: 0}],
        {duration: 160, fill: 'forwards'});
      animation.finished.then(reveal).catch(() => {});
    } else reveal();
  }
  function render(time = video.currentTime) {
    let index = 0;
    scenes.forEach((scene, i) => { if (time >= scene.start) index = i; });
    const scene = scenes[index];
    if (scene && video.readyState >= 2) {
      let layout = scene.evidence_from != null && time >= scene.evidence_from ? 'evidence' : scene.layout;
      (scene.layout_changes || []).forEach(change => { if (time >= change.at) layout = change.layout; });
      changeScene(scene, index, layout);
    }
    film.querySelector('[data-replay-progress]').style.width = `${100 * Math.min(1, time / (video.duration || 1))}%`;
  }
  function scheduleFrame() {
    if (frame || video.paused) return;
    frame = decodedFrames ? video.requestVideoFrameCallback((_, info) => {
      frame = 0; render(info.mediaTime); scheduleFrame();
    }) : requestAnimationFrame(() => {
      frame = 0; render(); scheduleFrame();
    });
  }
  function cancelFrame() {
    if (frame) decodedFrames ? video.cancelVideoFrameCallback(frame) : cancelAnimationFrame(frame);
    frame = 0;
  }
  function sizePicture() {
    const bounds = stage.getBoundingClientRect();
    const aspect = video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 16 / 9;
    const width = Math.min(bounds.width, bounds.height * aspect);
    const height = width / aspect;
    stage.style.setProperty('--office-picture-width', `${width}px`);
    stage.style.setProperty('--office-picture-height', `${height}px`);
    stage.style.setProperty('--office-picture-left', `${(bounds.width - width) / 2}px`);
    stage.style.setProperty('--office-picture-top', `${(bounds.height - height) / 2}px`);
  }
  function update() { toggle.textContent = video.paused ? 'Play demo' : 'Pause demo'; }
  function play() { started = true; video.play().catch(update); }

  toggle.hidden = false;
  toggle.addEventListener('click', () => video.paused ? play() : video.pause());
  fullscreen.hidden = !document.fullscreenEnabled;
  fullscreen.addEventListener('click', () => {
    const request = document.fullscreenElement ? document.exitFullscreen() : stage.requestFullscreen();
    request.catch(() => {});
  });
  document.addEventListener('fullscreenchange', () => {
    fullscreen.textContent = document.fullscreenElement === stage ? 'Exit full screen' : 'Full screen';
    sizePicture();
  });
  window.addEventListener('resize', sizePicture);
  video.addEventListener('loadedmetadata', sizePicture);
  video.addEventListener('play', () => { started = true; update(); scheduleFrame(); });
  video.addEventListener('pause', () => { update(); cancelFrame(); render(); });
  ['timeupdate', 'seeked', 'loadedmetadata', 'loadeddata', 'canplay'].forEach(event => video.addEventListener(event, () => {
    if (video.paused || !decodedFrames) render();
  }));
  video.addEventListener('error', () => { toggle.hidden = true; film.querySelector('[data-replay-error]').hidden = false; });
  motion.addEventListener('change', () => { if (motion.matches) {video.pause(); animation?.cancel();} });
  document.addEventListener('visibilitychange', () => { if (document.hidden) video.pause(); });
  fetch(film.dataset.scenes, {cache: 'no-cache'}).then(response => {
    if (!response.ok) throw new Error('Captions unavailable');
    return response.json();
  }).then(data => { scenes = data.scenes; render(); }).catch(() => {});

  if ('IntersectionObserver' in window) new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) video.pause();
    else if (!started && !motion.matches && !navigator.connection?.saveData && !document.hidden) play();
  }, {threshold: .35}).observe(video);
})();
