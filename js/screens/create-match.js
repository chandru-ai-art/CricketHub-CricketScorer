/**
 * CricketHub — screens/create-match.js
 * Multi-step match creation wizard
 */

import { navigateTo, goBack } from '../router.js';
import { createMatch, setTossResult, getState } from '../state.js';
import { showToast, generateId } from '../utils.js';
import { saveMatch } from '../db.js';

// Wizard state
let _step = 1;
let _matchData = null;
const TOTAL_STEPS = 3;

export function renderCreateMatch() {
  _step = 1;
  _matchData = {
    info: {
      teamA: { name: '', players: [] },
      teamB: { name: '', players: [] },
      tournament: '', venue: '', date: new Date().toISOString().split('T')[0],
      overs: 20, ballType: 'leather', matchType: 'T20',
    }
  };

  const el = document.getElementById('screen-create-match');
  el.innerHTML = `
    <div class="app-header">
      <button class="back-btn" id="cm-back">←</button>
      <div class="header-title">New Match</div>
    </div>

    <!-- Progress indicator -->
    <div class="create-match-progress" id="cm-progress"></div>

    <!-- Steps -->
    <div id="cm-steps" style="flex:1;overflow-y:auto;padding-bottom:80px;">
      ${renderStep1()}
      ${renderStep2('A')}
      ${renderStep3()}
    </div>

    <!-- Navigation -->
    <div class="step-nav">
      <button class="btn btn-outline" id="cm-prev" style="flex:0 0 auto;width:48px;min-height:48px;padding:0;">←</button>
      <button class="btn btn-primary btn-full" id="cm-next">Continue</button>
    </div>
  `;

  updateStep();
  attachCreateMatchEvents(el);
}

function renderStep1() {
  return `
    <div class="step-content active" data-step="1">
      <div class="step-header" style="padding:0 var(--space-4);margin-top:var(--space-4);">
        <div class="step-title">Match Info</div>
        <div class="step-subtitle">Set up match details</div>
      </div>
      <div style="padding:var(--space-4);display:flex;flex-direction:column;gap:var(--space-4);">
        <div class="form-group">
          <label class="form-label required">Match Type</label>
          <select class="form-select" id="cm-match-type">
            <option value="T10">T10</option>
            <option value="T20" selected>T20</option>
            <option value="ODI">ODI (50 overs)</option>
            <option value="Test">Test</option>
            <option value="Custom">Custom</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label required">Overs per Side</label>
          <input type="number" class="form-input" id="cm-overs" value="20" min="1" max="50" inputmode="numeric" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Ball Type</label>
            <select class="form-select" id="cm-ball-type">
              <option value="leather">Leather</option>
              <option value="tennis">Tennis</option>
              <option value="rubber">Rubber</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Date</label>
            <input type="date" class="form-input" id="cm-date" value="${new Date().toISOString().split('T')[0]}" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Tournament / Series</label>
          <input type="text" class="form-input" id="cm-tournament" placeholder="e.g. Street Cricket League" />
        </div>
        <div class="form-group">
          <label class="form-label">Venue</label>
          <input type="text" class="form-input" id="cm-venue" placeholder="e.g. Maidan Ground" />
        </div>
      </div>
    </div>
  `;
}

function renderStep2(team = 'A') {
  // Show team A first, then team B
  const label = team === 'A' ? 'Team A' : 'Team B';
  const id     = team === 'A' ? '2a' : '2b';
  const stepNum = team === 'A' ? 2 : 2; // both use step 2 data-attr

  return `
    <div class="step-content" data-step="${id === '2a' ? 2 : '2b'}">
      <div class="step-header" style="padding:0 var(--space-4);margin-top:var(--space-4);">
        <div class="step-title">${label} Setup</div>
        <div class="step-subtitle">Add team name and players</div>
      </div>
      <div style="padding:var(--space-4);display:flex;flex-direction:column;gap:var(--space-4);">
        <div class="form-group">
          <label class="form-label required">Team ${team} Name</label>
          <input type="text" class="form-input" id="cm-team${team}-name" placeholder="e.g. Mumbai Indians" />
        </div>
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">
            <label class="form-label" style="margin:0;">Players <span style="color:var(--text-muted);font-weight:400;">(optional)</span></label>
            <button class="btn btn-ghost" id="cm-add-player-${team}" style="font-size:var(--text-sm);color:var(--color-success);padding:4px 8px;min-height:auto;">+ Add Player</button>
          </div>
          <div id="cm-players-${team}">
            ${renderPlayerInputs(team, 11)}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderStep3() {
  return `
    <div class="step-content" data-step="3">
      <div class="step-header" style="padding:0 var(--space-4);margin-top:var(--space-4);">
        <div class="step-title">Team B Setup</div>
        <div class="step-subtitle">Add second team name and players</div>
      </div>
      <div style="padding:var(--space-4);display:flex;flex-direction:column;gap:var(--space-4);">
        <div class="form-group">
          <label class="form-label required">Team B Name</label>
          <input type="text" class="form-input" id="cm-teamB-name" placeholder="e.g. Chennai Super Kings" />
        </div>
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">
            <label class="form-label" style="margin:0;">Players <span style="color:var(--text-muted);font-weight:400;">(optional)</span></label>
            <button class="btn btn-ghost" id="cm-add-player-B" style="font-size:var(--text-sm);color:var(--color-success);padding:4px 8px;min-height:auto;">+ Add Player</button>
          </div>
          <div id="cm-players-B">
            ${renderPlayerInputs('B', 11)}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderPlayerInputs(team, count) {
  let html = '';
  for (let i = 1; i <= count; i++) {
    html += `
      <div class="player-entry" id="player-${team}-${i}">
        <div class="player-num">${i}</div>
        <input type="text" class="form-input player-name-input" data-team="${team}" data-idx="${i}"
               placeholder="Player ${i} name" autocomplete="off" />
        ${i > 1 ? `<button class="remove-player-btn" data-team="${team}" data-idx="${i}">✕</button>` : ''}
      </div>
    `;
  }
  return html;
}

function updateStep() {
  const el = document.getElementById('screen-create-match');
  if (!el) return;

  // Update progress bar
  const progress = el.querySelector('#cm-progress');
  if (progress) {
    progress.innerHTML = Array.from({ length: TOTAL_STEPS }, (_, i) => `
      <div class="progress-step ${i + 1 < _step ? 'done' : i + 1 === _step ? 'active' : ''}"></div>
    `).join('');
  }

  // Show/hide steps
  const stepContents = el.querySelectorAll('.step-content');
  stepContents.forEach(s => {
    const stepAttr = s.dataset.step;
    const isActive = (
      (_step === 1 && stepAttr === '1') ||
      (_step === 2 && stepAttr === '2') ||
      (_step === 3 && stepAttr === '3')
    );
    s.classList.toggle('active', isActive);
  });

  // Update buttons
  const prevBtn = el.querySelector('#cm-prev');
  const nextBtn = el.querySelector('#cm-next');
  if (prevBtn) prevBtn.disabled = _step === 1;
  if (nextBtn) nextBtn.textContent = _step === TOTAL_STEPS ? '🏏 Start Match' : 'Continue';
}

function attachCreateMatchEvents(el) {
  // Back button
  el.querySelector('#cm-back')?.addEventListener('click', () => goBack());

  // Match type → overs auto-fill
  el.querySelector('#cm-match-type')?.addEventListener('change', (e) => {
    const overs = { T10: 10, T20: 20, ODI: 50, Test: 90 };
    const oversInput = el.querySelector('#cm-overs');
    if (overs[e.target.value] && oversInput) {
      oversInput.value = overs[e.target.value];
    }
  });

  // Prev/Next
  el.querySelector('#cm-prev')?.addEventListener('click', () => {
    if (_step > 1) { _step--; updateStep(); }
    else goBack();
  });

  el.querySelector('#cm-next')?.addEventListener('click', () => handleNext(el));

  // Add player buttons
  el.querySelector('#cm-add-player-A')?.addEventListener('click', () => addPlayerRow(el, 'A'));
  el.querySelector('#cm-add-player-B')?.addEventListener('click', () => addPlayerRow(el, 'B'));

  // Remove player buttons (event delegation)
  el.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-player-btn')) {
      const row = e.target.closest('.player-entry');
      if (row) row.remove();
    }
  });
}

function addPlayerRow(el, team) {
  const container = el.querySelector(`#cm-players-${team}`);
  if (!container) return;
  const existing = container.querySelectorAll('.player-entry').length;
  const idx = existing + 1;
  const div = document.createElement('div');
  div.className = 'player-entry';
  div.id = `player-${team}-${idx}`;
  div.innerHTML = `
    <div class="player-num">${idx}</div>
    <input type="text" class="form-input player-name-input" data-team="${team}" data-idx="${idx}"
           placeholder="Player ${idx} name" autocomplete="off" />
    <button class="remove-player-btn" data-team="${team}" data-idx="${idx}">✕</button>
  `;
  container.appendChild(div);
}

function collectPlayers(el, team) {
  const inputs = el.querySelectorAll(`.player-name-input[data-team="${team}"]`);
  return Array.from(inputs)
    .map(i => i.value.trim())
    .filter(Boolean);
}

function handleNext(el) {
  if (_step === 1) {
    // Validate step 1
    const matchType  = el.querySelector('#cm-match-type')?.value;
    const overs      = parseInt(el.querySelector('#cm-overs')?.value || '20');
    const ballType   = el.querySelector('#cm-ball-type')?.value;
    const date       = el.querySelector('#cm-date')?.value;
    const tournament = el.querySelector('#cm-tournament')?.value?.trim();
    const venue      = el.querySelector('#cm-venue')?.value?.trim();

    if (!overs || overs < 1 || overs > 90) {
      showToast('Please enter valid overs (1–90)', 'danger');
      return;
    }

    _matchData.info.matchType  = matchType;
    _matchData.info.overs      = overs;
    _matchData.info.ballType   = ballType;
    _matchData.info.date       = date;
    _matchData.info.tournament = tournament;
    _matchData.info.venue      = venue;

    _step = 2;
    updateStep();

  } else if (_step === 2) {
    // Validate Team A
    const teamAName = el.querySelector('#cm-teamA-name')?.value?.trim();
    if (!teamAName) {
      showToast('Please enter Team A name', 'danger');
      el.querySelector('#cm-teamA-name')?.focus();
      return;
    }
    _matchData.info.teamA = {
      name: teamAName,
      players: collectPlayers(el, 'A')
    };
    _step = 3;
    updateStep();

  } else if (_step === 3) {
    // Validate Team B
    const teamBName = el.querySelector('#cm-teamB-name')?.value?.trim();
    if (!teamBName) {
      showToast('Please enter Team B name', 'danger');
      el.querySelector('#cm-teamB-name')?.focus();
      return;
    }
    if (teamBName === _matchData.info.teamA.name) {
      showToast('Team names must be different', 'danger');
      return;
    }
    _matchData.info.teamB = {
      name: teamBName,
      players: collectPlayers(el, 'B')
    };

    // Create the match and navigate to toss
    const match = createMatch(_matchData.info);
    saveMatch(match);
    showToast('Match created! Now do the toss 🪙', 'success');
    navigateTo('toss');
  }
}
