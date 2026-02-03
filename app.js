// DOM Elements
const els = {
    // Shared
    trackView: document.getElementById('trackView'),
    historyView: document.getElementById('historyView'),
    navTrack: document.getElementById('navTrack'),
    navHistory: document.getElementById('navHistory'),

    // Tracker View
    budgetRing: document.getElementById('budgetRing'),
    remainingAmount: document.getElementById('remainingAmount'),
    spentAmount: document.getElementById('spentAmount'),
    limitInput: document.getElementById('limitInput'),
    transactionList: document.getElementById('transactionList'),
    currentDate: document.getElementById('currentDate'),
    addBtn: document.getElementById('addBtn'),

    // History View
    historyChart: document.getElementById('historyChart'),
    historyList: document.getElementById('historyList'),

    // Modals
    addModal: document.getElementById('addModal'),
    closeAddModal: document.getElementById('closeAddModal'),
    saveExpenseBtn: document.getElementById('saveExpenseBtn'),
    resetDataBtn: document.getElementById('resetDataBtn'),

    // Inputs
    expenseAmount: document.getElementById('expenseAmount'),
    expenseNote: document.getElementById('expenseNote'),
    quickTags: document.getElementById('quickTags')
};

// State
let state = {
    budget: 100, // Default daily budget
    expenses: [],
    history: [], // [{date, spent, budget, result, status}]
    lastOpened: new Date().toLocaleDateString()
};

// Initialization
function init() {
    loadState();
    checkDateReset();
    render();
    setupEventListeners();
    setupNavigation();
}

// Logic
function loadState() {
    const saved = localStorage.getItem('dailySpendState');
    if (saved) {
        state = JSON.parse(saved);
        // Ensure legacy data doesn't break
        if (!state.expenses) state.expenses = [];
        if (!state.history) state.history = [];
        if (!state.budget) state.budget = 100;
    }
}

function saveState() {
    localStorage.setItem('dailySpendState', JSON.stringify(state));
    render();
}

function checkDateReset() {
    const today = new Date().toLocaleDateString();

    if (state.lastOpened !== today) {
        // --- ARCHIVE LOGIC ---
        // Calculate yesterday's stats (using the lastOpened date)
        const pastDate = state.lastOpened;
        const pastExpenses = state.expenses.filter(e => e.date === pastDate);

        // Only archive if there was activity? Or always? Let's say if there were expenses > 0
        const totalSpent = pastExpenses.reduce((sum, e) => sum + e.amount, 0);

        if (pastExpenses.length > 0 || totalSpent > 0) {
            const resultVal = state.budget - totalSpent;
            state.history.push({
                date: pastDate,
                spent: totalSpent,
                budget: state.budget,
                result: resultVal, // + means saved, - means deficit
                status: resultVal >= 0 ? 'saved' : 'deficit'
            });

            // Limit history size? (Optional, maybe last 30 days)
            if (state.history.length > 60) state.history.shift();
        }

        // Reset current day view marker
        state.lastOpened = today;
        saveState();
    }
}

function getTodayExpenses() {
    const today = new Date().toLocaleDateString();
    return state.expenses.filter(e => e.date === today);
}

function calculateTotals() {
    const todayExpenses = getTodayExpenses();
    const spent = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
    const remaining = state.budget - spent;
    const progress = Math.max(0, Math.min(100, (remaining / state.budget) * 100));

    return { spent, remaining, progress, todayExpenses };
}

function addExpense(amount, note) {
    if (isNaN(amount) || amount <= 0) return;

    const newExpense = {
        id: Date.now(),
        amount: parseFloat(amount),
        note: note || 'Expense',
        date: new Date().toLocaleDateString(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    state.expenses.unshift(newExpense);
    saveState();
}

// Rendering
function render() {
    const { spent, remaining, progress, todayExpenses } = calculateTotals();

    // Update Text (with Counter Animation)
    // We animate from the CURRENT displayed value to the NEW value
    // Only if animateValue is defined (safeguard)
    const currentDisplayed = parseFloat(els.remainingAmount.innerText) || 0;
    try {
        animateValue(els.remainingAmount, currentDisplayed, remaining, 1000);
    } catch (e) {
        els.remainingAmount.innerText = remaining.toFixed(2);
    }

    els.spentAmount.textContent = `$${spent.toFixed(2)}`;

    // Update Input (Only if not currently focused to avoid typing interruption)
    if (document.activeElement !== els.limitInput) {
        els.limitInput.value = state.budget;
    }

    els.currentDate.textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

    // Color Logic & Drama
    let colorVar, glowColor;
    const percent = progress; // 0 to 100 representing SPENT (wait, progress was remaining? let's check)
    // calculateTotals says: progress = (remaining / state.budget) * 100
    // So progress is REMAINING %. 
    // 100% remaining = Good. 0% remaining = Bad.

    if (remaining <= 0) {
        colorVar = 'var(--critical)';
        glowColor = 'rgba(255, 0, 0, 0.6)';
    } else if (progress < 20) {
        colorVar = 'var(--danger)';
        glowColor = 'rgba(255, 71, 87, 0.5)';
    } else if (progress < 50) {
        colorVar = 'var(--warning)';
        glowColor = 'rgba(255, 184, 0, 0.5)';
    } else {
        colorVar = 'var(--safe)';
        glowColor = 'rgba(0, 255, 157, 0.4)';
    }

    // Apply Colors
    document.documentElement.style.setProperty('--primary', colorVar);
    document.documentElement.style.setProperty('--current-color', colorVar);
    document.documentElement.style.setProperty('--glow-color', glowColor);

    // Update Ring (Smooth CSS transition handles logic)
    els.budgetRing.style.background = `conic-gradient(
        ${colorVar} ${progress}%, 
        transparent ${progress}%
    )`;

    // Text Color state
    if (remaining < 0) {
        els.remainingAmount.style.color = 'var(--critical)';
    } else {
        els.remainingAmount.style.color = ''; // Default white
    }

    // List
    els.transactionList.innerHTML = '';
    todayExpenses.forEach(e => {
        const li = document.createElement('li');
        li.className = 'transaction-item';
        li.innerHTML = `
            <div class="t-info">
                <span class="t-note">${e.note}</span>
                <span class="t-time">${e.timestamp}</span>
            </div>
            <div class="t-amount">$${e.amount.toFixed(2)}</div>
        `;
        els.transactionList.appendChild(li);
    });
}

function renderHistory() {
    // 1. Render Graph
    els.historyChart.innerHTML = '';
    const historyData = state.history.slice(-7); // Last 7 active days

    // Find max value for scaling
    // We scale based on BUDGET or SPENT, whichever is higher
    const maxVal = Math.max(...historyData.map(d => Math.max(d.spent, d.budget)), 100);

    if (historyData.length === 0) {
        els.historyChart.innerHTML = '<div style="width:100%; text-align:center; color:var(--text-muted); padding-bottom:20px;">No history yet.<br><small>Check back tomorrow!</small></div>';
    }

    historyData.forEach(d => {
        const heightPct = (d.spent / maxVal) * 100;
        const isDeficit = d.result < 0;
        const dayLabel = new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' });

        const wrapper = document.createElement('div');
        wrapper.className = 'bar-wrapper';
        wrapper.innerHTML = `
            <div class="bar ${isDeficit ? 'deficit' : ''}" style="height: ${heightPct}%"></div>
            <div class="bar-label">${dayLabel}</div>
        `;
        els.historyChart.appendChild(wrapper);
    });

    // 2. Render List
    els.historyList.innerHTML = '';
    // reverse to show newest first
    [...state.history].reverse().forEach(d => {
        const isSaved = d.result >= 0;
        const label = isSaved ? 'Saved' : 'Deficit';
        const resultClass = isSaved ? 'val-saved' : 'val-deficit';
        const formattedDate = new Date(d.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

        const li = document.createElement('li');
        li.className = `history-item entry-${isSaved ? 'saved' : 'deficit'}`;
        li.innerHTML = `
            <div class="h-date">
                <span class="h-day">${formattedDate}</span>
                <span class="h-meta">Limit: $${d.budget}</span>
            </div>
            <div class="h-amount">
                <div class="h-total">$${d.spent.toFixed(2)}</div>
                <div class="h-result ${resultClass}">${label}: $${Math.abs(d.result).toFixed(2)}</div>
            </div>
        `;
        els.historyList.appendChild(li);
    });
}

// Helper: Animate Numbers
function animateValue(obj, start, end, duration) {
    if (start === end) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        // Easing (easeOutExpo)
        const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const current = start + (end - start) * ease;
        obj.innerHTML = current.toFixed(2);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.innerHTML = end.toFixed(2);
        }
    };
    window.requestAnimationFrame(step);
}

// Navigation Logic
function setupNavigation() {
    const switchTab = (tab) => {
        if (tab === 'track') {
            els.trackView.style.display = 'flex';
            els.historyView.style.display = 'none';
            els.navTrack.classList.add('active');
            els.navHistory.classList.remove('active');
            els.addBtn.style.display = 'flex'; // Show FAB
            render(); // Refresh track view
        } else {
            els.trackView.style.display = 'none';
            els.historyView.style.display = 'block'; // Block for normal flow
            els.navTrack.classList.remove('active');
            els.navHistory.classList.add('active');
            els.addBtn.style.display = 'none'; // Hide FAB
            renderHistory(); // Render charts
        }
    };

    els.navTrack.addEventListener('click', () => switchTab('track'));
    els.navHistory.addEventListener('click', () => switchTab('history'));

    // Initial tab setup
    switchTab('track');
}


// Event Listeners
function setupEventListeners() {
    // Open Add Modal
    els.addBtn.addEventListener('click', () => {
        els.expenseAmount.value = '';
        els.expenseNote.value = '';
        els.addModal.classList.add('active');
        setTimeout(() => els.expenseAmount.focus(), 100);
    });

    // Close Modals
    els.closeAddModal.addEventListener('click', () => {
        els.addModal.classList.remove('active');
    });

    // Save Expense
    els.saveExpenseBtn.addEventListener('click', () => {
        const amt = els.expenseAmount.value;
        const note = els.expenseNote.value;
        if (amt) {
            addExpense(amt, note);
            els.addModal.classList.remove('active');
        }
    });

    // Budget Input Change
    els.limitInput.addEventListener('change', () => {
        const val = parseFloat(els.limitInput.value);
        if (!isNaN(val) && val > 0) {
            state.budget = val;
            saveState();
        }
    });

    // Allow saving by pressing "Enter" on the input too
    els.limitInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            els.limitInput.blur();
        }
    });

    // Reset Data
    els.resetDataBtn.addEventListener('click', () => {
        // Removing confirm to avoid blocking issues; adding immediate feedback
        if (state.expenses.length === 0 && state.history.length === 0) return;

        state.expenses = [];
        state.history = []; // Clear history too logic

        // Save and Reload to ensure fresh state (Hammer fix)
        localStorage.setItem('dailySpendState', JSON.stringify(state));
        location.reload();
    });

    // Quick Tags
    els.quickTags.addEventListener('click', (e) => {
        if (e.target.classList.contains('tag')) {
            els.expenseNote.value = e.target.dataset.val;
        }
    });

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target === els.addModal) els.addModal.classList.remove('active');
    });
}

// Run
init();
