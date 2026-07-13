/**
 * CricketHub — screens/toss.js
 * Toss Screen with animated coin flip
 */

import { navigateTo, goBack } from '../router.js';
import { getCurrentMatch, setTossResult } from '../state.js';
import { showToast, vibrate } from '../utils.js';
import { saveMatch } from '../db.js';

let _tossWinner = null;
let _tossDecision = null;
let _isFlipping = false;

export function renderToss() {
  const match = getCurrentMatch();
  if (!match) { navigateTo('home'); return; }

  const teamA = match.info.teamA.name;
  const teamB = match.info.teamB.name;

  const el = document.getElementById('screen-toss');
  el.innerHTML = `
    <div class="app-header" style="background:transparent;border:none;position:absolute;top:0;left:0;right:0;z-index:10;">
      <button class="back-btn" id="toss-back" style="background:rgba(255,255,255,0.1);">←</button>
      <div class="header-title" style="color:#fff;">Toss</div>
    </div>

    <div class="toss-screen">
      <div class="toss-content" style="padding-top:80px;">

        <div class="toss-title">🪙 Toss Time!</div>
        <p style="color:rgba(255,255,255,0.5);font-size:var(--text-sm);text-align:center;">
          ${teamA} vs ${teamB}
        </p>

        <!-- Coin -->
        <div class="coin-container" id="coin-container" title="Tap to flip">
          <div class="coin" id="coin">
            <div class="coin-face">🏏</div>
            <div class="coin-tail">🪙</div>
          </div>
        </div>
        <p class="toss-instruction" id="coin-instruction">Tap the coin to flip!</p>

        <!-- Result (shown after flip) -->
        <div id="toss-result-section" style="display:none;width:100%;animation:fadeInUp 0.4s ease;">
          <div style="text-align:center;margin-bottom:var(--space-4);">
            <div id="coin-result-text" style="font-family:var(--font-display);font-size:var(--text-xl);font-weight:700;color:var(--color-accent);margin-bottom:8px;"></div>
          </div>

          <div style="margin-bottom:var(--space-4);">
            <div style="font-size:var(--text-sm);color:rgba(255,255,255,0.5);margin-bottom:var(--space-2);text-align:center;">Who won the toss?</div>
            <div class="toss-options">
              <button class="toss-team-btn" id="toss-winner-A" data-team="${teamA}">${teamA}</button>
              <button class="toss-team-btn" id="toss-winner-B" data-team="${teamB}">${teamB}</button>
            </div>
          </div>

          <div id="toss-decision-wrap" style="display:none;margin-bottom:var(--space-4);">
            <div style="font-size:var(--text-sm);color:rgba(255,255,255,0.5);margin-bottom:var(--space-2);text-align:center;">
              <span id="winner-decided-name"></span> elected to...
            </div>
            <div class="toss-decision-row">
              <button class="toss-team-btn" id="toss-bat" data-decision="bat">🏏 Bat First</button>
              <button class="toss-team-btn" id="toss-bowl" data-decision="bowl">🎯 Bowl First</button>
            </div>
          </div>

          <button class="btn btn-accent btn-full btn-lg" id="toss-start" style="display:none;">
            Start Match 🏏
          </button>
        </div>

      </div>
    </div>
  `;

  attachTossEvents(el, teamA, teamB);
}

function attachTossEvents(el, teamA, teamB) {
  el.querySelector('#toss-back')?.addEventListener('click', goBack);

  // Coin flip
  const coinEl = el.querySelector('#coin');
  const coinContainer = el.querySelector('#coin-container');
  const instruction = el.querySelector('#coin-instruction');
  const resultSection = el.querySelector('#toss-result-section');
  const resultText    = el.querySelector('#coin-result-text');

  coinContainer?.addEventListener('click', () => {
    if (_isFlipping) return;
    _isFlipping = true;
    vibrate([20, 50, 20]);
    instruction.textContent = 'Flipping...';

    // Animate coin
    coinEl.classList.add('flip');
    const flips = 3 + Math.floor(Math.random() * 4); // 3-6 flips
    const result = Math.random() > 0.5 ? 'heads' : 'tails';

    setTimeout(() => {
      coinEl.classList.remove('flip');
      coinEl.className = `coin ${result}`;
      vibrate([30]);

      resultText.textContent = result === 'heads' ? '🏏 Heads!' : '🪙 Tails!';
      instruction.textContent = `It's ${result === 'heads' ? 'HEADS' : 'TAILS'}!`;
      resultSection.style.display = 'block';
      _isFlipping = false;
    }, 800);
  });

  // Winner selection
  el.querySelectorAll('.toss-team-btn[data-team]').forEach(btn => {
    btn.addEventListener('click', () => {
      el.querySelectorAll('[data-team]').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      _tossWinner = btn.dataset.team;
      vibrate([10]);

      const decisionWrap = el.querySelector('#toss-decision-wrap');
      const winnerName   = el.querySelector('#winner-decided-name');
      if (winnerName) winnerName.textContent = _tossWinner;
      if (decisionWrap) decisionWrap.style.display = 'block';
    });
  });

  // Decision selection
  el.querySelectorAll('[data-decision]').forEach(btn => {
    btn.addEventListener('click', () => {
      el.querySelectorAll('[data-decision]').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      _tossDecision = btn.dataset.decision;
      vibrate([10]);

      const startBtn = el.querySelector('#toss-start');
      if (startBtn) startBtn.style.display = 'block';
    });
  });

  // Start match
  el.querySelector('#toss-start')?.addEventListener('click', () => {
    if (!_tossWinner || !_tossDecision) {
      showToast('Please complete the toss first', 'danger');
      return;
    }

    setTossResult(_tossWinner, _tossDecision);
    const match = getCurrentMatch();
    if (match) saveMatch(match);

    const battingFirst = _tossDecision === 'bat' ? _tossWinner :
      (_tossWinner === match.info.teamA.name ? match.info.teamB.name : match.info.teamA.name);

    showToast(`${battingFirst} will bat first!`, 'success');
    navigateTo('scoring');
  });
}
