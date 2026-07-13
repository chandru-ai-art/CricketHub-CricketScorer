/**
 * CricketHub — screens/team.js
 * Team & Player Management
 */

import { navigateTo, goBack } from '../router.js';
import { getTeams, setAllTeams } from '../state.js';
import { getAll, put, deleteById, STORES } from '../db.js';
import { showToast, showConfirm, getInitials, showModal, hideModal } from '../utils.js';

export async function renderTeam() {
  const el = document.getElementById('screen-team');

  const teams = await getAll(STORES.TEAMS);
  setAllTeams(teams);

  el.innerHTML = `
    <div class="app-header">
      <button class="back-btn" id="team-back">←</button>
      <div class="header-title">Teams</div>
      <div class="header-actions">
        <button class="btn-icon" id="team-add-btn" aria-label="Add Team">+</button>
      </div>
    </div>
    <div class="screen-content">
      ${teams.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">👥</div>
          <h3>No Teams Yet</h3>
          <p>Create teams with rosters to speed up match creation</p>
          <button class="btn btn-primary" id="team-empty-add">Create First Team</button>
        </div>
      ` : `
        <div class="section-title">Saved Teams (${teams.length})</div>
        <div style="display:flex;flex-direction:column;gap:var(--space-3);" id="team-list">
          ${teams.map(team => renderTeamCard(team)).join('')}
        </div>
      `}
    </div>
  `;

  el.querySelector('#team-back')?.addEventListener('click', goBack);
  el.querySelector('#team-add-btn')?.addEventListener('click', () => showTeamModal());
  el.querySelector('#team-empty-add')?.addEventListener('click', () => showTeamModal());

  el.querySelectorAll('[data-team-id]').forEach(card => {
    card.addEventListener('click', (e) => {
      const id = card.dataset.teamId;
      const team = teams.find(t => t.id === id);
      if (team) showTeamModal(team);
    });
  });

  el.querySelectorAll('[data-delete-team]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.deleteTeam;
      showConfirm('Delete Team', 'Are you sure? This cannot be undone.', async () => {
        await deleteById(STORES.TEAMS, id);
        showToast('Team deleted');
        renderTeam();
      });
    });
  });
}

function renderTeamCard(team) {
  return `
    <div class="card card-hover card-clickable" data-team-id="${team.id}" style="display:flex;align-items:center;gap:var(--space-3);">
      <div class="avatar avatar-primary" style="width:48px;height:48px;font-size:var(--text-md);">
        ${getInitials(team.name)}
      </div>
      <div style="flex:1;">
        <div style="font-weight:700;font-size:var(--text-base);color:var(--text-primary);">${team.name}</div>
        <div style="font-size:var(--text-xs);color:var(--text-muted);">${team.players?.length || 0} players</div>
      </div>
      <button class="btn-icon" data-delete-team="${team.id}" style="color:var(--color-danger);font-size:16px;" aria-label="Delete">🗑️</button>
    </div>
  `;
}

function showTeamModal(existing = null) {
  const isEdit = !!existing;
  const players = existing?.players || Array(11).fill('');

  const playerInputs = players.map((p, i) => `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
      <span style="width:24px;height:24px;background:var(--bg-elevated);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--text-muted);flex-shrink:0;">${i+1}</span>
      <input type="text" class="form-input modal-player-input" value="${p}" placeholder="Player ${i+1}" style="font-size:var(--text-sm);min-height:36px;" />
    </div>
  `).join('');

  showModal(`
    <div class="modal-title">${isEdit ? '✏️ Edit Team' : '➕ New Team'}</div>
    <div class="form-group" style="margin-bottom:var(--space-4);">
      <label class="form-label required">Team Name</label>
      <input type="text" class="form-input" id="modal-team-name" value="${existing?.name || ''}" placeholder="e.g. Mumbai Indians" />
    </div>
    <div class="form-group">
      <label class="form-label">Players</label>
      <div id="modal-players-list" style="max-height:240px;overflow-y:auto;">
        ${playerInputs}
      </div>
      <button class="btn btn-ghost" id="modal-add-player" style="margin-top:8px;font-size:var(--text-sm);color:var(--color-success);">+ Add Player</button>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline btn-full" id="modal-cancel">Cancel</button>
      <button class="btn btn-primary btn-full" id="modal-save">${isEdit ? 'Save Changes' : 'Create Team'}</button>
    </div>
  `);

  document.getElementById('modal-cancel')?.addEventListener('click', hideModal);
  document.getElementById('modal-add-player')?.addEventListener('click', () => {
    const list = document.getElementById('modal-players-list');
    const count = list?.querySelectorAll('.modal-player-input').length || 0;
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;';
    div.innerHTML = `
      <span style="width:24px;height:24px;background:var(--bg-elevated);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--text-muted);flex-shrink:0;">${count+1}</span>
      <input type="text" class="form-input modal-player-input" placeholder="Player ${count+1}" style="font-size:var(--text-sm);min-height:36px;" />
    `;
    list?.appendChild(div);
  });

  document.getElementById('modal-save')?.addEventListener('click', async () => {
    const name = document.getElementById('modal-team-name')?.value?.trim();
    if (!name) { showToast('Team name required', 'danger'); return; }

    const playerInputEls = document.querySelectorAll('.modal-player-input');
    const teamPlayers = Array.from(playerInputEls).map(i => i.value.trim()).filter(Boolean);

    const team = {
      id:      existing?.id || (Date.now().toString(36)),
      name,
      players: teamPlayers,
      updatedAt: Date.now()
    };

    await put(STORES.TEAMS, team);
    hideModal();
    showToast(isEdit ? 'Team updated!' : 'Team created!', 'success');
    renderTeam();
  });
}
