// ─── State ───────────────────────────────────────────────────────────────
const STORAGE_KEY = 'dailyspend.v1';

const DEFAULT_CATEGORIES = [
  { id: 'food', label: 'Food' },
  { id: 'coffee', label: 'Coffee' },
  { id: 'transport', label: 'Transport' },
  { id: 'groceries', label: 'Groceries' },
];

const ACCENT_OPTIONS = ['#EEF4B0', '#C9F2A0', '#F4C8B0', '#B0D4F4', '#E8B0F4', '#0B0B0B'];
const LIMIT_PRESETS = [30, 40, 50, 60, 75, 100];

let state = {
  dailyLimit: 50,
  currency: 'USD',
  accent: '#EEF4B0',
  categories: DEFAULT_CATEGORIES.slice(),
  entries: [], // { id, date:'YYYY-MM-DD', categoryId, amount:cents, createdAt:ISO }
};

// Temporary UI state (not persisted)
let ui = {
  view: 'home',            // 'home' | 'history' | 'settings'
  addRaw: '',              // raw digit string for numpad input e.g. "1240"
  addCategoryId: null,
  editLimitVal: 50,
  colorPickerAccent: '#EEF4B0',
  historyFilter: 'all',
};

// ─── Persistence ─────────────────────────────────────────────────────────
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      state = Object.assign(state, saved);
      if (!state.categories || !state.categories.length) state.categories = DEFAULT_CATEGORIES.slice();
    }
  } catch (_) {}
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_) {}
}

// ─── Date helpers ─────────────────────────────────────────────────────────
function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function todayISO() { return toISODate(new Date()); }

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function fmtDate(isoDate, opts) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, opts || { weekday: 'short', month: 'short', day: 'numeric' });
}

function fmtShortDay(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const day = new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short' });
  return day.slice(0, 3);
}

function fmtTime(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// ─── Money helpers ────────────────────────────────────────────────────────
function centsToDisplay(cents) {
  return (cents / 100).toFixed(2);
}

function fmt(cents) {
  return '$' + centsToDisplay(cents);
}

function rawToDisplay(raw) {
  // raw is a decimal string like "10", "10.", "10.5", "10.50"
  return raw || '0';
}

function rawToCents(raw) {
  if (!raw || raw === '.') return 0;
  const val = parseFloat(raw);
  return isNaN(val) ? 0 : Math.round(val * 100);
}

// ─── Derived data ─────────────────────────────────────────────────────────
function todayEntries() {
  const t = todayISO();
  return state.entries.filter(e => e.date === t);
}

function totalCentsForDate(isoDate) {
  return state.entries
    .filter(e => e.date === isoDate)
    .reduce((s, e) => s + e.amount, 0);
}

function last7Days() {
  const today = new Date();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(today, -i);
    const iso = toISODate(d);
    const isToday = i === 0;
    const total = totalCentsForDate(iso);
    const label = isToday ? 'Today' : fmtShortDay(iso);
    days.push({ iso, label, total, isToday });
  }
  return days;
}

function last30Days() {
  const today = new Date();
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = addDays(today, -i);
    const iso = toISODate(d);
    const isToday = i === 0;
    const total = totalCentsForDate(iso);
    days.push({ iso, total, isToday, dayNum: d.getDate() });
  }
  return days;
}

function groupedHistory() {
  // All dates that have entries, sorted newest first
  const dateMap = {};
  for (const e of state.entries) {
    if (!dateMap[e.date]) dateMap[e.date] = [];
    dateMap[e.date].push(e);
  }
  return Object.keys(dateMap)
    .sort((a, b) => b.localeCompare(a))
    .map(date => ({
      date,
      total: dateMap[date].reduce((s, e) => s + e.amount, 0),
      entries: dateMap[date].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    }));
}

// ─── Accent / theme ──────────────────────────────────────────────────────

// Returns the visual accent colour currently in use.
// When dark mode is active (black swatch selected) the CSS accent is butter,
// so inline JS colour references should match.
function getAccent() {
  return state.accent === '#0B0B0B' ? '#EEF4B0' : state.accent;
}

function applyAccent(hex) {
  const isDark = hex === '#0B0B0B';

  if (isDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.style.setProperty('--accent', '#EEF4B0');
  } else {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.setProperty('--accent', hex);
  }

  // The displayed accent colour (what's active in the theme)
  const displayHex = isDark ? '#EEF4B0' : hex;
  document.querySelectorAll('.color-swatch-dot').forEach(el => {
    el.style.background = displayHex;
  });
}

// ─── DS Logo component ────────────────────────────────────────────────────
function buildDSLogo() {
  const wrap = document.createElement('div');
  wrap.className = 'ds-logo';

  const halo = document.createElement('div');
  halo.className = 'ds-logo-halo';

  const pill = document.createElement('div');
  pill.className = 'ds-logo-pill';

  const gloss = document.createElement('div');
  gloss.className = 'ds-logo-gloss';

  const text = document.createElement('span');
  text.textContent = 'Daily Spend';
  text.style.position = 'relative';

  pill.appendChild(gloss);
  pill.appendChild(text);
  wrap.appendChild(halo);
  wrap.appendChild(pill);
  return wrap;
}

function renderLogos() {
  ['home-logo', 'settings-logo'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = '';
      el.appendChild(buildDSLogo());
    }
  });
}

// ─── Navigation ───────────────────────────────────────────────────────────
function switchView(viewId) {
  ui.view = viewId;

  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(viewId + '-view').classList.add('active');

  document.querySelectorAll('.nav-glyph').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewId);
  });

  if (viewId === 'history') renderHistory();
  if (viewId === 'settings') renderSettings();
  if (viewId === 'home') renderHome();
}

// ─── Render: Home ─────────────────────────────────────────────────────────
function renderHome() {
  const today = new Date();
  const issue = String(today.getMonth() + 1).padStart(2, '0') + String(today.getDate()).padStart(2, '0');
  const dateStr = today.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

  const issueEl = document.getElementById('home-issue');
  const dateEl = document.getElementById('home-date');
  if (issueEl) issueEl.textContent = '№ ' + issue;
  if (dateEl) dateEl.textContent = dateStr;

  const todayCents = todayEntries().reduce((s, e) => s + e.amount, 0);
  const limitCents = state.dailyLimit * 100;
  const remainingCents = limitCents - todayCents;
  const pct = Math.max(0, Math.min(1, todayCents / limitCents));

  // Ring
  const C = 2 * Math.PI * 142;
  const dash = C * pct;
  const ringFill = document.getElementById('ring-fill');
  const ringTip = document.getElementById('ring-tip');
  if (ringFill) {
    if (pct < 0.005) {
      ringFill.style.stroke = 'transparent';
    } else {
      ringFill.style.stroke = '';
      ringFill.setAttribute('stroke-dasharray', `${dash} ${C}`);
    }
  }
  if (ringTip) {
    if (pct > 0.005) {
      // SVG element is CSS-rotated -90deg, so angle 0 = visual 12 o'clock
      const angle = 2 * Math.PI * pct;
      const tipX = 154 + 142 * Math.cos(angle);
      const tipY = 154 + 142 * Math.sin(angle);
      ringTip.setAttribute('cx', tipX);
      ringTip.setAttribute('cy', tipY);
      ringTip.setAttribute('fill', getAccent());
      ringTip.setAttribute('visibility', 'visible');
    } else {
      ringTip.setAttribute('visibility', 'hidden');
    }
  }

  // Remaining amount (integer dollars)
  const remEl = document.getElementById('home-remaining');
  if (remEl) remEl.textContent = Math.round(remainingCents / 100);

  // Week bars
  const days = last7Days();
  const weekTotal = days.reduce((s, d) => s + d.total, 0);
  const weekTotalEl = document.getElementById('week-total-val');
  if (weekTotalEl) weekTotalEl.textContent = fmt(weekTotal);

  const barsEl = document.getElementById('week-bars');
  if (barsEl) {
    const peak = Math.max(...days.map(d => d.total), 1);
    barsEl.innerHTML = '';

    const barsRow = document.createElement('div');
    barsRow.className = 'week-bars-inner';

    const labelsRow = document.createElement('div');
    labelsRow.className = 'week-labels-inner';

    days.forEach(d => {
      const h = Math.max(3, (d.total / peak) * 50);

      const bar = document.createElement('div');
      bar.className = 'week-bar';
      bar.style.height = h + 'px';
      bar.style.background = d.isToday ? getAccent() : 'var(--ink)';
      bar.style.border = d.isToday ? '1.5px solid var(--ink)' : 'none';
      bar.style.opacity = d.isToday ? '1' : '0.85';
      barsRow.appendChild(bar);

      const lbl = document.createElement('div');
      lbl.className = 'week-bar-label';
      lbl.textContent = d.isToday ? 'Now' : d.label.slice(0, 3);
      lbl.style.color = d.isToday ? 'var(--ink)' : 'var(--ink-muted)';
      lbl.style.fontWeight = d.isToday ? '700' : '400';
      labelsRow.appendChild(lbl);
    });

    barsEl.appendChild(barsRow);
    barsEl.appendChild(labelsRow);
  }
}

// ─── Render: History ──────────────────────────────────────────────────────
function renderHistory() {
  const today = new Date();
  const monthLabel = today.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  const mlEl = document.getElementById('history-month-label');
  if (mlEl) mlEl.textContent = monthLabel;

  // 30-day bar chart
  const days30 = last30Days();
  const peak30 = Math.max(...days30.map(d => d.total), 1);
  const peakLabelEl = document.getElementById('history-peak-label');
  if (peakLabelEl) peakLabelEl.textContent = 'peak ' + fmt(peak30);

  const monthBarsEl = document.getElementById('month-bars');
  if (monthBarsEl) {
    monthBarsEl.innerHTML = '';
    days30.forEach(d => {
      const h = Math.max(2, (d.total / peak30) * 84);
      const bar = document.createElement('div');
      bar.className = 'month-bar';
      bar.style.height = h + 'px';
      if (d.isToday) {
        bar.style.background = getAccent();
        bar.style.border = '1.5px solid var(--ink)';
        bar.style.boxSizing = 'border-box';
      } else if (d.total > limitCentsForOver()) {
        bar.style.background = 'var(--ink)';
      } else {
        const opacity = 0.18 + (d.total / peak30) * 0.45;
        bar.style.background = `rgba(11,11,11,${opacity})`;
      }
      monthBarsEl.appendChild(bar);
    });
  }

  // Filter chips
  const cats = [{ id: 'all', label: 'All' }, ...state.categories];
  const filtersEl = document.getElementById('history-filters');
  if (filtersEl) {
    filtersEl.innerHTML = '';
    cats.forEach(c => {
      const chip = document.createElement('button');
      chip.className = 'filter-chip' + (ui.historyFilter === c.id ? ' active' : '');
      chip.textContent = c.label;
      chip.addEventListener('click', () => {
        ui.historyFilter = c.id;
        renderHistory();
      });
      filtersEl.appendChild(chip);
    });
  }

  // Day list
  const listEl = document.getElementById('history-list');
  if (listEl) {
    listEl.innerHTML = '';
    const groups = groupedHistory();
    if (groups.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'text-align:center;color:var(--ink-subtle);padding:32px 0;font-size:14px;';
      empty.textContent = 'No history yet';
      listEl.appendChild(empty);
      return;
    }
    const todayIso = todayISO();
    const limitCents = state.dailyLimit * 100;

    groups.forEach(g => {
      const filteredEntries = ui.historyFilter === 'all'
        ? g.entries
        : g.entries.filter(e => e.categoryId === ui.historyFilter);
      if (filteredEntries.length === 0) return;

      const isToday = g.date === todayIso;
      const over = g.total > limitCents;
      const overBy = g.total - limitCents;

      // Day row
      const row = document.createElement('div');
      row.className = 'history-day-row';

      const info = document.createElement('div');
      info.className = 'history-day-info';

      const dateSpan = document.createElement('span');
      dateSpan.className = 'history-day-date' + (isToday ? ' today' : '');
      dateSpan.textContent = fmtDate(g.date) + (isToday ? ' · today' : '');

      const meta = document.createElement('span');
      meta.className = 'history-day-meta';
      if (filteredEntries.length === 1) {
        const cat = state.categories.find(c => c.id === filteredEntries[0].categoryId);
        meta.textContent = cat ? cat.label : '1 entry';
      } else {
        meta.textContent = filteredEntries.length + ' entries';
      }
      if (over && ui.historyFilter === 'all') {
        const overSpan = document.createElement('span');
        overSpan.className = 'over-label';
        overSpan.textContent = ' · over by ' + fmt(overBy);
        meta.appendChild(overSpan);
      }

      info.appendChild(dateSpan);
      info.appendChild(meta);

      const right = document.createElement('div');
      right.className = 'history-day-right';

      const amt = document.createElement('span');
      amt.className = 'history-day-amount';
      amt.textContent = fmt(ui.historyFilter === 'all' ? g.total : filteredEntries.reduce((s, e) => s + e.amount, 0));

      const dot = document.createElement('span');
      dot.className = 'history-day-dot';
      if (over) {
        dot.style.background = 'var(--ink)';
      } else {
        dot.style.background = getAccent();
        dot.style.border = '1.5px solid var(--ink)';
        dot.style.boxSizing = 'border-box';
      }

      right.appendChild(amt);
      right.appendChild(dot);
      row.appendChild(info);
      row.appendChild(right);

      // Expandable entries
      const entriesWrap = document.createElement('div');
      entriesWrap.className = 'history-entries';

      filteredEntries.forEach(e => {
        const cat = state.categories.find(c => c.id === e.categoryId);
        const eRow = document.createElement('div');
        eRow.className = 'history-entry-row';

        const eLabel = document.createElement('span');
        eLabel.textContent = (cat ? cat.label : 'Expense') + (e.note ? ' — ' + e.note : '');

        const eAmt = document.createElement('span');
        eAmt.className = 'history-entry-amount';
        eAmt.textContent = fmt(e.amount);

        eRow.appendChild(eLabel);
        eRow.appendChild(eAmt);
        entriesWrap.appendChild(eRow);
      });

      row.addEventListener('click', () => {
        const isOpen = entriesWrap.classList.contains('open');
        entriesWrap.classList.toggle('open', !isOpen);
      });

      listEl.appendChild(row);
      listEl.appendChild(entriesWrap);
    });
  }
}

function limitCentsForOver() {
  return state.dailyLimit * 100;
}

// ─── Render: Settings ─────────────────────────────────────────────────────
function renderSettings() {
  const limitEl = document.getElementById('settings-limit-val');
  if (limitEl) limitEl.textContent = '$' + state.dailyLimit;

  const dotEl = document.getElementById('settings-color-dot');
  if (dotEl) dotEl.style.background = state.accent;

  const catsCard = document.getElementById('settings-cats-card');
  if (catsCard) {
    catsCard.innerHTML = '';
    state.categories.forEach((c, i) => {
      const row = document.createElement('div');
      row.className = 'settings-row' + (i === state.categories.length - 1 ? ' last' : '');
      row.innerHTML = `
        <span class="settings-row-label">${c.label}</span>
        <div class="settings-row-right">
          <svg class="chevron-icon" width="7" height="12" viewBox="0 0 7 12">
            <path d="M1 1l5 5-5 5" stroke="var(--ink-muted)" stroke-width="1.5" fill="none" stroke-linecap="round"/>
          </svg>
        </div>`;
      catsCard.appendChild(row);
    });
  }
}

// ─── Render: Add sheet ────────────────────────────────────────────────────
function renderAddSheet() {
  const todayCents = todayEntries().reduce((s, e) => s + e.amount, 0);
  const limitCents = state.dailyLimit * 100;
  const remaining = limitCents - todayCents;

  const remEl = document.getElementById('sheet-remaining');
  if (remEl) remEl.textContent = fmt(remaining) + ' left';

  const valEl = document.getElementById('sheet-amount-val');
  if (valEl) valEl.textContent = rawToDisplay(ui.addRaw);

  const trackBtn = document.getElementById('track-btn');
  if (trackBtn) trackBtn.textContent = 'Track it — ' + fmt(rawToCents(ui.addRaw));

  // Category chips
  const chipsEl = document.getElementById('category-chips');
  if (chipsEl) {
    chipsEl.innerHTML = '';
    state.categories.forEach(c => {
      const chip = document.createElement('button');
      chip.className = 'cat-chip' + (ui.addCategoryId === c.id ? ' active' : '');
      chip.textContent = c.label;
      chip.addEventListener('click', () => {
        ui.addCategoryId = ui.addCategoryId === c.id ? null : c.id;
        renderAddSheet();
      });
      chipsEl.appendChild(chip);
    });

    // "+" chip for adding custom category
    const addChip = document.createElement('button');
    addChip.className = 'cat-chip-add';
    addChip.innerHTML = `<svg width="12" height="12" viewBox="0 0 14 14">
      <path d="M7 1v12M1 7h12" stroke="var(--ink)" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
    addChip.addEventListener('click', promptAddCategory);
    chipsEl.appendChild(addChip);
  }
}

function promptAddCategory() {
  const name = window.prompt('Category name:');
  if (!name || !name.trim()) return;
  const id = 'cat_' + Date.now();
  state.categories.push({ id, label: name.trim() });
  saveState();
  ui.addCategoryId = id;
  renderAddSheet();
  renderSettings();
}

// ─── Numpad ───────────────────────────────────────────────────────────────
function buildNumpad() {
  const numpadEl = document.getElementById('numpad');
  if (!numpadEl) return;
  numpadEl.innerHTML = '';
  const keys = ['1','2','3','4','5','6','7','8','9','.','0','⌫'];
  keys.forEach(k => {
    const btn = document.createElement('button');
    btn.className = 'numpad-key';
    btn.textContent = k;
    btn.addEventListener('click', () => {
      if ('vibrate' in navigator) navigator.vibrate(8);
      handleNumpadKey(k);
    });
    numpadEl.appendChild(btn);
  });
}

function handleNumpadKey(k) {
  if (k === '⌫') {
    ui.addRaw = ui.addRaw.slice(0, -1);
  } else if (k === '.') {
    if (ui.addRaw === '') {
      ui.addRaw = '0.';                          // leading zero before decimal
    } else if (!ui.addRaw.includes('.')) {
      ui.addRaw = ui.addRaw + '.';
    }
    // already has a decimal — ignore
  } else {
    // digit key
    const dotIdx = ui.addRaw.indexOf('.');
    if (dotIdx === -1) {
      // building integer part
      if (ui.addRaw === '0') {
        ui.addRaw = k;                           // replace lone leading zero
      } else if (ui.addRaw.length >= 6) {
        return;                                  // cap at $999999
      } else {
        ui.addRaw = ui.addRaw + k;
      }
    } else {
      // building decimal part — max 2 digits after the dot
      if (ui.addRaw.length - dotIdx - 1 >= 2) return;
      ui.addRaw = ui.addRaw + k;
    }
  }
  renderAddSheet();
}

// ─── Edit limit presets ───────────────────────────────────────────────────
function buildLimitPresets() {
  const el = document.getElementById('limit-presets');
  if (!el) return;
  el.innerHTML = '';
  LIMIT_PRESETS.forEach(v => {
    const chip = document.createElement('button');
    chip.className = 'limit-preset' + (ui.editLimitVal === v ? ' active' : '');
    chip.textContent = '$' + v;
    chip.addEventListener('click', () => {
      ui.editLimitVal = v;
      const display = document.getElementById('edit-limit-display');
      if (display) display.textContent = v;
      // Refresh active states
      el.querySelectorAll('.limit-preset').forEach(c => {
        c.classList.toggle('active', parseInt(c.textContent.slice(1)) === v);
      });
    });
    el.appendChild(chip);
  });
}

// ─── Accent swatches ──────────────────────────────────────────────────────
function buildAccentSwatches() {
  const el = document.getElementById('accent-swatches');
  if (!el) return;
  el.innerHTML = '';
  ACCENT_OPTIONS.forEach(hex => {
    const sw = document.createElement('button');
    sw.className = 'accent-swatch' + (ui.colorPickerAccent === hex ? ' active' : '');
    sw.style.background = hex;
    sw.addEventListener('click', () => {
      ui.colorPickerAccent = hex;
      el.querySelectorAll('.accent-swatch').forEach(s => {
        s.classList.toggle('active', s.style.background === hexToRgb(hex) || s.style.background === hex);
      });
      // Refresh so box-shadow uses correct color var
      buildAccentSwatches();
    });
    el.appendChild(sw);
  });
}

function hexToRgb(hex) {
  // browsers normalize hex to rgb() when reading style.background
  return hex; // comparison handled via rebuild
}

// ─── Overlay helpers ──────────────────────────────────────────────────────
function openOverlay(id) {
  document.getElementById(id).classList.add('active');
}

function closeOverlay(id) {
  document.getElementById(id).classList.remove('active');
}

// ─── Add expense flow ─────────────────────────────────────────────────────
function openAddSheet() {
  ui.addRaw = '';
  ui.addCategoryId = null;
  renderAddSheet();
  openOverlay('add-overlay');
}

function closeAddSheet() {
  closeOverlay('add-overlay');
}

function saveExpense() {
  const cents = rawToCents(ui.addRaw);
  if (cents <= 0) return;

  state.entries.unshift({
    id: Date.now(),
    date: todayISO(),
    categoryId: ui.addCategoryId || (state.categories[0] && state.categories[0].id) || null,
    amount: cents,
    createdAt: new Date().toISOString(),
  });

  saveState();
  closeAddSheet();
  renderHome();
}

// ─── Edit limit flow ──────────────────────────────────────────────────────
function openEditLimit() {
  ui.editLimitVal = state.dailyLimit;
  const display = document.getElementById('edit-limit-display');
  if (display) display.textContent = state.dailyLimit;
  const wasEl = document.getElementById('edit-limit-was');
  if (wasEl) wasEl.textContent = '';
  buildLimitPresets();
  openOverlay('edit-limit-overlay');
}

function closeEditLimit() {
  closeOverlay('edit-limit-overlay');
}

function saveLimit() {
  if (ui.editLimitVal > 0) {
    state.dailyLimit = ui.editLimitVal;
    saveState();
    renderHome();
    renderSettings();
  }
  closeEditLimit();
}

// ─── Color picker flow ────────────────────────────────────────────────────
function openColorPicker() {
  ui.colorPickerAccent = state.accent;
  buildAccentSwatches();
  openOverlay('color-overlay');
}

function closeColorPicker() {
  closeOverlay('color-overlay');
}

function saveAccent() {
  state.accent = ui.colorPickerAccent;
  saveState();
  applyAccent(state.accent);
  renderHome();
  renderSettings();
  closeColorPicker();
}

// ─── Reset ────────────────────────────────────────────────────────────────
function resetData() {
  if (!confirm('Clear all data? This cannot be undone.')) return;
  state.entries = [];
  state.categories = DEFAULT_CATEGORIES.slice();
  saveState();
  renderHome();
  renderSettings();
}

// ─── Event listeners ──────────────────────────────────────────────────────
function setupEvents() {
  // Navigation
  document.querySelectorAll('.nav-glyph').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // Add expense
  document.getElementById('add-btn').addEventListener('click', openAddSheet);
  document.getElementById('add-backdrop').addEventListener('click', closeAddSheet);
  document.getElementById('track-btn').addEventListener('click', saveExpense);

  // Edit limit
  document.getElementById('settings-limit-row').addEventListener('click', openEditLimit);
  document.getElementById('edit-limit-backdrop').addEventListener('click', closeEditLimit);
  document.getElementById('edit-limit-cancel').addEventListener('click', closeEditLimit);
  document.getElementById('edit-limit-save').addEventListener('click', saveLimit);

  // Color picker
  document.getElementById('settings-color-row').addEventListener('click', openColorPicker);
  document.getElementById('color-backdrop').addEventListener('click', closeColorPicker);
  document.getElementById('color-cancel').addEventListener('click', closeColorPicker);
  document.getElementById('color-save').addEventListener('click', saveAccent);

  // Reset
  document.getElementById('settings-reset-row').addEventListener('click', resetData);

  // Add category button (in settings)
  document.getElementById('add-cat-btn').addEventListener('click', promptAddCategory);
}

// ─── Init ─────────────────────────────────────────────────────────────────
function init() {
  loadState();
  applyAccent(state.accent);
  renderLogos();
  buildNumpad();
  setupEvents();
  renderHome();
}

init();
