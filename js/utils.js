/**
 * CricketHub — utils.js
 * Utility functions: formatting, calculations, helpers
 */

/**
 * Generate a unique ID
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * Format overs from balls bowled
 * @param {number} balls - total balls delivered
 * @returns {string} "X.Y" formatted overs
 */
export function formatOvers(balls) {
  const overs = Math.floor(balls / 6);
  const rem   = balls % 6;
  return `${overs}.${rem}`;
}

/**
 * Format overs for display (e.g. 4.3 overs)
 */
export function formatOversDisplay(balls) {
  return `${formatOvers(balls)} ov`;
}

/**
 * Calculate run rate
 * @param {number} runs
 * @param {number} balls
 * @returns {string} formatted run rate
 */
export function calcRunRate(runs, balls) {
  if (balls === 0) return '0.00';
  const rr = (runs / balls) * 6;
  return rr.toFixed(2);
}

/**
 * Calculate required run rate
 * @param {number} target
 * @param {number} scored
 * @param {number} totalBalls
 * @param {number} ballsBowled
 * @returns {string}
 */
export function calcRRR(target, scored, totalBalls, ballsBowled) {
  const needed = target - scored;
  const remaining = totalBalls - ballsBowled;
  if (remaining <= 0) return '—';
  if (needed <= 0) return '0.00';
  const rrr = (needed / remaining) * 6;
  return rrr.toFixed(2);
}

/**
 * Calculate strike rate
 * @param {number} runs
 * @param {number} balls
 * @returns {string}
 */
export function calcStrikeRate(runs, balls) {
  if (balls === 0) return '0.00';
  return ((runs / balls) * 100).toFixed(1);
}

/**
 * Calculate economy rate for bowling
 * @param {number} runs
 * @param {number} balls
 * @returns {string}
 */
export function calcEconomy(runs, balls) {
  if (balls === 0) return '0.00';
  return ((runs / balls) * 6).toFixed(2);
}

/**
 * Format date for display
 * @param {string|number} dateInput
 * @returns {string}
 */
export function formatDate(dateInput) {
  const d = new Date(dateInput);
  return d.toLocaleDateString('en-IN', {
    day:   'numeric',
    month: 'short',
    year:  'numeric'
  });
}

/**
 * Format datetime
 */
export function formatDateTime(dateInput) {
  const d = new Date(dateInput);
  return d.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

/**
 * Get relative time string
 */
export function timeAgo(dateInput) {
  const d = new Date(dateInput);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60)     return 'Just now';
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(d);
}

/**
 * Debounce function
 */
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Deep clone an object
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Capitalize first letter
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Get player initials
 */
export function getInitials(name = '') {
  return name.split(' ')
    .map(w => w.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';
}

/**
 * Clamp a number between min and max
 */
export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

/**
 * Sleep / delay
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Show toast notification
 */
export function showToast(message, type = 'default', duration = 2500) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast show${type !== 'default' ? ` toast-${type}` : ''}`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.className = 'toast hidden';
  }, duration);
}

/**
 * Show modal
 */
export function showModal(contentHTML) {
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  if (!overlay || !content) return;
  content.innerHTML = contentHTML;
  overlay.classList.remove('hidden');
  // Trap focus on close
  overlay.onclick = (e) => {
    if (e.target === overlay) hideModal();
  };
}

/**
 * Hide modal
 */
export function hideModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.classList.add('hidden');
}

/**
 * Confirm dialog via modal
 */
export function showConfirm(title, message, onConfirm, onCancel) {
  showModal(`
    <div class="modal-title">${title}</div>
    <p style="color:var(--text-secondary);font-size:var(--text-sm);line-height:1.6;">${message}</p>
    <div class="modal-actions">
      <button class="btn btn-outline btn-full" id="confirm-cancel">Cancel</button>
      <button class="btn btn-danger btn-full" id="confirm-ok">${title.includes('Delete') ? 'Delete' : 'Confirm'}</button>
    </div>
  `);
  document.getElementById('confirm-ok').onclick = () => { hideModal(); onConfirm && onConfirm(); };
  document.getElementById('confirm-cancel').onclick = () => { hideModal(); onCancel && onCancel(); };
}

/**
 * Vibrate device (haptic feedback)
 */
export function vibrate(pattern = [10]) {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

/**
 * Download a file
 */
export function downloadFile(filename, content, mimeType = 'application/json') {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Read a file as text
 */
export function readFile(accept = '.json') {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return reject(new Error('No file selected'));
      const reader = new FileReader();
      reader.onload = ev => resolve(ev.target.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    };
    input.click();
  });
}

/**
 * Get dot class for an over ball event
 */
export function getDotClass(event) {
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

/**
 * Get text for an over ball event
 */
export function getBallText(event) {
  if (!event) return '';
  if (event.type === 'wicket') return 'W';
  if (event.type === 'wide')   return `W${event.extras > 1 ? event.extras : ''}`;
  if (event.type === 'noball') return `NB${event.runs > 0 ? '+'+event.runs : ''}`;
  if (event.type === 'bye')    return `B${event.runs > 0 ? event.runs : ''}`;
  if (event.type === 'legbye') return `LB${event.runs > 0 ? event.runs : ''}`;
  return event.runs.toString();
}

/**
 * Format match result string
 */
export function formatResult(match) {
  const innings = match.innings;
  if (!innings || innings.length < 2) {
    if (innings && innings.length === 1) return 'In Progress';
    return 'Incomplete';
  }
  const i1 = innings[0];
  const i2 = innings[1];
  const target = i1.score + 1;

  if (i2.status === 'complete') {
    const needed = target - i2.score;
    if (i2.score >= target) {
      // Team2 won
      const wicketsLeft = 10 - i2.wickets;
      return `${i2.battingTeam} won by ${wicketsLeft} wicket${wicketsLeft !== 1 ? 's' : ''}`;
    } else if (i2.wickets >= 10 || i2.balls >= match.info.overs * 6) {
      // Team1 won
      const margin = i1.score - i2.score;
      return `${i1.battingTeam} won by ${margin} run${margin !== 1 ? 's' : ''}`;
    }
  }
  return 'In Progress';
}

/**
 * Pluralize
 */
export function plural(n, word, suffix = 's') {
  return `${n} ${word}${n !== 1 ? suffix : ''}`;
}
