/**
 * CricketHub — state.js
 * Global application state management
 * Single source of truth; persisted to IndexedDB automatically
 */

import { saveMatch, getSetting, saveSetting } from './db.js';

// ─── Default Innings Structure ─────────────────────────────
function createInnings(battingTeam, bowlingTeam) {
  return {
    battingTeam,
    bowlingTeam,
    score:   0,
    wickets: 0,
    balls:   0,       // legal balls bowled
    totalBalls: 0,    // includes wides & no-balls for counting
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
    batsmen: [],      // array of { name, runs, balls, fours, sixes, status, dismissal, isOut }
    bowlers: [],      // array of { name, overs, legalBalls, maidens, runs, wickets, wides, noBalls }
    currentBatsmen:    [null, null], // [strikerIdx, nonStrikerIdx]
    currentBowler:     null,         // index in bowlers[]
    partnerships:      [],           // { batsman1, batsman2, runs, balls, startWicket }
    overHistory:       [],           // array of ball events per over (array of arrays)
    currentOverBalls:  [],           // balls in the current over (incl. extras)
    status:            'active',     // 'active' | 'complete'
    result:            null
  };
}

// ─── App State ─────────────────────────────────────────────
const state = {
  // Current match being played/viewed
  currentMatch: null,

  // All matches (loaded from DB on boot)
  allMatches: [],

  // Saved teams (loaded from DB on boot)
  teams: [],

  // User settings
  settings: {
    darkMode:  true,
    autoSave:  true,
    sound:     false,
    vibration: true
  },

  // UI state
  ui: {
    currentScreen: 'splash',
    previousScreen: null,
    scorecardTab: 'batting',  // 'batting' | 'bowling'
    summaryInningsIdx: 0,
    historySearch: ''
  },

  // PWA install prompt
  installPrompt: null,

  // Listeners
  _listeners: {}
};

// ─── Accessors ─────────────────────────────────────────────
export function getState()        { return state; }
export function getCurrentMatch() { return state.currentMatch; }
export function getSettings()     { return state.settings; }
export function getAllMatches()    { return state.allMatches; }
export function getTeams()        { return state.teams; }
export function getUI()           { return state.ui; }

/** Get the current innings object */
export function getCurrentInnings() {
  const m = state.currentMatch;
  if (!m) return null;
  return m.innings[m.currentInnings] || null;
}

/** Get the second innings (if started) */
export function getInnings(idx) {
  const m = state.currentMatch;
  if (!m || !m.innings[idx]) return null;
  return m.innings[idx];
}

// ─── State Mutations ────────────────────────────────────────
/**
 * Create a new match and set it as current
 */
export function createMatch(info) {
  const { generateId } = window._utils || {};
  const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

  const match = {
    id,
    status:         'toss',   // 'setup' | 'toss' | 'innings1' | 'innings2' | 'complete'
    info,
    toss:           null,
    innings:        [],
    currentInnings: 0,
    createdAt:      Date.now(),
    updatedAt:      Date.now()
  };

  state.currentMatch = match;
  return match;
}

/**
 * Set toss result and initialize first innings
 */
export function setTossResult(winner, decision) {
  const m = state.currentMatch;
  if (!m) return;

  m.toss = { winner, decision };

  // Determine batting/bowling order
  const teamA = m.info.teamA.name;
  const teamB = m.info.teamB.name;

  let battingFirst, bowlingFirst;
  if (decision === 'bat') {
    battingFirst  = winner;
    bowlingFirst  = winner === teamA ? teamB : teamA;
  } else {
    bowlingFirst  = winner;
    battingFirst  = winner === teamA ? teamB : teamA;
  }

  // Create innings 1
  m.innings = [createInnings(battingFirst, bowlingFirst)];
  m.currentInnings = 0;
  m.status = 'innings1';
}

/**
 * Set opening batsmen (strikerIdx, nonStrikerIdx are player objects)
 */
export function setOpeningBatsmen(striker, nonStriker) {
  const inn = getCurrentInnings();
  if (!inn) return;

  inn.batsmen = [
    makeBatsman(striker, 0),
    makeBatsman(nonStriker, 1)
  ];
  inn.currentBatsmen = [0, 1]; // striker at idx 0
}

function makeBatsman(name, idx) {
  return {
    name,
    runs:     0,
    balls:    0,
    fours:    0,
    sixes:    0,
    status:   'batting',
    dismissal: '',
    isOut:    false,
    order:    idx
  };
}

/**
 * Set opening bowler
 */
export function setOpeningBowler(name) {
  const inn = getCurrentInnings();
  if (!inn) return;
  inn.bowlers = [makeBowler(name)];
  inn.currentBowler = 0;
}

function makeBowler(name) {
  return {
    name,
    legalBalls: 0,
    overs:      0,
    maidens:    0,
    runs:       0,
    wickets:    0,
    wides:      0,
    noBalls:    0,
    currentOverRuns: 0
  };
}

/**
 * Record a ball delivery in the current innings
 * @param {Object} event - ball event
 */
export function recordBall(event) {
  const inn = getCurrentInnings();
  if (!inn) return;

  const striker    = inn.batsmen[inn.currentBatsmen[0]];
  const bowler     = inn.bowlers[inn.currentBowler];

  // ─── Update scores ──────────────────────────
  const isLegal = event.type !== 'wide' && event.type !== 'noball';

  if (event.type === 'wide') {
    const wExtra = event.extras || 1;
    inn.score          += wExtra;
    inn.extras.wides   += wExtra;
    inn.extras.total   += wExtra;
    bowler.runs        += wExtra;
    bowler.wides       += 1;
    bowler.currentOverRuns += wExtra;
  }
  else if (event.type === 'noball') {
    const nbExtra = 1;
    inn.score          += nbExtra + event.runs;
    inn.extras.noBalls += 1;
    inn.extras.total   += nbExtra;
    bowler.runs        += nbExtra + event.runs;
    bowler.noBalls     += 1;
    bowler.currentOverRuns += nbExtra + event.runs;
    if (event.runs > 0 && striker) {
      striker.runs  += event.runs;
      striker.balls += 0; // NB doesn't count as a ball for batter
      if (event.runs === 4) striker.fours++;
      if (event.runs === 6) striker.sixes++;
    }
  }
  else if (event.type === 'bye') {
    inn.score        += event.runs;
    inn.extras.byes  += event.runs;
    inn.extras.total += event.runs;
    bowler.runs      += event.runs;
    bowler.currentOverRuns += event.runs;
    if (striker) striker.balls++;
    bowler.legalBalls++;
    inn.balls++;
  }
  else if (event.type === 'legbye') {
    inn.score          += event.runs;
    inn.extras.legByes += event.runs;
    inn.extras.total   += event.runs;
    bowler.runs        += event.runs;
    bowler.currentOverRuns += event.runs;
    if (striker) striker.balls++;
    bowler.legalBalls++;
    inn.balls++;
  }
  else if (event.type === 'wicket') {
    // Wicket ball
    bowler.runs    += event.runs || 0;
    bowler.wickets += 1;
    bowler.currentOverRuns += event.runs || 0;
    inn.score      += event.runs || 0;
    inn.wickets    += 1;
    if (striker) {
      striker.balls  += 1;
      striker.runs   += event.runs || 0;
      striker.isOut  = true;
      striker.status = 'out';
      striker.dismissal = event.dismissal || 'out';
    }
    bowler.legalBalls++;
    inn.balls++;
    if (event.runs === 4 && striker) striker.fours++;
    if (event.runs === 6 && striker) striker.sixes++;
  }
  else {
    // Normal run(s)
    inn.score  += event.runs;
    bowler.runs += event.runs;
    bowler.currentOverRuns += event.runs;
    if (striker) {
      striker.runs  += event.runs;
      striker.balls += 1;
      if (event.runs === 4) striker.fours++;
      if (event.runs === 6) striker.sixes++;
    }
    bowler.legalBalls++;
    inn.balls++;
  }

  // ─── Over completion ────────────────────────
  if (isLegal) {
    inn.totalBalls++;

    // Check over end (6 legal balls)
    if (bowler.legalBalls > 0 && bowler.legalBalls % 6 === 0) {
      // Over complete
      const overBalls = inn.currentOverBalls.concat(event);
      inn.overHistory.push(overBalls);
      inn.currentOverBalls = [];
      bowler.overs = Math.floor(bowler.legalBalls / 6);
      // Check maiden
      if (bowler.currentOverRuns === 0) bowler.maidens++;
      bowler.currentOverRuns = 0;
    } else {
      inn.currentOverBalls.push(event);
      bowler.overs = Math.floor(bowler.legalBalls / 6);
    }

    // ─── Strike rotation ─────────────────────
    const oddRun = (event.runs || 0) % 2 === 1;
    const overEnd = (bowler.legalBalls % 6 === 0);

    // Rotate strike on odd runs
    if (oddRun && event.type !== 'wicket') {
      inn.currentBatsmen = [inn.currentBatsmen[1], inn.currentBatsmen[0]];
    }
    // Rotate strike at end of over
    if (overEnd) {
      inn.currentBatsmen = [inn.currentBatsmen[1], inn.currentBatsmen[0]];
    }
  } else {
    // Extra ball — push to current over balls
    inn.currentOverBalls.push(event);
    // Strike rotation for wides/nb run
    if ((event.runs || 0) % 2 === 1) {
      inn.currentBatsmen = [inn.currentBatsmen[1], inn.currentBatsmen[0]];
    }
  }

  // ─── Innings complete check ──────────────────
  const m       = state.currentMatch;
  const maxBalls = m.info.overs * 6;

  if (inn.wickets >= 10 || inn.balls >= maxBalls) {
    completeInnings();
    return { inningsOver: true };
  }

  // Target achieved check (2nd innings)
  if (m.currentInnings === 1) {
    const target = m.innings[0].score + 1;
    if (inn.score >= target) {
      completeInnings();
      return { inningsOver: true, matchOver: true };
    }
  }

  autoSave();
  return { inningsOver: false };
}

/**
 * Bring in a new batsman
 */
export function bringInBatsman(name) {
  const inn = getCurrentInnings();
  if (!inn) return;
  const idx = inn.batsmen.length;
  inn.batsmen.push(makeBatsman(name, idx));
  // Find the vacant spot in currentBatsmen
  if (inn.currentBatsmen[0] === null || inn.batsmen[inn.currentBatsmen[0]]?.isOut) {
    inn.currentBatsmen[0] = idx;
  } else {
    inn.currentBatsmen[1] = idx;
  }
}

/**
 * Change bowler for next over
 */
export function changeBowler(name) {
  const inn = getCurrentInnings();
  if (!inn) return;

  // Check if this bowler already exists
  const existing = inn.bowlers.findIndex(b => b.name === name);
  if (existing !== -1) {
    inn.currentBowler = existing;
  } else {
    inn.bowlers.push(makeBowler(name));
    inn.currentBowler = inn.bowlers.length - 1;
  }
  autoSave();
}

/**
 * Mark current innings complete and set up 2nd innings if needed
 */
export function completeInnings() {
  const m   = state.currentMatch;
  const inn = getCurrentInnings();
  if (inn) inn.status = 'complete';

  if (m.currentInnings === 0) {
    // Set up 2nd innings
    const i1 = m.innings[0];
    m.innings.push(createInnings(i1.bowlingTeam, i1.battingTeam));
    m.currentInnings = 1;
    m.status = 'innings2';
  } else {
    // Match complete
    m.status = 'complete';
  }
  autoSave();
}

/**
 * Undo the last ball
 */
export function undoLastBall() {
  // We store the undo stack in the match
  const m = state.currentMatch;
  if (!m || !m.undoStack || m.undoStack.length === 0) return false;
  const snapshot = m.undoStack.pop();
  m.innings = snapshot.innings;
  m.status  = snapshot.status;
  m.currentInnings = snapshot.currentInnings;
  state.currentMatch = m;
  autoSave();
  return true;
}

/**
 * Push a snapshot for undo
 */
export function pushUndoSnapshot() {
  const m = state.currentMatch;
  if (!m) return;
  if (!m.undoStack) m.undoStack = [];
  // Keep max 20 snapshots
  if (m.undoStack.length >= 20) m.undoStack.shift();
  m.undoStack.push({
    innings:         JSON.parse(JSON.stringify(m.innings)),
    status:          m.status,
    currentInnings:  m.currentInnings
  });
}

/**
 * Auto-save current match to IndexedDB
 */
export async function autoSave() {
  if (!state.settings.autoSave) return;
  const m = state.currentMatch;
  if (!m) return;
  try {
    await saveMatch(m);
  } catch (e) {
    console.warn('[State] AutoSave failed:', e);
  }
}

/**
 * Load settings from DB
 */
export async function loadSettings() {
  const [darkMode, autoSave, vibration] = await Promise.all([
    getSetting('darkMode',  true),
    getSetting('autoSave',  true),
    getSetting('vibration', true)
  ]);
  state.settings = { darkMode, autoSave, vibration };
  applyTheme(darkMode);
}

/**
 * Update a setting
 */
export async function updateSetting(key, value) {
  state.settings[key] = value;
  await saveSetting(key, value);
  if (key === 'darkMode') applyTheme(value);
}

/**
 * Apply dark/light theme
 */
function applyTheme(isDark) {
  document.body.classList.toggle('theme-dark',  isDark);
  document.body.classList.toggle('theme-light', !isDark);
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.content = isDark ? '#080E16' : '#F0F9F4';
}

/**
 * Set all matches (from DB load)
 */
export function setAllMatches(matches) {
  state.allMatches = matches;
}

/**
 * Set all teams (from DB load)
 */
export function setAllTeams(teams) {
  state.teams = teams;
}

/**
 * Set current match (for viewing history)
 */
export function setCurrentMatch(match) {
  state.currentMatch = match;
}

/**
 * Set install prompt
 */
export function setInstallPrompt(prompt) {
  state.installPrompt = prompt;
}

export { createInnings };
