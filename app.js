/**
 * 짠이용돈기입장 (Smart Pocket Money Tracker) - Core Logic
 */

// Category Registry with Emojis
const CATEGORIES = {
    expense: [
        { id: "daiso", name: "다이소", emoji: "🛒" },
        { id: "stationery", name: "문구류", emoji: "✏️" },
        { id: "food", name: "간식/식비", emoji: "🍕" },
        { id: "game", name: "게임/놀이", emoji: "🎮" },
        { id: "savings", name: "저축", emoji: "🏦" },
        { id: "culture", name: "문화 생활", emoji: "🎬" },
        { id: "health", name: "건강/생활", emoji: "💊" },
        { id: "transport", name: "교통비", emoji: "🚌" },
        { id: "shopping", name: "쇼핑", emoji: "🛍️" },
        { id: "gift", name: "선물/경조사", emoji: "🎁" },
        { id: "other", name: "기타", emoji: "🏷️" }
    ],
    income: [
        { id: "allowance", name: "용돈", emoji: "💵" },
        { id: "parttime", name: "알바", emoji: "💼" },
        { id: "bonus", name: "상금/보너스", emoji: "🏆" },
        { id: "savings_return", name: "저축/만기", emoji: "🏦" },
        { id: "other", name: "기타", emoji: "🏷️" }
    ]
};

// Global App State
let state = {
    transactions: [],
    currentDate: new Date(), // Focus month
    activeTab: "list-tab",
    currentFilter: "all",
    currentSort: "input-order",
    selectedDateStr: "", // Format: YYYY-MM-DD
    calendarMode: "monthly" // monthly or weekly
};

// Calculator State
let calcState = {
    expression: "",
    result: "0",
    isReset: true,
    targetInput: null // Reference to the input element that triggered calculator
};

// Colors mapping for statistics donut segments
const CATEGORY_COLORS = {
    "다이소": "#3b82f6",
    "문구류": "#a855f7",
    "간식/식비": "#f43f5e",
    "게임/놀이": "#eab308",
    "저축": "#10b981",
    "문화 생활": "#6366f1",
    "건강/생활": "#14b8a6",
    "교통비": "#f97316",
    "쇼핑": "#ec4899",
    "선물/경조사": "#8b5cf6",
    "기타": "#64748b",
    "용돈": "#10b981",
    "알바": "#06b6d4",
    "상금/보너스": "#eab308",
    "저축/만기": "#14b8a6"
};

// Initialize App
window.addEventListener("DOMContentLoaded", () => {
    loadTransactions();
    
    // Initialize Theme
    const savedTheme = localStorage.getItem("jjan_pocket_money_theme") || "dark";
    setTheme(savedTheme);

    initDOMEvents();
    
    // Set default select date to today
    const today = new Date();
    state.selectedDateStr = formatDateStr(today);
    
    renderApp();
});

// Load & Save Data
function loadTransactions() {
    const saved = localStorage.getItem("jjan_pocket_money_transactions");
    if (saved) {
        try {
            state.transactions = JSON.parse(saved);
        } catch (e) {
            console.error("Error parsing transactions", e);
            state.transactions = [];
        }
    } else {
        // Sample seed data if empty
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        
        state.transactions = [
            {
                id: "seed-1",
                type: "expense",
                amount: 2000,
                date: `${year}-${month}-05T15:30`,
                categories: ["다이소", "문구류"],
                memo: "노트랑 연필 구매",
                payment: "card",
                createdAt: Date.now() - 86400000 * 2
            },
            {
                id: "seed-2",
                type: "income",
                amount: 10000,
                date: `${year}-${month}-01T10:00`,
                categories: ["용돈"],
                memo: "이번 달 용돈!",
                payment: "cash",
                createdAt: Date.now() - 86400000 * 6
            },
            {
                id: "seed-3",
                type: "expense",
                amount: 4500,
                date: `${year}-${month}-06T12:15`,
                categories: ["간식/식비"],
                memo: "떡볶이 냠냠",
                payment: "bank",
                createdAt: Date.now() - 3600000
            }
        ];
        saveTransactions();
    }
}

function saveTransactions() {
    localStorage.setItem("jjan_pocket_money_transactions", JSON.stringify(state.transactions));
}

// Format date to string: YYYY-MM-DD
function formatDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// Get display emojis for selected categories
function getCategoryEmojis(selectedCats, type) {
    const pool = CATEGORIES[type];
    return selectedCats.map(catName => {
        const found = pool.find(c => c.name === catName);
        return found ? found.emoji : "🏷️";
    }).join("");
}

// Event Bindings
function initDOMEvents() {
    // Navigation tab switching
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const tabId = btn.getAttribute("data-tab");
            
            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
            
            btn.classList.add("active");
            document.getElementById(tabId).classList.add("active");
            
            state.activeTab = tabId;
            renderApp();
        });
    });

    // Month Selector Buttons
    document.getElementById("prev-month-btn").addEventListener("click", () => {
        state.currentDate.setMonth(state.currentDate.getMonth() - 1);
        renderApp();
    });
    
    document.getElementById("next-month-btn").addEventListener("click", () => {
        state.currentDate.setMonth(state.currentDate.getMonth() + 1);
        renderApp();
    });

    // Filter Buttons
    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            state.currentFilter = btn.getAttribute("data-filter");
            renderTransactionsList();
        });
    });

    // Sort Dropdown
    document.getElementById("sort-select").addEventListener("change", (e) => {
        state.currentSort = e.target.value;
        renderTransactionsList();
    });

    // Modal Control: Open Add Income/Expense
    document.getElementById("add-expense-btn").addEventListener("click", () => openModal("expense"));
    document.getElementById("add-income-btn").addEventListener("click", () => openModal("income"));
    
    // Close Modal
    document.getElementById("close-modal-btn").addEventListener("click", closeModal);
    document.getElementById("cancel-modal-btn").addEventListener("click", closeModal);
    
    // Save Form
    document.getElementById("transaction-form").addEventListener("submit", handleSaveTransaction);

    // Payment Method Selection Buttons
    document.querySelectorAll(".pay-method-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".pay-method-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            document.getElementById("trans-payment").value = btn.getAttribute("data-value");
        });
    });

    // AM/PM Selection Buttons
    document.querySelectorAll(".ampm-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".ampm-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            document.getElementById("trans-ampm").value = btn.getAttribute("data-value");
        });
    });
    // Settings Modal Open/Close Controls
    document.getElementById("settings-toggle-btn").addEventListener("click", () => {
        document.getElementById("settings-modal").classList.add("open");
    });
    document.getElementById("close-settings-btn").addEventListener("click", () => {
        document.getElementById("settings-modal").classList.remove("open");
    });

    // Theme selector inside settings
    document.getElementById("settings-theme-dark").addEventListener("click", () => setTheme("dark"));
    document.getElementById("settings-theme-light").addEventListener("click", () => setTheme("light"));

    // Reset Data with Double Confirmation
    document.getElementById("reset-data-btn").addEventListener("click", () => {
        const confirm1 = confirm("⚠️ 정말로 모든 가계부 데이터를 초기화하시겠습니까?\n이 작업은 되돌릴 수 없으며, 모든 수입/지출 내역이 삭제됩니다.");
        if (confirm1) {
            const confirm2 = confirm("⚠️ [최종 확인] 데이터를 삭제하면 완전히 소실됩니다. 계속해서 초기화하시겠습니까?");
            if (confirm2) {
                localStorage.removeItem("jjan_pocket_money_transactions");
                state.transactions = [];
                saveTransactions();
                document.getElementById("settings-modal").classList.remove("open");
                renderApp();
                alert("가계부가 초기화되었습니다.");
            }
        }
    });

    // Calculator Draw Control
    document.getElementById("open-calc-btn").addEventListener("click", () => {
        openCalculator(null);
    });
    document.getElementById("modal-calc-btn").addEventListener("click", () => {
        openCalculator(document.getElementById("trans-amount"));
    });
    document.getElementById("close-calc-drawer-btn").addEventListener("click", closeCalculator);
    
    // Calculator Keypad Events
    document.querySelectorAll(".calc-key").forEach(key => {
        key.addEventListener("click", () => {
            const val = key.getAttribute("data-val");
            const action = key.getAttribute("data-action");
            handleCalculatorInput(val, action);
        });
    });
    
    document.getElementById("calc-apply-btn").addEventListener("click", applyCalculatorValue);

    // Calendar Modes: Monthly vs. Weekly Summary
    document.getElementById("cal-mode-monthly").addEventListener("click", () => {
        document.getElementById("cal-mode-monthly").classList.add("active");
        document.getElementById("cal-mode-weekly").classList.remove("active");
        document.getElementById("calendar-view-container").classList.remove("hidden");
        document.getElementById("weekly-summary-container").classList.add("hidden");
        state.calendarMode = "monthly";
        renderCalendar();
    });

    document.getElementById("cal-mode-weekly").addEventListener("click", () => {
        document.getElementById("cal-mode-monthly").classList.remove("active");
        document.getElementById("cal-mode-weekly").classList.add("active");
        document.getElementById("calendar-view-container").classList.add("hidden");
        document.getElementById("weekly-summary-container").classList.remove("hidden");
        state.calendarMode = "weekly";
        renderWeeklySummary();
    });
}

// Render Functions
function renderApp() {
    // Current Month Text
    const year = state.currentDate.getFullYear();
    const month = state.currentDate.getMonth() + 1;
    document.getElementById("current-month-display").textContent = `${year}년 ${String(month).padStart(2, '0')}월`;
    
    // Compute Totals
    updateBalances();
    
    // Switch between panels
    if (state.activeTab === "list-tab") {
        renderTransactionsList();
    } else if (state.activeTab === "calendar-tab") {
        if (state.calendarMode === "monthly") {
            renderCalendar();
        } else {
            renderWeeklySummary();
        }
        renderSelectedDateList();
    } else if (state.activeTab === "stats-tab") {
        renderStats();
    }
}

// Balance Card Updater
function updateBalances() {
    let cumulativeIncome = 0;
    let cumulativeExpense = 0;
    
    // Calculate total balance from all transactions
    state.transactions.forEach(t => {
        if (t.type === "income") {
            cumulativeIncome += t.amount;
        } else {
            cumulativeExpense += t.amount;
        }
    });
    
    const totalBalance = cumulativeIncome - cumulativeExpense;
    
    // Calculate month-specific totals
    const focusYear = state.currentDate.getFullYear();
    const focusMonth = state.currentDate.getMonth();
    
    let monthlyIncome = 0;
    let monthlyExpense = 0;
    
    state.transactions.forEach(t => {
        const d = new Date(t.date);
        if (d.getFullYear() === focusYear && d.getMonth() === focusMonth) {
            if (t.type === "income") {
                monthlyIncome += t.amount;
            } else {
                monthlyExpense += t.amount;
            }
        }
    });
    
    document.getElementById("total-balance").textContent = `${totalBalance.toLocaleString()}원`;
    document.getElementById("header-income").textContent = `+${monthlyIncome.toLocaleString()}원`;
    document.getElementById("header-expense").textContent = `-${monthlyExpense.toLocaleString()}원`;
}

// Sort Helper
function sortTransactions(list) {
    const listCopy = [...list];
    
    switch (state.currentSort) {
        case "input-order":
            // Recently recorded first (descending by createdAt timestamp)
            return listCopy.sort((a, b) => b.createdAt - a.createdAt);
            
        case "date-desc":
            // Newest date first
            return listCopy.sort((a, b) => new Date(b.date) - new Date(a.date));
            
        case "date-asc":
            // Oldest date first
            return listCopy.sort((a, b) => new Date(a.date) - new Date(b.date));
            
        case "amount-desc":
            // Highest amount first
            return listCopy.sort((a, b) => b.amount - a.amount);
            
        case "amount-asc":
            // Lowest amount first
            return listCopy.sort((a, b) => a.amount - b.amount);
            
        case "abc":
            // Alphabetical by memo/description
            return listCopy.sort((a, b) => (a.memo || "").localeCompare(b.memo || ""));
            
        case "category":
            // Sort by category string representation
            return listCopy.sort((a, b) => {
                const catA = a.categories.join(", ");
                const catB = b.categories.join(", ");
                return catA.localeCompare(catB);
            });
            
        default:
            return listCopy;
    }
}

// List Panel Renderer
function renderTransactionsList() {
    const container = document.getElementById("transaction-list-container");
    container.innerHTML = "";
    
    const focusYear = state.currentDate.getFullYear();
    const focusMonth = state.currentDate.getMonth();
    
    // Filter: current month + type filter
    let filteredList = state.transactions.filter(t => {
        const d = new Date(t.date);
        const matchMonth = d.getFullYear() === focusYear && d.getMonth() === focusMonth;
        
        if (!matchMonth) return false;
        if (state.currentFilter === "all") return true;
        return t.type === state.currentFilter;
    });
    
    if (filteredList.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>기록된 내역이 없습니다.</p>
                <span>하단의 + / - 버튼으로 첫 내역을 기록해 보세요!</span>
            </div>
        `;
        return;
    }
    
    // Sort
    const sortedList = sortTransactions(filteredList);
    
    // If grouped by date is visually better, check if sort is input-order or date-desc/date-asc
    const isChronological = ["date-desc", "date-asc", "input-order"].includes(state.currentSort);
    
    if (isChronological) {
        // Group by day for chronological sorts
        const groups = {};
        sortedList.forEach(item => {
            const dateOnly = item.date.split("T")[0];
            if (!groups[dateOnly]) groups[dateOnly] = [];
            groups[dateOnly].push(item);
        });
        
        // Render groups
        // Sorting keys of groups based on current sort direction
        const dateKeys = Object.keys(groups).sort((a, b) => {
            if (state.currentSort === "date-asc") {
                return new Date(a) - new Date(b);
            }
            // default/date-desc: newest days first
            return new Date(b) - new Date(a);
        });
        
        dateKeys.forEach(dateStr => {
            const dayItems = groups[dateStr];
            let dayIncome = 0;
            let dayExpense = 0;
            
            dayItems.forEach(item => {
                if (item.type === "income") dayIncome += item.amount;
                else dayExpense += item.amount;
            });
            
            const dayDateObj = new Date(dateStr);
            const dateLabel = `${dayDateObj.getMonth()+1}월 ${dayDateObj.getDate()}일 (${["일","월","화","수","목","금","토"][dayDateObj.getDay()]})`;
            
            const dayGroupDiv = document.createElement("div");
            dayGroupDiv.className = "day-group";
            
            let summaryHTML = "";
            if (dayIncome > 0) summaryHTML += `<span class="day-summary-inc">+${dayIncome.toLocaleString()}</span>`;
            if (dayExpense > 0) summaryHTML += `<span class="day-summary-exp">-${dayExpense.toLocaleString()}</span>`;
            
            dayGroupDiv.innerHTML = `
                <div class="day-header">
                    <span class="day-date">${dateLabel}</span>
                    <div class="day-summary">${summaryHTML}</div>
                </div>
            `;
            
            const itemsList = document.createElement("div");
            dayItems.forEach(item => {
                const itemEl = createTransactionItemEl(item);
                itemsList.appendChild(itemEl);
            });
            
            dayGroupDiv.appendChild(itemsList);
            container.appendChild(dayGroupDiv);
        });
        
    } else {
        // Plain linear list for other sorting options (Amount, Alphabetical, Category)
        const wrapper = document.createElement("div");
        wrapper.className = "day-group";
        
        sortedList.forEach(item => {
            const itemEl = createTransactionItemEl(item);
            wrapper.appendChild(itemEl);
        });
        
        container.appendChild(wrapper);
    }
}

function createTransactionItemEl(item) {
    const div = document.createElement("div");
    div.className = `trans-item ${item.type}-type`;
    div.addEventListener("click", (e) => {
        // Prevent editing trigger if delete button clicked
        if (e.target.closest(".btn-item-delete")) return;
        editTransaction(item.id);
    });
    
    const timeStr = item.date.split("T")[1] || "00:00";
    const emojiStr = getCategoryEmojis(item.categories, item.type);
    
    // Tag list HTML
    const tagsHTML = item.categories.map(c => `<span class="tag-badge">${c}</span>`).join("");
    
    div.innerHTML = `
        <div class="trans-icon-box">
            <span>${emojiStr.slice(0, 2) || "🏷️"}</span>
        </div>
        <div class="trans-details">
            <div class="trans-memo">${item.memo || "메모 없음"}</div>
            <div class="trans-meta">
                <span class="trans-time">${timeStr}</span>
                <div class="trans-tags">${tagsHTML}</div>
            </div>
        </div>
        <div class="trans-amount-box">
            ${item.type === "income" ? "+" : "-"}${item.amount.toLocaleString()}원
        </div>
        <div class="trans-actions">
            <button class="btn-item-delete" onclick="handleDeleteTransaction(event, '${item.id}')" title="삭제">
                <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </button>
        </div>
    `;
    return div;
}

// Calendar Renderer
function renderCalendar() {
    const daysGrid = document.getElementById("calendar-days-grid");
    daysGrid.innerHTML = "";
    
    const year = state.currentDate.getFullYear();
    const month = state.currentDate.getMonth();
    
    // First day of current month
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Total days in current month
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();
    
    // Previous month padding
    const prevMonthLast = new Date(year, month, 0).getDate();
    for (let i = startWeekday - 1; i >= 0; i--) {
        const cell = document.createElement("div");
        cell.className = "cal-day-cell other-month";
        cell.innerHTML = `<span class="cal-day-num">${prevMonthLast - i}</span>`;
        daysGrid.appendChild(cell);
    }
    
    // Active month days
    for (let day = 1; day <= totalDays; day++) {
        const cell = document.createElement("div");
        const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        let weekdayClass = "";
        const dayOfWeek = new Date(year, month, day).getDay();
        if (dayOfWeek === 0) weekdayClass = "sunday";
        if (dayOfWeek === 6) weekdayClass = "saturday";
        
        const isActiveStr = state.selectedDateStr === cellDateStr ? "active-day" : "";
        cell.className = `cal-day-cell ${weekdayClass} ${isActiveStr}`;
        cell.setAttribute("data-date", cellDateStr);
        
        // Sum incomes/expenses for this day
        const dayTrans = state.transactions.filter(t => t.date.startsWith(cellDateStr));
        let incSum = 0;
        let expSum = 0;
        dayTrans.forEach(t => {
            if (t.type === "income") incSum += t.amount;
            else expSum += t.amount;
        });
        
        let sumHTML = "";
        if (incSum > 0) sumHTML += `<span class="cal-mini-inc">+${incSum >= 10000 ? (incSum/10000).toFixed(1)+'만' : incSum.toLocaleString()}</span>`;
        if (expSum > 0) sumHTML += `<span class="cal-mini-exp">-${expSum >= 10000 ? (expSum/10000).toFixed(1)+'만' : expSum.toLocaleString()}</span>`;
        
        cell.innerHTML = `
            <span class="cal-day-num">${day}</span>
            <div class="cal-day-sums">${sumHTML}</div>
        `;
        
        cell.addEventListener("click", () => {
            document.querySelectorAll(".cal-day-cell").forEach(c => c.classList.remove("active-day"));
            cell.classList.add("active-day");
            state.selectedDateStr = cellDateStr;
            renderSelectedDateList();
        });
        
        daysGrid.appendChild(cell);
    }
}

// Weekly Summary Renderer
function renderWeeklySummary() {
    const container = document.getElementById("weekly-summary-container");
    container.innerHTML = "";
    
    const year = state.currentDate.getFullYear();
    const month = state.currentDate.getMonth();
    
    // Group monthly transactions into calendar weeks
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();
    
    let currentWeekNum = 1;
    let weekIncome = 0;
    let weekExpense = 0;
    let weekStartDay = 1;
    
    for (let d = 1; d <= totalDays; d++) {
        const curDate = new Date(year, month, d);
        const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        
        // Accumulate
        const dayTrans = state.transactions.filter(t => t.date.startsWith(cellDateStr));
        dayTrans.forEach(t => {
            if (t.type === "income") weekIncome += t.amount;
            else weekExpense += t.amount;
        });
        
        // End of week (Saturday) or last day of month
        if (curDate.getDay() === 6 || d === totalDays) {
            const row = document.createElement("div");
            row.className = "weekly-row";
            row.innerHTML = `
                <div class="weekly-label">${month + 1}월 ${weekStartDay}일 ~ ${d}일 (${currentWeekNum}주차)</div>
                <div class="weekly-vals">
                    <span class="day-summary-inc">+${weekIncome.toLocaleString()}원</span>
                    <span class="day-summary-exp">-${weekExpense.toLocaleString()}원</span>
                </div>
            `;
            container.appendChild(row);
            
            // Reset for next week
            currentWeekNum++;
            weekIncome = 0;
            weekExpense = 0;
            weekStartDay = d + 1;
        }
    }
}

// Selected Date List Renderer
function renderSelectedDateList() {
    const listContainer = document.getElementById("selected-date-list");
    const title = document.getElementById("selected-date-title");
    
    listContainer.innerHTML = "";
    
    if (!state.selectedDateStr) {
        title.textContent = "날짜를 선택해 주세요";
        return;
    }
    
    const dParts = state.selectedDateStr.split("-");
    title.textContent = `${parseInt(dParts[1])}월 ${parseInt(dParts[2])}일 내역`;
    
    const dayTrans = state.transactions.filter(t => t.date.startsWith(state.selectedDateStr));
    
    if (dayTrans.length === 0) {
        listContainer.innerHTML = `<div class="empty-state" style="padding:15px; font-size:0.8rem;">기록된 내역이 없습니다.</div>`;
        return;
    }
    
    dayTrans.forEach(item => {
        const itemEl = document.createElement("div");
        itemEl.className = `mini-item ${item.type}-type`;
        itemEl.addEventListener("click", () => editTransaction(item.id));
        
        const emojiStr = getCategoryEmojis(item.categories, item.type);
        
        itemEl.innerHTML = `
            <div class="mini-item-left">
                <span class="mini-emoji">${emojiStr.slice(0, 2) || "🏷️"}</span>
                <span class="mini-memo">${item.memo || item.categories.join(", ")}</span>
            </div>
            <div class="mini-amount">${item.type === "income" ? "+" : "-"}${item.amount.toLocaleString()}원</div>
        `;
        listContainer.appendChild(itemEl);
    });
}

// Analytics and Statistics Render (Donut Chart & Text Feedback)
function renderStats() {
    const focusYear = state.currentDate.getFullYear();
    const focusMonth = state.currentDate.getMonth();
    
    // Filter this month's expenses
    const monthlyExpenses = state.transactions.filter(t => {
        const d = new Date(t.date);
        return d.getFullYear() === focusYear && d.getMonth() === focusMonth && t.type === "expense";
    });
    
    const totalExp = monthlyExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    document.getElementById("chart-total-expense").textContent = `${totalExp.toLocaleString()}원`;
    
    const legendContainer = document.getElementById("chart-legend-container");
    const chartSvg = document.getElementById("category-donut-chart");
    legendContainer.innerHTML = "";
    
    // Clear segments except base helper ring
    chartSvg.querySelectorAll(".chart-segment").forEach(s => s.remove());
    
    if (totalExp === 0) {
        legendContainer.innerHTML = `<div class="empty-state">기록된 지출이 없어서 통계를 작성할 수 없습니다.</div>`;
        document.getElementById("analysis-feedback-text").textContent = "지출 내역을 추가하시면 소비 진단 및 피드백을 전달해 드립니다!";
        return;
    }
    
    // Categorize
    const catSums = {};
    monthlyExpenses.forEach(t => {
        t.categories.forEach(cat => {
            // Distribute amount equally among item's selected categories
            const share = t.amount / t.categories.length;
            catSums[cat] = (catSums[cat] || 0) + share;
        });
    });
    
    // Sort categories by sum descending
    const sortedCats = Object.entries(catSums).sort((a, b) => b[1] - a[1]);
    
    // Draw SVG Donut segments
    let accumulatedPercent = 0;
    
    sortedCats.forEach(([catName, amount]) => {
        const percent = (amount / totalExp) * 100;
        const color = CATEGORY_COLORS[catName] || "#64748b";
        
        // Donut calculations: circumference = 2 * PI * r = 2 * 3.14159 * 40 = 251.3
        const circ = 251.3;
        const strokeDasharray = `${(percent / 100) * circ} ${circ}`;
        const strokeDashoffset = `${- (accumulatedPercent / 100) * circ}`;
        
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", "50");
        circle.setAttribute("cy", "50");
        circle.setAttribute("r", "40");
        circle.setAttribute("fill", "transparent");
        circle.setAttribute("stroke", color);
        circle.setAttribute("stroke-width", "12");
        circle.setAttribute("stroke-dasharray", strokeDasharray);
        circle.setAttribute("stroke-dashoffset", strokeDashoffset);
        circle.setAttribute("class", "chart-segment");
        
        chartSvg.appendChild(circle);
        
        accumulatedPercent += percent;
        
        // Add legend row
        const legendRow = document.createElement("div");
        legendRow.className = "legend-item";
        legendRow.innerHTML = `
            <div class="legend-left">
                <span class="legend-color" style="background-color: ${color}"></span>
                <span class="legend-label">${catName}</span>
                <span class="legend-pct">${percent.toFixed(1)}%</span>
            </div>
            <div class="legend-val">${Math.round(amount).toLocaleString()}원</div>
        `;
        legendContainer.appendChild(legendRow);
    });
    
    // Analysis Feedback Logic
    const feedbackEl = document.getElementById("analysis-feedback-text");
    const topCategory = sortedCats[0][0];
    const topPct = (sortedCats[0][1] / totalExp) * 100;
    
    let feedbackStr = `이번 달 주요 지출 카테고리는 <strong>${topCategory}</strong>(${topPct.toFixed(1)}%) 입니다. `;
    
    if (topCategory === "다이소" || topCategory === "문구류") {
        feedbackStr += "자잘하게 충동적인 쇼핑 아이템을 샀을 확률이 높아요! 🛒 사기 전에 정말 필요한 물건인지 세 번씩 고민해 보길 권장합니다.";
    } else if (topCategory === "간식/식비") {
        feedbackStr += "군것질이나 식비 비중이 큽니다 🍕. 간식 비용을 정해진 예산만큼만 따로 분리해 보세요.";
    } else if (topCategory === "게임/놀이") {
        feedbackStr += "놀이방이나 가챠 게임 등 디지털 유흥 비용이 가장 크네요 🎮! 하루 상한선을 정해보는 것은 어떨까요?";
    } else if (topCategory === "저축") {
        feedbackStr += "돈을 차곡차곡 모으고 계시네요 🏦! 장래에 하고 싶은 버킷리스트를 채우는 훌륭한 소비 방식입니다.";
    } else {
        feedbackStr += "계획했던 용돈 한도 내에서 알뜰하고 밸런스 있는 가계부를 가꾸어 나가고 계십니다. 아주 훌륭합니다 👍!";
    }
    
    feedbackEl.innerHTML = feedbackStr;
}

// Modal Form Open/Close
function openModal(type, existingItem = null) {
    const modal = document.getElementById("transaction-modal");
    const modalTitle = document.getElementById("modal-title");
    const typeInput = document.getElementById("trans-type");
    const idInput = document.getElementById("trans-id");
    const amountInput = document.getElementById("trans-amount");
    const memoInput = document.getElementById("trans-memo");
    const paymentSelect = document.getElementById("trans-payment");
    const customCatBox = document.getElementById("custom-cat-input-box");
    const customCatText = document.getElementById("custom-category-text");
    
    // Form defaults
    modalTitle.textContent = existingItem ? "내역 수정" : (type === "expense" ? "지출 기록하기" : "수입 기록하기");
    typeInput.value = type;
    idInput.value = existingItem ? existingItem.id : "";
    amountInput.value = existingItem ? existingItem.amount : "";
    memoInput.value = existingItem ? existingItem.memo : "";
    const payVal = existingItem ? existingItem.payment : "card";
    paymentSelect.value = payVal;
    document.querySelectorAll(".pay-method-btn").forEach(btn => {
        if (btn.getAttribute("data-value") === payVal) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });
    customCatText.value = "";
    customCatBox.classList.add("hidden");
    
    // Set active date and time
    let YYYY_MM_DD = "";
    let HH = 12;
    let MM = "00";
    
    if (existingItem) {
        const parts = existingItem.date.split("T");
        YYYY_MM_DD = parts[0];
        const timeParts = (parts[1] || "00:00").split(":");
        HH = parseInt(timeParts[0], 10);
        MM = timeParts[1] || "00";
    } else {
        const now = new Date();
        YYYY_MM_DD = formatDateStr(now);
        HH = now.getHours();
        MM = String(now.getMinutes()).padStart(2, '0');
    }
    
    // Convert 24h to 12h & AM/PM
    let ampm = "AM";
    let hour12 = HH;
    if (HH >= 12) {
        ampm = "PM";
        if (HH > 12) {
            hour12 = HH - 12;
        }
    } else if (HH === 0) {
        hour12 = 12;
    }
    
    document.getElementById("trans-date-only").value = YYYY_MM_DD;
    document.getElementById("trans-ampm").value = ampm;
    document.getElementById("trans-hour").value = hour12;
    document.getElementById("trans-minute").value = MM;
    
    // Toggle AM/PM buttons active state
    document.querySelectorAll(".ampm-btn").forEach(btn => {
        if (btn.getAttribute("data-value") === ampm) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });
    
    // Build category grid
    const catGrid = document.getElementById("modal-category-grid");
    catGrid.innerHTML = "";
    
    const catPool = CATEGORIES[type];
    
    catPool.forEach(cat => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "cat-select-btn";
        btn.setAttribute("data-category", cat.name);
        
        const isSelected = existingItem && existingItem.categories.includes(cat.name);
        if (isSelected) {
            btn.classList.add("selected");
            // If custom is selected
            if (cat.name === "기타") {
                customCatBox.classList.remove("hidden");
                // Find custom string (it would be whatever is in list but doesn't exist in predefined names)
                const predefinedNames = catPool.map(c => c.name);
                const customVal = existingItem.categories.find(c => !predefinedNames.includes(c));
                if (customVal) customCatText.value = customVal;
            }
        }
        
        btn.innerHTML = `
            <span class="cat-icon">${cat.emoji}</span>
            <span>${cat.name}</span>
        `;
        
        btn.addEventListener("click", () => {
            btn.classList.toggle("selected");
            
            // Special trigger for "기타" category
            if (cat.name === "기타") {
                if (btn.classList.contains("selected")) {
                    customCatBox.classList.remove("hidden");
                    customCatText.focus();
                } else {
                    customCatBox.classList.add("hidden");
                }
            }
        });
        
        catGrid.appendChild(btn);
    });
    
    modal.classList.add("open");
}

function closeModal() {
    document.getElementById("transaction-modal").classList.remove("open");
}

// Save Operation (Create or Update)
function handleSaveTransaction() {
    const type = document.getElementById("trans-type").value;
    const id = document.getElementById("trans-id").value;
    const amount = parseInt(document.getElementById("trans-amount").value, 10);
    const dateOnly = document.getElementById("trans-date-only").value;
    const ampm = document.getElementById("trans-ampm").value;
    const hour12 = parseInt(document.getElementById("trans-hour").value, 10);
    
    // Safely parse typed minute
    let minuteVal = parseInt(document.getElementById("trans-minute").value, 10);
    if (isNaN(minuteVal) || minuteVal < 0) {
        minuteVal = 0;
    } else if (minuteVal > 59) {
        minuteVal = 59;
    }
    const minuteStr = String(minuteVal).padStart(2, '0');
    
    // Convert 12h & AM/PM to 24h HH
    let hour24 = hour12;
    if (ampm === "PM") {
        if (hour12 < 12) {
            hour24 = hour12 + 12;
        }
    } else { // AM
        if (hour12 === 12) {
            hour24 = 0;
        }
    }
    const hourStr = String(hour24).padStart(2, '0');
    const date = `${dateOnly}T${hourStr}:${minuteStr}`;
    
    const memo = document.getElementById("trans-memo").value.trim();
    const payment = document.getElementById("trans-payment").value;
    
    // Find all selected categories
    const selectedBtnElements = document.querySelectorAll(".cat-select-btn.selected");
    let selectedCats = Array.from(selectedBtnElements).map(el => el.getAttribute("data-category"));
    
    if (selectedCats.length === 0) {
        alert("카테고리를 최소 1개 이상 선택해 주세요!");
        return;
    }
    
    // Process "기타" text input
    if (selectedCats.includes("기타")) {
        // Swap "기타" with custom label if user specified it
        const customVal = document.getElementById("custom-category-text").value.trim();
        const index = selectedCats.indexOf("기타");
        if (customVal) {
            selectedCats[index] = customVal;
        } else {
            selectedCats[index] = "기타";
        }
    }
    
    if (isNaN(amount) || amount <= 0) {
        alert("금액을 정확히 입력해 주세요.");
        return;
    }
    
    if (!date) {
        alert("날짜를 입력해 주세요.");
        return;
    }
    
    if (id) {
        // Edit mode
        const index = state.transactions.findIndex(t => t.id === id);
        if (index !== -1) {
            state.transactions[index] = {
                ...state.transactions[index],
                type,
                amount,
                date,
                categories: selectedCats,
                memo: memo || selectedCats.join("-"),
                payment
            };
        }
    } else {
        // New mode
        const newTrans = {
            id: "trans-" + Date.now() + Math.random().toString(36).substr(2, 4),
            type,
            amount,
            date,
            categories: selectedCats,
            memo: memo || selectedCats.join("-"),
            payment,
            createdAt: Date.now()
        };
        state.transactions.push(newTrans);
    }
    
    saveTransactions();
    closeModal();
    
    // Update selectedDateStr to match saved item for calendar comfort
    state.selectedDateStr = date.split("T")[0];
    
    renderApp();
}

// Edit Mode Opener
function editTransaction(id) {
    const item = state.transactions.find(t => t.id === id);
    if (item) {
        openModal(item.type, item);
    }
}

// Delete Operation
function handleDeleteTransaction(e, id) {
    e.stopPropagation(); // Stop clicking row from opening edit modal
    
    if (confirm("정말로 이 내역을 삭제하시겠습니까?")) {
        state.transactions = state.transactions.filter(t => t.id !== id);
        saveTransactions();
        renderApp();
    }
}

// Calculator Logic
function openCalculator(targetInputEl) {
    calcState.targetInput = targetInputEl;
    
    // Pre-populate calculator from amount field if it has value
    if (targetInputEl && targetInputEl.value) {
        calcState.result = targetInputEl.value;
        calcState.expression = "";
        calcState.isReset = false;
    } else {
        calcState.result = "0";
        calcState.expression = "";
        calcState.isReset = true;
    }
    
    updateCalculatorDisplay();
    document.getElementById("calculator-drawer").classList.add("open");
}

function closeCalculator() {
    document.getElementById("calculator-drawer").classList.remove("open");
}

function updateCalculatorDisplay() {
    document.getElementById("calc-exp-display").textContent = calcState.expression;
    document.getElementById("calc-val-display").textContent = calcState.result;
}

function handleCalculatorInput(val, action) {
    if (action === "clear") {
        calcState.expression = "";
        calcState.result = "0";
        calcState.isReset = true;
    } 
    else if (action === "backspace") {
        if (calcState.result.length > 1) {
            calcState.result = calcState.result.slice(0, -1);
        } else {
            calcState.result = "0";
            calcState.isReset = true;
        }
    } 
    else {
        // Operators or Decimals or Digits
        const operators = ["+", "-", "*", "/"];
        
        if (operators.includes(val)) {
            // Operator selected
            if (calcState.isReset) {
                calcState.expression = calcState.result + " " + val + " ";
            } else {
                calcState.expression += calcState.result + " " + val + " ";
            }
            calcState.result = "0";
            calcState.isReset = true;
        } 
        else {
            // Digit or decimal point
            if (val === ".") {
                if (!calcState.result.includes(".")) {
                    calcState.result += ".";
                }
            } else {
                if (calcState.result === "0" || calcState.isReset) {
                    calcState.result = val;
                    calcState.isReset = false;
                } else {
                    calcState.result += val;
                }
            }
        }
    }
    updateCalculatorDisplay();
}

function applyCalculatorValue() {
    // If there is an active expression, evaluate it first
    if (calcState.expression) {
        try {
            // Sanitize expression and evaluate
            const sanitizedExp = (calcState.expression + calcState.result).replace(/×/g, "*").replace(/÷/g, "/");
            // Simple safer eval alternative
            const finalVal = Function(`"use strict"; return (${sanitizedExp})`)();
            
            if (isFinite(finalVal)) {
                calcState.result = String(Math.round(finalVal));
                calcState.expression = "";
                calcState.isReset = true;
            } else {
                calcState.result = "오류";
                updateCalculatorDisplay();
                return;
            }
        } catch (e) {
            calcState.result = "오류";
            updateCalculatorDisplay();
            return;
        }
    }
    
    // Apply final value to form if target input is defined
    if (calcState.targetInput) {
        const numericVal = parseInt(calcState.result, 10);
        if (!isNaN(numericVal) && numericVal > 0) {
            calcState.targetInput.value = numericVal;
        }
    }
    
    closeCalculator();
}

// Global Theme Changer
function setTheme(theme) {
    const themeBtn = document.getElementById("theme-toggle-btn");
    const sunIcon = themeBtn ? themeBtn.querySelector(".sun-icon") : null;
    const moonIcon = themeBtn ? themeBtn.querySelector(".moon-icon") : null;
    const darkCardBtn = document.getElementById("settings-theme-dark");
    const lightCardBtn = document.getElementById("settings-theme-light");

    localStorage.setItem("jjan_pocket_money_theme", theme);

    if (theme === "light") {
        document.body.classList.add("light-theme");
        if (sunIcon) sunIcon.classList.add("hidden");
        if (moonIcon) moonIcon.classList.remove("hidden");
        if (lightCardBtn) lightCardBtn.classList.add("active");
        if (darkCardBtn) darkCardBtn.classList.remove("active");
    } else {
        document.body.classList.remove("light-theme");
        if (sunIcon) sunIcon.classList.remove("hidden");
        if (moonIcon) moonIcon.classList.add("hidden");
        if (lightCardBtn) lightCardBtn.classList.remove("active");
        if (darkCardBtn) darkCardBtn.classList.add("active");
    }
}
