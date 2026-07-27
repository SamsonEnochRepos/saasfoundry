/**
 * animations.js — scroll reveal + ambient hero motion.
 *
 * A single IntersectionObserver serves every [data-animate] element on the
 * page. Each element is unobserved the moment it reveals, so the observer's
 * entry list shrinks as the user scrolls and reveals never replay.
 */

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');

/** Elements deeper than this in a stagger group get their delay capped. */
const MAX_STAGGER_INDEX = 11;

let observer = null;

/**
 * Reveal an element and schedule the will-change release.
 * @param {Element} el
 */
function reveal(el) {
  el.classList.add('is-visible');

  // Drop the compositor hint once the transition has finished, so we are not
  // holding a layer for every revealed element on a long page.
  const settle = () => el.classList.add('is-settled');
  el.addEventListener('transitionend', settle, { once: true });
  window.setTimeout(settle, 1400);
}

/**
 * Assign --i to the children of every [data-stagger] container so
 * animations.css can derive a transition-delay without per-element JS.
 */
function indexStaggerGroups() {
  document.querySelectorAll('[data-stagger]').forEach((group) => {
    Array.from(group.children).forEach((child, i) => {
      child.style.setProperty('--i', String(Math.min(i, MAX_STAGGER_INDEX)));
    });
  });
}

/**
 * Register any [data-animate] elements that are not yet observed.
 * Safe to call again after injecting markup.
 */
export function refreshReveals() {
  if (!observer) return;
  document.querySelectorAll('[data-animate]:not(.is-visible)').forEach((el) => {
    observer.observe(el);
  });
}

/**
 * Reveal anything already inside the viewport, right now.
 *
 * IntersectionObserver takes its first reading before web fonts have
 * swapped. When the swap reflows the page, an element that was below the
 * fold at first reading can end up on screen without the observer ever
 * seeing a change — and it would stay invisible until the user scrolls.
 * This sweep runs after `load` and after `document.fonts.ready` to close
 * that window.
 */
function sweepViewport() {
  if (!observer) return;
  const limit = window.innerHeight - 60;

  document.querySelectorAll('[data-animate]:not(.is-visible)').forEach((el) => {
    const box = el.getBoundingClientRect();
    if (box.top < limit && box.bottom > 0) {
      observer.unobserve(el);
      reveal(el);
    }
  });
}

/**
 * Hero "Neural Forge": brighten nodes nearest the pointer.
 * Pure transform/opacity, rAF-throttled, and skipped entirely on touch
 * devices and under reduced motion.
 */
function initNeuralForge() {
  const forge = document.querySelector('[data-forge]');
  if (!forge) return;
  if (REDUCED_MOTION.matches) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const nodes = Array.from(forge.querySelectorAll('[data-forge-node]'));
  if (!nodes.length) return;

  const RADIUS = 170;
  let frame = 0;
  let pointer = null;

  const paint = () => {
    frame = 0;
    if (!pointer) {
      nodes.forEach((node) => node.style.removeProperty('--proximity'));
      return;
    }

    const box = forge.getBoundingClientRect();
    nodes.forEach((node) => {
      const b = node.getBoundingClientRect();
      const dx = b.left + b.width / 2 - (box.left + pointer.x);
      const dy = b.top + b.height / 2 - (box.top + pointer.y);
      const dist = Math.hypot(dx, dy);
      const strength = dist > RADIUS ? 0 : 1 - dist / RADIUS;
      node.style.setProperty('--proximity', strength.toFixed(3));
    });
  };

  const schedule = () => {
    if (!frame) frame = window.requestAnimationFrame(paint);
  };

  forge.addEventListener('pointermove', (event) => {
    const box = forge.getBoundingClientRect();
    pointer = { x: event.clientX - box.left, y: event.clientY - box.top };
    schedule();
  });

  forge.addEventListener('pointerleave', () => {
    pointer = null;
    schedule();
  });
}

/**
 * Boot the reveal system.
 */
export function initAnimations() {
  indexStaggerGroups();

  // No observer support, or the user prefers reduced motion: show everything.
  if (REDUCED_MOTION.matches || !('IntersectionObserver' in window)) {
    document.querySelectorAll('[data-animate]').forEach((el) => {
      el.classList.add('is-visible', 'is-settled');
    });
    return;
  }

  observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
  );

  refreshReveals();
  initNeuralForge();

  // Close the font-swap gap described in sweepViewport().
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(sweepViewport);
  }
  window.addEventListener('load', sweepViewport, { once: true });
}
