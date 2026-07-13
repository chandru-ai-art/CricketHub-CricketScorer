/**
 * CricketHub — app.js
 * Application entry point — bootstraps router, screens, PWA
 */

// ─── Core Modules ───────────────────────────────────────────
import { registerScreen, navigateTo, initRouter } from './router.js';
import { loadSettings }                            from './state.js';
import { openDB }                                  from './db.js';
import { registerServiceWorker, setupInstallPrompt, setupOfflineDetection } from './pwa.js';

// ─── Screen Modules ─────────────────────────────────────────
import { renderSplash }       from './screens/splash.js';
import { renderHome }         from './screens/home.js';
import { renderCreateMatch }  from './screens/create-match.js';
import { renderTeam }         from './screens/team.js';
import { renderToss }         from './screens/toss.js';
import { renderScoring }      from './screens/scoring.js';
import { renderScorecard }    from './screens/scorecard.js';
import { renderSummary }      from './screens/summary.js';
import { renderHistory }      from './screens/history.js';
import { renderStatistics }   from './screens/statistics.js';
import { renderSettings }     from './screens/settings.js';
import { renderAbout }        from './screens/about.js';

/**
 * Initialize the application
 */
async function initApp() {
  try {
    // 1. Open database
    await openDB();

    // 2. Load user settings (dark/light mode, etc.)
    await loadSettings();

    // 3. Register all screens with the router
    registerScreen('splash',        renderSplash);
    registerScreen('home',          renderHome);
    registerScreen('create-match',  renderCreateMatch);
    registerScreen('team',          renderTeam);
    registerScreen('toss',          renderToss);
    registerScreen('scoring',       renderScoring);
    registerScreen('scorecard',     renderScorecard);
    registerScreen('summary',       renderSummary);
    registerScreen('history',       renderHistory);
    registerScreen('statistics',    renderStatistics);
    registerScreen('settings',      renderSettings);
    registerScreen('about',         renderAbout);

    // 4. Initialize router (handles hash-based navigation)
    const initialScreen = initRouter();

    // 5. Navigate to initial screen (splash always on first load)
    navigateTo('splash', {}, true);

    // 6. Setup PWA features
    setupOfflineDetection();
    setupInstallPrompt();
    registerServiceWorker();

    // 7. Register global keyboard shortcuts
    registerKeyboardShortcuts();

    console.log('[CricketHub] App initialized ✓');

  } catch (err) {
    console.error('[CricketHub] Initialization error:', err);
    // Show error state
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100dvh;gap:16px;padding:24px;text-align:center;background:#0D1117;color:#E6EDF3;">
          <div style="font-size:48px;">😕</div>
          <h2 style="font-family:sans-serif;font-size:20px;">Oops! Something went wrong</h2>
          <p style="font-size:14px;color:#8B949E;">${err.message || 'App failed to load'}</p>
          <button onclick="location.reload()" style="background:#1B5E20;color:white;border:none;border-radius:12px;padding:12px 24px;font-size:16px;cursor:pointer;">Reload App</button>
        </div>
      `;
    }
  }
}

/**
 * Global keyboard shortcuts (useful when testing on desktop)
 */
function registerKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Escape — go back
    if (e.key === 'Escape') {
      import('./router.js').then(({ goBack }) => goBack());
    }
    // Alt+H — home
    if (e.altKey && e.key === 'h') navigateTo('home');
  });
}

// ─── Boot ────────────────────────────────────────────────────
// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
