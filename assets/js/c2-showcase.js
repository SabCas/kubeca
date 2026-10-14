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
      link.closest('[data-c2-story]')?.dispatchEvent(new Event('c2:pause'));
      preview.src = link.href;
      preview.alt = link.querySelector('img.is-current, img:not([aria-hidden="true"])').alt;
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

// A finite, user-started story. Screenshots retain the real application's UI;
// the only animation is the presentation, never fabricated aircraft telemetry.
(() => {
  const story = document.querySelector('[data-c2-story]');
  if (!story) return;
  const shots = [...story.querySelectorAll('[data-story-shot]')];
  const chapters = [...story.querySelectorAll('[data-story-scene]')];
  const controls = story.querySelector('.c2-story-controls');
  const toggle = story.querySelector('[data-story-toggle]');
  const toggleLabel = story.querySelector('[data-story-toggle-label]');
  const icon = story.querySelector('[data-story-icon]');
  const screen = story.querySelector('.c2-showcase-screen');
  const terminal = story.querySelector('.c2-showcase-terminal');
  const title = story.querySelector('[data-story-title]');
  const description = story.querySelector('[data-story-description]');
  const figureTitle = story.querySelector('[data-story-figure-title]');
  const timeLabel = story.querySelector('[data-story-time]');
  const status = story.querySelector('[data-story-status]');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const scenes = [
    {label: 'Mission fleet', title: 'The whole mission, in view.', description: 'See two fixed-wing aircraft and three quadcopters together on one mission map.'},
    {label: 'Selected aircraft', title: 'One aircraft. The full picture.', description: 'Select a quad to see its camera and status. All five aircraft stay on the mission map.'},
    {label: 'Fixed-wing navigation', title: 'Follow progress toward the goal.', description: 'Focus on the fixed-wing group, with reported progress and an estimated time to goal.'},
  ];
  const sceneDuration = 6000;
  const duration = scenes.length * sceneDuration;
  let elapsed = 0;
  let previousTime = null;
  let frame = 0;
  let active = -1;
  let playing = false;
  let ready = false;
  let loading = false;

  function render() {
    const index = Math.min(scenes.length - 1, Math.floor(elapsed / sceneDuration));
    if (index !== active) {
      active = index;
      shots.forEach((shot, i) => {
        shot.classList.toggle('is-current', i === index);
        if (i === index) shot.removeAttribute('aria-hidden');
        else shot.setAttribute('aria-hidden', 'true');
      });
      chapters.forEach((button, i) => {
        if (i === index) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
      });
      screen.href = shots[index].src;
      screen.setAttribute('aria-label', `Enlarge ${scenes[index].label.toLowerCase()} interface`);
      title.textContent = scenes[index].title;
      description.textContent = scenes[index].description;
      figureTitle.textContent = `KUBECA C2 · ${scenes[index].label}`;
      story.dataset.scene = shots[index].dataset.storyShot;
    }
    chapters.forEach((button, i) => {
      const progress = Math.max(0, Math.min(1, (elapsed - i * sceneDuration) / sceneDuration));
      button.style.setProperty('--scene-progress', progress);
    });
    // A gentle camera move across the complete device; no UI labels are cropped.
    const fraction = elapsed / duration;
    const ease = fraction * fraction * (3 - 2 * fraction);
    terminal.style.transform = reducedMotion.matches ? 'none' : `scale(${1 + .09 * ease})`;
    timeLabel.textContent = `0:${String(Math.floor(elapsed / 1000)).padStart(2, '0')} / 0:18`;
  }

  function renderPlayback() {
    const label = playing ? 'Pause overview' : elapsed >= duration ? 'Replay overview' : elapsed ? 'Continue overview' : 'Play overview';
    toggleLabel.textContent = label;
    toggle.setAttribute('aria-label', `${label}${elapsed === 0 ? ' (18 seconds)' : ''}`);
    icon.textContent = playing ? 'Ⅱ' : '▶';
    story.dataset.playing = String(playing);
  }

  function pause(announce = false) {
    if (playing && previousTime !== null) {
      elapsed = Math.min(duration, elapsed + performance.now() - previousTime);
    }
    playing = false;
    previousTime = null;
    cancelAnimationFrame(frame);
    render();
    renderPlayback();
    if (announce) status.textContent = `Paused. Scene ${active + 1}: ${scenes[active].label}.`;
  }

  function tick(now) {
    if (!playing) return;
    elapsed = Math.min(duration, elapsed + Math.max(0, now - previousTime));
    previousTime = now;
    render();
    if (elapsed >= duration) {
      playing = false;
      previousTime = null;
      renderPlayback();
      status.textContent = 'Overview complete. Replay it or choose a scene.';
      return;
    }
    frame = requestAnimationFrame(tick);
  }

  toggle.addEventListener('click', () => {
    if (!ready) return;
    if (playing) {
      pause(true);
      return;
    }
    if (elapsed >= duration) elapsed = 0;
    playing = true;
    previousTime = performance.now();
    render();
    renderPlayback();
    status.textContent = 'Playing the C2 overview. Three scenes, 18 seconds.';
    frame = requestAnimationFrame(tick);
  });

  chapters.forEach((button, index) => button.addEventListener('click', () => {
    // A deliberate scene choice stays still for inspection.
    pause();
    elapsed = index * sceneDuration;
    render();
    renderPlayback();
    status.textContent = `Scene ${index + 1} of 3: ${scenes[index].label}. ${scenes[index].description}`;
  }));
  story.addEventListener('c2:pause', () => pause());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && playing) pause();
  });
  reducedMotion.addEventListener('change', () => {
    pause();
  });

  async function prepare() {
    if (loading) return;
    loading = true;
    try {
      await Promise.all(shots.map((shot) => {
        shot.loading = 'eager';
        return shot.decode();
      }));
      ready = true;
      controls.hidden = false;
      story.dataset.ready = 'true';
      render();
      renderPlayback();
    } catch {
      // Keep the ordinary fleet image link and caption if an extra asset fails.
      story.querySelector('[data-story-error]').hidden = false;
    }
  }

  if ('IntersectionObserver' in window) {
    const loadObserver = new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting)) {
        prepare();
        loadObserver.disconnect();
      }
    }, {rootMargin: '300px'});
    loadObserver.observe(story);
    const visibilityObserver = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting && playing) pause();
    });
    visibilityObserver.observe(story);
  } else {
    prepare();
  }
})();
