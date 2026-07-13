/**
 * CricketHub — screens/splash.js
 * Splash / Loading screen
 */

import { navigateTo } from '../router.js';
import { getActiveMatches } from '../db.js';

export function renderSplash() {
  const el = document.getElementById('screen-splash');
  el.innerHTML = `
    <div class="splash-screen">
      <div class="splash-bg-circle splash-bg-circle-1"></div>
      <div class="splash-bg-circle splash-bg-circle-2"></div>

      <div class="splash-content">
        <div class="splash-logo-wrap splash-logo-animate">🏏</div>
        <div class="animate-fade-in-up" style="animation-delay:0.3s;opacity:0">
          <div class="splash-app-name">Cricket<span>Hub</span></div>
          <div class="splash-tagline">Score. Track. Analyze.</div>
        </div>
      </div>

      <div class="splash-footer animate-fade-in" style="animation-delay:0.6s;opacity:0">
        <div class="dot-loader">
          <span></span><span></span><span></span>
        </div>
        <div class="splash-version">v1.0.0 &nbsp;·&nbsp; Offline Ready</div>
      </div>
    </div>
  `;

  // Navigate to home after loading
  setTimeout(async () => {
    try {
      const activeMatches = await getActiveMatches();
      // If there's an active match, offer to continue (handled in home)
      navigateTo('home', { hasActiveMatch: activeMatches.length > 0 }, true);
    } catch (e) {
      navigateTo('home', {}, true);
    }
  }, 2000);
}
