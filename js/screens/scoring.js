/**
 * CricketHub — screens/scoring.js
 * Live Scoring Engine — the core screen
 */

import { navigateTo, goBack }   from '../router.js';
import { getCurrentMatch, getCurrentInnings, getInnings,
         setOpeningBatsmen, setOpeningBowler, recordBall,
         pushUndoSnapshot, undoLastBall, changeBowler,
         bringInBatsman, completeInnings, autoSave }  from '../state.js';
import { showToast, showModal, hideModal, vibrate,
         formatOvers, calcRunRate, calcRRR,
         getDotClass, getBallText }                    from '../utils.js';
import { saveMatch }             from '../db.js';

// ─── Module-level UI refs ──────────────────────────────────
let _el = null;

export function renderScoring(params = {}) {
  const match = getCurrentMatch();
  if (!match) { navigateTo('home'); return; }

  _el = document.getElementById('screen-scoring');

  // If innings not started yet (no opening batsmen), prompt setup
  const inn = getCurrentInnings();
  if (!inn || !inn.currentBatsmen || inn.currentBatsmen[0] === null || inn.batsmen.length === 0) {
    showOpeningSetupModal(match, () => refreshScoringUI());
    // Render empty shell first
    renderScoringShell(match);
    return;
  }

  renderScoringShell(match);
}

/** Render the scoring screen shell with live data */
function renderScoringShell(match) {
  const inn = getCurrentInnings();
  if (!inn) return;

  _el.innerHTML = `
    <div class="scoring-screen">
      ${renderScoreHeader(match, inn)}
      ${renderBattingPanel(inn)}
      ${renderBowlerPanel(inn)}
      ${renderLastOverPanel(inn)}
      <div class="scoring-panel">
        ${renderScoringButtons()}
      </div>
    </div>
  `;

  attachScoringEvents(match, inn);
}

function renderScoreHeader(match, inn) {
  const overs    = formatOvers(inn.balls);
  const maxOvers = match.info.overs;
  const rr       = calcRunRate(inn.score, inn.balls);
  const isSecond = match.currentInnings === 1;
  const target   = isSecond ? match.innings[0].score + 1 : null;
  const rrr      = isSecond ? calcRRR(target, inn.score, maxOvers * 6, inn.balls) : null;
  const oversPct = isSecond
    ? Math.min((inn.score / target) * 100, 100)
    : (inn.balls / (maxOvers * 6)) * 100;
  const ballsLeft = (maxOvers * 6) - inn.balls;
  const wktsLeft  = 10 - inn.wickets;

  return `
    <div class="score-header">
      <div class="score-header-top">
        <div class="score-match-info">
          ${match.info.teamA.name}
          <span style="color:var(--text-muted);margin:0 4px;">vs</span>
          ${match.info.teamB.name}
        </div>
        <div class="score-innings-label">${match.currentInnings === 0 ? '1st' : '2nd'} Inn</div>
      </div>

      <div class="score-display">
        <div>
          <div style="display:flex;align-items:flex-end;gap:2px;">
            <div class="score-runs" id="live-score">${inn.score}</div>
            <div class="score-wickets">/${inn.wickets}</div>
          </div>
          <div class="score-meta">
            <div class="score-overs">⏱ ${overs} / ${maxOvers} ov</div>
            <div class="score-rr">CRR <strong style="color:var(--color-accent);">${rr}</strong></div>
          </div>
        </div>

        <!-- Right: mini stat chips -->
        <div style="margin-left:auto;display:flex;flex-direction:column;gap:6px;align-items:flex-end;">
          <div style="display:flex;gap:6px;">
            <div style="padding:4px 9px;background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.25);border-radius:var(--radius-full);font-size:11px;font-weight:800;color:var(--color-danger);">
              ${wktsLeft}🏏
            </div>
            <div style="padding:4px 9px;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.25);border-radius:var(--radius-full);font-size:11px;font-weight:800;color:var(--color-primary);">
              ${ballsLeft}⚡
            </div>
          </div>
          <div style="display:flex;gap:6px;">
            <button class="btn-icon" id="btn-scorecard" title="Scorecard"
              style="width:36px;height:36px;font-size:15px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;"
            >📋</button>
            <button class="btn-icon" id="btn-finish-innings" title="End Innings"
              style="width:36px;height:36px;font-size:11px;font-weight:700;font-family:var(--font-body);background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.3);border-radius:10px;color:var(--color-danger);"
            >End</button>
          </div>
        </div>
      </div>

      ${isSecond && target ? `
      <div class="score-target-bar">
        <div class="score-target-text">Need <strong style="color:var(--text-primary);">${Math.max(0, target - inn.score)}</strong> off ${ballsLeft} balls</div>
        <div class="score-target-progress">
          <div class="score-target-fill" style="width:${oversPct}%"></div>
        </div>
        <div class="score-rrr">RRR ${rrr}</div>
      </div>` : `
      <div style="height:4px;background:linear-gradient(90deg, var(--color-primary) ${oversPct}%, rgba(255,255,255,0.06) ${oversPct}%);border-radius:var(--radius-full);margin-top:var(--space-2);transition:background 0.4s ease;"></div>
      `}
    </div>
  `;
}

function renderBattingPanel(inn) {
  const strikerIdx   = inn.currentBatsmen[0];
  const nonStrikerIdx = inn.currentBatsmen[1];
  const striker      = inn.batsmen[strikerIdx];
  const nonStriker   = inn.batsmen[nonStrikerIdx];

  function batterHTML(batter, isStriker) {
    if (!batter) return `
      <div class="batter-info">
        <div style="font-size:12px;color:var(--text-muted);">—</div>
      </div>`;
    return `
      <div class="batter-info ${isStriker ? 'striker' : ''}">
        ${isStriker ? '<div class="striker-dot"></div>' : ''}
        <div>
          <div class="batter-name">${batter.name}${isStriker ? ' *' : ''}</div>
          <div class="batter-score">
            ${batter.runs}
            <small>(${batter.balls})</small>
          </div>
          <div style="font-size:10px;color:var(--text-muted);">${batter.fours}×4 &nbsp; ${batter.sixes}×6</div>
        </div>
      </div>
    `;
  }

  return `
    <div class="batting-panel" id="batting-panel">
      ${batterHTML(striker, true)}
      ${batterHTML(nonStriker, false)}
    </div>
  `;
}

function renderBowlerPanel(inn) {
  const bowler = inn.bowlers[inn.currentBowler];
  if (!bowler) return `<div class="bowler-panel"><div class="bowler-label">Bowler</div><div class="bowler-name">—</div></div>`;
  const overs = Math.floor(bowler.legalBalls / 6) + '.' + (bowler.legalBalls % 6);
  return `
    <div class="bowler-panel" id="bowler-panel">
      <div class="bowler-label">🎳 Bowling</div>
      <div>
        <div class="bowler-name">${bowler.name}</div>
        <div style="font-size:10px;color:var(--text-muted);">${bowler.wickets} wkt${bowler.wickets!==1?'s':''}</div>
      </div>
      <div class="bowler-stats">${overs}-${bowler.maidens}-${bowler.runs}-${bowler.wickets}</div>
      <button class="btn btn-ghost" id="btn-change-bowler" style="font-size:var(--text-xs);padding:4px 8px;min-height:auto;margin-left:var(--space-2);">Change</button>
    </div>
  `;
}

function renderLastOverPanel(inn) {
  const balls = inn.currentOverBalls || [];
  const dotsHTML = balls.map(b => `
    <div class="over-dot ${getDotClass(b)}">${getBallText(b)}</div>
  `).join('') || '<span style="font-size:var(--text-xs);color:var(--text-muted);">Start of over</span>';

  return `
    <div class="last-over-panel" id="last-over-panel">
      <div class="last-over-label">This Over</div>
      <div class="over-dots">${dotsHTML}</div>
    </div>
  `;
}

function renderScoringButtons() {
  return `
    <!-- Runs: 0–3 -->
    <div class="section-sep">Runs</div>
    <div class="score-btn-grid">
      ${[0,1,2,3].map(r => `
        <button class="score-btn score-btn-run ripple-container" data-run="${r}" style="font-size:var(--text-2xl);">${r}</button>
      `).join('')}
    </div>

    <!-- Boundaries: 4 & 6 -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:var(--space-3);">
      <button class="score-btn score-btn-run run-4 ripple-container" data-run="4" style="min-height:68px;">
        <span style="font-size:var(--text-4xl);line-height:1;">4</span>
        <span style="font-size:10px;color:rgba(74,222,128,0.7);font-weight:700;letter-spacing:1px;">FOUR</span>
      </button>
      <button class="score-btn score-btn-run run-6 ripple-container" data-run="6" style="min-height:68px;">
        <span style="font-size:var(--text-4xl);line-height:1;">6</span>
        <span style="font-size:10px;color:rgba(250,204,21,0.7);font-weight:700;letter-spacing:1px;">SIX</span>
      </button>
    </div>

    <!-- Extras -->
    <div class="section-sep">Extras</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:var(--space-3);">
      <button class="score-btn score-btn-extra" id="btn-wide">
        <span style="font-size:16px;">↔</span>
        <span style="font-size:var(--text-sm);">Wide</span>
      </button>
      <button class="score-btn score-btn-extra" id="btn-noball">
        <span style="font-size:16px;">🚫</span>
        <span style="font-size:var(--text-sm);">No Ball</span>
      </button>
      <button class="score-btn score-btn-extra" id="btn-bye">
        <span style="font-size:16px;">↗</span>
        <span style="font-size:var(--text-sm);">Bye</span>
      </button>
      <button class="score-btn score-btn-extra" id="btn-legbye">
        <span style="font-size:16px;">↙</span>
        <span style="font-size:var(--text-sm);">Leg Bye</span>
      </button>
    </div>

    <!-- Wicket / Actions -->
    <div class="section-sep">Special</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:var(--space-3);">
      <button class="score-btn score-btn-wicket" id="btn-wicket" style="min-height:64px;">
        <span style="font-size:20px;">⚡</span>
        <span style="font-size:var(--text-sm);font-weight:800;">Wicket</span>
      </button>
      <button class="score-btn score-btn-wicket" id="btn-runout" style="min-height:64px;">
        <span style="font-size:20px;">🏃</span>
        <span style="font-size:var(--text-sm);font-weight:800;">Run Out</span>
      </button>
      <button class="score-btn score-btn-undo" id="btn-undo">
        <span>↩</span>
        <span style="font-size:var(--text-sm);">Undo</span>
      </button>
      <button class="score-btn score-btn-action" id="btn-next-over">
        <span>→</span>
        <span style="font-size:var(--text-sm);">Next Over</span>
      </button>
    </div>

    <div style="height:24px;"></div>
  `;
}

// ─── Events ────────────────────────────────────────────────
function attachScoringEvents(match, inn) {
  // Run buttons
  _el.querySelectorAll('[data-run]').forEach(btn => {
    btn.addEventListener('click', () => {
      const runs = parseInt(btn.dataset.run);
      handleBall({ type: 'run', runs }, btn);
    });
  });

  // Extras
  _el.querySelector('#btn-wide')?.addEventListener('click', () =>
    showExtraModal('wide', 'Wide'));
  _el.querySelector('#btn-noball')?.addEventListener('click', () =>
    showExtraModal('noball', 'No Ball'));
  _el.querySelector('#btn-bye')?.addEventListener('click', () =>
    showExtraModal('bye', 'Bye'));
  _el.querySelector('#btn-legbye')?.addEventListener('click', () =>
    showExtraModal('legbye', 'Leg Bye'));

  // Wicket
  _el.querySelector('#btn-wicket')?.addEventListener('click', () =>
    showWicketModal('wicket'));
  _el.querySelector('#btn-runout')?.addEventListener('click', () =>
    showWicketModal('runout'));

  // Undo
  _el.querySelector('#btn-undo')?.addEventListener('click', () => {
    const ok = undoLastBall();
    if (ok) { showToast('Ball undone ↩', 'default'); refreshScoringUI(); }
    else showToast('Nothing to undo', 'danger');
  });

  // Next Over
  _el.querySelector('#btn-next-over')?.addEventListener('click', () => {
    const inn = getCurrentInnings();
    if (!inn) return;
    const legalBalls = inn.bowlers[inn.currentBowler]?.legalBalls || 0;
    if (legalBalls % 6 !== 0) {
      showToast('Complete 6 legal balls to end over', 'danger'); return;
    }
    showChangeBowlerModal(match);
  });

  // Change bowler
  _el.querySelector('#btn-change-bowler')?.addEventListener('click', () =>
    showChangeBowlerModal(match));

  // Scorecard link
  _el.querySelector('#btn-scorecard')?.addEventListener('click', () =>
    navigateTo('scorecard'));

  // Finish innings
  _el.querySelector('#btn-finish-innings')?.addEventListener('click', () => {
    import('../utils.js').then(({ showConfirm }) => {
      showConfirm('End Innings', 'Are you sure you want to end the innings now?', () => {
        finishInnings(match);
      });
    });
  });
}

// ─── Ball Handler ──────────────────────────────────────────
function handleBall(event, btnEl = null) {
  const match = getCurrentMatch();
  const inn   = getCurrentInnings();
  if (!inn || inn.status === 'complete') return;

  // Check if we need a new batsman (wicket fell)
  if (inn.currentBatsmen[0] === null || !inn.batsmen[inn.currentBatsmen[0]]) {
    showToast('Select new batsman first', 'danger');
    showNewBatsmanModal(match);
    return;
  }

  // Haptic feedback
  vibrate([8]);

  // Flash the score area
  const scoreEl = _el?.querySelector('#live-score');
  if (scoreEl) scoreEl.classList.add('score-flash');
  setTimeout(() => scoreEl?.classList.remove('score-flash'), 600);

  // Push undo snapshot
  pushUndoSnapshot();

  // Record the ball
  const result = recordBall(event);

  // Check innings over
  if (result?.inningsOver) {
    handleInningsOver(match);
    return;
  }

  // Check if wicket fell (need new batsman)
  const updatedInn = getCurrentInnings();
  if (event.type === 'wicket' && updatedInn?.wickets < 10) {
    showToast('⚡ WICKET!', 'danger');
    vibrate([30, 50, 30]);
    setTimeout(() => showNewBatsmanModal(match), 500);
  }

  // Refresh UI
  refreshScoringUI();

  // Auto-save
  saveMatch(getCurrentMatch());
}

function refreshScoringUI() {
  const match = getCurrentMatch();
  if (!match) return;
  renderScoringShell(match);
}

// ─── Modals ────────────────────────────────────────────────

/** Opening batsmen & bowler setup */
function showOpeningSetupModal(match, onDone) {
  const inn       = getCurrentInnings();
  const teamA     = match.info.teamA;
  const teamB     = match.info.teamB;
  const battingTeam  = inn.battingTeam;
  const bowlingTeam  = inn.bowlingTeam;
  const battingPlayers = battingTeam === teamA.name ? teamA.players : teamB.players;
  const bowlingPlayers = bowlingTeam === teamA.name ? teamA.players : teamB.players;

  function playerOptions(players) {
    if (!players || players.length === 0) {
      // Fallback inputs if no players set
      return '';
    }
    return players.map(p => `<option value="${p}">${p}</option>`).join('');
  }

  function playerInput(id, label, players) {
    if (players && players.length > 0) {
      return `
        <div class="form-group">
          <label class="form-label required">${label}</label>
          <select class="form-select" id="${id}">
            <option value="">Select player…</option>
            ${playerOptions(players)}
          </select>
        </div>
      `;
    }
    return `
      <div class="form-group">
        <label class="form-label required">${label}</label>
        <input type="text" class="form-input" id="${id}" placeholder="Enter player name" />
      </div>
    `;
  }

  showModal(`
    <div class="modal-title">🏏 Start Innings</div>
    <p style="color:var(--text-muted);font-size:var(--text-sm);margin-bottom:var(--space-4);">
      <strong style="color:var(--text-primary);">${battingTeam}</strong> are batting first.
    </p>

    ${playerInput('opening-striker', `⚡ Opener (Striker) — ${battingTeam}`, battingPlayers)}
    ${playerInput('opening-non-striker', `Non-Striker — ${battingTeam}`, battingPlayers)}
    ${playerInput('opening-bowler', `Opening Bowler — ${bowlingTeam}`, bowlingPlayers)}

    <div class="modal-actions">
      <button class="btn btn-primary btn-full" id="opening-start-btn">Start Innings</button>
    </div>
  `);

  document.getElementById('opening-start-btn')?.addEventListener('click', () => {
    const s   = getVal('opening-striker');
    const ns  = getVal('opening-non-striker');
    const b   = getVal('opening-bowler');

    if (!s || !ns || !b) { showToast('Fill all fields', 'danger'); return; }
    if (s === ns)         { showToast('Striker & non-striker must differ', 'danger'); return; }

    setOpeningBatsmen(s, ns);
    setOpeningBowler(b);
    saveMatch(getCurrentMatch());
    hideModal();
    onDone();
  });
}

function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

/** Extra run selection modal */
function showExtraModal(type, label) {
  showModal(`
    <div class="modal-title">${label}</div>
    <p style="color:var(--text-muted);font-size:var(--text-sm);margin-bottom:var(--space-4);">
      How many runs scored off this ${label.toLowerCase()}?
    </p>
    <div class="score-btn-grid" style="margin-bottom:var(--space-4);">
      ${[0,1,2,3,4].map(r => `
        <button class="score-btn score-btn-run extra-run-btn" data-runs="${r}"
                style="min-height:52px;font-size:var(--text-xl);">${r}</button>
      `).join('')}
    </div>
    <button class="btn btn-outline btn-full" id="extra-cancel">Cancel</button>
  `);

  document.querySelectorAll('.extra-run-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const runs = parseInt(btn.dataset.runs);
      hideModal();
      if (type === 'wide') {
        handleBall({ type: 'wide', extras: 1 + runs, runs: 0 });
      } else if (type === 'noball') {
        handleBall({ type: 'noball', runs, extras: 1 });
      } else if (type === 'bye') {
        handleBall({ type: 'bye', runs });
      } else if (type === 'legbye') {
        handleBall({ type: 'legbye', runs });
      }
    });
  });

  document.getElementById('extra-cancel')?.addEventListener('click', hideModal);
}

/** Wicket modal */
function showWicketModal(typeHint = 'wicket') {
  const match = getCurrentMatch();
  const inn   = getCurrentInnings();
  if (!inn) return;

  const strikerName = inn.batsmen[inn.currentBatsmen[0]]?.name || 'Striker';
  const nonStrikerName = inn.batsmen[inn.currentBatsmen[1]]?.name || 'Non-Striker';

  const types = [
    { id: 'bowled',    label: 'Bowled' },
    { id: 'caught',    label: 'Caught' },
    { id: 'lbw',       label: 'LBW' },
    { id: 'stumped',   label: 'Stumped' },
    { id: 'runout',    label: 'Run Out' },
    { id: 'hitwicket', label: 'Hit Wicket' }
  ];

  showModal(`
    <div class="modal-title">⚡ Wicket!</div>
    <div class="form-group" style="margin-bottom:var(--space-4);">
      <label class="form-label required">Batsman Out</label>
      <select class="form-select" id="wicket-batsman">
        <option value="${inn.currentBatsmen[0]}">${strikerName} (Striker)</option>
        <option value="${inn.currentBatsmen[1]}">${nonStrikerName} (Non-Striker)</option>
      </select>
    </div>
    <div class="form-group" style="margin-bottom:var(--space-4);">
      <label class="form-label required">Dismissal Type</label>
      <div class="wicket-type-grid" id="wicket-type-grid">
        ${types.map(t => `
          <button class="wicket-type-btn ${t.id === typeHint ? 'selected' : ''}" data-type="${t.id}">
            ${t.label}
          </button>
        `).join('')}
      </div>
    </div>
    <div class="form-group" style="margin-bottom:var(--space-4);">
      <label class="form-label">Runs scored before wicket</label>
      <div class="score-btn-grid">
        ${[0,1,2,3,4].map(r => `
          <button class="score-btn score-btn-run wicket-run-btn ${r===0?'selected':''}" data-r="${r}"
                  style="min-height:44px;font-size:var(--text-lg);">${r}</button>
        `).join('')}
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline btn-full" id="wicket-cancel">Cancel</button>
      <button class="btn btn-danger btn-full" id="wicket-confirm">Record Wicket</button>
    </div>
  `);

  let selectedType = types.find(t => t.id === typeHint)?.id || 'bowled';
  let selectedRuns = 0;

  document.querySelectorAll('.wicket-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.wicket-type-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedType = btn.dataset.type;
    });
  });

  document.querySelectorAll('.wicket-run-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.wicket-run-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedRuns = parseInt(btn.dataset.r);
    });
  });

  document.getElementById('wicket-cancel')?.addEventListener('click', hideModal);
  document.getElementById('wicket-confirm')?.addEventListener('click', () => {
    const batsmanIdx = parseInt(document.getElementById('wicket-batsman')?.value || '0');
    const batter = inn.batsmen[batsmanIdx];
    hideModal();
    handleBall({
      type: 'wicket',
      runs: selectedRuns,
      dismissal: selectedType,
      batsmanIdx,
      batsmanName: batter?.name || ''
    });
  });
}

/** New batsman modal */
function showNewBatsmanModal(match) {
  const inn         = getCurrentInnings();
  const battingTeam = inn?.battingTeam;
  const teamInfo    = battingTeam === match.info.teamA.name ? match.info.teamA : match.info.teamB;
  const usedNames   = inn?.batsmen?.map(b => b.name) || [];
  const available   = (teamInfo.players || []).filter(p => !usedNames.includes(p));

  function playerInput() {
    if (available.length > 0) {
      return `
        <select class="form-select" id="new-batsman-input">
          <option value="">Select batsman…</option>
          ${available.map(p => `<option value="${p}">${p}</option>`).join('')}
        </select>
      `;
    }
    return `<input type="text" class="form-input" id="new-batsman-input" placeholder="Enter batsman name" />`;
  }

  showModal(`
    <div class="modal-title">🏏 New Batsman</div>
    <p style="color:var(--text-muted);font-size:var(--text-sm);margin-bottom:var(--space-4);">
      Wicket fell! Send in the next batsman.
    </p>
    <div class="form-group" style="margin-bottom:var(--space-4);">
      <label class="form-label required">Batsman</label>
      ${playerInput()}
    </div>
    <div class="modal-actions">
      <button class="btn btn-primary btn-full" id="new-batsman-confirm">Send In</button>
    </div>
  `);

  document.getElementById('new-batsman-confirm')?.addEventListener('click', () => {
    const name = getVal('new-batsman-input');
    if (!name) { showToast('Enter batsman name', 'danger'); return; }
    bringInBatsman(name);
    saveMatch(getCurrentMatch());
    hideModal();
    refreshScoringUI();
  });
}

/** Change bowler modal */
function showChangeBowlerModal(match) {
  const inn         = getCurrentInnings();
  const bowlingTeam = inn?.bowlingTeam;
  const teamInfo    = bowlingTeam === match.info.teamA.name ? match.info.teamA : match.info.teamB;
  const lastBowler  = inn?.bowlers[inn.currentBowler]?.name;
  const available   = (teamInfo.players || []).filter(p => p !== lastBowler);

  function bowlerInput() {
    if (available.length > 0) {
      return `
        <select class="form-select" id="new-bowler-input">
          <option value="">Select bowler…</option>
          ${available.map(p => `<option value="${p}">${p}</option>`).join('')}
          ${(teamInfo.players || []).length > 0 ? `<optgroup label="Previous bowlers">
            ${(inn?.bowlers || []).filter(b => b.name !== lastBowler).map(b =>
              `<option value="${b.name}">${b.name} (${Math.floor(b.legalBalls/6)}.${b.legalBalls%6} ov)</option>`
            ).join('')}
          </optgroup>` : ''}
        </select>
      `;
    }
    return `<input type="text" class="form-input" id="new-bowler-input" placeholder="Enter bowler name" />`;
  }

  showModal(`
    <div class="modal-title">🎳 Change Bowler</div>
    <div class="form-group" style="margin-bottom:var(--space-4);">
      <label class="form-label required">Next Bowler</label>
      ${bowlerInput()}
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" id="bowler-cancel">Cancel</button>
      <button class="btn btn-primary btn-full" id="bowler-confirm">Confirm</button>
    </div>
  `);

  document.getElementById('bowler-cancel')?.addEventListener('click', hideModal);
  document.getElementById('bowler-confirm')?.addEventListener('click', () => {
    const name = getVal('new-bowler-input');
    if (!name) { showToast('Select a bowler', 'danger'); return; }
    if (name === lastBowler) { showToast('Same bowler cannot bowl consecutive overs', 'danger'); return; }
    changeBowler(name);
    hideModal();
    refreshScoringUI();
  });
}

/** Innings over handling */
function handleInningsOver(match) {
  vibrate([30, 100, 30]);
  if (match.currentInnings === 0) {
    const inn = match.innings[0];
    showToast(`Innings over! ${inn.battingTeam}: ${inn.score}/${inn.wickets}`, 'success', 3000);
    setTimeout(() => {
      showModal(`
        <div class="modal-title">🏏 1st Innings Over!</div>
        <div style="text-align:center;padding:var(--space-4) 0;">
          <div style="font-family:var(--font-display);font-size:var(--text-4xl);font-weight:700;color:var(--text-primary);">
            ${inn.score}/${inn.wickets}
          </div>
          <div style="color:var(--text-muted);margin-top:4px;">${inn.battingTeam} &nbsp;·&nbsp; ${formatOvers(inn.balls)} overs</div>
          <div style="margin-top:var(--space-4);color:var(--text-secondary);">
            ${match.innings[1] ? match.innings[1].battingTeam : 'Team 2'} need <strong style="color:var(--color-accent);">${inn.score + 1}</strong> to win
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-primary btn-full" id="start-2nd-innings">Start 2nd Innings</button>
        </div>
      `);
      document.getElementById('start-2nd-innings')?.addEventListener('click', () => {
        hideModal();
        renderScoring(); // re-render for 2nd innings setup
      });
    }, 500);
  } else {
    // Match complete
    saveMatch(getCurrentMatch());
    showModal(`
      <div class="modal-title">🏆 Match Complete!</div>
      <div style="text-align:center;padding:var(--space-4) 0;font-family:var(--font-display);">
        <div style="font-size:var(--text-4xl);">🏆</div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-primary btn-full" id="go-summary">View Summary</button>
        <button class="btn btn-outline btn-full" id="go-home-from-match">Home</button>
      </div>
    `);
    document.getElementById('go-summary')?.addEventListener('click', () => {
      hideModal(); navigateTo('summary');
    });
    document.getElementById('go-home-from-match')?.addEventListener('click', () => {
      hideModal(); navigateTo('home');
    });
  }
}

function finishInnings(match) {
  completeInnings();
  saveMatch(getCurrentMatch());
  handleInningsOver(match);
}
