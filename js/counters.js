/**
 * counters.js — count-up animation for the statistics band.
 *
 * Markup contract:
 *   <span data-count="100" data-suffix="+" data-duration="1600">0</span>
 *
 * The element's text is written on every frame but its width is reserved by
 * CSS (tabular figures + min-width), so counting cannot cause layout shift.
 */

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');

const DEFAULT_DURATION = 1600;

/** Ease-out cubic — fast start, soft landing. */
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

/**
 * @param {HTMLElement} el
 * @param {number} target
 * @param {string} suffix
 * @param {string} prefix
 */
function formatInto(el, value, prefix, suffix) {
  el.textContent = `${prefix}${value.toLocaleString('en-US')}${suffix}`;
}

/**
 * Animate one counter to its target value.
 * @param {HTMLElement} el
 */
function run(el) {
  const target = Number.parseFloat(el.dataset.count);
  if (!Number.isFinite(target)) return;

  const prefix = el.dataset.prefix ?? '';
  const suffix = el.dataset.suffix ?? '';
  const duration = Number(el.dataset.duration) || DEFAULT_DURATION;

  if (REDUCED_MOTION.matches) {
    formatInto(el, target, prefix, suffix);
    return;
  }

  const start = performance.now();

  const step = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    formatInto(el, Math.round(easeOut(progress) * target), prefix, suffix);
    if (progress < 1) window.requestAnimationFrame(step);
  };

  window.requestAnimationFrame(step);
}

/**
 * Boot counters. Each fires once, when at least half of it is on screen.
 */
export function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  // Seed the final value so the number is correct even if JS motion never
  // runs (no observer support, printing, or reduced motion).
  if (REDUCED_MOTION.matches || !('IntersectionObserver' in window)) {
    counters.forEach(run);
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        run(entry.target);
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach((el) => observer.observe(el));
}
