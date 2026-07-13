/**
 * CricketHub — router.js
 * Hash-based SPA router with screen transition animations
 */

import { getState } from './state.js';

// Map of screen id → module render function
const screenRegistry = {};

// Currently active screen id
let _active = null;

/**
 * Register a screen with its render function
 * @param {string} id - screen identifier (matches data-screen attribute)
 * @param {Function} renderFn - called when navigating to this screen
 * @param {Function} [destroyFn] - called when leaving this screen
 */
export function registerScreen(id, renderFn, destroyFn = null) {
  screenRegistry[id] = { renderFn, destroyFn };
}

/**
 * Navigate to a screen
 * @param {string} id - screen id
 * @param {Object} [params] - optional params passed to renderFn
 * @param {boolean} [replace] - replace history state instead of push
 */
export function navigateTo(id, params = {}, replace = false) {
  if (_active === id && !params.force) return;

  const prev = _active;
  _active = id;

  // Update UI state
  const state = getState();
  state.ui.previousScreen = prev;
  state.ui.currentScreen  = id;

  // Call destroy on old screen
  if (prev && screenRegistry[prev]?.destroyFn) {
    screenRegistry[prev].destroyFn();
  }

  // Hide all screens, show target
  const screens = document.querySelectorAll('.screen');
  screens.forEach(s => {
    if (s.dataset.screen === id) {
      s.classList.remove('slide-out');
      s.classList.add('active');
    } else if (s.classList.contains('active')) {
      s.classList.add('slide-out');
      s.classList.remove('active');
      setTimeout(() => s.classList.remove('slide-out'), 400);
    }
  });

  // Render the target screen
  if (screenRegistry[id]?.renderFn) {
    // Use setTimeout so the DOM is ready
    setTimeout(() => screenRegistry[id].renderFn(params), 0);
  }

  // Update browser history
  const hash = `#${id}`;
  if (replace || !history.state) {
    history.replaceState({ screen: id, params }, '', hash);
  } else {
    history.pushState({ screen: id, params }, '', hash);
  }
}

/**
 * Go back to previous screen
 */
export function goBack() {
  if (history.length > 1) {
    history.back();
  } else {
    navigateTo('home');
  }
}

/**
 * Initialize the router (listen to popstate)
 */
export function initRouter() {
  window.addEventListener('popstate', (e) => {
    const screen = e.state?.screen || 'home';
    const params = e.state?.params || {};
    // Don't push state again
    if (_active !== screen) {
      _active = null; // force re-render
      navigateTo(screen, { ...params, force: true }, true);
    }
  });

  // Handle initial hash on load
  const initialHash = window.location.hash.slice(1);
  if (initialHash && screenRegistry[initialHash]) {
    return initialHash;
  }
  return 'splash';
}

/**
 * Get current active screen
 */
export function getActiveScreen() {
  return _active;
}
