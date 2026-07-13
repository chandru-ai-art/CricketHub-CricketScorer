/**
 * CricketHub — screens/settings.js
 * App Settings Screen
 */

import { goBack, navigateTo } from '../router.js';
import { getSettings, updateSetting } from '../state.js';
import { exportAllData, importAllData, resetDatabase } from '../db.js';
import { showToast, showConfirm, downloadFile, readFile } from '../utils.js';

export function renderSettings() {
  const el       = document.getElementById('screen-settings');
  const settings = getSettings();

  el.innerHTML = `
    <div class="app-header">
      <button class="back-btn" id="set-back">←</button>
      <div class="header-title">Settings</div>
    </div>
    <div class="screen-content">

      <!-- Appearance -->
      <div class="section-title">Appearance</div>
      <div class="settings-group">
        <div class="settings-item" id="set-theme-item" style="cursor:default;">
          <div class="settings-item-icon" style="background:rgba(33,150,243,0.1);">🎨</div>
          <div class="settings-item-text">
            <div class="settings-item-title">Dark Mode</div>
            <div class="settings-item-desc">Toggle between dark and light theme</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="set-dark-mode" ${settings.darkMode ? 'checked' : ''} />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <!-- Behavior -->
      <div class="section-title">Behavior</div>
      <div class="settings-group">
        <div class="settings-item" style="cursor:default;">
          <div class="settings-item-icon" style="background:rgba(76,175,80,0.1);">💾</div>
          <div class="settings-item-text">
            <div class="settings-item-title">Auto Save</div>
            <div class="settings-item-desc">Save match data after every ball</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="set-auto-save" ${settings.autoSave ? 'checked' : ''} />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="settings-item" style="cursor:default;">
          <div class="settings-item-icon" style="background:rgba(255,152,0,0.1);">📳</div>
          <div class="settings-item-text">
            <div class="settings-item-title">Vibration</div>
            <div class="settings-item-desc">Haptic feedback when scoring</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="set-vibration" ${settings.vibration ? 'checked' : ''} />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <!-- Data -->
      <div class="section-title">Data & Backup</div>
      <div class="settings-group">
        <div class="settings-item card-clickable" id="set-export">
          <div class="settings-item-icon" style="background:rgba(33,150,243,0.1);">📤</div>
          <div class="settings-item-text">
            <div class="settings-item-title">Export Backup</div>
            <div class="settings-item-desc">Download all match data as JSON</div>
          </div>
          <div class="settings-item-action">→</div>
        </div>
        <div class="settings-item card-clickable" id="set-import">
          <div class="settings-item-icon" style="background:rgba(76,175,80,0.1);">📥</div>
          <div class="settings-item-text">
            <div class="settings-item-title">Import Backup</div>
            <div class="settings-item-desc">Restore from a JSON backup file</div>
          </div>
          <div class="settings-item-action">→</div>
        </div>
        <div class="settings-item card-clickable" id="set-teams">
          <div class="settings-item-icon" style="background:rgba(255,214,0,0.1);">👥</div>
          <div class="settings-item-text">
            <div class="settings-item-title">Manage Teams</div>
            <div class="settings-item-desc">Add, edit, or remove saved teams</div>
          </div>
          <div class="settings-item-action">→</div>
        </div>
      </div>

      <!-- Danger Zone -->
      <div class="section-title">Danger Zone</div>
      <div class="settings-group">
        <div class="settings-item card-clickable" id="set-reset" style="color:var(--color-danger);">
          <div class="settings-item-icon" style="background:rgba(244,67,54,0.1);">🗑️</div>
          <div class="settings-item-text">
            <div class="settings-item-title" style="color:var(--color-danger);">Reset App</div>
            <div class="settings-item-desc">Delete ALL matches and data permanently</div>
          </div>
          <div class="settings-item-action" style="color:var(--color-danger);">→</div>
        </div>
      </div>

      <!-- App Info -->
      <div style="text-align:center;padding:var(--space-6) var(--space-4);color:var(--text-muted);">
        <div style="font-size:var(--text-xs);letter-spacing:1px;">CricketHub v1.0.0</div>
        <div style="font-size:var(--text-xs);margin-top:4px;">Made with ❤️ for cricket lovers</div>
      </div>

    </div>
  `;

  // Back
  el.querySelector('#set-back')?.addEventListener('click', goBack);
  el.querySelector('#set-teams')?.addEventListener('click', () => navigateTo('team'));

  // Toggles
  el.querySelector('#set-dark-mode')?.addEventListener('change', async (e) => {
    await updateSetting('darkMode', e.target.checked);
    showToast(e.target.checked ? '🌙 Dark mode on' : '☀️ Light mode on');
  });

  el.querySelector('#set-auto-save')?.addEventListener('change', async (e) => {
    await updateSetting('autoSave', e.target.checked);
    showToast(e.target.checked ? 'Auto save enabled' : 'Auto save disabled');
  });

  el.querySelector('#set-vibration')?.addEventListener('change', async (e) => {
    await updateSetting('vibration', e.target.checked);
    showToast(e.target.checked ? 'Vibration enabled' : 'Vibration disabled');
  });

  // Export
  el.querySelector('#set-export')?.addEventListener('click', async () => {
    try {
      const data = await exportAllData();
      const date = new Date().toISOString().split('T')[0];
      downloadFile(`crickethub-backup-${date}.json`, data);
      showToast('Backup exported!', 'success');
    } catch (e) {
      showToast('Export failed: ' + e.message, 'danger');
    }
  });

  // Import
  el.querySelector('#set-import')?.addEventListener('click', async () => {
    showConfirm(
      'Import Backup',
      'This will REPLACE all existing data with the backup file. Are you sure?',
      async () => {
        try {
          const json = await readFile('.json');
          await importAllData(json);
          showToast('Backup imported successfully!', 'success');
          // Reload to refresh state
          setTimeout(() => location.reload(), 1000);
        } catch (e) {
          showToast('Import failed: ' + (e.message || 'Invalid file'), 'danger');
        }
      }
    );
  });

  // Reset
  el.querySelector('#set-reset')?.addEventListener('click', () => {
    showConfirm(
      'Delete All Data',
      'This will permanently delete ALL matches, teams, and settings. This cannot be undone!',
      async () => {
        await resetDatabase();
        showToast('App reset complete', 'default');
        setTimeout(() => location.reload(), 800);
      }
    );
  });
}
