/**
 * CricketHub — screens/summary.js
 * Match Summary Screen
 */

import { navigateTo, goBack } from '../router.js';
import { getCurrentMatch }    from '../state.js';
import { formatDate, formatOvers, calcRunRate, formatResult, showModal, hideModal, showToast } from '../utils.js';
import { saveMatch }          from '../db.js';

export function renderSummary() {
  const match = getCurrentMatch();
  if (!match) { navigateTo('home'); return; }

  const el = document.getElementById('screen-summary');

  const i1 = match.innings[0];
  const i2 = match.innings[1];
  const result = formatResult(match);

  // Find Man of the Match (highest scorer)
  const allBatsmen = [...(i1?.batsmen || []), ...(i2?.batsmen || [])];
  const mom = allBatsmen.sort((a, b) => b.runs - a.runs)[0];

  // Find best bowler
  const allBowlers = [...(i1?.bowlers || []), ...(i2?.bowlers || [])];
  const bestBowler = allBowlers.sort((a, b) => b.wickets - a.wickets || a.runs - b.runs)[0];

  el.innerHTML = `
    <div class="summary-screen">
      <!-- Hero -->
      <div class="summary-hero">
        <span class="summary-trophy">🏆</span>
        <div class="summary-result">${result}</div>
        <div class="summary-teams">${match.info.teamA.name} vs ${match.info.teamB.name}</div>

        <div class="summary-scores">
          <div class="summary-team-score">
            <div class="summary-team-name">${i1?.battingTeam || match.info.teamA.name}</div>
            <div class="summary-team-runs">${i1?.score || 0}/${i1?.wickets || 0}</div>
            <div class="summary-team-overs">(${formatOvers(i1?.balls || 0)} ov)</div>
          </div>
          <div class="summary-vs-divider">vs</div>
          <div class="summary-team-score">
            <div class="summary-team-name">${i2?.battingTeam || match.info.teamB.name}</div>
            <div class="summary-team-runs">${i2 ? `${i2.score}/${i2.wickets}` : 'Yet to bat'}</div>
            ${i2 ? `<div class="summary-team-overs">(${formatOvers(i2.balls)} ov)</div>` : ''}
          </div>
        </div>

        <!-- Match info pills -->
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:var(--space-4);">
          <span class="badge badge-muted">📅 ${formatDate(match.info.date || match.createdAt)}</span>
          <span class="badge badge-muted">⚡ ${match.info.overs} overs</span>
          ${match.info.venue ? `<span class="badge badge-muted">🏟️ ${match.info.venue}</span>` : ''}
          ${match.info.tournament ? `<span class="badge badge-accent">🏆 ${match.info.tournament}</span>` : ''}
        </div>
      </div>

      <div class="screen-content" style="padding-top:var(--space-4);">

        <!-- Man of the Match -->
        ${mom ? `
        <div class="mom-card" style="margin-bottom:var(--space-4);">
          <div class="mom-icon">🌟</div>
          <div>
            <div class="mom-label">Man of the Match</div>
            <div class="mom-name">${mom.name}</div>
            <div class="mom-stats">${mom.runs} runs · ${mom.balls} balls · SR: ${mom.balls > 0 ? ((mom.runs/mom.balls)*100).toFixed(0) : 0}</div>
          </div>
        </div>
        ` : ''}

        <!-- Key Stats -->
        <div class="section-title">Key Stats</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-2);margin-bottom:var(--space-5);">
          ${i1 ? `
          <div class="stat-chip">
            <div class="stat-chip-value">${calcRunRate(i1.score, i1.balls)}</div>
            <div class="stat-chip-label">${i1.battingTeam.split(' ')[0]} RR</div>
          </div>` : ''}
          ${i2 ? `
          <div class="stat-chip">
            <div class="stat-chip-value">${calcRunRate(i2.score, i2.balls)}</div>
            <div class="stat-chip-label">${i2.battingTeam.split(' ')[0]} RR</div>
          </div>` : ''}
          <div class="stat-chip">
            <div class="stat-chip-value">${(i1?.extras?.total || 0) + (i2?.extras?.total || 0)}</div>
            <div class="stat-chip-label">Extras</div>
          </div>
          <div class="stat-chip">
            <div class="stat-chip-value">${allBatsmen.reduce((s,b) => s + b.fours, 0)}</div>
            <div class="stat-chip-label">Fours</div>
          </div>
          <div class="stat-chip">
            <div class="stat-chip-value">${allBatsmen.reduce((s,b) => s + b.sixes, 0)}</div>
            <div class="stat-chip-label">Sixes</div>
          </div>
          <div class="stat-chip">
            <div class="stat-chip-value">${bestBowler?.wickets || 0}</div>
            <div class="stat-chip-label">Best Wkts</div>
          </div>
        </div>

        <!-- Top Performers -->
        ${renderTopPerformers(i1, i2, allBatsmen, allBowlers)}

        <!-- Action Buttons -->
        <div style="display:flex;flex-direction:column;gap:var(--space-3);margin-top:var(--space-5);">
          <button class="btn btn-primary btn-full btn-lg" id="btn-view-scorecard">📋 View Full Scorecard</button>
          <button class="btn btn-outline btn-full" id="btn-share-result">📤 Share Result</button>
          <button class="btn btn-ghost btn-full" id="btn-go-home-summary">🏠 Home</button>
        </div>

      </div>
    </div>
  `;

  el.querySelector('#btn-view-scorecard')?.addEventListener('click', () => navigateTo('scorecard'));
  el.querySelector('#btn-go-home-summary')?.addEventListener('click', () => navigateTo('home'));
  el.querySelector('#btn-share-result')?.addEventListener('click', () => shareResult(match, result));
}

function renderTopPerformers(i1, i2, allBatsmen, allBowlers) {
  const topBat = allBatsmen.slice(0, 3);
  const topBowl = allBowlers.sort((a, b) => b.wickets - a.wickets || a.runs - b.runs).slice(0, 3);

  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);margin-bottom:var(--space-4);">
      <div class="card">
        <div class="section-title" style="margin-bottom:var(--space-2);">Top Batters</div>
        ${topBat.map(b => `
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border-color);">
            <span style="font-size:var(--text-xs);color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:80px;">${b.name}</span>
            <span style="font-family:var(--font-display);font-size:var(--text-sm);font-weight:700;color:var(--color-accent);">${b.runs}*</span>
          </div>
        `).join('')}
      </div>
      <div class="card">
        <div class="section-title" style="margin-bottom:var(--space-2);">Top Bowlers</div>
        ${topBowl.map(b => `
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border-color);">
            <span style="font-size:var(--text-xs);color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:80px;">${b.name}</span>
            <span style="font-family:var(--font-display);font-size:var(--text-sm);font-weight:700;color:var(--color-danger);">${b.wickets}/${b.runs}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

async function shareResult(match, result) {
  const i1 = match.innings[0];
  const i2 = match.innings[1];
  const text = `🏏 ${match.info.teamA.name} vs ${match.info.teamB.name}\n` +
    `${i1?.battingTeam}: ${i1?.score}/${i1?.wickets} (${formatOvers(i1?.balls || 0)} ov)\n` +
    (i2 ? `${i2.battingTeam}: ${i2.score}/${i2.wickets} (${formatOvers(i2.balls)} ov)\n` : '') +
    `Result: ${result}\n` +
    `Scored with CricketHub 🏏`;

  if (navigator.share) {
    try {
      await navigator.share({ title: 'Cricket Match Result', text });
      showToast('Result shared!', 'success');
    } catch (e) {
      if (e.name !== 'AbortError') showToast('Could not share', 'danger');
    }
  } else {
    navigator.clipboard?.writeText(text).then(() =>
      showToast('Result copied to clipboard!', 'success')
    );
  }
}
