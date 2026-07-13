/**
 * CricketHub — screens/home.js  (ENHANCED v2)
 * Home Dashboard — Premium Design
 */

import { navigateTo }     from '../router.js';
import { getAllMatches, getActiveMatches } from '../db.js';
import { setCurrentMatch, setAllMatches } from '../state.js';
import { formatDate, timeAgo, formatOvers, formatResult } from '../utils.js';

export async function renderHome(params = {}) {
  const el = document.getElementById('screen-home');

  const [allMatches, activeMatches] = await Promise.all([
    getAllMatches(),
    getActiveMatches()
  ]);
  setAllMatches(allMatches);

  const lastMatch   = allMatches[0] || null;
  const activeMatch = activeMatches[0] || null;
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long'
  });

  el.innerHTML = `
    <div class="home-screen">

      <!-- ─ Hero Header ─ -->
      <div class="home-hero">
        <div class="home-hero-header">
          <div class="home-app-logo">
            <div class="home-logo-icon">🏏</div>
            <div>
              <div class="home-app-name">Cricket<span>Hub</span></div>
              <div class="home-date">${today}</div>
            </div>
          </div>
          <button class="home-settings-btn" id="home-settings-btn" aria-label="Settings">⚙️</button>
        </div>

        <div class="home-hero-cta">
          <div class="home-hero-title">
            Ready to
            <span>Score?</span>
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <div class="home-hero-subtitle">${allMatches.length} match${allMatches.length !== 1 ? 'es' : ''} recorded</div>
            ${allMatches.filter(m => m.status === 'complete').length > 0 ?
              `<span class="badge badge-primary" style="font-size:10px;">
                ✓ ${allMatches.filter(m => m.status === 'complete').length} completed
              </span>` : ''}
          </div>
        </div>
      </div>

      <!-- ─ Quick Actions ─ -->
      <div class="home-quick-actions stagger-children">

        <!-- New Match: full-width hero card -->
        <div class="quick-action-card highlight ripple-container card-clickable" id="btn-new-match">
          <div class="qa-icon">🏏</div>
          <div>
            <div class="qa-title">New Match</div>
            <div class="qa-subtitle">Set up teams, toss & start scoring</div>
          </div>
          <span class="qa-arrow">→</span>
        </div>

        <!-- Continue Match: full-width if active -->
        ${activeMatch ? `
        <div class="continue-match-card card-clickable ripple-container" id="btn-continue">
          <div style="width:44px;height:44px;background:rgba(250,204,21,0.12);border:1px solid rgba(250,204,21,0.3);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">▶️</div>
          <div style="flex:1;min-width:0;">
            <div class="continue-badge" style="display:inline-flex;margin-bottom:4px;">
              <span style="width:6px;height:6px;background:var(--color-danger);border-radius:50%;animation:pulse 1.2s ease infinite;"></span>
              LIVE
            </div>
            <div style="font-weight:700;font-size:var(--text-base);color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${activeMatch.info.teamA.name} vs ${activeMatch.info.teamB.name}
            </div>
            <div style="font-size:var(--text-xs);color:var(--text-muted);">
              ${activeMatch.info.overs} overs · ${activeMatch.info.matchType || 'T20'}
            </div>
          </div>
          <div style="font-size:20px;color:var(--color-accent);">→</div>
        </div>
        ` : ''}

        <!-- History -->
        <div class="quick-action-card card-clickable ripple-container" id="btn-history">
          <div class="qa-icon" style="background:rgba(96,165,250,0.1);border-color:rgba(96,165,250,0.2);">📋</div>
          <div class="qa-title">History</div>
          <div class="qa-subtitle">${allMatches.length} matches</div>
        </div>

        <!-- Statistics -->
        <div class="quick-action-card card-clickable ripple-container" id="btn-stats">
          <div class="qa-icon" style="background:rgba(167,139,250,0.1);border-color:rgba(167,139,250,0.2);">📊</div>
          <div class="qa-title">Statistics</div>
          <div class="qa-subtitle">Insights</div>
        </div>

        <!-- Teams -->
        <div class="quick-action-card card-clickable ripple-container" id="btn-teams">
          <div class="qa-icon" style="background:rgba(251,146,60,0.1);border-color:rgba(251,146,60,0.2);">👥</div>
          <div class="qa-title">Teams</div>
          <div class="qa-subtitle">Manage rosters</div>
        </div>

        <!-- About -->
        <div class="quick-action-card card-clickable ripple-container" id="btn-about">
          <div class="qa-icon" style="background:rgba(34,197,94,0.1);border-color:rgba(34,197,94,0.2);">ℹ️</div>
          <div class="qa-title">About</div>
          <div class="qa-subtitle">App info</div>
        </div>

      </div>

      <!-- ─ Recent Match ─ -->
      ${lastMatch ? renderRecentMatch(lastMatch) : renderEmptyTip()}

      <!-- Bottom Pad -->
      <div style="height:32px;"></div>
    </div>
  `;

  // ── Events ──
  el.querySelector('#btn-new-match')?.addEventListener('click', () => navigateTo('create-match'));
  el.querySelector('#home-settings-btn')?.addEventListener('click', () => navigateTo('settings'));
  el.querySelector('#btn-history')?.addEventListener('click', () => navigateTo('history'));
  el.querySelector('#btn-stats')?.addEventListener('click', () => navigateTo('statistics'));
  el.querySelector('#btn-teams')?.addEventListener('click', () => navigateTo('team'));
  el.querySelector('#btn-about')?.addEventListener('click', () => navigateTo('about'));

  if (activeMatch) {
    el.querySelector('#btn-continue')?.addEventListener('click', () => {
      setCurrentMatch(activeMatch);
      navigateTo('scoring', { matchId: activeMatch.id });
    });
  }

  el.querySelector('#btn-recent')?.addEventListener('click', () => {
    if (lastMatch) {
      setCurrentMatch(lastMatch);
      navigateTo(lastMatch.status === 'complete' ? 'summary' : 'scoring');
    }
  });
}

function renderRecentMatch(match) {
  const inn = match.innings;
  if (!inn || inn.length === 0) return '';

  const i1 = inn[0];
  const i2 = inn[1];
  const result = formatResult(match);
  const isActive = match.status !== 'complete';

  return `
    <div style="padding: var(--space-4) var(--space-4) 0;">
      <div class="section-title">Recent Match</div>
      <div class="recent-match-card card-clickable ripple-container" id="btn-recent">

        <div class="recent-label">
          ${isActive
            ? `<span style="width:7px;height:7px;background:var(--color-danger);border-radius:50%;animation:pulse 1.2s ease infinite;"></span> Live`
            : `<span style="width:7px;height:7px;background:var(--color-success);border-radius:50%;"></span> Completed`
          }
          <span style="margin-left:auto;color:var(--text-muted);">${timeAgo(match.updatedAt || match.createdAt)}</span>
        </div>

        <div class="recent-match-teams">
          <div class="recent-team">
            <div class="recent-team-name">${i1.battingTeam}</div>
            <div class="recent-team-score">
              ${i1.score}<small>/${i1.wickets}</small>
            </div>
            <div style="font-size:var(--text-xs);color:var(--text-muted);">${formatOvers(i1.balls)} ov</div>
          </div>

          <div class="recent-vs">vs</div>

          <div class="recent-team" style="text-align:right;">
            <div class="recent-team-name">${i2 ? i2.battingTeam : match.info.teamB?.name || ''}</div>
            ${i2 ? `
              <div class="recent-team-score" style="justify-content:flex-end;">
                ${i2.score}<small>/${i2.wickets}</small>
              </div>
              <div style="font-size:var(--text-xs);color:var(--text-muted);">${formatOvers(i2.balls)} ov</div>
            ` : `<div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:4px;">Yet to bat</div>`}
          </div>
        </div>

        <div class="recent-match-result">${result}</div>

        <div class="recent-match-meta">
          ${match.info.venue ? `<span>🏟️ ${match.info.venue}</span>` : ''}
          <span>🗓️ ${formatDate(match.info.date || match.createdAt)}</span>
          <span>⚡ ${match.info.overs} ov</span>
          ${match.info.ballType ? `<span>🏏 ${match.info.ballType}</span>` : ''}
        </div>
      </div>
    </div>
  `;
}

function renderEmptyTip() {
  return `
    <div style="padding: var(--space-4);">
      <div class="card" style="text-align:center;padding:var(--space-6);background:linear-gradient(135deg,rgba(34,197,94,0.05),transparent);border-color:rgba(34,197,94,0.15);">
        <div style="font-size:48px;margin-bottom:var(--space-3);opacity:0.5;">🏏</div>
        <div style="font-family:var(--font-display);font-size:var(--text-lg);color:var(--text-primary);margin-bottom:var(--space-2);">No Matches Yet</div>
        <div style="font-size:var(--text-sm);color:var(--text-muted);">Tap <strong style="color:var(--color-primary);">New Match</strong> to start scoring your first match</div>
      </div>
    </div>
  `;
}
