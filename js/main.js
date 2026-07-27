/**
 * main.js — application entry point.
 *
 * Loaded as a native ES module (`<script type="module">`), so it is deferred
 * by default and runs after the document has parsed. No bundler, no build
 * step, no inline JavaScript anywhere in the document.
 */

import { initNavigation } from './navigation.js';
import { initAnimations } from './animations.js';
import { initCounters } from './counters.js';
import { initFaq } from './faq.js';

/**
 * Smooth scrolling itself is CSS (`scroll-behavior: smooth`). This handler
 * exists for accessibility: browsers do not move keyboard focus when an
 * in-page anchor is followed, which strands screen-reader and keyboard users
 * at the top of the document.
 */
function initAnchorFocus() {
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;

    const id = link.getAttribute('href');
    if (!id || id === '#') return;

    const target = document.querySelector(id);
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({ block: 'start' });

    // Make the section programmatically focusable without adding it to the
    // tab order, then hand focus over once scrolling has been requested.
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });

    // Keep the URL shareable without triggering a second jump.
    if (window.history.replaceState) {
      window.history.replaceState(null, '', id);
    }
  });
}

/**
 * Marks the document as JS-enabled and records the real scrollbar width, so
 * locking body scroll for the mobile menu does not shift the layout.
 */
function initDocumentState() {
  const root = document.documentElement;
  root.classList.add('js');

  const setScrollbarWidth = () => {
    const width = window.innerWidth - root.clientWidth;
    root.style.setProperty('--scrollbar-w', `${width}px`);
  };

  setScrollbarWidth();
  window.addEventListener('resize', setScrollbarWidth, { passive: true });
}

/* ==========================================================================
   Contact form

   Validation is deliberately hand-rolled rather than left to the browser:
   native bubbles cannot be styled, vanish on scroll, and are not announced
   consistently. The form carries `novalidate` and we own the messaging.
   ========================================================================== */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} field
 * @returns {string} error message, or '' when valid
 */
function validateField(field) {
  const value = field.value.trim();

  if (field.required && !value) {
    return field.tagName === 'SELECT' ? 'Please choose an option.' : 'This field is required.';
  }
  if (!value) return '';

  if (field.type === 'email' && !EMAIL_RE.test(value)) {
    return 'Enter a valid email address.';
  }
  if (field.type === 'tel' && !/^[\d\s+()-]{7,}$/.test(value)) {
    return 'Enter a valid phone number.';
  }
  if (field.name === 'message' && value.length < 10) {
    return 'A sentence or two helps us point you at the right stream.';
  }
  return '';
}

/**
 * @param {HTMLElement} field
 * @param {string} message
 */
function showError(field, message) {
  const target = document.querySelector(`[data-error-for="${field.name}"]`);
  if (target) target.textContent = message;

  if (message) field.setAttribute('aria-invalid', 'true');
  else field.removeAttribute('aria-invalid');
}

function initContactForm() {
  const form = document.querySelector('[data-contact-form]');
  if (!form) return;

  const status = form.querySelector('[data-form-status]');
  const fields = Array.from(form.querySelectorAll('.field__input'));

  // Validate on blur, then live-correct once a field is already in error —
  // never scold someone mid-keystroke on their first attempt.
  fields.forEach((field) => {
    field.addEventListener('blur', () => showError(field, validateField(field)));
    field.addEventListener('input', () => {
      if (field.getAttribute('aria-invalid') === 'true') {
        showError(field, validateField(field));
      }
    });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    let firstInvalid = null;
    fields.forEach((field) => {
      const message = validateField(field);
      showError(field, message);
      if (message && !firstInvalid) firstInvalid = field;
    });

    if (firstInvalid) {
      if (status) {
        status.dataset.state = 'error';
        status.textContent = 'Please fix the highlighted fields.';
      }
      firstInvalid.focus();
      return;
    }

    handleSubmit(form, status);
  });
}

/**
 * Delivery hook. There is no backend wired up: point this at your endpoint
 * (Formspree, a serverless function, your CRM) and handle the response.
 *
 *   const res = await fetch('https://your-endpoint', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify(Object.fromEntries(new FormData(form))),
 *   });
 *
 * @param {HTMLFormElement} form
 * @param {HTMLElement|null} status
 */
function handleSubmit(form, status) {
  if (status) {
    status.dataset.state = 'ok';
    status.textContent =
      'Thanks — your details are ready to send. Connect an endpoint in js/main.js to deliver this form.';
  }
  form.querySelectorAll('.field__input').forEach((field) => {
    field.removeAttribute('aria-invalid');
  });
}

function boot() {
  initDocumentState();
  initAnchorFocus();
  initContactForm();
  initNavigation();
  initAnimations();
  initCounters();
  initFaq();
}

boot();
