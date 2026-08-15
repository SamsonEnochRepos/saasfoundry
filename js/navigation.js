/**
 * navigation.js — sticky header state, mobile menu and scroll-spy.
 *
 * Every routine guards on its own markup, so the module stays safe if a
 * section is absent.
 */

/** Must match the width at which responsive.css turns .nav into an overlay. */
const MOBILE_QUERY = window.matchMedia('(max-width: 992px)');

/** Elements that can receive keyboard focus inside the mobile menu. */
const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Toggle the glass background once the page has scrolled off the hero.
 * @param {HTMLElement} header
 */
function initStickyState(header) {
  const THRESHOLD = 40;
  let ticking = false;

  const update = () => {
    ticking = false;
    header.classList.toggle('is-stuck', window.scrollY > THRESHOLD);
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  update();
}

/**
 * Full-screen mobile menu: open/close, body scroll lock, focus trap, Esc.
 * @param {HTMLElement} header
 */
function initMobileMenu(header) {
  const toggle = header.querySelector('[data-nav-toggle]');
  const nav = header.querySelector('#primary-nav');
  const label = header.querySelector('[data-nav-label]');
  const scrim = document.querySelector('[data-nav-scrim]');
  if (!toggle || !nav) return;

  let isOpen = false;

  const setOpen = (open) => {
    isOpen = open;
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('no-scroll', open);
    if (label) label.textContent = open ? 'Close menu' : 'Open menu';

    if (scrim) {
      if (open) {
        scrim.hidden = false;
        // Next frame, so the opacity transition has a start value to run from.
        window.requestAnimationFrame(() => scrim.classList.add('is-open'));
      } else {
        scrim.classList.remove('is-open');
        window.setTimeout(() => { if (!isOpen) scrim.hidden = true; }, 250);
      }
    }

    if (open) {
      const first = nav.querySelector(FOCUSABLE);
      if (first) first.focus();
    } else {
      toggle.focus();
    }
  };

  toggle.addEventListener('click', () => setOpen(!isOpen));
  if (scrim) scrim.addEventListener('click', () => setOpen(false));

  // Following a link should always dismiss the overlay.
  nav.addEventListener('click', (event) => {
    if (isOpen && event.target.closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (!isOpen) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      return;
    }

    if (event.key !== 'Tab') return;

    // Trap focus inside the open menu.
    const items = Array.from(nav.querySelectorAll(FOCUSABLE));
    if (!items.length) return;

    const first = items[0];
    const last = items[items.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  // Resizing up to desktop must not leave the page scroll-locked.
  MOBILE_QUERY.addEventListener('change', (event) => {
    if (!event.matches && isOpen) setOpen(false);
  });
}

/**
 * Scroll-spy: light the nav link whose section currently owns the viewport.
 * @param {HTMLElement} header
 */
function initScrollSpy(header) {
  const links = Array.from(header.querySelectorAll('[data-spy]'));
  if (!links.length || !('IntersectionObserver' in window)) return;

  const byId = new Map();
  links.forEach((link) => {
    const id = link.getAttribute('href');
    const section = id && id.length > 1 ? document.querySelector(id) : null;
    if (section) byId.set(section, link);
  });
  if (!byId.size) return;

  const visible = new Set();

  const paint = () => {
    // With several sections on screen, the highest one wins — it is the one
    // the reader has just arrived at.
    let winner = null;
    let top = Infinity;

    visible.forEach((section) => {
      const y = section.getBoundingClientRect().top;
      if (y < top) {
        top = y;
        winner = section;
      }
    });

    links.forEach((link) => {
      link.classList.remove('is-active');
      link.removeAttribute('aria-current');
    });

    const active = winner && byId.get(winner);
    if (active) {
      active.classList.add('is-active');
      active.setAttribute('aria-current', 'true');
    }
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      });
      paint();
    },
    // Band across the upper-middle of the viewport: a section counts as
    // "current" once its content sits under the header.
    { rootMargin: '-20% 0px -55% 0px', threshold: 0 }
  );

  byId.forEach((_link, section) => observer.observe(section));
}

export function initNavigation() {
  const header = document.querySelector('[data-header]');
  if (!header) return;

  initStickyState(header);
  initMobileMenu(header);
  initScrollSpy(header);
}
