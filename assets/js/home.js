'use strict';

// Scroll transitions and image motion from the approved three-point homepage.
(() => {
  const story = document.querySelector('.home-who-story');
  if (!story) return;
  const header = document.querySelector('.site-nav');
  const scenes = Array.from(story.querySelectorAll('.home-who-scene'));
  const panel = story.querySelector('.home-who-text');
  const title = document.querySelector('#story-title');
  const copy = document.querySelector('#story-copy');
  const steps = Array.from(story.querySelectorAll('.home-story-progress i'));
  const mobileCopies = Array.from(story.querySelectorAll('.mobile-story-copy'));
  const technologyLink = document.querySelector('#home-technology-link');
  const desktop = window.matchMedia('(min-width: 761px)');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let active = -1;
  let timer;
  let frame;
  let headerHeight = 0;

  function setScene(index, immediate = false) {
    if (index === active) return;
    active = index;
    clearTimeout(timer);
    const update = () => {
      title.textContent = `${String(index + 1).padStart(2, '0')} - ${scenes[index].dataset.title}`;
      copy.textContent = scenes[index].dataset.copy;
      technologyLink.hidden = desktop.matches && index !== scenes.length - 1;
      steps.forEach((step, stepIndex) => step.classList.toggle('is-active', stepIndex === index));
      panel.classList.remove('is-changing');
    };
    if (immediate || motion.matches) update();
    else {
      panel.classList.add('is-changing');
      timer = setTimeout(update, 360);
    }
  }

  function render() {
    frame = null;
    panel.inert = !desktop.matches;
    mobileCopies.forEach((mobileCopy) => { mobileCopy.inert = desktop.matches; });
    const linkParent = desktop.matches ? panel : mobileCopies[mobileCopies.length - 1];
    if (technologyLink.parentElement !== linkParent) {
      linkParent.append(technologyLink);
      technologyLink.hidden = desktop.matches && active !== scenes.length - 1;
    }
    const measuredHeader = header.getBoundingClientRect().height;
    if (headerHeight !== measuredHeader) {
      headerHeight = measuredHeader;
      document.documentElement.style.setProperty('--home-header-height', `${headerHeight}px`);
    }
    const rect = story.getBoundingClientRect();
    panel.classList.toggle('is-fixed', desktop.matches && rect.top <= headerHeight && rect.bottom > innerHeight);
    panel.classList.toggle('is-bottom', desktop.matches && rect.bottom <= innerHeight);
    const scrollable = Math.max(story.offsetHeight - innerHeight, 1);
    const progress = Math.max(0, Math.min(1, -rect.top / scrollable));
    setScene(Math.round(progress * (scenes.length - 1)));
    scenes.forEach((scene) => {
      const image = scene.querySelector('.home-who-image');
      if (motion.matches || !desktop.matches) {
        image.style.removeProperty('--story-shift');
        image.style.removeProperty('--story-scale');
        return;
      }
      const sceneRect = scene.getBoundingClientRect();
      const sceneProgress = Math.max(0, Math.min(1, (innerHeight - sceneRect.top) / (innerHeight + sceneRect.height)));
      image.style.setProperty('--story-shift', ((sceneProgress - .5) * 8).toFixed(2) + '%');
      image.style.setProperty('--story-scale', (1.12 + Math.abs(sceneProgress - .5) * .055).toFixed(3));
    });
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(render);
  }

  setScene(0, true);
  render();
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  desktop.addEventListener('change', schedule);
  motion.addEventListener('change', () => {
    const index = Math.max(0, active);
    active = -1;
    setScene(index, true);
    schedule();
  });
})();
