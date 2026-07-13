/**
 * CricketHub — screens/about.js
 * About Screen
 */

import { goBack } from '../router.js';

export function renderAbout() {
  const el = document.getElementById('screen-about');

  el.innerHTML = `
    <div class="app-header">
      <button class="back-btn" id="about-back">←</button>
      <div class="header-title">About</div>
    </div>

    <div class="about-hero animate-fade-in">
      <div class="about-logo splash-logo-animate" style="animation-duration:0.6s;">🏏</div>
      <div>
        <h1 style="font-family:var(--font-display);font-size:var(--text-3xl);color:#fff;text-align:center;font-weight:700;">
          Cricket<span style="color:var(--color-accent);">Hub</span>
        </h1>
        <div style="display:flex;align-items:center;gap:8px;justify-content:center;margin-top:4px;">
          <span class="badge badge-accent">v1.0.0</span>
          <span class="badge badge-primary">Offline Ready</span>
          <span class="badge badge-muted">PWA</span>
        </div>
      </div>
      <p style="color:rgba(255,255,255,0.5);font-size:var(--text-sm);text-align:center;max-width:280px;">
        A professional offline cricket scoring app — score matches ball by ball, track stats, and relive every over.
      </p>
    </div>

    <div class="screen-content">

      <!-- Features -->
      <div class="section-title">Features</div>
      <div class="settings-group" style="margin-bottom:var(--space-4);">
        ${[
          ['📱', 'Mobile-First Design', 'Optimized for Android phones, portrait orientation'],
          ['📡', 'Fully Offline', 'Works without internet after first load'],
          ['💾', 'Auto Save', 'Every ball saved automatically to local storage'],
          ['🏏', 'Ball-by-Ball Scoring', 'Runs, extras, wickets, and undo support'],
          ['📊', 'Live Scorecards', 'Batting, bowling, and over-by-over views'],
          ['📈', 'Statistics', 'Aggregated stats across all your matches'],
          ['🔄', 'Restore Matches', 'Resume unfinished matches automatically'],
          ['📤', 'Backup & Restore', 'Export/import all data as JSON'],
        ].map(([icon, title, desc]) => `
          <div class="settings-item" style="cursor:default;">
            <div class="settings-item-icon" style="background:rgba(27,94,32,0.15);font-size:20px;">${icon}</div>
            <div class="settings-item-text">
              <div class="settings-item-title">${title}</div>
              <div class="settings-item-desc">${desc}</div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Tech Stack -->
      <div class="section-title">Built With</div>
      <div class="chip-list" style="margin-bottom:var(--space-5);">
        ${['HTML5', 'CSS3', 'Vanilla JS', 'IndexedDB', 'Service Worker', 'PWA', 'Inter Font'].map(t =>
          `<span class="chip selected">${t}</span>`
        ).join('')}
      </div>

      <!-- Legal -->
      <div class="card" style="margin-bottom:var(--space-4);text-align:center;">
        <p style="font-size:var(--text-sm);color:var(--text-muted);line-height:1.7;">
          CricketHub is a personal cricket scoring tool.<br>
          All data is stored locally on your device.<br>
          No data is sent to any server.
        </p>
      </div>

      <!-- Credits -->
      <div style="text-align:center;padding:var(--space-4);color:var(--text-muted);">
        <p style="font-size:var(--text-sm);">Made with ❤️ for cricket lovers everywhere</p>
        <p style="font-size:var(--text-xs);margin-top:4px;">🏏 May your run rate stay above 8 and your economy below 6</p>
      </div>

    </div>
  `;

  el.querySelector('#about-back')?.addEventListener('click', goBack);
}
