// ─── State ───────────────────────────────────────────────────────────────
const STORAGE_KEY = 'dailyspend.v1';

const DEFAULT_CATEGORIES = [
  { id: 'food', label: 'Food' },
  { id: 'coffee', label: 'Coffee' },
  { id: 'transport', label: 'Transport' },
  { id: 'groceries', label: 'Groceries' },
];

// ─── Colour system (ported from DailyConvert) ─────────────────────────────
// 3 solid light accents kept from DailySpend; gradient/blend/dark from DailyConvert exactly.
const LIGHT_ACCENTS = ['#F4C8B0', '#EEF4B0', '#B0D4F4']; // pink, butter, blue

const DARK_ACCENTS = ['#1E1E1E', '#0A1628', '#180E2A'];

const GRADIENT_ACCENTS = ['grad-sunset', 'grad-aurora', 'grad-dusk'];

const BLEND_THEMES = {
  'blend-flame':    { wa: '#FF9070', wb: '#FFD060', accent: '#FF8050', cream: '#FBF0EC', haze: '#DED9D5', swatch: 'linear-gradient(135deg, #FF9070 50%, #FFD060 50%)' },
  'blend-tide':     { wa: '#5EC8C0', wb: '#8090E0', accent: '#5AB8D0', cream: '#EEF4F6', haze: '#D4DADC', swatch: 'linear-gradient(135deg, #5EC8C0 50%, #8090E0 50%)' },
  'blend-grove':    { wa: '#88D470', wb: '#E08AB8', accent: '#70C060', cream: '#F0F6EE', haze: '#D6DCD5', swatch: 'linear-gradient(135deg, #88D470 50%, #E08AB8 50%)' },
  'blend-citrus':   { wa: '#F0E060', wb: '#80E860', accent: '#A0C840', cream: '#F6F6E8', haze: '#DCDDD0', swatch: 'linear-gradient(135deg, #F0E060 50%, #80E860 50%)' },
  'blend-twilight': { wa: '#7060E0', wb: '#E06090', accent: '#9060C0', cream: '#F4EEF8', haze: '#D8D0DC', swatch: 'linear-gradient(135deg, #7060E0 50%, #E06090 50%)' },
  'blend-sherbet':  { wa: '#FF8840', wb: '#C098F0', accent: '#E07840', cream: '#FAF0EC', haze: '#DDDAD8', swatch: 'linear-gradient(135deg, #FF8840 50%, #C098F0 50%)' },
};
const BLEND_ACCENTS = Object.keys(BLEND_THEMES);

const GRADIENT_THEMES = {
  'grad-sunset': { blob: 'linear-gradient(135deg, #F4A0C0, #F4D080)', accent: '#F4A0B8', cream: '#FAF0EE', haze: '#DDD6D0' },
  'grad-aurora': { blob: 'linear-gradient(135deg, #80ECD0, #80C4F4)', accent: '#80C0F0', cream: '#EEF6F8', haze: '#D2DADC' },
  'grad-dusk':   { blob: 'linear-gradient(135deg, #C080F0, #F080B4)', accent: '#C080EC', cream: '#F5EEF9', haze: '#D8D2DC' },
};

const DARK_THEMES = {
  '#1E1E1E': { cream: '#080808', haze: '#111111', accent: '#C0C0B8' },
  '#0A1628': { cream: '#050A12', haze: '#0C1620', accent: '#8BB4D0' },
  '#180E2A': { cream: '#0C0814', haze: '#140C1E', accent: '#B090D4' },
};

const LIGHT_THEMES = {
  '#F4C8B0': { cream: '#FBF2EE', haze: '#DDD8D5' },
  '#EEF4B0': { cream: '#F7F6EE', haze: '#DDDDD8' },
  '#B0D4F4': { cream: '#EEF4FB', haze: '#D3D9DE' },
};

const ACCENTS = [...LIGHT_ACCENTS, ...GRADIENT_ACCENTS, ...BLEND_ACCENTS, ...DARK_ACCENTS];

const CURRENCIES = [
  { code: 'USD', symbol: '$',  label: 'USD — $  US Dollar' },
  { code: 'EUR', symbol: '€',  label: 'EUR — €  Euro' },
  { code: 'GBP', symbol: '£',  label: 'GBP — £  British Pound' },
  { code: 'JPY', symbol: '¥',  label: 'JPY — ¥  Japanese Yen' },
  { code: 'AUD', symbol: 'A$', label: 'AUD — A$  Australian Dollar' },
  { code: 'CAD', symbol: 'C$', label: 'CAD — C$  Canadian Dollar' },
];


let state = {
  dailyLimit: 50,
  currency: 'USD',
  currencySymbol: '$',
  accent: '#EEF4B0',   // default: butter
  categories: DEFAULT_CATEGORIES.slice(),
  entries: [], // { id, date:'YYYY-MM-DD', categoryId, amount:cents, createdAt:ISO }
};

// Temporary UI state (not persisted)
let ui = {
  view: 'home',            // 'home' | 'history' | 'settings'
  addRaw: '',              // raw digit string for numpad input e.g. "1240"
  addCategoryId: null,
  addNote: '',             // one-time custom label for new expense
  editLimitVal: 50,
  colorPickerAccent: '#EEF4B0',
  historyFilter: 'all',
  selectedCurrency: 'USD',
  // Edit-entry flow
  editEntryId: null,
  editRaw: '',
  editCategoryId: null,
  editNote: '',            // one-time custom label when editing
  customCatContext: 'add', // 'add' | 'edit'
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
  const abs     = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const rem     = abs % 100;
  const sign    = cents < 0 ? '-' : '';
  return rem === 0
    ? `${sign}${dollars}`
    : `${sign}${dollars}.${String(rem).padStart(2, '0')}`;
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
  // Use truncation so the animated integer never disagrees with the cents element
  const absTo   = Math.abs(toCents);
  const toVal   = Math.floor(absTo / 100) * (toCents < 0 ? -1 : 1);
  if (fromVal === toVal) { el.textContent = toVal; return; }
  const start = performance.now();
  const tick = (now) => {
    const p     = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(2, -10 * p);
    el.textContent = Math.round(fromVal + (toVal - fromVal) * eased);
    if (p < 1) requestAnimationFrame(tick);
    else        el.textContent = toVal;
  };
  requestAnimationFrame(tick);
}

// ─── Accent / theme ──────────────────────────────────────────────────────

function getAccent() {
  const dark  = DARK_THEMES[state.accent];
  if (dark)  return dark.accent;
  const grad  = GRADIENT_THEMES[state.accent];
  if (grad)  return grad.accent;
  const blend = BLEND_THEMES[state.accent];
  if (blend) return blend.accent;
  return state.accent;
}

function applyAccent(key) {
  const dark  = DARK_THEMES[key];
  const grad  = GRADIENT_THEMES[key];
  const blend = BLEND_THEMES[key];
  const root  = document.documentElement;

  ['--cream','--haze','--accent','--accent-blob','--wb-a','--wb-b'].forEach(p =>
    root.style.removeProperty(p));
  root.removeAttribute('data-blend');

  if (dark) {
    root.setAttribute('data-theme', 'dark');
    root.style.setProperty('--accent', dark.accent);
    root.style.setProperty('--cream',  dark.cream);
    root.style.setProperty('--haze',   dark.haze);
  } else if (blend) {
    root.removeAttribute('data-theme');
    root.setAttribute('data-blend', '1');
    root.style.setProperty('--accent', blend.accent);
    root.style.setProperty('--cream',  blend.cream);
    root.style.setProperty('--haze',   blend.haze);
    root.style.setProperty('--wb-a',   blend.wa);
    root.style.setProperty('--wb-b',   blend.wb);
  } else if (grad) {
    root.removeAttribute('data-theme');
    root.style.setProperty('--accent',      grad.accent);
    root.style.setProperty('--accent-blob', grad.blob);
    root.style.setProperty('--cream',       grad.cream);
    root.style.setProperty('--haze',        grad.haze);
  } else {
    root.removeAttribute('data-theme');
    const t = LIGHT_THEMES[key] || LIGHT_THEMES['#EEF4B0'];
    root.style.setProperty('--accent', key);
    root.style.setProperty('--cream',  t.cream);
    root.style.setProperty('--haze',   t.haze);
  }

  syncColorDot();
}

function syncColorDot() {
  const key   = state.accent;
  const grad  = GRADIENT_THEMES[key];
  const blend = BLEND_THEMES[key];
  const bg    = grad ? grad.blob : blend ? blend.swatch : (DARK_THEMES[key] ? DARK_THEMES[key].accent : key);
  document.querySelectorAll('.color-swatch-dot').forEach(el => el.style.background = bg);
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

// Draws both fill and overflow arcs for a given total dash length (can exceed RING_C).
function setRingArcs(totalDash) {
  const fillDash     = Math.min(totalDash, RING_C);
  const overflowDash = Math.max(0, totalDash - RING_C);
  const isOver       = overflowDash > 0;

  const ringFill     = document.getElementById('ring-fill');
  const ringOverflow = document.getElementById('ring-overflow');
  const ringTip      = document.getElementById('ring-tip');

  if (ringFill) {
    if (fillDash < 4) {
      ringFill.style.stroke = 'transparent';
    } else {
      ringFill.style.stroke = '';
      ringFill.setAttribute('stroke-dasharray', `${fillDash} ${RING_C}`);
    }
  }

  if (ringOverflow) {
    if (overflowDash < 4) {
      ringOverflow.setAttribute('visibility', 'hidden');
    } else {
      ringOverflow.setAttribute('visibility', 'visible');
      ringOverflow.setAttribute('stroke-dasharray', `${overflowDash} ${RING_C}`);
    }
  }

  if (ringTip) {
    if (totalDash > 4) {
      const angle = 2 * Math.PI * (totalDash / RING_C);
      ringTip.setAttribute('cx', 154 + 142 * Math.cos(angle));
      ringTip.setAttribute('cy', 154 + 142 * Math.sin(angle));
      ringTip.setAttribute('fill', isOver ? '#c0392b' : getAccent());
      ringTip.setAttribute('stroke', isOver ? '#7a1a10' : 'var(--ink)');
      ringTip.setAttribute('visibility', 'visible');
    } else {
      ringTip.setAttribute('visibility', 'hidden');
    }
  }
}

function animateRingFill(targetDash) {
  if (_ringAnimFrame) cancelAnimationFrame(_ringAnimFrame);
  const startDash = _ringCurrentDash;
  const startTime = performance.now();
  const duration  = 1000; // ms — long, heavily smoothed

  function step(now) {
    const t    = Math.min(1, (now - startTime) / duration);
    const dash = startDash + (targetDash - startDash) * easeOutExpo(t);
    _ringCurrentDash = dash;
    setRingArcs(dash);
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
  const pct = Math.max(0, todayCents / limitCents); // unclamped — can exceed 1 when over limit

  // Limit badge
  const badgeVal = document.getElementById('limit-badge-val');
  if (badgeVal) badgeVal.textContent = state.currencySymbol + state.dailyLimit;

  // Ring currency symbol
  const ringDollar = document.getElementById('ring-dollar');
  if (ringDollar) ringDollar.textContent = state.currencySymbol;

  // Ring fill arc (totalDash can exceed RING_C when over limit)
  const totalDash = RING_C * pct;
  if (_animateRingNext) {
    _animateRingNext = false;
    animateRingFill(totalDash);
  } else {
    // Instant set (page load, view switch, reset, etc.)
    if (_ringAnimFrame) { cancelAnimationFrame(_ringAnimFrame); _ringAnimFrame = null; }
    _ringCurrentDash = totalDash;
    if (pct < 0.005) {
      const ringFill = document.getElementById('ring-fill');
      if (ringFill) ringFill.style.stroke = 'transparent';
      const ringTip = document.getElementById('ring-tip');
      if (ringTip) ringTip.setAttribute('visibility', 'hidden');
      const ringOverflow = document.getElementById('ring-overflow');
      if (ringOverflow) ringOverflow.setAttribute('visibility', 'hidden');
    } else {
      setRingArcs(totalDash);
    }
  }

  // Remaining amount — animated dollar integer + static cents
  const remEl    = document.getElementById('home-remaining');
  const centsEl  = document.getElementById('home-remaining-cents');
  if (remEl) {
    const absRem   = Math.abs(remainingCents);
    const dollars  = Math.floor(absRem / 100);
    const centPart = absRem % 100;
    const sign     = remainingCents < 0 ? '-' : '';

    const prev = _prevRemainingCents;
    if (prev !== null && prev !== remainingCents) {
      animateCounter(remEl, prev, remainingCents);
    } else {
      remEl.textContent = sign + dollars;
    }
    _prevRemainingCents = remainingCents;

    // Cents: always set immediately (no animation needed)
    if (centsEl) {
      centsEl.textContent = centPart > 0 ? '.' + String(centPart).padStart(2, '0') : '';
    }
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
    row.addEventListener('click', () => openEditEntry(e.id));

    const left = document.createElement('div');
    left.className = 'today-entry-left';

    const label = document.createElement('span');
    label.className = 'today-entry-label';
    label.textContent = cat ? cat.label : (e.note || 'Expense');

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
        const e0 = filteredEntries[0];
        const cat = state.categories.find(c => c.id === e0.categoryId);
        meta.textContent = cat ? cat.label : (e0.note || '1 entry');
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
        eLabel.textContent = cat ? cat.label : (e.note || 'Expense');

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
          <button class="cat-delete-btn" aria-label="Remove ${c.label}">
            <svg width="12" height="12" viewBox="0 0 14 14">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>`;
      row.querySelector('.cat-delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        // Swap row into inline confirmation state
        const labelEl = row.querySelector('.settings-row-label');
        const rightEl = row.querySelector('.settings-row-right');
        labelEl.textContent = `Delete "${c.label}"?`;
        labelEl.style.color = 'var(--ink-muted)';
        rightEl.innerHTML = `
          <button class="cat-confirm-cancel">Cancel</button>
          <button class="cat-confirm-delete">Delete</button>`;
        rightEl.querySelector('.cat-confirm-cancel').addEventListener('click', (ev) => {
          ev.stopPropagation();
          renderSettings();
        });
        rightEl.querySelector('.cat-confirm-delete').addEventListener('click', (ev) => {
          ev.stopPropagation();
          deleteCategory(c.id);
        });
      });
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
      // Active only if selected AND no custom note overrides it
      chip.className = 'cat-chip' + (ui.addCategoryId === c.id && !ui.addNote ? ' active' : '');
      chip.textContent = c.label;
      chip.addEventListener('click', () => {
        ui.addCategoryId = ui.addCategoryId === c.id ? null : c.id;
        ui.addNote = ''; // clear custom note when picking a category
        renderAddSheet();
      });
      chipsEl.appendChild(chip);
    });

    // + chip: compact when no note; expands as an active chip when note is set
    const specialChip = document.createElement('button');
    if (ui.addNote) {
      specialChip.className = 'cat-chip active';
      specialChip.textContent = ui.addNote;
      specialChip.title = 'Tap to edit label';
      specialChip.addEventListener('click', () => {
        ui.customCatContext = 'add';
        openCustomCatInput();
      });
    } else {
      specialChip.className = 'cat-chip cat-chip-plus';
      specialChip.textContent = '+';
      specialChip.title = 'Add one-time label';
      specialChip.addEventListener('click', () => {
        ui.customCatContext = 'add';
        openCustomCatInput();
      });
    }
    chipsEl.appendChild(specialChip);
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

// ─── Category delete ──────────────────────────────────────────────────────
function deleteCategory(id) {
  state.categories = state.categories.filter(c => c.id !== id);
  // Null out categoryId on any existing entries that used this category
  state.entries = state.entries.map(e =>
    e.categoryId === id ? { ...e, categoryId: null } : e
  );
  saveState();
  renderSettings();
}

// ─── Accent swatches (4 groups matching DailyConvert) ────────────────────
function buildAccentSwatches() {
  const ALL_GRID_IDS = ['accent-swatches-light','accent-swatches-grad','accent-swatches-blend','accent-swatches-dark'];

  function populateGrid(gridId, accents) {
    const wrap = document.getElementById(gridId);
    if (!wrap) return;
    wrap.innerHTML = '';
    accents.forEach(key => {
      const grad  = GRADIENT_THEMES[key];
      const blend = BLEND_THEMES[key];
      const btn   = document.createElement('button');
      btn.className  = 'accent-swatch' + (key === ui.colorPickerAccent ? ' active' : '');
      btn.style.background = grad ? grad.blob : blend ? blend.swatch : key;
      btn.dataset.color = key;
      btn.addEventListener('click', () => {
        ui.colorPickerAccent = key;
        ALL_GRID_IDS.forEach(id =>
          document.getElementById(id)?.querySelectorAll('.accent-swatch')
            .forEach(sw => sw.classList.remove('active'))
        );
        btn.classList.add('active');
      });
      wrap.appendChild(btn);
    });
  }

  populateGrid('accent-swatches-light', LIGHT_ACCENTS);
  populateGrid('accent-swatches-grad',  GRADIENT_ACCENTS);
  populateGrid('accent-swatches-blend', BLEND_ACCENTS);
  populateGrid('accent-swatches-dark',  DARK_ACCENTS);
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
  ui.addNote = '';
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
    categoryId: ui.addNote ? null : (ui.addCategoryId || (state.categories[0] && state.categories[0].id) || null),
    amount: cents,
    note: ui.addNote || '',
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
  const inputEl = document.getElementById('edit-limit-input');
  if (inputEl) {
    inputEl.value = state.dailyLimit;
    // Auto-focus and select so user can type immediately
    setTimeout(() => { inputEl.focus(); inputEl.select(); }, 80);
  }
  const wasEl = document.getElementById('edit-limit-was');
  if (wasEl) wasEl.textContent = '';
  openOverlay('edit-limit-overlay');
}

function closeEditLimit() {
  // Blur input to dismiss keyboard on mobile
  const inputEl = document.getElementById('edit-limit-input');
  if (inputEl) inputEl.blur();
  closeOverlay('edit-limit-overlay');
}

function saveLimit() {
  const inputEl = document.getElementById('edit-limit-input');
  const val = inputEl ? parseInt(inputEl.value, 10) : ui.editLimitVal;
  if (val > 0) {
    state.dailyLimit = val;
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
  syncColorDot();
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

// ─── Custom one-time label ────────────────────────────────────────────────
function openCustomCatInput() {
  const inputEl = document.getElementById('custom-cat-input');
  if (inputEl) {
    inputEl.value = ui.customCatContext === 'edit' ? ui.editNote : ui.addNote;
    setTimeout(() => { inputEl.focus(); inputEl.select(); }, 80);
  }
  openOverlay('custom-cat-overlay');
}

function closeCustomCatInput() {
  const inputEl = document.getElementById('custom-cat-input');
  if (inputEl) inputEl.blur();
  closeOverlay('custom-cat-overlay');
}

function saveCustomCat() {
  const inputEl = document.getElementById('custom-cat-input');
  const val = inputEl ? inputEl.value.trim() : '';
  if (ui.customCatContext === 'edit') {
    ui.editNote = val;
    if (val) ui.editCategoryId = null; // note takes priority
    renderEditSheet();
  } else {
    ui.addNote = val;
    if (val) ui.addCategoryId = null;
    renderAddSheet();
  }
  closeCustomCatInput();
}

// ─── Edit entry flow ──────────────────────────────────────────────────────
function renderEditSheet() {
  const valEl = document.getElementById('edit-amount-val');
  if (valEl) valEl.textContent = rawToDisplay(ui.editRaw);

  const dollarEl = document.getElementById('edit-amount-dollar');
  if (dollarEl) dollarEl.textContent = state.currencySymbol;

  const saveBtn = document.getElementById('edit-save-btn');
  if (saveBtn) saveBtn.textContent = 'Save — ' + fmt(rawToCents(ui.editRaw));

  const chipsEl = document.getElementById('edit-category-chips');
  if (!chipsEl) return;
  chipsEl.innerHTML = '';

  state.categories.forEach(c => {
    const chip = document.createElement('button');
    chip.className = 'cat-chip' + (ui.editCategoryId === c.id && !ui.editNote ? ' active' : '');
    chip.textContent = c.label;
    chip.addEventListener('click', () => {
      ui.editCategoryId = ui.editCategoryId === c.id ? null : c.id;
      ui.editNote = '';
      renderEditSheet();
    });
    chipsEl.appendChild(chip);
  });

  // + chip / active note chip
  const specialChip = document.createElement('button');
  if (ui.editNote) {
    specialChip.className = 'cat-chip active';
    specialChip.textContent = ui.editNote;
    specialChip.title = 'Tap to edit label';
    specialChip.addEventListener('click', () => {
      ui.customCatContext = 'edit';
      openCustomCatInput();
    });
  } else {
    specialChip.className = 'cat-chip cat-chip-plus';
    specialChip.textContent = '+';
    specialChip.title = 'Add one-time label';
    specialChip.addEventListener('click', () => {
      ui.customCatContext = 'edit';
      openCustomCatInput();
    });
  }
  chipsEl.appendChild(specialChip);
}

function buildEditNumpad() {
  const numpadEl = document.getElementById('edit-numpad');
  if (!numpadEl) return;
  numpadEl.innerHTML = '';
  ['1','2','3','4','5','6','7','8','9','.','0','⌫'].forEach(k => {
    const btn = document.createElement('button');
    btn.className = 'numpad-key';
    btn.textContent = k;
    btn.addEventListener('click', () => {
      if ('vibrate' in navigator) navigator.vibrate(8);
      handleEditNumpadKey(k);
    });
    numpadEl.appendChild(btn);
  });
}

function handleEditNumpadKey(k) {
  if (k === '⌫') {
    ui.editRaw = ui.editRaw.slice(0, -1);
  } else if (k === '.') {
    if (ui.editRaw === '') ui.editRaw = '0.';
    else if (!ui.editRaw.includes('.')) ui.editRaw += '.';
  } else {
    const dotIdx = ui.editRaw.indexOf('.');
    if (dotIdx === -1) {
      if (ui.editRaw === '0') ui.editRaw = k;
      else if (ui.editRaw.length >= 6) return;
      else ui.editRaw += k;
    } else {
      if (ui.editRaw.length - dotIdx - 1 >= 2) return;
      ui.editRaw += k;
    }
  }
  renderEditSheet();
}

function openEditEntry(id) {
  const entry = state.entries.find(e => e.id === id);
  if (!entry) return;

  ui.editEntryId = id;
  // Reconstruct raw string from stored cents
  const abs     = entry.amount;
  const dollars = Math.floor(abs / 100);
  const cents   = abs % 100;
  ui.editRaw          = cents > 0 ? `${dollars}.${String(cents).padStart(2, '0')}` : `${dollars}`;
  ui.editCategoryId   = entry.categoryId || null;
  ui.editNote         = entry.note || '';

  buildEditNumpad();
  renderEditSheet();

  const sheet    = document.querySelector('.edit-entry-sheet');
  const overlay  = document.getElementById('edit-entry-overlay');
  const backdrop = document.getElementById('edit-entry-backdrop');

  overlay.classList.add('active');
  if (backdrop) { backdrop.style.transition = 'none'; backdrop.style.opacity = '0'; }
  sheet.style.transition = 'none';
  sheet.style.transform  = 'translateY(100%)';

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      sheet.style.transition = 'transform 400ms cubic-bezier(0.32, 0.72, 0, 1)';
      if (backdrop) { backdrop.style.transition = 'opacity 300ms ease'; backdrop.style.opacity = '1'; }
      sheet.style.transform = 'translateY(0)';
      setTimeout(() => {
        sheet.style.transition = '';
        sheet.style.transform  = '';
        if (backdrop) backdrop.style.transition = '';
      }, 410);
    });
  });
}

function closeEditEntry() {
  const sheet    = document.querySelector('.edit-entry-sheet');
  const overlay  = document.getElementById('edit-entry-overlay');
  const backdrop = document.getElementById('edit-entry-backdrop');

  if (backdrop) { backdrop.style.transition = 'opacity 300ms ease'; backdrop.style.opacity = '0'; }
  sheet.style.transition = 'transform 320ms cubic-bezier(0.32, 0, 0.67, 0)';
  sheet.style.transform  = 'translateY(100%)';

  setTimeout(() => {
    overlay.classList.remove('active');
    sheet.style.transition = '';
    sheet.style.transform  = '';
    if (backdrop) { backdrop.style.transition = ''; backdrop.style.opacity = ''; }
    ui.editEntryId = null;
    // Reset delete button confirming state
    const btn = document.getElementById('edit-delete-btn');
    if (btn) {
      btn.dataset.confirming = '';
      btn.textContent = 'Delete';
      btn.style.background = '';
      btn.style.color = '';
      btn.style.borderColor = '';
    }
  }, 340);
}

function saveEditEntry() {
  const cents = rawToCents(ui.editRaw);
  if (cents <= 0) return;
  const idx = state.entries.findIndex(e => e.id === ui.editEntryId);
  if (idx === -1) return;
  state.entries[idx] = {
    ...state.entries[idx],
    amount:     cents,
    categoryId: ui.editNote ? null : (ui.editCategoryId || null),
    note:       ui.editNote || '',
  };
  saveState();
  closeEditEntry();
  _animateRingNext = true;
  renderHome();
}

function deleteEditEntry() {
  state.entries = state.entries.filter(e => e.id !== ui.editEntryId);
  saveState();
  closeEditEntry();
  _animateRingNext = true;
  renderHome();
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
  document.getElementById('edit-limit-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter')  saveLimit();
    if (e.key === 'Escape') closeEditLimit();
  });

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

  // Custom one-time label overlay
  document.getElementById('custom-cat-backdrop').addEventListener('click', closeCustomCatInput);
  document.getElementById('custom-cat-cancel').addEventListener('click', closeCustomCatInput);
  document.getElementById('custom-cat-done').addEventListener('click', saveCustomCat);
  document.getElementById('custom-cat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter')  saveCustomCat();
    if (e.key === 'Escape') closeCustomCatInput();
  });

  // Edit entry overlay
  document.getElementById('edit-entry-backdrop').addEventListener('click', closeEditEntry);
  document.getElementById('edit-save-btn').addEventListener('click', saveEditEntry);
  document.getElementById('edit-delete-btn').addEventListener('click', () => {
    // Inline confirmation: swap button text to "Confirm delete"
    const btn = document.getElementById('edit-delete-btn');
    if (btn.dataset.confirming === 'true') {
      deleteEditEntry();
    } else {
      btn.dataset.confirming = 'true';
      btn.textContent = 'Confirm delete';
      btn.style.background = '#c0392b';
      btn.style.color = '#fff';
      btn.style.borderColor = '#c0392b';
      setTimeout(() => {
        if (btn.dataset.confirming === 'true') {
          btn.dataset.confirming = '';
          btn.textContent = 'Delete';
          btn.style.background = '';
          btn.style.color = '';
          btn.style.borderColor = '';
        }
      }, 3000);
    }
  });

  // Tap grabber zone to close edit sheet
  document.querySelector('.edit-entry-sheet').addEventListener('click', (e) => {
    const overlay = document.getElementById('edit-entry-overlay');
    if (!overlay.classList.contains('active')) return;
    const sheet = document.querySelector('.edit-entry-sheet');
    if (e.clientY - sheet.getBoundingClientRect().top < 60) closeEditEntry();
  });
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
