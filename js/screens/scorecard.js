/**
 * CricketHub — screens/scorecard.js
 * Live Batting & Bowling Scorecard
 */

import { navigateTo, goBack } from '../router.js';
import { getCurrentMatch, getState } from '../state.js';
import { formatOvers, calcStrikeRate, calcEconomy, calcRunRate } from '../utils.js';

export function renderScorecard(params = {}) {
  const match = getCurrentMatch();
  if (!match) { navigateTo('home'); return; }

  const state     = getState();
  let activeTab   = state.ui.scorecardTab || 'batting';
  let inningsIdx  = match.currentInnings;

  const el = document.getElementById('screen-scorecard');

  function render() {
    const inn = match.innings[inningsIdx];
    if (!inn) return;

    el.innerHTML = `
      <div class="scorecard-screen">
        <div class="app-header">
          <button class="back-btn" id="sc-back">←</button>
          <div class="header-title">Scorecard</div>
          ${match.innings.length > 1 ? `
          <div class="header-actions">
            <button class="btn btn-ghost" id="sc-toggle-innings" style="font-size:var(--text-xs);padding:4px 8px;min-height:auto;">
              ${inningsIdx === 0 ? '2nd Inn →' : '← 1st Inn'}
            </button>
          </div>` : ''}
        </div>

        <!-- Innings Summary -->
        <div class="scorecard-header-info">
          <div class="scorecard-match-title">${inn.battingTeam}</div>
          <div class="scorecard-score-line">
            <div class="scorecard-score">${inn.score}/${inn.wickets}</div>
            <div class="scorecard-overs">(${formatOvers(inn.balls)} overs)</div>
            <div class="scorecard-rr">CRR: ${calcRunRate(inn.score, inn.balls)}</div>
          </div>
          ${inningsIdx === 1 && match.innings[0] ? `
          <div style="font-size:var(--text-sm);color:rgba(255,255,255,0.5);margin-top:4px;">
            Target: <strong style="color:var(--color-accent);">${match.innings[0].score + 1}</strong>
            &nbsp;·&nbsp; Need: <strong>${Math.max(0, match.innings[0].score + 1 - inn.score)}</strong>
            off ${Math.max(0, match.info.overs * 6 - inn.balls)} balls
          </div>` : ''}
        </div>

        <!-- Tabs -->
        <div class="tabs" style="padding: 0 var(--space-4);">
          <button class="tab-btn ${activeTab === 'batting' ? 'active' : ''}" id="tab-batting">🏏 Batting</button>
          <button class="tab-btn ${activeTab === 'bowling' ? 'active' : ''}" id="tab-bowling">🎳 Bowling</button>
          <button class="tab-btn ${activeTab === 'over' ? 'active' : ''}" id="tab-over">📊 Over-by-Over</button>
        </div>

        <!-- Tab Content -->
        <div style="padding:var(--space-4);overflow-y:auto;">
          ${activeTab === 'batting' ? renderBattingCard(inn, match) : ''}
          ${activeTab === 'bowling' ? renderBowlingCard(inn) : ''}
          ${activeTab === 'over'    ? renderOverByOver(inn) : ''}
        </div>
      </div>
    `;

    // Tab switching
    el.querySelector('#tab-batting')?.addEventListener('click', () => { activeTab = 'batting'; state.ui.scorecardTab = 'batting'; render(); });
    el.querySelector('#tab-bowling')?.addEventListener('click', () => { activeTab = 'bowling'; state.ui.scorecardTab = 'bowling'; render(); });
    el.querySelector('#tab-over')?.addEventListener('click',    () => { activeTab = 'over';    state.ui.scorecardTab = 'over';    render(); });
    el.querySelector('#sc-back')?.addEventListener('click', goBack);
    el.querySelector('#sc-toggle-innings')?.addEventListener('click', () => {
      inningsIdx = inningsIdx === 0 ? 1 : 0; render();
    });
  }

  render();
}

function renderBattingCard(inn, match) {
  const strikerIdx   = inn.currentBatsmen?.[0];
  const nonStrikerIdx = inn.currentBatsmen?.[1];

  const rows = inn.batsmen.map((b, i) => {
    const isCurrent = (i === strikerIdx || i === nonStrikerIdx) && inn.status !== 'complete';
    const sr = calcStrikeRate(b.runs, b.balls);
    return `
      <tr class="${isCurrent ? 'current-player' : ''}">
        <td class="player-name">
          ${b.name}
          ${i === strikerIdx && inn.status !== 'complete' ? ' <span style="color:var(--color-accent);font-size:10px;">★</span>' : ''}
          ${b.isOut ? `<br><span style="font-size:10px;color:var(--text-muted);">${b.dismissal}</span>` : ''}
          ${!b.isOut && isCurrent ? '<br><span style="font-size:10px;color:var(--color-success);">Batting</span>' : ''}
          ${!b.isOut && !isCurrent && !b.dismissal ? '<br><span style="font-size:10px;color:var(--text-muted);">Yet to bat</span>' : ''}
        </td>
        <td class="number-col">${b.runs}</td>
        <td class="number-col">${b.balls}</td>
        <td class="number-col">${b.fours}</td>
        <td class="number-col">${b.sixes}</td>
        <td class="number-col">${sr}</td>
      </tr>
    `;
  }).join('');

  const extras = inn.extras;
  return `
    <div class="table-container" style="margin-bottom:var(--space-4);">
      <table class="scorecard-table">
        <thead>
          <tr>
            <th>Batter</th>
            <th class="number-col">R</th>
            <th class="number-col">B</th>
            <th class="number-col">4s</th>
            <th class="number-col">6s</th>
            <th class="number-col">SR</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="6" style="color:var(--text-muted);padding:16px;text-align:center;">No batsmen yet</td></tr>'}
          <tr style="border-top:2px solid var(--border-color-strong);">
            <td colspan="5" style="font-size:var(--text-xs);color:var(--text-muted);">
              Extras: ${extras.total} (W:${extras.wides} NB:${extras.noBalls} B:${extras.byes} LB:${extras.legByes})
            </td>
            <td class="number-col" style="font-weight:700;color:var(--text-primary);">${extras.total}</td>
          </tr>
          <tr style="background:rgba(255,214,0,0.05);">
            <td colspan="5" style="font-weight:700;color:var(--text-primary);">Total</td>
            <td class="number-col" style="font-family:var(--font-display);font-size:var(--text-lg);font-weight:700;color:var(--color-accent);">
              ${inn.score}/${inn.wickets}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    ${renderPartnerships(inn)}
  `;
}

function renderBowlingCard(inn) {
  const rows = inn.bowlers.map((b, i) => {
    const isCurrent = i === inn.currentBowler && inn.status !== 'complete';
    const overs = Math.floor(b.legalBalls / 6) + '.' + (b.legalBalls % 6);
    const econ  = calcEconomy(b.runs, b.legalBalls);
    return `
      <tr class="${isCurrent ? 'current-player' : ''}">
        <td class="player-name">
          ${b.name}
          ${isCurrent ? ' <span style="color:var(--color-accent);font-size:10px;">★</span>' : ''}
        </td>
        <td class="number-col">${overs}</td>
        <td class="number-col">${b.maidens}</td>
        <td class="number-col">${b.runs}</td>
        <td class="number-col" style="color:${b.wickets > 0 ? 'var(--color-danger)' : 'inherit'};font-weight:${b.wickets > 0 ? 700 : 400};">${b.wickets}</td>
        <td class="number-col">${econ}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="table-container">
      <table class="scorecard-table">
        <thead>
          <tr>
            <th>Bowler</th>
            <th class="number-col">O</th>
            <th class="number-col">M</th>
            <th class="number-col">R</th>
            <th class="number-col">W</th>
            <th class="number-col">Econ</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="6" style="color:var(--text-muted);padding:16px;text-align:center;">No bowlers yet</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

function renderOverByOver(inn) {
  if (!inn.overHistory || inn.overHistory.length === 0) {
    return `<div class="empty-state" style="padding:var(--space-8) 0;">
      <div class="empty-state-icon">📊</div>
      <h3>No Overs Yet</h3>
    </div>`;
  }

  return `
    <div style="display:flex;flex-direction:column;gap:var(--space-3);">
      ${inn.overHistory.map((over, idx) => {
        const overRuns = over.reduce((sum, b) => sum + (b.runs || 0) + (b.extras || 0), 0);
        const dotsHTML = over.map(b => `
          <div class="over-dot ${getDotClass_local(b)}" style="width:30px;height:30px;font-size:10px;">
            ${getBallText_local(b)}
          </div>
        `).join('');

        return `
          <div class="card" style="padding:var(--space-3);">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-2);">
              <span style="font-size:var(--text-sm);font-weight:700;color:var(--text-primary);">Over ${idx + 1}</span>
              <span style="font-family:var(--font-display);font-size:var(--text-lg);font-weight:700;color:var(--color-accent);">${overRuns}</span>
            </div>
            <div class="over-dots">${dotsHTML}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderPartnerships(inn) {
  if (!inn.overHistory || inn.overHistory.length === 0) return '';
  // Calculate basic partnerships from wicket events
  const wickets = inn.batsmen.filter(b => b.isOut);
  if (wickets.length === 0) return '';

  return `
    <div style="margin-top:var(--space-4);">
      <div class="section-title">Fall of Wickets</div>
      ${inn.batsmen.filter(b => b.isOut).map((b, i) => `
        <div style="display:flex;justify-content:space-between;padding:var(--space-2) 0;border-bottom:1px solid var(--border-color);">
          <span style="font-size:var(--text-sm);color:var(--text-primary);font-weight:600;">${b.name}</span>
          <span style="font-size:var(--text-sm);color:var(--text-muted);">${b.runs} · ${b.dismissal}</span>
        </div>
      `).join('')}
    </div>
  `;
}

// Local helpers (avoid circular import)
function getDotClass_local(event) {
  if (!event) return '';
  if (event.type === 'wicket') return 'dot-W';
  if (event.type === 'wide')   return 'dot-wd';
  if (event.type === 'noball') return 'dot-nb';
  if (event.type === 'bye')    return 'dot-b';
  if (event.type === 'legbye') return 'dot-lb';
  const r = event.runs;
  if (r === 0) return 'dot-0';
  if (r === 4) return 'dot-4';
  if (r === 6) return 'dot-6';
  return `dot-${Math.min(r, 3)}`;
}

function getBallText_local(event) {
  if (!event) return '';
  if (event.type === 'wicket') return 'W';
  if (event.type === 'wide')   return 'Wd';
  if (event.type === 'noball') return 'NB';
  if (event.type === 'bye')    return `B${event.runs > 0 ? event.runs : ''}`;
  if (event.type === 'legbye') return `LB`;
  return event.runs?.toString() || '0';
}
