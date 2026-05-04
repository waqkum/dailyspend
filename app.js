// ─── State ───────────────────────────────────────────────────────────────
const STORAGE_KEY = 'dailyspend.v1';

const DEFAULT_CATEGORIES = [
  { id: 'food', label: 'Food' },
  { id: 'coffee', label: 'Coffee' },
  { id: 'transport', label: 'Transport' },
  { id: 'groceries', label: 'Groceries' },
];

const ACCENT_OPTIONS = ['#EEF4B0', '#C9F2A0', '#F4C8B0', '#B0D4F4', '#E8B0F4', '#0B0B0B'];
const LIMIT_PRESETS  = [30, 40, 50, 60, 75, 100];
const CURRENCIES = [
  { code: 'USD', symbol: '$',  label: 'USD — $  US Dollar' },
  { code: 'EUR', symbol: '€',  label: 'EUR — €  Euro' },
  { code: 'GBP', symbol: '£',  label: 'GBP — £  British Pound' },
  { code: 'JPY', symbol: '¥',  label: 'JPY — ¥  Japanese Yen' },
  { code: 'AUD', symbol: 'A$', label: 'AUD — A$  Australian Dollar' },
  { code: 'CAD', symbol: 'C$', label: 'CAD — C$  Canadian Dollar' },
];

// ─── Light theme palettes ─────────────────────────────────────────────────
// Each accent colour gets a coordinated background tint (--cream) and wash
// gradient colours (--butter / --butter-soft) so the whole UI feels tinted.
const LIGHT_THEMES = {
  '#EEF4B0': { cream: '#F7F6EE', haze: '#DDDDD8', butter: '#EEF4B0', butterSoft: '#F4F6C8' }, // Butter (default)
  '#C9F2A0': { cream: '#F2F9EE', haze: '#D6DDD3', butter: '#C9F2A0', butterSoft: '#DAF5C4' }, // Green
  '#F4C8B0': { cream: '#FBF2EE', haze: '#DDD8D5', butter: '#F4C8B0', butterSoft: '#F8DDD0' }, // Peach
  '#B0D4F4': { cream: '#EEF4FB', haze: '#D3D9DE', butter: '#B0D4F4', butterSoft: '#CAE4F8' }, // Blue
  '#E8B0F4': { cream: '#F7EDF9', haze: '#D9D3DE', butter: '#E8B0F4', butterSoft: '#F1D0F8' }, // Lavender
};

let state = {
  dailyLimit: 50,
  currency: 'USD',
  currencySymbol: '$',
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
  selectedCurrency: 'USD',
};

// ─── Persistence ─────────────────────────────────────────────────────────
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      state = Object.assign(state, saved);
      if (!state.categories || !state.categories.length) state.categories = DEFAULT_CATEGORIES.slice();
      if (!state.currencySymbol) state.currencySymbol = '$'; // migration
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
  return state.currencySymbol + centsToDisplay(cents);
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

// ─── Animation helpers ───────────────────────────────────────────────────
let _prevRemainingCents = null;

function animateCounter(el, fromCents, toCents, duration = 500) {
  const fromVal = Math.round(fromCents / 100);
  const toVal   = Math.round(toCents  / 100);
  if (fromVal === toVal) { el.textContent = toVal; return; }
  const start = performance.now();
  const tick = (now) => {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(2, -10 * p); // ease-out-expo
    el.textContent = Math.round(fromVal + (toVal - fromVal) * eased);
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = toVal;
  };
  requestAnimationFrame(tick);
}

// ─── Accent / theme ──────────────────────────────────────────────────────

// Returns the visual accent colour currently in use.
// When dark mode is active (black swatch selected) the CSS accent is butter,
// so inline JS colour references should match.
function getAccent() {
  return state.accent === '#0B0B0B' ? '#C8C8A0' : state.accent;
}

function applyAccent(hex) {
  const isDark = hex === '#0B0B0B';
  const root   = document.documentElement;

  // Always clear any previously applied inline theme properties
  ['--cream', '--haze', '--butter', '--butter-soft', '--accent'].forEach(p => {
    root.style.removeProperty(p);
  });

  if (isDark) {
    root.setAttribute('data-theme', 'dark');
    root.style.setProperty('--accent', '#C8C8A0');
  } else {
    root.removeAttribute('data-theme');
    const t = LIGHT_THEMES[hex] || LIGHT_THEMES['#EEF4B0'];
    root.style.setProperty('--accent',      hex);
    root.style.setProperty('--cream',       t.cream);
    root.style.setProperty('--haze',        t.haze);
    root.style.setProperty('--butter',      t.butter);
    root.style.setProperty('--butter-soft', t.butterSoft);
  }

  // Keep the swatch dot in settings in sync
  const displayHex = isDark ? '#C8C8A0' : hex;
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
  // Settings logo pill removed — nothing to render
}

// ─── Navigation ───────────────────────────────────────────────────────────
function switchView(viewId) {
  ui.view = viewId;

  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById(viewId + '-view');
  target.classList.add('active');
  // Entry animation — remove and re-add so it replays on each switch
  target.classList.remove('view-entering');
  void target.offsetWidth; // force reflow
  target.classList.add('view-entering');
  setTimeout(() => target.classList.remove('view-entering'), 350);

  document.querySelectorAll('.nav-glyph').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewId);
  });

  if (viewId === 'history') renderHistory();
  if (viewId === 'settings') renderSettings();
  if (viewId === 'home') renderHome();
}

// ─── Ring fill animation ───────────────────────────────────────────────────
const RING_C = 2 * Math.PI * 142;           // SVG circumference (~892 px)
let   _ringCurrentDash   = 0;               // tracks live animated value
let   _ringAnimFrame     = null;            // rAF handle
let   _animateRingNext   = false;           // set by saveExpense before renderHome

function easeOutExpo(t) {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function animateRingFill(targetDash) {
  if (_ringAnimFrame) cancelAnimationFrame(_ringAnimFrame);
  const startDash = _ringCurrentDash;
  const startTime = performance.now();
  const duration  = 1000; // ms — long, heavily smoothed

  function step(now) {
    const t      = Math.min(1, (now - startTime) / duration);
    const eased  = easeOutExpo(t);
    const dash   = startDash + (targetDash - startDash) * eased;

    _ringCurrentDash = dash;

    const ringFill = document.getElementById('ring-fill');
    const ringTip  = document.getElementById('ring-tip');

    if (ringFill) {
      if (dash < 4) {
        ringFill.style.stroke = 'transparent';
      } else {
        ringFill.style.stroke = '';
        ringFill.setAttribute('stroke-dasharray', `${dash} ${RING_C}`);
      }
    }

    if (ringTip) {
      if (targetDash > 4) {
        const pct   = dash / RING_C;
        const angle = 2 * Math.PI * pct;
        ringTip.setAttribute('cx', 154 + 142 * Math.cos(angle));
        ringTip.setAttribute('cy', 154 + 142 * Math.sin(angle));
        ringTip.setAttribute('fill', getAccent());
        ringTip.setAttribute('visibility', 'visible');
      } else {
        ringTip.setAttribute('visibility', 'hidden');
      }
    }

    if (t < 1) {
      _ringAnimFrame = requestAnimationFrame(step);
    } else {
      _ringAnimFrame = null;
    }
  }

  _ringAnimFrame = requestAnimationFrame(step);
}

// ─── Render: Home ─────────────────────────────────────────────────────────
function renderHome() {
  const entries  = todayEntries();
  const todayCents    = entries.reduce((s, e) => s + e.amount, 0);
  const limitCents    = state.dailyLimit * 100;
  const remainingCents = limitCents - todayCents;
  const pct = Math.max(0, Math.min(1, todayCents / limitCents));

  // Limit badge
  const badgeVal = document.getElementById('limit-badge-val');
  if (badgeVal) badgeVal.textContent = state.currencySymbol + state.dailyLimit;

  // Ring currency symbol
  const ringDollar = document.getElementById('ring-dollar');
  if (ringDollar) ringDollar.textContent = state.currencySymbol;

  // Ring fill arc
  const dash = RING_C * pct;
  if (_animateRingNext) {
    _animateRingNext = false;
    animateRingFill(dash);
  } else {
    // Instant set (page load, view switch, reset, etc.)
    if (_ringAnimFrame) { cancelAnimationFrame(_ringAnimFrame); _ringAnimFrame = null; }
    _ringCurrentDash = dash;
    const ringFill = document.getElementById('ring-fill');
    const ringTip  = document.getElementById('ring-tip');
    if (ringFill) {
      if (pct < 0.005) {
        ringFill.style.stroke = 'transparent';
      } else {
        ringFill.style.stroke = '';
        ringFill.setAttribute('stroke-dasharray', `${dash} ${RING_C}`);
      }
    }
    if (ringTip) {
      if (pct > 0.005) {
        const angle = 2 * Math.PI * pct;
        ringTip.setAttribute('cx', 154 + 142 * Math.cos(angle));
        ringTip.setAttribute('cy', 154 + 142 * Math.sin(angle));
        ringTip.setAttribute('fill', getAccent());
        ringTip.setAttribute('visibility', 'visible');
      } else {
        ringTip.setAttribute('visibility', 'hidden');
      }
    }
  }

  // Remaining amount — animated counter
  const remEl = document.getElementById('home-remaining');
  if (remEl) {
    const prev = _prevRemainingCents;
    if (prev !== null && prev !== remainingCents) {
      animateCounter(remEl, prev, remainingCents);
    } else {
      remEl.textContent = Math.round(remainingCents / 100);
    }
    _prevRemainingCents = remainingCents;
  }

  // Today's total
  const totalEl = document.getElementById('today-total-val');
  if (totalEl) totalEl.textContent = todayCents > 0 ? fmt(todayCents) : '';

  // Today's transaction list
  const listEl = document.getElementById('today-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  if (entries.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'today-empty';
    empty.innerHTML = '<span>Nothing tracked yet</span><span class="today-empty-sub">Tap the bar below to add an expense</span>';
    listEl.appendChild(empty);
    return;
  }

  entries.forEach((e, i) => {
    const cat = state.categories.find(c => c.id === e.categoryId);
    const row = document.createElement('div');
    row.className = 'today-entry';
    row.style.animationDelay = `${i * 40}ms`;

    const left = document.createElement('div');
    left.className = 'today-entry-left';

    const label = document.createElement('span');
    label.className = 'today-entry-label';
    label.textContent = cat ? cat.label : 'Expense';

    const time = document.createElement('span');
    time.className = 'today-entry-time';
    time.textContent = fmtTime(e.createdAt);

    left.appendChild(label);
    left.appendChild(time);

    const amt = document.createElement('span');
    amt.className = 'today-entry-amount';
    amt.textContent = fmt(e.amount);

    row.appendChild(left);
    row.appendChild(amt);
    listEl.appendChild(row);
  });
}

// ─── Render: History ──────────────────────────────────────────────────────
function renderHistory() {
  const today = new Date();
  const monthLabel = today.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  const mlEl = document.getElementById('history-month-label');
  if (mlEl) mlEl.textContent = monthLabel;

  // 7-day bar chart
  const days7  = last7Days();
  const peak7  = Math.max(...days7.map(d => d.total), 1);
  const peakLabelEl = document.getElementById('history-peak-label');
  if (peakLabelEl) peakLabelEl.textContent = peak7 > 0 ? 'peak ' + fmt(peak7) : '';

  const monthBarsEl = document.getElementById('month-bars');
  const axisEl = document.getElementById('month-axis');
  if (monthBarsEl) {
    monthBarsEl.innerHTML = '';
    if (axisEl) axisEl.innerHTML = '';
    days7.forEach(d => {
      const h = d.total > 0 ? Math.max(4, (d.total / peak7) * 80) : 4;
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
        const opacity = d.total > 0 ? 0.18 + (d.total / peak7) * 0.45 : 0.08;
        bar.style.background = `rgba(11,11,11,${opacity})`;
      }
      monthBarsEl.appendChild(bar);

      if (axisEl) {
        const lbl = document.createElement('span');
        lbl.textContent = d.isToday ? 'today' : d.label.slice(0, 3).toLowerCase();
        lbl.style.fontWeight = d.isToday ? '700' : '';
        lbl.style.color = d.isToday ? 'var(--ink)' : '';
        axisEl.appendChild(lbl);
      }
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
  if (limitEl) limitEl.textContent = state.currencySymbol + state.dailyLimit;

  const currEl = document.getElementById('settings-currency-val');
  if (currEl) currEl.textContent = state.currency + ' · ' + state.currencySymbol;

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
  const card = document.getElementById('settings-cats-card');
  if (!card || card.querySelector('.cat-name-input')) return;

  const row = document.createElement('div');
  row.className = 'settings-row cat-add-row';

  const input = document.createElement('input');
  input.className = 'cat-name-input';
  input.type = 'text';
  input.placeholder = 'Category name';
  input.maxLength = 24;
  input.setAttribute('autocomplete', 'off');

  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Add';
  saveBtn.className = 'cat-name-save';

  const commit = () => {
    const name = input.value.trim();
    if (!name) { row.remove(); return; }
    const id = 'cat_' + Date.now();
    state.categories.push({ id, label: name });
    saveState();
    renderSettings();
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') row.remove();
  });
  input.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== saveBtn) row.remove(); }, 150));
  saveBtn.addEventListener('click', commit);

  row.appendChild(input);
  row.appendChild(saveBtn);
  card.insertBefore(row, card.firstChild);
  input.focus();
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

// Returns the translateY (in px) that positions the sheet so its top edge
function openAddSheet() {
  ui.addRaw = '';
  ui.addCategoryId = null;
  renderAddSheet();

  const sheet    = document.querySelector('.add-sheet');
  const overlay  = document.getElementById('add-overlay');
  const backdrop = document.getElementById('add-backdrop');
  const tab      = document.getElementById('sheet-tab');

  // Hide pill button, show overlay with backdrop invisible
  if (tab) { tab.style.transition = 'none'; tab.style.opacity = '0'; tab.style.pointerEvents = 'none'; }
  overlay.classList.add('active');
  if (backdrop) { backdrop.style.transition = 'none'; backdrop.style.opacity = '0'; }

  // Pin sheet off-screen below, no transition
  sheet.style.transition = 'none';
  sheet.style.transform  = 'translateY(100%)';

  // Two rAFs: let the browser apply the off-screen position, then slide up
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      sheet.style.transition = 'transform 400ms cubic-bezier(0.32, 0.72, 0, 1)';
      if (backdrop) {
        backdrop.style.transition = 'opacity 300ms ease';
        backdrop.style.opacity    = '1';
      }
      sheet.style.transform = 'translateY(0)';
      setTimeout(() => {
        sheet.style.transition = '';
        sheet.style.transform  = '';
        if (backdrop) { backdrop.style.transition = ''; }
        if (tab)      { tab.style.transition = ''; }
      }, 410);
    });
  });
}

function closeAddSheet() {
  const sheet    = document.querySelector('.add-sheet');
  const overlay  = document.getElementById('add-overlay');
  const backdrop = document.getElementById('add-backdrop');
  const tab      = document.getElementById('sheet-tab');

  // Fade backdrop out, fade pill button back in (slight delay so it appears as sheet clears)
  if (backdrop) { backdrop.style.transition = 'opacity 300ms ease'; backdrop.style.opacity = '0'; }
  if (tab) {
    tab.style.transition   = 'opacity 260ms ease 120ms';
    tab.style.opacity      = '1';
  }

  // Slide sheet back down off-screen
  sheet.style.transition = 'transform 320ms cubic-bezier(0.32, 0, 0.67, 0)';
  sheet.style.transform  = 'translateY(100%)';

  setTimeout(() => {
    overlay.classList.remove('active');
    sheet.style.transition = '';
    sheet.style.transform  = '';
    if (backdrop) { backdrop.style.transition = ''; backdrop.style.opacity = ''; }
    if (tab)      { tab.style.transition = ''; tab.style.opacity = ''; tab.style.pointerEvents = ''; }
  }, 340);
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
  _animateRingNext = true;
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
    _prevRemainingCents = null; // reset counter so it doesn't animate from stale value
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

// ─── Currency picker flow ─────────────────────────────────────────────────
function buildCurrencyOptions() {
  const el = document.getElementById('currency-options');
  if (!el) return;
  el.innerHTML = '';
  CURRENCIES.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'currency-option' + (ui.selectedCurrency === c.code ? ' active' : '');
    btn.textContent = c.label;
    btn.addEventListener('click', () => {
      ui.selectedCurrency = c.code;
      el.querySelectorAll('.currency-option').forEach(b =>
        b.classList.toggle('active', b === btn));
    });
    el.appendChild(btn);
  });
}

function openCurrencyPicker() {
  ui.selectedCurrency = state.currency;
  buildCurrencyOptions();
  openOverlay('currency-overlay');
}

function closeCurrencyPicker() {
  closeOverlay('currency-overlay');
}

function saveCurrency() {
  const c = CURRENCIES.find(c => c.code === ui.selectedCurrency);
  if (c) {
    state.currency       = c.code;
    state.currencySymbol = c.symbol;
    saveState();
    renderHome();
    renderSettings();
  }
  closeCurrencyPicker();
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

  // Sheet tab — tap to toggle add sheet
  document.getElementById('sheet-tab').addEventListener('click', () => {
    const overlay = document.getElementById('add-overlay');
    if (overlay.classList.contains('active')) closeAddSheet();
    else openAddSheet();
  });

  // Tap top of open sheet to close (grabber zone ≈ top 60px)
  document.querySelector('.add-sheet').addEventListener('click', (e) => {
    const overlay = document.getElementById('add-overlay');
    if (!overlay.classList.contains('active')) return;
    const sheet = document.querySelector('.add-sheet');
    const rect  = sheet.getBoundingClientRect();
    if (e.clientY - rect.top < 60) closeAddSheet();
  });

  // Add sheet backdrop
  document.getElementById('add-backdrop').addEventListener('click', closeAddSheet);
  document.getElementById('track-btn').addEventListener('click', saveExpense);

  // Limit badge on home screen
  document.getElementById('limit-badge').addEventListener('click', openEditLimit);

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

  // Currency picker
  document.getElementById('settings-currency-row').addEventListener('click', openCurrencyPicker);
  document.getElementById('currency-backdrop').addEventListener('click', closeCurrencyPicker);
  document.getElementById('currency-cancel').addEventListener('click', closeCurrencyPicker);
  document.getElementById('currency-save').addEventListener('click', saveCurrency);

  // Reset
  document.getElementById('settings-reset-row').addEventListener('click', resetData);

  // Add category button (in settings)
  document.getElementById('add-cat-btn').addEventListener('click', promptAddCategory);
}

// ─── Swipe-to-dismiss sheet ───────────────────────────────────────────────
function setupSheetSwipe() {
  const sheet   = document.querySelector('.add-sheet');
  const overlay = document.getElementById('add-overlay');
  let startY = 0, lastY = 0, startTime = 0, dragging = false;

  sheet.addEventListener('touchstart', (e) => {
    startY    = e.touches[0].clientY;
    lastY     = startY;
    startTime = Date.now();
    dragging  = true;
    sheet.style.transition = 'none';
  }, { passive: true });

  sheet.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    lastY = e.touches[0].clientY;
    const dy = Math.max(0, lastY - startY); // downward only
    sheet.style.transform = `translateY(${dy}px)`;
  }, { passive: true });

  sheet.addEventListener('touchend', () => {
    if (!dragging) return;
    dragging = false;
    const dy       = Math.max(0, lastY - startY);
    const velocity = dy / Math.max(1, Date.now() - startTime); // px/ms

    const shouldDismiss = dy > sheet.offsetHeight * 0.3 || (velocity > 0.55 && dy > 36);

    if (shouldDismiss) {
      const backdrop = document.getElementById('add-backdrop');
      const tab      = document.getElementById('sheet-tab');
      if (backdrop) { backdrop.style.transition = 'opacity 280ms ease'; backdrop.style.opacity = '0'; }
      if (tab)      { tab.style.transition = 'opacity 260ms ease 80ms'; tab.style.opacity = '1'; }
      sheet.style.transition = 'transform 300ms cubic-bezier(0.32, 0, 0.67, 0)';
      sheet.style.transform  = 'translateY(100%)';
      setTimeout(() => {
        overlay.classList.remove('active');
        sheet.style.transition = '';
        sheet.style.transform  = '';
        if (backdrop) { backdrop.style.transition = ''; backdrop.style.opacity = ''; }
        if (tab)      { tab.style.transition = ''; tab.style.opacity = ''; tab.style.pointerEvents = ''; }
      }, 320);
    } else {
      // Snap back
      sheet.style.transition = 'transform 380ms cubic-bezier(0.32, 0.72, 0, 1)';
      sheet.style.transform  = '';
    }
  });
}

// ─── Tab drag (drag up to open sheet) ────────────────────────────────────
function setupTabDrag() {
  const tab     = document.getElementById('sheet-tab');
  const sheet   = document.querySelector('.add-sheet');
  const overlay = document.getElementById('add-overlay');
  if (!tab) return;

  let startY = 0, lastY = 0, startTime = 0, dragging = false;

  tab.addEventListener('touchstart', (e) => {
    startY    = e.touches[0].clientY;
    lastY     = startY;
    startTime = Date.now();
    dragging  = true;
  }, { passive: true });

  tab.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    lastY = e.touches[0].clientY;
    const dy = startY - lastY; // positive = dragged up
    if (dy > 8) {
      if (!overlay.classList.contains('active')) {
        // First frame of upward drag: show overlay, hide pill button
        overlay.classList.add('active');
        if (tab) { tab.style.transition = 'none'; tab.style.opacity = '0'; tab.style.pointerEvents = 'none'; }
      }
      // Partially translate the sheet to follow finger
      const progress = Math.min(1, dy / 120);
      const translateY = (1 - progress) * 105;
      sheet.style.transition = 'none';
      sheet.style.transform  = `translateY(${translateY}%)`;
    }
  }, { passive: true });

  tab.addEventListener('touchend', () => {
    if (!dragging) return;
    dragging = false;
    const dy       = startY - lastY;
    const velocity = dy / Math.max(1, Date.now() - startTime);

    if (dy > 40 || velocity > 0.45) {
      // Commit open — keep tab hidden, finish slide
      if (tab) { tab.style.transition = 'none'; tab.style.opacity = '0'; tab.style.pointerEvents = 'none'; }
      sheet.style.transition = 'transform 380ms cubic-bezier(0.32, 0.72, 0, 1)';
      sheet.style.transform  = 'translateY(0)';
    } else if (overlay.classList.contains('active')) {
      // Snap back closed — slide off-screen, fade tab back in
      const backdrop = document.getElementById('add-backdrop');
      if (backdrop) { backdrop.style.transition = 'opacity 280ms ease'; backdrop.style.opacity = '0'; }
      if (tab)      { tab.style.transition = 'opacity 260ms ease 80ms'; tab.style.opacity = '1'; }
      sheet.style.transition = 'transform 300ms cubic-bezier(0.32, 0, 0.67, 0)';
      sheet.style.transform  = 'translateY(100%)';
      setTimeout(() => {
        overlay.classList.remove('active');
        sheet.style.transition = '';
        sheet.style.transform  = '';
        if (backdrop) { backdrop.style.transition = ''; backdrop.style.opacity = ''; }
        if (tab)      { tab.style.transition = ''; tab.style.opacity = ''; tab.style.pointerEvents = ''; }
      }, 320);
    }
  });
}

// ─── Home layout: cap today-section height so ring doesn't rise above header ──
function clampHomeLayout() {
  const view     = document.getElementById('home-view');
  const header   = view && view.querySelector('.home-header');
  const ringZone = view && view.querySelector('.ring-zone');
  const limitRow = view && view.querySelector('.limit-row');
  if (!view || !header || !ringZone || !limitRow) return;
  const maxH = view.clientHeight - header.offsetHeight - ringZone.offsetHeight - limitRow.offsetHeight;
  document.documentElement.style.setProperty('--max-today-h', Math.max(80, maxH) + 'px');
}

// ─── Init ─────────────────────────────────────────────────────────────────
function init() {
  loadState();
  applyAccent(state.accent);
  renderLogos();
  buildNumpad();
  setupEvents();
  setupSheetSwipe();
  setupTabDrag();
  renderHome();
  clampHomeLayout();
  window.addEventListener('resize', clampHomeLayout);
}

init();
