/**
 * faq.js — accessible single-open accordion.
 *
 * Markup contract:
 *   [data-accordion] > .faq__item > h3 > button.faq__trigger[aria-controls]
 *                                 > .faq__panel[role=region]
 *
 * Height is animated in CSS (grid-template-rows 0fr → 1fr), so this module
 * only manages state and keyboard interaction — it never measures or writes
 * a pixel height, which is what keeps the accordion free of layout thrash.
 */

export function initFaq() {
  const accordion = document.querySelector('[data-accordion]');
  if (!accordion) return;

  const triggers = Array.from(accordion.querySelectorAll('.faq__trigger'));
  if (!triggers.length) return;

  /**
   * @param {HTMLButtonElement} trigger
   * @param {boolean} open
   */
  const setOpen = (trigger, open) => {
    const item = trigger.closest('.faq__item');
    if (!item) return;
    trigger.setAttribute('aria-expanded', String(open));
    item.classList.toggle('is-open', open);
  };

  triggers.forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const isOpen = trigger.getAttribute('aria-expanded') === 'true';

      // Single-open: collapse the rest before expanding this one.
      triggers.forEach((other) => {
        if (other !== trigger) setOpen(other, false);
      });

      setOpen(trigger, !isOpen);
    });
  });

  // Arrow / Home / End move between headers, per the ARIA accordion pattern.
  accordion.addEventListener('keydown', (event) => {
    const current = event.target.closest('.faq__trigger');
    if (!current) return;

    const index = triggers.indexOf(current);
    if (index === -1) return;

    let next = -1;
    switch (event.key) {
      case 'ArrowDown': next = (index + 1) % triggers.length; break;
      case 'ArrowUp':   next = (index - 1 + triggers.length) % triggers.length; break;
      case 'Home':      next = 0; break;
      case 'End':       next = triggers.length - 1; break;
      default: return;
    }

    event.preventDefault();
    triggers[next].focus();
  });

  // Deep link: /#faq-panel-3 opens that entry and scrolls to it.
  const openFromHash = () => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const panel = accordion.querySelector(`#${CSS.escape(id)}`);
    if (!panel) return;
    const trigger = accordion.querySelector(`[aria-controls="${id}"]`);
    if (trigger) setOpen(trigger, true);
  };

  openFromHash();
  window.addEventListener('hashchange', openFromHash);
}
