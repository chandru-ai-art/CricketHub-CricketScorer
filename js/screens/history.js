/**
 * CricketHub — screens/history.js
 * Match History Screen
 */

import { navigateTo, goBack } from '../router.js';
import { getAllMatches, deleteById, put, STORES } from '../db.js';
import { setCurrentMatch, setAllMatches } from '../state.js';
import { formatDate, timeAgo, formatOvers, formatResult, showConfirm, showToast, debounce, deepClone, generateId } from '../utils.js';

export async function renderHistory(params = {}) {
  const el = document.getElementById('screen-history');

  let allMatches = await getAllMatches();
  setAllMatches(allMatches);

  let searchQuery = '';

  function filteredMatches() {
    if (!searchQuery) return allMatches;
    const q = searchQuery.toLowerCase();
    return allMatches.filter(m =>
      m.info.teamA.name.toLowerCase().includes(q) ||
      m.info.teamB.name.toLowerCase().includes(q) ||
      (m.info.venue || '').toLowerCase().includes(q) ||
      (m.info.tournament || '').toLowerCase().includes(q)
    );
  }

  function render() {
    const matches = filteredMatches();
    el.innerHTML = `
      <div class="app-header">
        <button class="back-btn" id="hist-back">←</button>
        <div class="header-title">Match History</div>
        <div class="header-actions">
          <span style="font-size:var(--text-xs);color:var(--text-muted);">${allMatches.length} matches</span>
        </div>
      </div>

      <div style="padding:var(--space-4);padding-bottom:0;">
        <div class="search-input-wrapper">
          <span class="search-icon">🔍</span>
          <input type="text" class="form-input" id="hist-search"
                 placeholder="Search by team, venue, tournament…"
                 value="${searchQuery}" />
        </div>
      </div>

      <div class="screen-content">
        ${matches.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon">📋</div>
            <h3>${searchQuery ? 'No Results Found' : 'No Matches Yet'}</h3>
            <p>${searchQuery ? `No matches for "${searchQuery}"` : 'Start your first match to see history here'}</p>
            ${!searchQuery ? `<button class="btn btn-primary" id="hist-new-match">Start First Match</button>` : ''}
          </div>
        ` : matches.map(m => renderMatchCard(m)).join('')}
      </div>
    `;

    // Search
    const searchEl = el.querySelector('#hist-search');
    searchEl?.addEventListener('input', debounce((e) => {
      searchQuery = e.target.value.trim();
      render();
    }, 300));

    // Back
    el.querySelector('#hist-back')?.addEventListener('click', goBack);
    el.querySelector('#hist-new-match')?.addEventListener('click', () => navigateTo('create-match'));

    // Match card actions
    el.querySelectorAll('[data-match-id]').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.matchId;
        const match = allMatches.find(m => m.id === id);
        if (!match) return;
        setCurrentMatch(match);
        if (match.status === 'complete') {
          navigateTo('summary');
        } else {
          navigateTo('scoring');
        }
      });
    });

    el.querySelectorAll('[data-delete-id]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.deleteId;
        showConfirm('Delete Match', 'Permanently delete this match? This cannot be undone.', async () => {
          await deleteById(STORES.MATCHES, id);
          allMatches = allMatches.filter(m => m.id !== id);
          setAllMatches(allMatches);
          showToast('Match deleted', 'default');
          render();
        });
      });
    });

    el.querySelectorAll('[data-dup-id]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.dupId;
        const match = allMatches.find(m => m.id === id);
        if (!match) return;
        const dup = deepClone(match);
        dup.id = Date.now().toString(36) + Math.random().toString(36).substr(2,5);
        dup.createdAt = Date.now();
        dup.updatedAt = Date.now();
        dup.status = 'setup';
        dup.innings = [];
        dup.currentInnings = 0;
        dup.undoStack = [];
        await put(STORES.MATCHES, dup);
        allMatches = [dup, ...allMatches];
        setAllMatches(allMatches);
        showToast('Match duplicated!', 'success');
        render();
      });
    });

    el.querySelectorAll('[data-continue-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.continueId;
        const match = allMatches.find(m => m.id === id);
        if (!match) return;
        setCurrentMatch(match);
        navigateTo('scoring');
      });
    });
  }

  render();
}

function renderMatchCard(match) {
  const i1 = match.innings?.[0];
  const i2 = match.innings?.[1];
  const result = formatResult(match);
  const isComplete = match.status === 'complete';
  const isActive = !isComplete && match.innings?.length > 0;

  return `
    <div class="history-item" data-match-id="${match.id}">
      <div class="history-item-header">
        <div>
          <div class="history-teams">${match.info.teamA.name} vs ${match.info.teamB.name}</div>
          <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px;">
            ${match.info.venue ? `🏟️ ${match.info.venue} · ` : ''}
            ⚡ ${match.info.overs} overs
            ${match.info.matchType ? ` · ${match.info.matchType}` : ''}
          </div>
        </div>
        <div style="text-align:right;">
          <span class="badge ${isComplete ? 'badge-primary' : isActive ? 'badge-accent' : 'badge-muted'}">
            ${isComplete ? '✓ Done' : isActive ? '● Live' : 'Setup'}
          </span>
          <div class="history-date" style="margin-top:4px;">${timeAgo(match.updatedAt || match.createdAt)}</div>
        </div>
      </div>

      ${i1 ? `
      <div class="history-score-row">
        <div>
          <div style="font-size:var(--text-xs);color:var(--text-muted);">${i1.battingTeam}</div>
          <div class="history-score" style="color:var(--text-primary);">${i1.score}/${i1.wickets} <small style="font-size:var(--text-xs);color:var(--text-muted);">(${formatOvers(i1.balls)} ov)</small></div>
        </div>
        ${i2 ? `
        <div style="text-align:right;">
          <div style="font-size:var(--text-xs);color:var(--text-muted);">${i2.battingTeam}</div>
          <div class="history-score" style="color:var(--text-primary);">${i2.score}/${i2.wickets} <small style="font-size:var(--text-xs);color:var(--text-muted);">(${formatOvers(i2.balls)} ov)</small></div>
        </div>` : `
        <div style="text-align:right;font-size:var(--text-xs);color:var(--text-muted);">
          ${i1.bowlingTeam}<br>Yet to bat
        </div>`}
      </div>
      <div class="history-result ${result.includes('won') ? 'win' : ''}" style="margin-top:var(--space-2);">${result}</div>
      ` : `
      <div style="font-size:var(--text-xs);color:var(--text-muted);padding:var(--space-2) 0;">Match not started yet</div>
      `}

      <div class="history-item-actions">
        ${isActive ? `<button class="btn btn-primary" data-continue-id="${match.id}" style="flex:1;min-height:36px;font-size:var(--text-sm);">▶ Continue</button>` : ''}
        <button class="btn btn-outline" data-dup-id="${match.id}" style="flex:1;min-height:36px;font-size:var(--text-sm);">⎘ Duplicate</button>
        <button class="btn btn-ghost" data-delete-id="${match.id}" style="color:var(--color-danger);min-height:36px;font-size:var(--text-sm);flex:0 0 auto;padding:0 12px;">🗑️</button>
      </div>
    </div>
  `;
}
