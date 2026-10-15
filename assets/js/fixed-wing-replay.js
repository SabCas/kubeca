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
  const captionText = window.KubecaReplayCaptions?.create(film);
  const introDuration = 1.68;
  const scenes = [
    [0, 'KUBECA / Fixed-wing demonstration', 'Visual navigation.', 'Automatic navigation. Optional review.'],
    [1.68, 'Recorded replay', 'Automatic visual navigation.', 'Trajectory and onboard imagery.'],
    [7.4, 'Visual anchor check', 'Checking is optional.', 'Review the visual anchor when needed.'],
    [12.76, 'Recorded replay', 'The flight continues.', 'Automatic navigation continues.'],
  ];
  let currentScene = -1;
  let animation = null;
  let outgoingAnimation = null;
  let outgoingCaption = null;
  let frame = 0;

  function clearFades() {
    animation?.cancel();
    outgoingAnimation?.cancel();
    outgoingCaption?.remove();
    outgoingCaption = null;
  }

  function snapshotCaption() {
    const ghost = caption.cloneNode(true);
    const bounds = caption.getBoundingClientRect();
    const parent = stage.getBoundingClientRect();
    const originals = [caption, ...caption.querySelectorAll('*')];
    const copies = [ghost, ...ghost.querySelectorAll('*')];
    originals.forEach((original, index) => {
      const styles = getComputedStyle(original);
      const node = copies[index];
      // Freeze the outgoing layout before the intro or review classes change.
      for (const property of ['font', 'line-height', 'letter-spacing', 'color', 'margin',
        'padding', 'border', 'border-left', 'background', 'backdrop-filter', 'box-shadow', 'display', 'width', 'height']) {
        node.style.setProperty(property, styles.getPropertyValue(property));
      }
      [...node.attributes].forEach(attribute => {
        if (attribute.name.startsWith('data-replay-')) node.removeAttribute(attribute.name);
      });
    });
    Object.assign(ghost.style, {
      position: 'absolute', left: `${bounds.left - parent.left - stage.clientLeft}px`,
      top: `${bounds.top - parent.top - stage.clientTop}px`, right: 'auto', bottom: 'auto',
      width: `${bounds.width}px`, height: `${bounds.height}px`, margin: '0', opacity: '1',
      pointerEvents: 'none',
    });
    ghost.classList.add('replay-caption-fade');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.inert = true;
    stage.append(ghost);
    return ghost;
  }

  function render() {
    const time = video.currentTime;
    let nextScene = 0;
    scenes.forEach((scene, index) => { if (time >= scene[0]) nextScene = index; });
    const changed = nextScene !== currentScene;
    if (changed) {
      clearFades();
      const blend = !motion.matches && !video.paused && currentScene >= 0;
      const ghost = blend ? snapshotCaption() : null;
      currentScene = nextScene;
      const [, label, heading, description] = scenes[nextScene];
      step.textContent = label;
      title.textContent = heading;
      copy.textContent = description;
      if (ghost) {
        outgoingCaption = ghost;
        const timing = { duration: 900, easing: 'cubic-bezier(.4,0,.2,1)' };
        animation = caption.animate([{ opacity: 0 }, { opacity: 1 }], timing);
        outgoingAnimation = ghost.animate([{ opacity: 1 }, { opacity: 0 }], timing);
        outgoingAnimation.finished.then(() => {
          ghost.remove();
          if (outgoingCaption === ghost) outgoingCaption = null;
        }, () => ghost.remove());
      }
    }
    const isIntro = time < introDuration;
    if (film.classList.contains('has-intro') !== isIntro) {
      film.classList.toggle('has-intro', isIntro);
      sizePicture();
    }
    film.classList.toggle('has-comparison', time >= 7.4 && time < 12.76);
    if (changed) captionText?.reveal();
    progress.style.width = `${100 * Math.min(1, time / (video.duration || 23.12))}%`;
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
    clearFades();
    update();
    sizePicture();
  });
  window.addEventListener('resize', () => { clearFades(); sizePicture(); });
  video.addEventListener('loadedmetadata', sizePicture);
  video.addEventListener('play', () => {
    update();
    if (!frame) frame = window.requestAnimationFrame(tick);
  });
  video.addEventListener('pause', () => { clearFades(); update(); window.cancelAnimationFrame(frame); frame = 0; render(); });
  ['timeupdate', 'seeked', 'loadedmetadata'].forEach(event => video.addEventListener(event, () => { update(); render(); }));
  video.addEventListener('ended', () => {
    clearFades();
    video.pause();
    video.currentTime = 0;
    update();
    render();
    sizePicture();
  });
  video.addEventListener('error', () => {
    toggle.hidden = true;
    film.querySelector('[data-replay-error]').hidden = false;
  });
  motion.addEventListener('change', () => {
    if (motion.matches) { video.pause(); clearFades(); }
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
