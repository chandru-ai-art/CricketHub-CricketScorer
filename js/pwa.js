/**
 * CricketHub — pwa.js
 * PWA: Service worker registration, install prompt, offline detection
 */

import { setInstallPrompt, getState } from './state.js';

/**
 * Register the service worker
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('[PWA] Service Worker registered:', reg.scope);

    // Handle updates
    reg.onupdatefound = () => {
      const installing = reg.installing;
      installing.onstatechange = () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateBanner();
        }
      };
    };
  } catch (err) {
    console.warn('[PWA] SW registration failed:', err);
  }
}

/**
 * Show app update available banner
 */
function showUpdateBanner() {
  // For now, just show a toast — could be extended to a reload prompt
  import('./utils.js').then(({ showToast }) => {
    showToast('App updated! Reload to get the latest version.', 'default', 5000);
  });
}

/**
 * Setup install prompt handling
 */
export function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    setInstallPrompt(e);
    showInstallBanner();
  });

  window.addEventListener('appinstalled', () => {
    hideInstallBanner();
    setInstallPrompt(null);
    import('./utils.js').then(({ showToast }) => {
      showToast('🏏 CricketHub installed! Enjoy scoring!', 'success');
    });
  });

  // Install button click
  const installBtn = document.getElementById('install-btn');
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      const state = getState();
      if (!state.installPrompt) return;
      state.installPrompt.prompt();
      const { outcome } = await state.installPrompt.userChoice;
      if (outcome === 'accepted') setInstallPrompt(null);
      hideInstallBanner();
    });
  }

  // Dismiss button
  const dismissBtn = document.getElementById('install-dismiss');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      hideInstallBanner();
      // Don't show again for 7 days
      localStorage.setItem('installDismissed', Date.now().toString());
    });
  }
}

function showInstallBanner() {
  // Check if dismissed recently (7 days)
  const dismissed = localStorage.getItem('installDismissed');
  if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

  const banner = document.getElementById('install-banner');
  if (banner) banner.classList.remove('hidden');
}

function hideInstallBanner() {
  const banner = document.getElementById('install-banner');
  if (banner) banner.classList.add('hidden');
}

/**
 * Setup offline/online detection
 */
export function setupOfflineDetection() {
  const banner = document.getElementById('offline-banner');

  function updateStatus() {
    if (banner) {
      if (!navigator.onLine) {
        banner.classList.remove('hidden');
      } else {
        banner.classList.add('hidden');
      }
    }
  }

  window.addEventListener('online',  updateStatus);
  window.addEventListener('offline', updateStatus);
  updateStatus(); // initial check
}
