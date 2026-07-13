/**
 * CricketHub — screens/statistics.js
 * Aggregated Statistics Screen
 */

import { goBack } from '../router.js';
import { getAllMatches } from '../db.js';
import { calcRunRate } from '../utils.js';

export async function renderStatistics() {
  const el = document.getElementById('screen-statistics');
  const matches = await getAllMatches();
  const completed = matches.filter(m => m.status === 'complete');

  const stats = computeStats(matches, completed);

  el.innerHTML = `
    <div class="app-header">
      <button class="back-btn" id="stats-back">←</button>
      <div class="header-title">Statistics</div>
    </div>

    ${matches.length === 0 ? `
      <div class="empty-state" style="flex:1;">
        <div class="empty-state-icon">📊</div>
        <h3>No Data Yet</h3>
        <p>Play some matches to see your statistics here</p>
      </div>
    ` : `
    <div class="screen-content">

      <!-- Overview Cards -->
      <div class="section-title">Overview</div>
      <div class="stats-overview stagger-children">
        <div class="stats-overview-card">
          <div class="stats-big-number">${matches.length}</div>
          <div class="stats-card-label">Matches</div>
        </div>
        <div class="stats-overview-card">
          <div class="stats-big-number">${completed.length}</div>
          <div class="stats-card-label">Completed</div>
        </div>
        <div class="stats-overview-card">
          <div class="stats-big-number">${stats.totalRuns.toLocaleString()}</div>
          <div class="stats-card-label">Total Runs</div>
        </div>
        <div class="stats-overview-card">
          <div class="stats-big-number">${stats.totalWickets}</div>
          <div class="stats-card-label">Wickets</div>
        </div>
        <div class="stats-overview-card">
          <div class="stats-big-number">${stats.totalFours}</div>
          <div class="stats-card-label">Fours</div>
        </div>
        <div class="stats-overview-card">
          <div class="stats-big-number">${stats.totalSixes}</div>
          <div class="stats-card-label">Sixes</div>
        </div>
        <div class="stats-overview-card">
          <div class="stats-big-number">${stats.totalExtras}</div>
          <div class="stats-card-label">Extras</div>
        </div>
        <div class="stats-overview-card">
          <div class="stats-big-number">${stats.avgRunRate}</div>
          <div class="stats-card-label">Avg RR</div>
        </div>
      </div>

      <!-- Top Batters -->
      ${stats.topBatters.length > 0 ? `
      <div class="section-title" style="margin-top:var(--space-5);">Top Batters (by runs)</div>
      <div class="card" style="padding:var(--space-3);margin-bottom:var(--space-4);">
        <div class="bar-chart">
          ${stats.topBatters.map((b, i) => {
            const pct = stats.topBatters[0].runs > 0 ? (b.runs / stats.topBatters[0].runs) * 100 : 0;
            return `
              <div class="bar-row">
                <div class="bar-label" title="${b.name}">${i+1}. ${b.name}</div>
                <div class="bar-track">
                  <div class="bar-fill" style="width:${pct}%;background:linear-gradient(90deg,var(--color-primary),var(--color-accent));">
                    <span class="bar-value">${b.runs}</span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      ` : ''}

      <!-- Top Bowlers -->
      ${stats.topBowlers.length > 0 ? `
      <div class="section-title">Top Bowlers (by wickets)</div>
      <div class="card" style="padding:var(--space-3);margin-bottom:var(--space-4);">
        <div class="bar-chart">
          ${stats.topBowlers.map((b, i) => {
            const pct = stats.topBowlers[0].wickets > 0 ? (b.wickets / stats.topBowlers[0].wickets) * 100 : 0;
            return `
              <div class="bar-row">
                <div class="bar-label" title="${b.name}">${i+1}. ${b.name}</div>
                <div class="bar-track">
                  <div class="bar-fill" style="width:${pct}%;background:linear-gradient(90deg,var(--color-danger),#FF5722);">
                    <span class="bar-value">${b.wickets} wkt${b.wickets!==1?'s':''}</span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      ` : ''}

      <!-- Highest Scores -->
      ${stats.highestScores.length > 0 ? `
      <div class="section-title">Highest Team Scores</div>
      <div style="display:flex;flex-direction:column;gap:var(--space-2);margin-bottom:var(--space-4);">
        ${stats.highestScores.map((s, i) => `
          <div class="card" style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-4);">
            <div style="width:28px;height:28px;background:${i===0?'var(--color-accent)':i===1?'#C0C0C0':'#CD7F32'};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#1A1A1A;flex-shrink:0;">${i+1}</div>
            <div style="flex:1;">
              <div style="font-weight:700;font-size:var(--text-sm);color:var(--text-primary);">${s.team}</div>
              <div style="font-size:var(--text-xs);color:var(--text-muted);">vs ${s.vs} · ${s.date}</div>
            </div>
            <div style="font-family:var(--font-display);font-size:var(--text-xl);font-weight:700;color:var(--color-accent);">${s.score}/${s.wickets}</div>
          </div>
        `).join('')}
      </div>
      ` : ''}

      <!-- Boundary Stats -->
      <div class="section-title">Boundary Stats</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-2);margin-bottom:var(--space-5);">
        <div class="stat-chip">
          <div class="stat-chip-value" style="color:var(--color-success);">${stats.totalFours}</div>
          <div class="stat-chip-label">Fours</div>
        </div>
        <div class="stat-chip">
          <div class="stat-chip-value" style="color:var(--color-accent);">${stats.totalSixes}</div>
          <div class="stat-chip-label">Sixes</div>
        </div>
        <div class="stat-chip">
          <div class="stat-chip-value" style="color:var(--color-info);">${stats.boundaryPct}%</div>
          <div class="stat-chip-label">Boundary%</div>
        </div>
      </div>

      <!-- Extras Breakdown -->
      <div class="section-title">Extras Breakdown</div>
      <div class="extras-row" style="margin:0 0 var(--space-5);">
        <div class="extras-item"><div class="extras-item-val">${stats.extras.wides}</div><div class="extras-item-label">Wides</div></div>
        <div class="extras-item"><div class="extras-item-val">${stats.extras.noBalls}</div><div class="extras-item-label">No Balls</div></div>
        <div class="extras-item"><div class="extras-item-val">${stats.extras.byes}</div><div class="extras-item-label">Byes</div></div>
        <div class="extras-item"><div class="extras-item-val">${stats.extras.legByes}</div><div class="extras-item-label">Leg Byes</div></div>
      </div>

    </div>
    `}
  `;

  el.querySelector('#stats-back')?.addEventListener('click', goBack);
}

// ─── Stats Computation ─────────────────────────────────────
function computeStats(matches, completed) {
  let totalRuns = 0, totalWickets = 0, totalFours = 0, totalSixes = 0;
  let totalBalls = 0;
  const extras = { wides: 0, noBalls: 0, byes: 0, legByes: 0 };
  const batsmanMap = {};
  const bowlerMap  = {};
  const highestScores = [];

  for (const match of matches) {
    for (const inn of (match.innings || [])) {
      totalRuns    += inn.score || 0;
      totalWickets += inn.wickets || 0;
      totalBalls   += inn.balls || 0;
      extras.wides   += inn.extras?.wides   || 0;
      extras.noBalls += inn.extras?.noBalls || 0;
      extras.byes    += inn.extras?.byes    || 0;
      extras.legByes += inn.extras?.legByes || 0;

      // Batsmen aggregation
      for (const b of (inn.batsmen || [])) {
        if (!batsmanMap[b.name]) batsmanMap[b.name] = { name: b.name, runs: 0, balls: 0, fours: 0, sixes: 0 };
        batsmanMap[b.name].runs  += b.runs  || 0;
        batsmanMap[b.name].balls += b.balls || 0;
        batsmanMap[b.name].fours += b.fours || 0;
        batsmanMap[b.name].sixes += b.sixes || 0;
        totalFours += b.fours || 0;
        totalSixes += b.sixes || 0;
      }

      // Bowlers aggregation
      for (const b of (inn.bowlers || [])) {
        if (!bowlerMap[b.name]) bowlerMap[b.name] = { name: b.name, wickets: 0, runs: 0, legalBalls: 0 };
        bowlerMap[b.name].wickets    += b.wickets    || 0;
        bowlerMap[b.name].runs       += b.runs       || 0;
        bowlerMap[b.name].legalBalls += b.legalBalls || 0;
      }

      // Highest scores
      highestScores.push({
        team:    inn.battingTeam,
        vs:      inn.bowlingTeam,
        score:   inn.score,
        wickets: inn.wickets,
        date:    new Date(match.createdAt || Date.now()).toLocaleDateString('en-IN', { day:'numeric', month:'short' })
      });
    }
  }

  const totalExtras = extras.wides + extras.noBalls + extras.byes + extras.legByes;
  const boundaryRuns = totalFours * 4 + totalSixes * 6;
  const boundaryPct = totalRuns > 0 ? Math.round((boundaryRuns / totalRuns) * 100) : 0;

  const topBatters = Object.values(batsmanMap)
    .sort((a, b) => b.runs - a.runs)
    .slice(0, 7);

  const topBowlers = Object.values(bowlerMap)
    .sort((a, b) => b.wickets - a.wickets || a.runs - b.runs)
    .slice(0, 7);

  highestScores.sort((a, b) => b.score - a.score);

  const avgRunRate = totalBalls > 0 ? calcRunRate(totalRuns, totalBalls) : '0.00';

  return {
    totalRuns, totalWickets, totalFours, totalSixes, totalExtras,
    avgRunRate, boundaryPct, extras,
    topBatters, topBowlers,
    highestScores: highestScores.slice(0, 5)
  };
}
