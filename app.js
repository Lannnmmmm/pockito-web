
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
} from "./config.js";

const APP_URL = "https://lannnmmmm.github.io/pockito-web/";

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

const loginSection = document.getElementById("login-section");
const dashboardSection = document.getElementById("dashboard-section");
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const recoveryForm = document.getElementById("recovery-form");
const recoverySection = document.getElementById("recovery-section");
const loginView = document.getElementById("login-view");
const signupView = document.getElementById("signup-view");
const loginTabButton = document.getElementById("show-login");
const signupTabButton = document.getElementById("show-signup");
const transactionForm = document.getElementById("transaction-form");
const transactionWalletField = document.getElementById("transaction-wallet-field");
const transactionWalletSelect = document.getElementById("transaction-wallet");
const walletForm = document.getElementById("wallet-form");
const walletNameInput = document.getElementById("wallet-name");
const walletMessage = document.getElementById("wallet-message");
const walletList = document.getElementById("wallet-list");
const loginMessage = document.getElementById("login-message");
const transactionMessage = document.getElementById("transaction-message");
const transactionList = document.getElementById("transaction-list");
const homeTransactionList = document.getElementById("home-transaction-list");
const transactionType = document.getElementById("transaction-type");
const transactionCategory = document.getElementById("transaction-category");
const categoryForm = document.getElementById("category-form");
const customCategoryName = document.getElementById("custom-category-name");
const customCategoryType = document.getElementById("custom-category-type");
const categoryMessage = document.getElementById("category-message");
const categoryList = document.getElementById("category-list");
const viewButtons = document.querySelectorAll("[data-view-target]");
const views = document.querySelectorAll("[data-view]");
const themeToggle = document.getElementById("theme-toggle");
const themeToggleLabel = themeToggle.querySelector(".theme-toggle-label");
const themeToggleIcon = themeToggle.querySelector(".theme-toggle-icon");

function applyTheme(theme) {
    const isDark = theme === "dark";
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    themeToggle.setAttribute("aria-pressed", String(isDark));
    themeToggle.setAttribute(
        "aria-label",
        isDark ? "Aktifkan tema terang" : "Aktifkan tema gelap"
    );
    themeToggleLabel.textContent = isDark ? "Mode terang" : "Mode gelap";
    themeToggleIcon.textContent = isDark ? "☀" : "☾";
}

let savedTheme = "light";
try {
    savedTheme = localStorage.getItem("pockito-theme") === "dark" ? "dark" : "light";
} catch (error) {
    console.warn("Preferensi tema tidak bisa dibaca:", error);
}
applyTheme(savedTheme);

themeToggle.addEventListener("click", () => {
    const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    try {
        localStorage.setItem("pockito-theme", nextTheme);
    } catch (error) {
        console.warn("Preferensi tema tidak bisa disimpan:", error);
    }
});

const rupiah = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
});

let currentUser = null;
let currentWallets = [];
let currentCategories = [];
let cachedCreditPayments = [];
let cachedCreditPlans = [];
let cachedCreditInstallments = [];
let cachedSavingsTargets = [];
let cachedTargetMovements = [];
let selectedNewTargetIcon = "🐷";

const SAVINGS_TARGET_ICONS = [
    { group: "Perjalanan", icons: ["🌊", "🏖️", "🏝️", "⛰️", "🏕️", "✈️", "🧳", "🚗"] },
    { group: "Rumah & keluarga", icons: ["🏡", "🏠", "💍", "❤️", "👶", "🐾", "🌷", "🫶"] },
    { group: "Keuangan", icons: ["🐷", "💰", "👛", "💎", "🪙", "📈", "🏦", "🛟"] },
    { group: "Hobi & lainnya", icons: ["📷", "💻", "🎧", "🎸", "🎮", "🎁", "⭐", "🎯"] }
];

function renderTargetIconPicker(container, selectedIcon, onSelect) {
    container.replaceChildren();
    SAVINGS_TARGET_ICONS.forEach((group) => {
        const section = document.createElement("div");
        section.className = "target-icon-picker-group";
        const label = document.createElement("span");
        label.className = "target-icon-picker-label";
        label.textContent = group.group;
        const grid = document.createElement("div");
        grid.className = "target-icon-picker-grid";
        group.icons.forEach((emoji) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "target-icon-option";
            button.textContent = emoji;
            button.setAttribute("aria-label", emoji);
            button.setAttribute("aria-pressed", String(emoji === selectedIcon));
            button.classList.toggle("selected", emoji === selectedIcon);
            button.addEventListener("click", () => {
                onSelect(emoji);
                container.querySelectorAll(".target-icon-option").forEach((option) => {
                    const isSelected = option.textContent === emoji;
                    option.classList.toggle("selected", isSelected);
                    option.setAttribute("aria-pressed", String(isSelected));
                });
            });
            grid.append(button);
        });
        section.append(label, grid);
        container.append(section);
    });
}

function isMissingTargetIconColumn(error) {
    const message = String(error?.message || "").toLowerCase();
    return message.includes("icon") &&
        (message.includes("column") || message.includes("schema cache") || message.includes("does not exist"));
}

function isMissingTargetDeletedAtColumn(error) {
    const message = String(error?.message || "").toLowerCase();
    return message.includes("deleted_at") &&
        (message.includes("column") || message.includes("schema cache") || message.includes("does not exist"));
}
let reportMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

function localDateTimeValues() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    return {
        date: `${year}-${month}-${day}`,
        time: `${hours}:${minutes}:${seconds}`
    };
}

function setTransactionDateTimeToNow() {
    const values = localDateTimeValues();
    document.getElementById("transaction-date").value = values.date;
    document.getElementById("transaction-time").value = values.time;
}

setTransactionDateTimeToNow();

const targetCreationPicker = document.getElementById("target-create-icon-picker");
const targetCreationForm = document.getElementById("target-form");
const targetCreationToggle = document.getElementById("show-target-form");
const targetCreationCancel = document.getElementById("cancel-target-create");
const targetIconPreview = document.getElementById("target-create-icon-preview");

if (targetCreationPicker) {
    renderTargetIconPicker(targetCreationPicker, selectedNewTargetIcon, (emoji) => {
        selectedNewTargetIcon = emoji;
        if (targetIconPreview) targetIconPreview.textContent = emoji;
    });
}
if (targetCreationToggle && targetCreationForm) {
    targetCreationToggle.addEventListener("click", () => {
        const opening = targetCreationForm.hidden;
        targetCreationForm.hidden = !opening;
        targetCreationToggle.textContent = opening ? "Tutup formulir" : "+ Target baru";
        if (opening) document.getElementById("target-name").focus();
    });
}
if (targetCreationCancel && targetCreationForm) {
    targetCreationCancel.addEventListener("click", () => {
        targetCreationForm.reset();
        selectedNewTargetIcon = "🐷";
        if (targetIconPreview) targetIconPreview.textContent = selectedNewTargetIcon;
        const iconDetails = document.querySelector(".target-icon-picker-collapsible");
        if (iconDetails) iconDetails.open = false;
        if (targetCreationPicker) renderTargetIconPicker(targetCreationPicker, selectedNewTargetIcon, (emoji) => {
            selectedNewTargetIcon = emoji;
            if (targetIconPreview) targetIconPreview.textContent = emoji;
        });
        targetCreationForm.hidden = true;
        targetCreationToggle.textContent = "+ Target baru";
    });
}

function showMessage(element, message, isError = false) {
    element.textContent = message;
    element.style.color = isError ? "#c0392b" : "#4e8b68";
}

function showLogin() {
    loginSection.hidden = false;
    dashboardSection.hidden = true;
}

function showDashboard() {
    document.querySelector(".app").classList.remove("auth-mode");
    loginSection.hidden = true;
    recoverySection.hidden = true;
    dashboardSection.hidden = false;
}

function showAuthView(view) {
    document.querySelector(".app").classList.add("auth-mode");
    recoverySection.hidden = true;
    loginSection.hidden = false;
    dashboardSection.hidden = true;
    loginView.hidden = view !== "login";
    signupView.hidden = view !== "signup";
    loginTabButton.classList.toggle("active", view === "login");
    signupTabButton.classList.toggle("active", view === "signup");
    loginTabButton.setAttribute("aria-selected", String(view === "login"));
    signupTabButton.setAttribute("aria-selected", String(view === "signup"));
    showMessage(loginMessage, "");
    showMessage(document.getElementById("signup-message"), "");
}

function showPasswordRecovery() {
    document.querySelector(".app").classList.add("auth-mode");
    loginSection.hidden = true;
    dashboardSection.hidden = true;
    recoverySection.hidden = false;
}

async function loadWallets() {
    const { data: wallets, error } = await supabase
        .from("wallets")
        .select("id, name, balance, created_at, icon, color")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: true });

    if (error) throw error;
    currentWallets = wallets || [];
    renderWalletOptions();
    renderWalletList();
}

function renderWalletOptions() {
    const previousValue = transactionWalletSelect.value;
    transactionWalletSelect.replaceChildren();

    for (const wallet of currentWallets) {
        const option = document.createElement("option");
        option.value = wallet.id;
        option.textContent = wallet.name;
        transactionWalletSelect.append(option);
    }

    transactionWalletField.hidden = currentWallets.length === 0;
    transactionWalletSelect.required = currentWallets.length > 0;

    if (currentWallets.some((wallet) => wallet.id === previousValue)) {
        transactionWalletSelect.value = previousValue;
    } else if (currentWallets.length > 0) {
        transactionWalletSelect.value = currentWallets[0].id;
    }
}

function targetSavedBalance(targetId) {
    return cachedTargetMovements
        .filter((movement) => movement.target_id === targetId)
        .reduce((sum, movement) => {
            if (movement.movement_type === "deposit") return sum + Number(movement.amount);
            return sum - Number(movement.amount);
        }, 0);
}

function walletRecordedBalance(walletId) {
    const income = cachedTransactions.filter((item) => item.wallet_id === walletId && item.type === "income")
        .reduce((sum, item) => sum + Number(item.amount), 0);
    const expense = cachedTransactions.filter((item) => item.wallet_id === walletId && item.type === "expense")
        .reduce((sum, item) => sum + Number(item.amount), 0);
    const transfersOut = cachedTargetMovements
        .filter((item) => item.wallet_id === walletId && item.movement_type === "deposit")
        .reduce((sum, item) => sum + Number(item.amount), 0);
    const transfersIn = cachedTargetMovements
        .filter((item) => item.wallet_id === walletId && item.movement_type === "return")
        .reduce((sum, item) => sum + Number(item.amount), 0);
    const creditPrincipalPaid = cachedCreditPayments
        .filter((item) => item.wallet_id === walletId)
        .reduce((sum, item) => sum + Number(item.principal_amount || 0), 0);
    return income - expense - transfersOut + transfersIn - creditPrincipalPaid;
}

async function loadSavingsTargets() {
    let loadedTargets = [];
    const { data: targets, error: targetError } = await supabase
        .from("savings_targets")
        .select("id, name, target_amount, icon, status, created_at, completed_at, deleted_at")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });
    if (targetError && isMissingTargetDeletedAtColumn(targetError)) {
        const legacy = await supabase.from("savings_targets")
            .select("id, name, target_amount, icon, status, created_at, completed_at")
            .eq("user_id", currentUser.id)
            .order("created_at", { ascending: false });
        if (legacy.error && isMissingTargetIconColumn(legacy.error)) {
            const fallback = await supabase.from("savings_targets")
                .select("id, name, target_amount, status, created_at, completed_at")
                .eq("user_id", currentUser.id)
                .order("created_at", { ascending: false });
            if (fallback.error) throw fallback.error;
            loadedTargets = (fallback.data || []).map((target) => ({ ...target, icon: "🐷", deleted_at: null }));
        } else if (legacy.error) {
            throw legacy.error;
        } else {
            loadedTargets = (legacy.data || []).map((target) => ({ ...target, deleted_at: null }));
        }
    } else if (targetError && isMissingTargetIconColumn(targetError)) {
        const fallback = await supabase.from("savings_targets")
            .select("id, name, target_amount, status, created_at, completed_at, deleted_at")
            .eq("user_id", currentUser.id)
            .order("created_at", { ascending: false });
        if (fallback.error) throw fallback.error;
        loadedTargets = (fallback.data || []).map((target) => ({ ...target, icon: "🐷" }));
    } else if (targetError) {
        throw targetError;
    } else {
        loadedTargets = targets || [];
    }

    const { data: movements, error: movementError } = await supabase
        .from("savings_target_movements")
        .select("id, target_id, user_id, wallet_id, movement_type, amount, description, movement_date, created_at")
        .eq("user_id", currentUser.id)
        .order("movement_date", { ascending: true })
        .order("created_at", { ascending: true });
    if (movementError) throw movementError;

    cachedSavingsTargets = loadedTargets;
    cachedTargetMovements = movements || [];
    renderSavingsTargets();
    renderWalletList();
    renderHomeWalletBalances();
}

function renderSavingsTargets() {
    const activeTargets = cachedSavingsTargets.filter((item) => item.status === "active" && !item.deleted_at);
    const activeSavedTotal = activeTargets.reduce((sum, target) => sum + targetSavedBalance(target.id), 0);
    const targetGoalTotal = activeTargets.reduce((sum, target) => {
        const amount = target.target_amount === null ? 0 : Number(target.target_amount);
        return sum + (Number.isFinite(amount) && amount > 0 ? amount : 0);
    }, 0);
    const targetProgressTotal = targetGoalTotal > 0
        ? Math.min(100, Math.round(activeTargets.reduce((sum, target) => {
            const amount = target.target_amount === null ? 0 : Number(target.target_amount);
            return sum + (Number.isFinite(amount) && amount > 0 ? Math.min(targetSavedBalance(target.id), amount) : 0);
        }, 0) / targetGoalTotal * 100))
        : 0;
    const overviewCount = document.getElementById("target-overview-count");
    const overviewSaved = document.getElementById("target-overview-saved");
    const overviewProgress = document.getElementById("target-overview-progress");
    if (overviewCount) overviewCount.textContent = String(activeTargets.length);
    if (overviewSaved) overviewSaved.textContent = rupiah.format(activeSavedTotal);
    if (overviewProgress) overviewProgress.textContent = targetGoalTotal > 0 ? `${targetProgressTotal}%` : "—";

    const activeList = document.getElementById("active-target-list");
    const completedList = document.getElementById("completed-target-list");
    const buriedList = document.getElementById("buried-target-list");
    if (!activeList || !completedList || !buriedList) return;
    activeList.replaceChildren();
    completedList.replaceChildren();
    buriedList.replaceChildren();

    for (const target of cachedSavingsTargets) {
        const saved = targetSavedBalance(target.id);
        const targetAmount = target.target_amount === null ? null : Number(target.target_amount);
        const progress = targetAmount ? Math.min(100, Math.max(0, saved / targetAmount * 100)) : null;
        const card = document.createElement("article");
        card.className = target.deleted_at ? "target-card target-buried-card" : "target-card";
        const top = document.createElement("div");
        top.className = "target-card-top";
        const icon = document.createElement("span");
        icon.className = "target-icon";
        icon.textContent = target.icon || "🐷";
        const titleBlock = document.createElement("div");
        titleBlock.className = "target-title-block";
        const title = document.createElement("h3");
        title.textContent = target.name;
        const amountLine = document.createElement("small");
        amountLine.className = "target-amount-line";
        amountLine.textContent = targetAmount === null
            ? `${rupiah.format(saved)} terkumpul`
            : `${rupiah.format(saved)} / ${rupiah.format(targetAmount)}`;
        titleBlock.append(title, amountLine);

        if (progress !== null) {
            const progressMeta = document.createElement("div");
            progressMeta.className = "target-progress-meta";
            const percentLabel = document.createElement("small");
            percentLabel.className = "target-progress-label";
            percentLabel.textContent = `${Math.round(progress)}% terkumpul`;
            progressMeta.append(percentLabel);

            const track = document.createElement("div");
            track.className = "target-progress-track target-progress-track-inline";
            const bar = document.createElement("div");
            bar.className = "target-progress-bar";
            bar.style.width = `${progress}%`;
            track.append(bar);
            titleBlock.append(progressMeta, track);
        }

        top.append(icon, titleBlock);
        if (!target.deleted_at) {
            const editMini = document.createElement("button");
            editMini.type = "button";
            editMini.className = "target-edit-mini";
            editMini.textContent = "✎";
            editMini.setAttribute("aria-label", `Edit target ${target.name}`);
            editMini.title = "Edit target";
            editMini.addEventListener("click", () => editSavingsTarget(target));
            top.append(editMini);
        }
        card.append(top);

        const targetMoves = cachedTargetMovements.filter((item) => item.target_id === target.id);
        const spent = targetMoves.filter((item) => item.movement_type === "spend")
            .reduce((sum, item) => sum + Number(item.amount), 0);
        const stats = document.createElement("div");
        stats.className = "target-stats-grid target-stats-compact";
        [
            { label: "Dana saat ini", value: rupiah.format(saved), className: "target-stat-current" },
            { label: "Dana terpakai", value: rupiah.format(spent), className: "target-stat-spent" }
        ].forEach((item) => {
            const stat = document.createElement("div");
            stat.className = `target-stat ${item.className}`;
            const label = document.createElement("small");
            label.textContent = item.label;
            const value = document.createElement("strong");
            value.textContent = item.value;
            stat.append(label, value);
            stats.append(stat);
        });
        card.append(stats);

        if (targetMoves.length > 0) {
            const history = document.createElement("details");
            history.className = "target-history";
            const historySummary = document.createElement("summary");
            historySummary.textContent = `Riwayat pergerakan · ${targetMoves.length}`;
            const historyList = document.createElement("div");
            historyList.className = "target-history-list";
            [...targetMoves].sort((a, b) =>
                new Date(`${b.movement_date}T${b.created_at?.split("T")[1] || "00:00:00"}`)
                - new Date(`${a.movement_date}T${a.created_at?.split("T")[1] || "00:00:00"}`)
            ).forEach((movement) => {
                const row = document.createElement("div");
                row.className = `target-history-row target-history-${movement.movement_type}`;
                const details = document.createElement("div");
                details.className = "target-history-details";
                const label = document.createElement("strong");
                label.textContent = movement.movement_type === "deposit" ? "Dana ditambahkan"
                    : movement.movement_type === "return" ? "Dana dikembalikan" : "Dana digunakan";
                const wallet = currentWallets.find((item) => item.id === movement.wallet_id);
                const note = document.createElement("small");
                const dateLabel = movement.movement_date
                    ? new Date(`${movement.movement_date}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
                    : "";
                const walletLabel = wallet
                    ? movement.movement_type === "deposit" ? `Dari dompet: ${wallet.name}`
                        : movement.movement_type === "return" ? `Ke dompet: ${wallet.name}` : ""
                    : "";
                const movementNote = movement.movement_type === "spend"
                    ? movement.description
                    : walletLabel || movement.description;
                note.textContent = [dateLabel, movementNote].filter(Boolean).join(" · ");
                details.append(label, note);
                const amount = document.createElement("strong");
                amount.className = "target-history-amount";
                amount.textContent = `${movement.movement_type === "deposit" ? "+" : "−"}${rupiah.format(Number(movement.amount))}`;
                row.append(details, amount);
                historyList.append(row);
            });
            history.append(historySummary, historyList);
            card.append(history);
        }

        if (target.deleted_at) {
            const buriedLabel = document.createElement("small");
            buriedLabel.className = "target-buried-label";
            buriedLabel.textContent = `Dikubur pada ${new Date(target.deleted_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`;
            card.append(buriedLabel);
            buriedList.append(card);
            continue;
        }

        if (target.status === "active") {
            const actions = document.createElement("div");
            actions.className = "target-actions";
            const deposit = document.createElement("button");
            deposit.type = "button";
            deposit.className = "target-primary-action";
            deposit.textContent = "＋ Tambah dana";
            deposit.addEventListener("click", () => moveTargetFunds(target, "deposit"));

            const more = document.createElement("details");
            more.className = "target-more-actions";
            const moreSummary = document.createElement("summary");
            moreSummary.textContent = "Lainnya";
            const moreMenu = document.createElement("div");
            moreMenu.className = "target-more-menu";
            const returnFunds = document.createElement("button");
            returnFunds.type = "button";
            returnFunds.className = "secondary-action";
            returnFunds.textContent = "↩ Kembalikan dana";
            returnFunds.disabled = saved <= 0;
            returnFunds.addEventListener("click", () => {
                more.open = false;
                moveTargetFunds(target, "return");
            });
            const spend = document.createElement("button");
            spend.type = "button";
            spend.className = "secondary-action";
            spend.textContent = "− Catat pemakaian";
            spend.disabled = saved <= 0;
            spend.addEventListener("click", () => {
                more.open = false;
                moveTargetFunds(target, "spend");
            });
            const complete = document.createElement("button");
            complete.type = "button";
            complete.className = "secondary-action";
            complete.textContent = "✓ Tandai selesai";
            complete.addEventListener("click", () => {
                more.open = false;
                completeSavingsTarget(target);
            });
            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "secondary-action target-delete-action";
            deleteButton.textContent = "Hapus target";
            deleteButton.addEventListener("click", () => {
                more.open = false;
                deleteSavingsTarget(target);
            });
            moreMenu.append(returnFunds, spend, complete, deleteButton);
            more.append(moreSummary, moreMenu);
            actions.append(deposit, more);
            card.append(actions);
            activeList.append(card);
        } else {
            const completed = document.createElement("small");
            completed.className = "target-completed-label";
            completed.textContent = target.completed_at
                ? `Selesai ${new Date(target.completed_at).toLocaleDateString("id-ID")}`
                : "Selesai";
            card.append(completed);

            const actions = document.createElement("div");
            actions.className = "target-actions";
            const more = document.createElement("details");
            more.className = "target-more-actions target-more-actions-completed";
            const moreSummary = document.createElement("summary");
            moreSummary.textContent = "Kelola";
            const moreMenu = document.createElement("div");
            moreMenu.className = "target-more-menu";
            const reopen = document.createElement("button");
            reopen.type = "button";
            reopen.className = "secondary-action";
            reopen.textContent = "↶ Batalkan selesai";
            reopen.addEventListener("click", () => {
                more.open = false;
                reopenSavingsTarget(target);
            });
            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "secondary-action target-delete-action";
            deleteButton.textContent = "Hapus target";
            deleteButton.addEventListener("click", () => {
                more.open = false;
                deleteSavingsTarget(target);
            });
            moreMenu.append(reopen, deleteButton);
            more.append(moreSummary, moreMenu);
            actions.append(more);
            card.append(actions);
            completedList.append(card);
        }
    }

    if (!cachedSavingsTargets.some((item) => item.status === "active" && !item.deleted_at)) {
        const empty = document.createElement("p");
        empty.className = "empty-note";
        empty.textContent = "Belum ada target aktif. Buat target pertamamu di atas!";
        activeList.append(empty);
    }
    if (!cachedSavingsTargets.some((item) => item.status === "completed" && !item.deleted_at)) {
        const empty = document.createElement("p");
        empty.className = "empty-note";
        empty.textContent = "Belum ada target yang diselesaikan.";
        completedList.append(empty);
    }
    if (!cachedSavingsTargets.some((item) => item.deleted_at)) {
        const empty = document.createElement("p");
        empty.className = "empty-note";
        empty.textContent = "Belum ada mimpi yang dikubur. Semoga targetmu banyak yang jadi kenyataan! 🌱";
        buriedList.append(empty);
    }
}

async function refreshTargetData() {
    await loadSavingsTargets();
    await loadTransactions();
    await loadWallets();
    renderSavingsTargets();
}

async function editSavingsTarget(target) {
    const overlay = document.createElement("div");
    overlay.className = "target-modal-overlay";
    overlay.innerHTML = `
        <section class="target-modal" role="dialog" aria-modal="true" aria-labelledby="edit-target-title">
            <button type="button" class="target-modal-close" aria-label="Tutup">×</button>
            <p class="section-kicker">PERSONALISASI TARGET</p>
            <h2 id="edit-target-title">Edit target</h2>
            <p class="target-modal-description">Atur nama, nominal, dan ikon yang paling mewakili tujuanmu. Target selesai juga bisa diedit tanpa mengubah riwayat dana.</p>
            <form class="target-modal-form">
                <label for="edit-target-name">Nama target</label>
                <input id="edit-target-name" type="text" maxlength="80" required>
                <label for="edit-target-amount">Nominal target (opsional)</label>
                <input id="edit-target-amount" type="number" min="1" step="1" inputmode="numeric" placeholder="Kosongkan jika belum ditentukan">
                <span class="target-icon-picker-heading">Pilih ikon</span>
                <div class="target-icon-picker"></div>
                <p class="target-modal-error" role="alert" hidden></p>
                <div class="target-modal-actions">
                    <button type="button" class="target-modal-cancel secondary-action">Batal</button>
                    <button type="submit" class="target-modal-submit">Simpan perubahan</button>
                </div>
            </form>
        </section>`;
    const form = overlay.querySelector("form");
    const nameInput = overlay.querySelector("#edit-target-name");
    const amountInput = overlay.querySelector("#edit-target-amount");
    const picker = overlay.querySelector(".target-icon-picker");
    const errorMessage = overlay.querySelector(".target-modal-error");
    let selectedIcon = target.icon || "🐷";
    nameInput.value = target.name;
    amountInput.value = target.target_amount ?? "";
    renderTargetIconPicker(picker, selectedIcon, (emoji) => { selectedIcon = emoji; });

    const close = () => {
        overlay.remove();
        document.removeEventListener("keydown", onKeyDown);
    };
    const onKeyDown = (event) => { if (event.key === "Escape") close(); };
    overlay.querySelector(".target-modal-close").addEventListener("click", close);
    overlay.querySelector(".target-modal-cancel").addEventListener("click", close);
    overlay.addEventListener("click", (event) => { if (event.target === overlay) close(); });
    document.addEventListener("keydown", onKeyDown);
    document.body.append(overlay);
    nameInput.focus();

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const name = nameInput.value.trim();
        const amountText = amountInput.value.trim();
        const targetAmount = amountText === "" ? null : Number(amountText);
        if (!name || (targetAmount !== null && (!Number.isFinite(targetAmount) || targetAmount <= 0))) {
            errorMessage.textContent = "Periksa nama dan nominal target.";
            errorMessage.hidden = false;
            return;
        }
        const submit = form.querySelector('[type="submit"]');
        submit.disabled = true;
        errorMessage.hidden = true;
        try {
            let result = await supabase.from("savings_targets")
                .update({ name, target_amount: targetAmount, icon: selectedIcon })
                .eq("id", target.id).eq("user_id", currentUser.id).is("deleted_at", null);
            if (result.error && isMissingTargetIconColumn(result.error)) {
                result = await supabase.from("savings_targets")
                    .update({ name, target_amount: targetAmount })
                    .eq("id", target.id).eq("user_id", currentUser.id).is("deleted_at", null);
            }
            if (result.error && isMissingTargetDeletedAtColumn(result.error)) {
                errorMessage.textContent = "Jalankan migrasi Pockito terbaru di Supabase dulu agar fitur target bisa digunakan.";
                errorMessage.hidden = false;
                submit.disabled = false;
                return;
            }
            if (result.error) throw result.error;
            close();
            await loadSavingsTargets();
            showMessage(document.getElementById("target-message"), "Target berhasil diperbarui.");
        } catch (error) {
            console.error("Gagal mengedit target:", error);
            errorMessage.textContent = "Target gagal diperbarui. Coba lagi.";
            errorMessage.hidden = false;
            submit.disabled = false;
        }
    });
}

async function reopenSavingsTarget(target) {
    if (!window.confirm(`Batalkan status selesai untuk target "${target.name}" dan aktifkan kembali?`)) return;
    try {
        const { error } = await supabase.from("savings_targets")
            .update({ status: "active", completed_at: null })
            .eq("id", target.id).eq("user_id", currentUser.id).eq("status", "completed").is("deleted_at", null);
        if (error) throw error;
        await loadSavingsTargets();
        showMessage(document.getElementById("target-message"), "Target diaktifkan kembali. Riwayat tetap tersimpan.");
    } catch (error) {
        console.error("Gagal mengaktifkan kembali target:", error);
        showMessage(document.getElementById("target-message"), "Target gagal diaktifkan kembali. Pastikan migrasi terbaru sudah diterapkan.", true);
    }
}

function openBuryTargetModal(target, refundable, spent) {
    return new Promise((resolve) => {
        const overlay = document.createElement("div");
        overlay.className = "target-modal-overlay";
        overlay.innerHTML = `
            <section class="target-modal target-bury-modal" role="dialog" aria-modal="true" aria-labelledby="bury-target-title">
                <button type="button" class="target-modal-close" aria-label="Tutup">×</button>
                <p class="section-kicker">MIMPI YANG TERKUBUR</p>
                <h2 id="bury-target-title">Kubur target ini?</h2>
                <p class="target-modal-description"></p>
                <div class="target-complete-summary">
                    <div><span>Dana dikembalikan ke dompet</span><strong data-refund></strong></div>
                    <div><span>Pengeluaran yang tetap tercatat</span><strong data-spent></strong></div>
                </div>
                <p class="target-complete-extra">Riwayat target akan tetap bisa dilihat, tetapi tidak bisa diedit atau digunakan lagi. Pengeluaran yang sudah dicatat tidak dihapus.</p>
                <form class="target-modal-form">
                    <div class="target-modal-wallet-field">
                        <label for="bury-target-wallet">Kembalikan sisa dana ke dompet</label>
                        <select id="bury-target-wallet"></select>
                        <small class="target-modal-wallet-balance"></small>
                    </div>
                    <p class="target-modal-error" role="alert" hidden></p>
                    <div class="target-modal-actions">
                        <button type="button" class="target-modal-cancel secondary-action">Batal</button>
                        <button type="submit" class="target-modal-submit">Kubur target</button>
                    </div>
                </form>
            </section>`;
        const form = overlay.querySelector("form");
        const walletField = overlay.querySelector(".target-modal-wallet-field");
        const walletSelect = overlay.querySelector("#bury-target-wallet");
        const walletBalance = overlay.querySelector(".target-modal-wallet-balance");
        const errorMessage = overlay.querySelector(".target-modal-error");
        overlay.querySelector("#bury-target-title").textContent = `Kubur "${target.name}"?`;
        overlay.querySelector(".target-modal-description").textContent =
            "Sebelum disimpan ke arsip, sisa dana akan dikembalikan ke dompet pilihanmu.";
        overlay.querySelector("[data-refund]").textContent = rupiah.format(refundable);
        overlay.querySelector("[data-spent]").textContent = rupiah.format(spent);
        walletField.hidden = refundable <= 0;
        walletSelect.required = refundable > 0;
        if (refundable > 0) {
            currentWallets.forEach((wallet) => {
                const option = document.createElement("option");
                option.value = wallet.id;
                option.textContent = `${wallet.name} · saldo ${rupiah.format(walletRecordedBalance(wallet.id))}`;
                walletSelect.append(option);
            });
            if (currentWallets.length === 0) {
                const option = document.createElement("option");
                option.value = "";
                option.textContent = "Belum ada dompet";
                walletSelect.append(option);
                walletBalance.textContent = "Buat dompet terlebih dahulu untuk menerima sisa dana.";
            } else {
                walletBalance.textContent = "Seluruh sisa dana akan masuk ke dompet yang dipilih.";
            }
        }

        let settled = false;
        const finish = (result) => {
            if (settled) return;
            settled = true;
            document.removeEventListener("keydown", onKeyDown);
            overlay.remove();
            resolve(result);
        };
        const onKeyDown = (event) => {
            if (event.key === "Escape") finish(null);
        };
        overlay.addEventListener("click", (event) => {
            if (event.target === overlay) finish(null);
        });
        overlay.querySelector(".target-modal-close").addEventListener("click", () => finish(null));
        overlay.querySelector(".target-modal-cancel").addEventListener("click", () => finish(null));
        form.addEventListener("submit", (event) => {
            event.preventDefault();
            if (refundable > 0 && (!currentWallets.length || !currentWallets.some((wallet) => wallet.id === walletSelect.value))) {
                errorMessage.textContent = "Pilih atau buat dompet untuk menerima sisa dana sebelum mengubur target.";
                errorMessage.hidden = false;
                return;
            }
            finish({ wallet: refundable > 0 ? currentWallets.find((wallet) => wallet.id === walletSelect.value) : null });
        });
        document.addEventListener("keydown", onKeyDown);
        document.body.append(overlay);
    });
}

async function deleteSavingsTarget(target) {
    const saved = targetSavedBalance(target.id);
    const refundable = Math.max(0, saved);
    const targetMoves = cachedTargetMovements.filter((item) => item.target_id === target.id);
    const spent = targetMoves.filter((item) => item.movement_type === "spend")
        .reduce((sum, item) => sum + Number(item.amount), 0);
    const result = await openBuryTargetModal(target, refundable, spent);
    if (!result) return;

    let refundMovementId = null;
    let targetBuried = false;
    try {
        if (refundable > 0) {
            const { data: refundMovement, error: refundError } = await supabase
                .from("savings_target_movements")
                .insert({
                    user_id: currentUser.id,
                    target_id: target.id,
                    wallet_id: result.wallet.id,
                    movement_type: "return",
                    amount: refundable,
                    description: `Sisa dana dikembalikan ke ${result.wallet.name} saat target dikubur`,
                    movement_date: localDateTimeValues().date
                })
                .select("id")
                .single();
            if (refundError) throw refundError;
            refundMovementId = refundMovement.id;
        }

        const { data: updatedTargets, error: buryError } = await supabase
            .from("savings_targets")
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", target.id)
            .eq("user_id", currentUser.id)
            .is("deleted_at", null)
            .select("id");
        if (buryError) throw buryError;
        if (!updatedTargets || updatedTargets.length === 0) {
            throw new Error("Target tidak ditemukan atau sudah dikubur.");
        }
        targetBuried = true;

        await loadSavingsTargets();
        await loadTransactions();
        await loadWallets();
        showMessage(
            document.getElementById("target-message"),
            refundable > 0
                ? `Target masuk ke Mimpi yang Terkubur. ${rupiah.format(refundable)} dikembalikan ke ${result.wallet.name}; pengeluaran ${rupiah.format(spent)} tetap tercatat.`
                : `Target masuk ke Mimpi yang Terkubur. Tidak ada sisa dana untuk dikembalikan; pengeluaran ${rupiah.format(spent)} tetap tercatat.`
        );
    } catch (error) {
        console.error("Gagal mengubur target:", error);
        if (refundMovementId && !targetBuried) {
            const { error: rollbackError } = await supabase.from("savings_target_movements")
                .delete().eq("id", refundMovementId).eq("user_id", currentUser.id);
            if (rollbackError) console.error("Gagal membatalkan catatan pengembalian:", rollbackError);
        }
        showMessage(document.getElementById("target-message"), "Target belum berhasil dikubur. Periksa koneksi dan pastikan migrasi deleted_at sudah dijalankan di Supabase.", true);
    }
}

function openTargetMovementModal(target, kind, saved) {
    return new Promise((resolve) => {
        const isDeposit = kind === "deposit";
        const isReturn = kind === "return";
        const isSpend = kind === "spend";
        const needsWallet = isDeposit || isReturn;
        const overlay = document.createElement("div");
        overlay.className = "target-modal-overlay";
        overlay.innerHTML = `
            <section class="target-modal" role="dialog" aria-modal="true" aria-labelledby="target-modal-title">
                <button type="button" class="target-modal-close" aria-label="Tutup">×</button>
                <p class="section-kicker">TARGET TABUNGAN</p>
                <h2 id="target-modal-title">${isDeposit ? "Tambah dana" : isReturn ? "Kembalikan dana" : "Catat pemakaian"}</h2>
                <p class="target-modal-description"></p>
                <form class="target-modal-form">
                    <div class="target-modal-wallet-field">
                        <label for="target-modal-wallet">Pilih dompet</label>
                        <select id="target-modal-wallet" required></select>
                        <small class="target-modal-wallet-balance"></small>
                    </div>
                    <label for="target-modal-amount">Nominal (Rp)</label>
                    <input id="target-modal-amount" type="number" min="1" step="1" inputmode="numeric" required placeholder="Contoh: 100000">
                    <div class="target-modal-note-field" hidden>
                        <label for="target-modal-note">Keterangan pemakaian</label>
                        <textarea id="target-modal-note" rows="3" maxlength="300" placeholder="Contoh: beli bahan bangunan, bayar katering, atau biaya transportasi"></textarea>
                        <small class="target-modal-note-hint">Tulis dana ini dipakai untuk apa.</small>
                    </div>
                    <p class="target-modal-error" role="alert" hidden></p>
                    <div class="target-modal-actions">
                        <button type="button" class="target-modal-cancel secondary-action">Batal</button>
                        <button type="submit" class="target-modal-submit">${isDeposit ? "Pindahkan dana" : isReturn ? "Kembalikan dana" : "Simpan pemakaian"}</button>
                    </div>
                </form>
            </section>`;
        const form = overlay.querySelector("form");
        const walletField = overlay.querySelector(".target-modal-wallet-field");
        const walletSelect = overlay.querySelector("#target-modal-wallet");
        const walletBalance = overlay.querySelector(".target-modal-wallet-balance");
        const amountInput = overlay.querySelector("#target-modal-amount");
        const noteField = overlay.querySelector(".target-modal-note-field");
        const noteInput = overlay.querySelector("#target-modal-note");
        const errorMessage = overlay.querySelector(".target-modal-error");
        overlay.querySelector(".target-modal-description").textContent = isDeposit
            ? "Pindahkan uang dari salah satu dompet ke target ini."
            : isReturn ? "Pilih dompet tujuan untuk mengembalikan dana dari target ini."
            : "Catat dana dari target ini yang benar-benar sudah digunakan.";
        walletField.hidden = !needsWallet;
        walletSelect.required = needsWallet;
        noteField.hidden = !isSpend;
        noteInput.required = isSpend;
        if (needsWallet) {
            currentWallets.forEach((wallet) => {
                const option = document.createElement("option");
                option.value = wallet.id;
                option.textContent = `${wallet.name} · ${rupiah.format(walletRecordedBalance(wallet.id))}`;
                walletSelect.append(option);
            });
        }

        const updateWalletBalance = () => {
            const wallet = currentWallets.find((item) => item.id === walletSelect.value);
            if (!needsWallet || !wallet) {
                walletBalance.textContent = `Saldo target tersedia: ${rupiah.format(saved)}`;
                amountInput.max = String(saved);
                return;
            }
            const available = walletRecordedBalance(wallet.id);
            walletBalance.textContent = isDeposit
                ? `Saldo tersedia: ${rupiah.format(available)}`
                : `Dana akan dikembalikan ke saldo ${wallet.name}`;
            amountInput.max = String(isDeposit ? available : saved);
        };
        walletSelect.addEventListener("change", updateWalletBalance);
        updateWalletBalance();

        let settled = false;
        const finish = (result) => {
            if (settled) return;
            settled = true;
            document.removeEventListener("keydown", onKeyDown);
            overlay.remove();
            resolve(result);
        };
        const onKeyDown = (event) => {
            if (event.key === "Escape") finish(null);
        };
        overlay.addEventListener("click", (event) => {
            if (event.target === overlay) finish(null);
        });
        overlay.querySelector(".target-modal-close").addEventListener("click", () => finish(null));
        overlay.querySelector(".target-modal-cancel").addEventListener("click", () => finish(null));
        form.addEventListener("submit", (event) => {
            event.preventDefault();
            const amount = Number(amountInput.value);
            const note = noteInput.value.trim();
            const wallet = needsWallet ? currentWallets.find((item) => item.id === walletSelect.value) : null;
            const available = isDeposit && wallet ? walletRecordedBalance(wallet.id) : saved;
            if (isSpend && !note) {
                errorMessage.textContent = "Isi keterangan agar nanti kamu ingat dana ini dipakai untuk apa.";
                errorMessage.hidden = false;
                noteInput.focus();
                return;
            }
            if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) {
                errorMessage.textContent = "Masukkan nominal rupiah berupa bilangan bulat yang lebih dari nol.";
                errorMessage.hidden = false;
                return;
            }
            if (amount > available) {
                errorMessage.textContent = isDeposit
                    ? "Saldo dompet tidak cukup untuk nominal ini."
                    : "Nominal melebihi saldo target yang tersedia.";
                errorMessage.hidden = false;
                return;
            }
            finish({ amount, wallet, note });
        });
        document.body.append(overlay);
        document.addEventListener("keydown", onKeyDown);
        amountInput.focus();
    });
}

async function moveTargetFunds(target, kind) {
    const saved = targetSavedBalance(target.id);
    const needsWallet = kind === "deposit" || kind === "return";
    if (needsWallet && currentWallets.length === 0) {
        showMessage(document.getElementById("target-message"), "Buat dompet terlebih dahulu untuk memindahkan dana.", true);
        return;
    }
    const movement = await openTargetMovementModal(target, kind, saved);
    if (!movement) return;
    const { amount, wallet, note = "" } = movement;

    let transactionId = null;
    try {
        if (kind === "spend") {
            const category = currentCategories.find((item) => item.type === "expense" && item.name.toLocaleLowerCase("id-ID") === "lainnya")
                || currentCategories.find((item) => item.type === "expense");
            if (!category) throw new Error("Tidak ada kategori pengeluaran.");
            const { data: transaction, error: transactionError } = await supabase.from("transactions")
                .insert({
                    user_id: currentUser.id,
                    wallet_id: null,
                    type: "expense",
                    category_id: category.id,
                    amount,
                    description: `Pemakaian target: ${target.name} — ${note}`,
                    transaction_date: localDateTimeValues().date,
                    transaction_time: localDateTimeValues().time
                }).select("id").single();
            if (transactionError) throw transactionError;
            transactionId = transaction.id;
        }

        const { error } = await supabase.from("savings_target_movements").insert({
            user_id: currentUser.id,
            target_id: target.id,
            wallet_id: wallet?.id ?? null,
            movement_type: kind,
            amount,
            description: kind === "deposit" ? `Transfer dari ${wallet.name}`
                : kind === "return" ? `Transfer kembali ke ${wallet.name}`
                : note,
            movement_date: localDateTimeValues().date
        });
        if (error) {
            if (transactionId) {
                await supabase.from("transactions").delete().eq("id", transactionId).eq("user_id", currentUser.id);
            }
            throw error;
        }
        await loadSavingsTargets();
        await loadTransactions();
        await loadWallets();
        showMessage(document.getElementById("target-message"),
            kind === "deposit" ? "Dana berhasil dipindahkan ke target."
                : kind === "return" ? "Dana berhasil dikembalikan ke dompet."
                : "Pemakaian target dicatat sebagai pengeluaran.");
    } catch (error) {
        console.error("Gagal memproses dana target:", error);
        showMessage(document.getElementById("target-message"), "Perubahan dana gagal disimpan. Periksa koneksi lalu muat ulang data.", true);
    }
}

function openCompleteTargetModal(target, alreadySpent, saved) {
    return new Promise((resolve) => {
        const overlay = document.createElement("div");
        overlay.className = "target-modal-overlay";
        overlay.innerHTML = `
            <section class="target-modal target-complete-modal" role="dialog" aria-modal="true" aria-labelledby="complete-target-title">
                <button type="button" class="target-modal-close" aria-label="Tutup">×</button>
                <p class="section-kicker">TARGET TABUNGAN</p>
                <h2 id="complete-target-title">Selesaikan target</h2>
                <p class="target-modal-description"></p>
                <div class="target-complete-summary">
                    <div><span>Dana terkumpul</span><strong data-saved></strong></div>
                    <div><span>Sudah dicatat sebagai pemakaian</span><strong data-spent></strong></div>
                </div>
                <form class="target-modal-form">
                    <label for="complete-target-cost">Total biaya aktual (Rp)</label>
                    <input id="complete-target-cost" type="number" min="0" step="1" inputmode="numeric" required>
                    <p class="target-complete-extra" hidden></p>
                    <div class="target-complete-wallet-field" hidden>
                        <label for="complete-target-wallet">Dompet untuk membayar kekurangan</label>
                        <select id="complete-target-wallet"></select>
                        <small class="target-modal-wallet-balance"></small>
                    </div>
                    <div class="target-complete-leftover"><span>Sisa dana setelah selesai</span><strong data-leftover></strong></div>
                    <p class="target-modal-error" role="alert" hidden></p>
                    <div class="target-modal-actions">
                        <button type="button" class="target-modal-cancel secondary-action">Batal</button>
                        <button type="submit" class="target-modal-submit">Selesaikan target</button>
                    </div>
                </form>
            </section>`;
        const form = overlay.querySelector("form");
        const costInput = overlay.querySelector("#complete-target-cost");
        const walletField = overlay.querySelector(".target-complete-wallet-field");
        const walletSelect = overlay.querySelector("#complete-target-wallet");
        const walletBalance = overlay.querySelector(".target-modal-wallet-balance");
        const extraLabel = overlay.querySelector(".target-complete-extra");
        const leftoverLabel = overlay.querySelector("[data-leftover]");
        const errorMessage = overlay.querySelector(".target-modal-error");
        overlay.querySelector(".target-modal-description").textContent =
            `Konfirmasi biaya akhir untuk “${target.name}”. Sisa dana yang tidak terpakai akan tetap tercatat di target.`;
        overlay.querySelector("[data-saved]").textContent = rupiah.format(saved);
        overlay.querySelector("[data-spent]").textContent = rupiah.format(alreadySpent);
        costInput.value = String(alreadySpent);

        currentWallets.forEach((wallet) => {
            const option = document.createElement("option");
            option.value = wallet.id;
            option.textContent = `${wallet.name} · ${rupiah.format(walletRecordedBalance(wallet.id))}`;
            walletSelect.append(option);
        });

        const calculate = () => {
            const actualCost = Number(costInput.value);
            const additionalCost = actualCost - alreadySpent;
            const fromTarget = Math.min(Math.max(0, additionalCost), saved);
            const fromWallet = Math.max(0, additionalCost - fromTarget);
            const leftover = Math.max(0, saved - fromTarget);
            extraLabel.hidden = fromWallet <= 0;
            extraLabel.textContent = fromWallet > 0
                ? `Kekurangan dana target: ${rupiah.format(fromWallet)}. Pilih dompet untuk membayar selisihnya.`
                : "";
            walletField.hidden = fromWallet <= 0;
            walletSelect.required = fromWallet > 0;
            leftoverLabel.textContent = rupiah.format(leftover);
            const wallet = currentWallets.find((item) => item.id === walletSelect.value);
            walletBalance.textContent = wallet
                ? `Saldo tersedia: ${rupiah.format(walletRecordedBalance(wallet.id))}`
                : "Belum ada dompet yang tersedia.";
            return { actualCost, fromWallet, wallet };
        };
        costInput.addEventListener("input", () => {
            errorMessage.hidden = true;
            calculate();
        });
        walletSelect.addEventListener("change", calculate);

        let settled = false;
        const finish = (result) => {
            if (settled) return;
            settled = true;
            document.removeEventListener("keydown", onKeyDown);
            overlay.remove();
            resolve(result);
        };
        const onKeyDown = (event) => {
            if (event.key === "Escape") finish(null);
        };
        overlay.addEventListener("click", (event) => {
            if (event.target === overlay) finish(null);
        });
        overlay.querySelector(".target-modal-close").addEventListener("click", () => finish(null));
        overlay.querySelector(".target-modal-cancel").addEventListener("click", () => finish(null));
        form.addEventListener("submit", (event) => {
            event.preventDefault();
            const result = calculate();
            if (!Number.isFinite(result.actualCost) || result.actualCost < 0 || !Number.isInteger(result.actualCost)) {
                errorMessage.textContent = "Masukkan total biaya berupa bilangan bulat nol atau lebih.";
                errorMessage.hidden = false;
                return;
            }
            if (result.actualCost < alreadySpent) {
                errorMessage.textContent = `Biaya aktual tidak boleh kurang dari pemakaian yang sudah dicatat (${rupiah.format(alreadySpent)}).`;
                errorMessage.hidden = false;
                return;
            }
            if (result.fromWallet > 0 && !result.wallet) {
                errorMessage.textContent = "Tambahkan dompet terlebih dahulu untuk membayar kekurangan dana.";
                errorMessage.hidden = false;
                return;
            }
            if (result.fromWallet > 0 && result.fromWallet > walletRecordedBalance(result.wallet.id)) {
                errorMessage.textContent = "Saldo dompet tidak cukup untuk membayar selisih biaya aktual.";
                errorMessage.hidden = false;
                return;
            }
            finish({ actualCost: result.actualCost, wallet: result.fromWallet > 0 ? result.wallet : null });
        });
        document.body.append(overlay);
        document.addEventListener("keydown", onKeyDown);
        calculate();
        costInput.focus();
        costInput.select();
    });
}

async function completeSavingsTarget(target) {
    const targetMoves = cachedTargetMovements.filter((item) => item.target_id === target.id);
    const alreadySpent = targetMoves.filter((item) => item.movement_type === "spend")
        .reduce((sum, item) => sum + Number(item.amount), 0);
    const saved = targetSavedBalance(target.id);
    const completion = await openCompleteTargetModal(target, alreadySpent, saved);
    if (!completion) return;
    const { actualCost, wallet } = completion;

    const additionalCost = actualCost - alreadySpent;
    const fromTarget = Math.min(additionalCost, saved);
    const fromWallet = additionalCost - fromTarget;

    const expenseCategory = currentCategories.find((item) => item.type === "expense" && item.name.toLocaleLowerCase("id-ID") === "lainnya")
        || currentCategories.find((item) => item.type === "expense");
    if (additionalCost > 0 && !expenseCategory) {
        showMessage(document.getElementById("target-message"), "Tidak ada kategori pengeluaran untuk mencatat biaya target.", true);
        return;
    }

    const insertedTransactionIds = [];
    const insertedMovementIds = [];
    try {
        const now = localDateTimeValues();
        if (fromTarget > 0) {
            const { data, error } = await supabase.from("transactions").insert({
                user_id: currentUser.id,
                wallet_id: null,
                type: "expense",
                category_id: expenseCategory.id,
                amount: fromTarget,
                description: `Biaya target: ${target.name}`,
                transaction_date: now.date,
                transaction_time: now.time
            }).select("id").single();
            if (error) throw error;
            insertedTransactionIds.push(data.id);

            const { data: movement, error: movementError } = await supabase.from("savings_target_movements").insert({
                user_id: currentUser.id,
                target_id: target.id,
                wallet_id: null,
                movement_type: "spend",
                amount: fromTarget,
                description: `Biaya aktual target: ${target.name}`,
                movement_date: now.date
            }).select("id").single();
            if (movementError) throw movementError;
            insertedMovementIds.push(movement.id);
        }

        if (fromWallet > 0) {
            const { data, error } = await supabase.from("transactions").insert({
                user_id: currentUser.id,
                wallet_id: wallet.id,
                type: "expense",
                category_id: expenseCategory.id,
                amount: fromWallet,
                description: `Selisih biaya target: ${target.name}`,
                transaction_date: now.date,
                transaction_time: now.time
            }).select("id").single();
            if (error) throw error;
            insertedTransactionIds.push(data.id);
        }

        const { error: updateError } = await supabase.from("savings_targets")
            .update({ status: "completed", completed_at: new Date().toISOString() })
            .eq("id", target.id).eq("user_id", currentUser.id).eq("status", "active");
        if (updateError) throw updateError;

        await loadSavingsTargets();
        await loadTransactions();
        await loadWallets();
        showMessage(document.getElementById("target-message"), "Target selesai. Biaya aktual tercatat sebagai pengeluaran dan riwayat target dipertahankan.");
    } catch (error) {
        console.error("Gagal menyelesaikan target:", error);
        if (insertedMovementIds.length > 0) {
            const { error: rollbackMovementError } = await supabase.from("savings_target_movements")
                .delete().in("id", insertedMovementIds).eq("user_id", currentUser.id);
            if (rollbackMovementError) console.error("Rollback pergerakan target gagal:", rollbackMovementError);
        }
        if (insertedTransactionIds.length > 0) {
            const { error: rollbackTransactionError } = await supabase.from("transactions")
                .delete().in("id", insertedTransactionIds).eq("user_id", currentUser.id);
            if (rollbackTransactionError) console.error("Rollback transaksi target gagal:", rollbackTransactionError);
        }
        showMessage(document.getElementById("target-message"), "Penyelesaian target gagal. Periksa data sebelum mencoba lagi.", true);
    }
}

const WALLET_ICONS = {
    bank: { label: "Bank", paths: '<rect x="3" y="9" width="18" height="11" rx="1.5"/><path d="M2 9 12 3l10 6M7 12v5M12 12v5M17 12v5M2 21h20"/>' },
    smartphone: { label: "Digital", paths: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 5h4M11 18h2"/>' },
    wallet: { label: "Tunai", paths: '<path d="M4 6h15a2 2 0 0 1 2 2v11H5a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2h14"/><path d="M16 11h5v4h-5a2 2 0 0 1 0-4Z"/>' },
    piggy: { label: "Tabungan", paths: '<path d="M5 10 3 8M4 13H2v4h3l2 3h9l2-3h2v-7l-3-3H9L6 9Z"/><path d="M9 7 8 4l5 2M16 11h.01M8 20v2M16 20v2M21 12h1"/>' },
    card: { label: "Kartu", paths: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>' },
    coins: { label: "Dana", paths: '<ellipse cx="9" cy="6" rx="6" ry="3"/><path d="M3 6v5c0 1.7 2.7 3 6 3s6-1.3 6-3V6M3 11v5c0 1.7 2.7 3 6 3 1.2 0 2.3-.2 3.2-.6"/><circle cx="17" cy="16" r="4"/><path d="M17 14v4M15.5 15h3"/>' },
    landmark: { label: "Gedung", paths: '<path d="M3 21h18M5 21V9M9 21V9M15 21V9M19 21V9M2 9l10-6 10 6Z"/><path d="M2 13h20"/>' }
};
const WALLET_COLORS = [
    { value: "#DDF5E7", label: "Mint" }, { value: "#E3EAFE", label: "Biru" },
    { value: "#FCE7D6", label: "Peach" }, { value: "#EDE3FA", label: "Lavender" },
    { value: "#F9DFE9", label: "Pink" }, { value: "#DDF2F5", label: "Aqua" },
    { value: "#F6F0CE", label: "Kuning" }, { value: "#E9E7E2", label: "Abu-abu" }
];

function walletIcon(name) {
    const normalized = name.toLocaleLowerCase("id-ID");
    if (normalized.includes("tunai") || normalized.includes("cash")) return "wallet";
    if (normalized.includes("tabungan") || normalized.includes("nabung")) return "piggy";
    if (normalized.includes("seabank") || normalized.includes("sea bank")) return "smartphone";
    if (normalized.includes("bri") || normalized.includes("bca") || normalized.includes("bni") ||
        normalized.includes("bsi") || normalized.includes("mandiri") || normalized.includes("bank")) return "bank";
    if (normalized.includes("ewallet") || normalized.includes("e-wallet") || normalized.includes("gopay") ||
        normalized.includes("ovo") || normalized.includes("dana") || normalized.includes("shopeepay")) return "smartphone";
    return "wallet";
}

function createWalletIcon(iconKey, color, className = "wallet-icon") {
    const key = WALLET_ICONS[iconKey] ? iconKey : "wallet";
    const background = WALLET_COLORS.some((item) => item.value === color) ? color : "#DDF5E7";
    const wrapper = document.createElement("span");
    wrapper.className = className;
    wrapper.style.setProperty("--wallet-color", background);
    wrapper.setAttribute("aria-hidden", "true");
    wrapper.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${WALLET_ICONS[key].paths}</svg>`;
    return wrapper;
}

function openWalletEditDialog(wallet) {
    return new Promise((resolve) => {
        const overlay = document.createElement("div");
        overlay.className = "wallet-modal-overlay";
        overlay.innerHTML = `<section class="wallet-modal" role="dialog" aria-modal="true" aria-labelledby="wallet-dialog-title">
            <button type="button" class="wallet-modal-close" aria-label="Tutup">×</button>
            <p class="section-kicker">IDENTITAS DOMPET</p><h2 id="wallet-dialog-title">Edit dompet</h2>
            <p class="panel-description">Ubah nama, ikon, dan warna agar mudah dikenali.</p>
            <form class="wallet-modal-form">
                <label for="wallet-edit-name">Nama dompet</label><input id="wallet-edit-name" type="text" maxlength="60" required>
                <fieldset class="wallet-choice-field"><legend>Ikon</legend><div class="wallet-icon-picker"></div></fieldset>
                <fieldset class="wallet-choice-field"><legend>Warna identitas</legend><div class="wallet-color-picker"></div></fieldset>
                <p class="wallet-modal-error" role="alert" hidden></p>
                <div class="wallet-modal-actions"><button type="button" class="secondary-action wallet-modal-cancel">Batal</button><button type="submit" class="wallet-modal-submit">Simpan perubahan</button></div>
            </form></section>`;
        const form = overlay.querySelector("form");
        const nameInput = overlay.querySelector("#wallet-edit-name");
        const iconPicker = overlay.querySelector(".wallet-icon-picker");
        const colorPicker = overlay.querySelector(".wallet-color-picker");
        const errorMessage = overlay.querySelector(".wallet-modal-error");
        let selectedIcon = WALLET_ICONS[wallet.icon] ? wallet.icon : walletIcon(wallet.name);
        let selectedColor = WALLET_COLORS.some((item) => item.value === wallet.color) ? wallet.color : "#DDF5E7";
        nameInput.value = wallet.name;
        const renderChoices = () => {
            iconPicker.replaceChildren();
            Object.entries(WALLET_ICONS).forEach(([key, definition]) => {
                const button = document.createElement("button");
                button.type = "button"; button.className = "wallet-icon-choice";
                button.classList.toggle("selected", key === selectedIcon);
                button.setAttribute("aria-pressed", String(key === selectedIcon));
                button.setAttribute("aria-label", definition.label); button.title = definition.label;
                button.append(createWalletIcon(key, selectedColor, "wallet-choice-icon"));
                const label = document.createElement("small"); label.textContent = definition.label; button.append(label);
                button.addEventListener("click", () => { selectedIcon = key; renderChoices(); });
                iconPicker.append(button);
            });
            colorPicker.replaceChildren();
            WALLET_COLORS.forEach((color) => {
                const button = document.createElement("button");
                button.type = "button"; button.className = "wallet-color-choice";
                button.style.setProperty("--swatch-color", color.value);
                button.classList.toggle("selected", color.value === selectedColor);
                button.setAttribute("aria-label", color.label); button.title = color.label;
                button.setAttribute("aria-pressed", String(color.value === selectedColor));
                button.addEventListener("click", () => { selectedColor = color.value; renderChoices(); });
                colorPicker.append(button);
            });
        };
        renderChoices();
        let settled = false;
        const finish = (result) => { if (settled) return; settled = true; document.removeEventListener("keydown", onKeyDown); overlay.remove(); resolve(result); };
        const onKeyDown = (event) => { if (event.key === "Escape") finish(null); };
        overlay.addEventListener("click", (event) => { if (event.target === overlay) finish(null); });
        overlay.querySelector(".wallet-modal-close").addEventListener("click", () => finish(null));
        overlay.querySelector(".wallet-modal-cancel").addEventListener("click", () => finish(null));
        form.addEventListener("submit", (event) => {
            event.preventDefault();
            const name = nameInput.value.trim();
            if (!name) { errorMessage.textContent = "Nama dompet tidak boleh kosong."; errorMessage.hidden = false; return; }
            if (currentWallets.some((item) => item.id !== wallet.id && item.name.toLocaleLowerCase("id-ID") === name.toLocaleLowerCase("id-ID"))) {
                errorMessage.textContent = "Nama dompet itu sudah ada."; errorMessage.hidden = false; return;
            }
            finish({ name, icon: selectedIcon, color: selectedColor });
        });
        document.addEventListener("keydown", onKeyDown);
        document.body.append(overlay); nameInput.focus();
    });
}

async function renameWallet(wallet) {
    const changes = await openWalletEditDialog(wallet);
    if (!changes) return;
    try {
        const { error } = await supabase.from("wallets").update(changes).eq("id", wallet.id).eq("user_id", currentUser.id);
        if (error) throw error;
        await loadWallets(); renderHomeTransactions(cachedTransactions); renderHistoryTransactions(); renderHomeWalletBalances();
        showMessage(walletMessage, `Dompet "${changes.name}" berhasil diperbarui.`);
    } catch (error) {
        console.error("Gagal mengubah dompet:", error);
        showMessage(walletMessage, "Dompet gagal diperbarui. Pastikan migrasi ikon dan warna sudah dijalankan.", true);
    }
}

function openWalletDeleteDialog(wallet, linkedCount) {
    return new Promise((resolve) => {
        const overlay = document.createElement("div");
        overlay.className = "wallet-modal-overlay";
        overlay.innerHTML = `<section class="wallet-modal wallet-delete-modal" role="dialog" aria-modal="true" aria-labelledby="wallet-delete-title">
            <button type="button" class="wallet-modal-close" aria-label="Tutup">×</button>
            <div class="wallet-delete-symbol"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 10v7M14 10v7"/></svg></div>
            <p class="section-kicker">KONFIRMASI</p><h2 id="wallet-delete-title">Hapus dompet?</h2><p class="panel-description"></p><div class="wallet-delete-note"></div>
            <div class="wallet-modal-actions"><button type="button" class="secondary-action wallet-modal-cancel">Batal</button><button type="button" class="wallet-modal-submit wallet-confirm-delete">Ya, hapus dompet</button></div>
            </section>`;
        overlay.querySelector(".panel-description").textContent = `Kamu akan menghapus dompet “${wallet.name}”.`;
        overlay.querySelector(".wallet-delete-note").textContent = linkedCount > 0
            ? `${linkedCount} transaksi terkait tetap tersimpan di riwayat, tetapi tidak lagi terhubung ke dompet ini. Data transaksi tidak dihapus.`
            : "Tidak ada transaksi yang terhubung. Dompet ini akan dihapus.";
        let settled = false;
        const finish = (result) => { if (settled) return; settled = true; document.removeEventListener("keydown", onKeyDown); overlay.remove(); resolve(result); };
        const onKeyDown = (event) => { if (event.key === "Escape") finish(false); };
        overlay.addEventListener("click", (event) => { if (event.target === overlay) finish(false); });
        overlay.querySelector(".wallet-modal-close").addEventListener("click", () => finish(false));
        overlay.querySelector(".wallet-modal-cancel").addEventListener("click", () => finish(false));
        overlay.querySelector(".wallet-confirm-delete").addEventListener("click", () => finish(true));
        document.addEventListener("keydown", onKeyDown); document.body.append(overlay);
    });
}

async function deleteWallet(wallet) {
    const linkedCount = cachedTransactions.filter((transaction) => transaction.wallet_id === wallet.id).length;
    if (!await openWalletDeleteDialog(wallet, linkedCount)) return;
    try {
        if (linkedCount > 0) {
            const { error: detachError } = await supabase.from("transactions").update({ wallet_id: null }).eq("wallet_id", wallet.id).eq("user_id", currentUser.id);
            if (detachError) throw detachError;
        }
        const { error } = await supabase.from("wallets").delete().eq("id", wallet.id).eq("user_id", currentUser.id);
        if (error) throw error;
        await loadWallets(); await loadTransactions();
        showMessage(walletMessage, `Dompet "${wallet.name}" berhasil dihapus. Riwayat transaksi tetap tersimpan.`);
    } catch (error) {
        console.error("Gagal menghapus dompet:", error);
        showMessage(walletMessage, "Dompet gagal dihapus. Riwayat transaksi tetap dipertahankan; coba lagi.", true);
        try { await loadWallets(); await loadTransactions(); } catch (refreshError) { console.error("Gagal memuat ulang setelah penghapusan dompet:", refreshError); }
    }
}

function renderWalletList() {
    walletList.replaceChildren();

    if (currentWallets.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-note";
        empty.textContent = "Belum ada dompet. Kamu tetap bisa mencatat transaksi tanpa dompet.";
        walletList.append(empty);
        return;
    }

    for (const wallet of currentWallets) {
        const walletTransactions = cachedTransactions.filter(
            (transaction) => transaction.wallet_id === wallet.id
        );
        const income = walletTransactions
            .filter((transaction) => transaction.type === "income")
            .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
        const expense = walletTransactions
            .filter((transaction) => transaction.type === "expense")
            .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
        const walletBalance = walletRecordedBalance(wallet.id);

        const item = document.createElement("div");
        item.className = "category-item wallet-item";

        const identity = document.createElement("div");
        identity.className = "wallet-identity";

        const icon = createWalletIcon(wallet.icon || walletIcon(wallet.name), wallet.color);

        const details = document.createElement("div");
        details.className = "wallet-item-details";

        const name = document.createElement("strong");
        name.textContent = wallet.name;

        const balance = document.createElement("strong");
        balance.className = "wallet-balance";
        balance.textContent = rupiah.format(walletBalance);

        const totals = document.createElement("small");
        totals.className = "wallet-totals";
        totals.textContent = `Masuk ${rupiah.format(income)} · Keluar ${rupiah.format(expense)}`;

        details.append(name, balance, totals);
        identity.append(icon, details);

        const actions = document.createElement("details");
        actions.className = "wallet-actions-menu";
        const menuToggle = document.createElement("summary");
        menuToggle.className = "wallet-action-button";
        menuToggle.textContent = "⋮";
        menuToggle.title = `Kelola ${wallet.name}`;
        menuToggle.setAttribute("aria-label", `Kelola ${wallet.name}`);
        const menu = document.createElement("div");
        menu.className = "wallet-actions-popover";
        const renameButton = document.createElement("button");
        renameButton.type = "button";
        renameButton.textContent = "Edit dompet";
        renameButton.addEventListener("click", () => { actions.open = false; renameWallet(wallet); });
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "wallet-delete-button";
        deleteButton.textContent = "Hapus dompet";
        deleteButton.addEventListener("click", () => { actions.open = false; deleteWallet(wallet); });
        menu.append(renameButton, deleteButton);
        actions.append(menuToggle, menu);
        item.append(identity, actions);
        walletList.append(item);
    }
}

const defaultCategories = [
    { name: "Makan", type: "expense" },
    { name: "Bensin", type: "expense" },
    { name: "Tagihan", type: "expense" },
    { name: "Belanja", type: "expense" },
    { name: "Lainnya", type: "expense" },
    { name: "Gaji", type: "income" },
    { name: "Bonus", type: "income" },
    { name: "Usaha", type: "income" },
    { name: "Lainnya", type: "income" }
];

async function loadCategories() {
    const { data: categories, error } = await supabase
        .from("categories")
        .select("id, name, type")
        .eq("user_id", currentUser.id)
        .order("name", { ascending: true });

    if (error) throw error;

    const existingKeys = new Set(
        categories.map((category) => `${category.type}:${category.name.toLowerCase()}`)
    );
    const missingCategories = defaultCategories
        .filter((category) => !existingKeys.has(`${category.type}:${category.name.toLowerCase()}`))
        .map((category) => ({
            ...category,
            user_id: currentUser.id
        }));

    if (missingCategories.length > 0) {
        const { error: insertError } = await supabase
            .from("categories")
            .insert(missingCategories);

        if (insertError) throw insertError;
    }

    const { data: refreshedCategories, error: refreshError } = await supabase
        .from("categories")
        .select("id, name, type")
        .eq("user_id", currentUser.id)
        .order("name", { ascending: true });

    if (refreshError) throw refreshError;

    currentCategories = refreshedCategories;
    renderCategoryOptions();
    renderCategoryList();
}

function renderCategoryOptions() {
    const selectedType = transactionType.value;
    const previousValue = transactionCategory.value;

    transactionCategory.replaceChildren();

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Pilih kategori";
    transactionCategory.append(placeholder);

    for (const category of currentCategories.filter((item) => item.type === selectedType)) {
        const option = document.createElement("option");
        option.value = category.id;
        option.textContent = category.name;
        transactionCategory.append(option);
    }

    if ([...transactionCategory.options].some((option) => option.value === previousValue)) {
        transactionCategory.value = previousValue;
    }
}

function renderCategoryList() {
    categoryList.replaceChildren();
    const totalCount = document.getElementById("category-total-count");
    if (totalCount) {
        totalCount.textContent = `${currentCategories.length} kategori`;
    }

    for (const type of ["income", "expense"]) {
        const categories = currentCategories.filter((category) => category.type === type);
        const group = document.createElement("section");
        group.className = `category-group category-group-${type}`;

        const heading = document.createElement("div");
        heading.className = "category-group-heading";

        const titleBlock = document.createElement("div");
        titleBlock.className = "category-group-title";

        const marker = document.createElement("span");
        marker.className = "category-group-marker";
        marker.setAttribute("aria-hidden", "true");
        marker.textContent = type === "income" ? "↗" : "↘";

        const title = document.createElement("h3");
        title.textContent = type === "income" ? "Pemasukan" : "Pengeluaran";
        titleBlock.append(marker, title);

        const count = document.createElement("span");
        count.className = "category-group-count";
        count.textContent = `${categories.length} kategori`;
        heading.append(titleBlock, count);
        group.append(heading);

        const list = document.createElement("div");
        list.className = "category-group-items";
        if (categories.length === 0) {
            const empty = document.createElement("p");
            empty.className = "empty-note";
            empty.textContent = "Belum ada kategori.";
            list.append(empty);
        }

        for (const category of categories) {
            const item = document.createElement("div");
            item.className = "category-item";

            const name = document.createElement("strong");
            name.textContent = category.name;

            const isDefault = defaultCategories.some((entry) =>
                entry.type === category.type &&
                entry.name.toLocaleLowerCase() === category.name.toLocaleLowerCase()
            );

            const tag = document.createElement("small");
            tag.className = "category-tag";
            tag.textContent = isDefault ? "Bawaan Pockito" : "Personal";

            item.append(name, tag);
            list.append(item);
        }

        group.append(list);
        categoryList.append(group);
    }
}

function showView(viewName) {
    for (const view of views) {
        view.hidden = view.dataset.view !== viewName;
    }

    const moreViews = ["targets", "credit", "categories", "wallets"];
    for (const button of viewButtons) {
        const isActive = button.dataset.viewTarget === viewName;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-current", isActive ? "page" : "false");
    }
    if (openMoreMenuButton) {
        const moreIsActive = moreViews.includes(viewName);
        openMoreMenuButton.classList.toggle("active", moreIsActive);
        openMoreMenuButton.setAttribute("aria-current", moreIsActive ? "page" : "false");
    }
}

function monthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date) {
    const label = new Intl.DateTimeFormat("id-ID", {
        month: "long",
        year: "numeric"
    }).format(date);
    return label.charAt(0).toLocaleUpperCase("id-ID") + label.slice(1);
}

let historyMonth = new Date();
historyMonth = new Date(historyMonth.getFullYear(), historyMonth.getMonth(), 1);
let cachedTransactions = [];

function createTransactionItem(transaction, compact = false) {
    const item = document.createElement("div");
    item.className = compact ? "transaction-item home-transaction-item" : "transaction-item";

    const info = document.createElement("div");
    info.className = "transaction-info";

    const description = document.createElement("strong");
    description.textContent =
        transaction.description?.trim() || (
            transaction.type === "income" ? "Pemasukan" : "Pengeluaran"
        );

    const category = currentCategories.find((entry) => entry.id === transaction.category_id);
    const categoryLabel = document.createElement("small");
    categoryLabel.textContent = category ? category.name : "Tanpa kategori";

    const date = document.createElement("small");
    date.textContent = transaction.transaction_time
        ? `${transaction.transaction_date} • ${transaction.transaction_time}`
        : transaction.transaction_date;

    const wallet = currentWallets.find((entry) => entry.id === transaction.wallet_id);
    const walletLabel = document.createElement("small");
    walletLabel.textContent = wallet ? wallet.name : "Tanpa dompet";

    const value = document.createElement("div");
    value.className = `transaction-amount ${transaction.type === "income" ? "income" : "expense"}`;
    const sign = transaction.type === "income" ? "+" : "−";
    value.textContent = `${sign}${rupiah.format(Number(transaction.amount))}`;

    info.append(description, walletLabel, categoryLabel, date);
    item.append(info, value);
    return item;
}

function renderHomeWalletBalances() {
    const container = document.getElementById("home-wallet-balances");
    const list = document.getElementById("home-wallet-balance-list");
    if (!container || !list) return;

    list.replaceChildren();
    if (currentWallets.length === 0) {
        container.hidden = true;
        return;
    }

    for (const wallet of currentWallets) {
        const walletBalance = walletRecordedBalance(wallet.id);

        const row = document.createElement("div");
        row.className = "home-wallet-balance-row";

        const identity = document.createElement("span");
        identity.className = "home-wallet-identity";
        const icon = createWalletIcon(wallet.icon || walletIcon(wallet.name), wallet.color, "wallet-icon home-wallet-icon");
        const name = document.createElement("span");
        name.textContent = wallet.name;
        identity.append(icon, name);

        const balance = document.createElement("strong");
        balance.textContent = rupiah.format(walletBalance);

        row.append(identity, balance);
        list.append(row);
    }

    container.hidden = false;
}


function renderHomeExpenseComposition() {
    const bar = document.getElementById("home-expense-bar");
    const legend = document.getElementById("home-expense-legend");
    const totalNode = document.getElementById("home-composition-total");
    const insight = document.getElementById("home-expense-insight");
    const period = document.getElementById("home-composition-period");
    if (!bar || !legend || !totalNode || !insight) return;

    const now = new Date();
    const key = monthKey(now);
    const transactions = cachedTransactions.filter((item) =>
        item.type === "expense" && item.transaction_date?.startsWith(key)
    );
    const totals = new Map();
    for (const transaction of transactions) {
        const category = currentCategories.find((item) => item.id === transaction.category_id);
        const name = category?.name || "Kategori dihapus";
        totals.set(name, (totals.get(name) || 0) + Number(transaction.amount));
    }
    const entries = [...totals.entries()].sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((sum, entry) => sum + entry[1], 0);
    const palette = ["#2764d8", "#e7a52f", "#2f9b69", "#df655b", "#8a75cf", "#32a6b8", "#cf78a5", "#87929f"];
    totalNode.textContent = rupiah.format(total);
    if (period) period.textContent = monthLabel(now);
    bar.replaceChildren();
    legend.replaceChildren();
    if (total <= 0 || entries.length === 0) {
        bar.hidden = true;
        const empty = document.createElement("p");
        empty.className = "empty-note";
        empty.textContent = "Belum ada pengeluaran pada bulan ini.";
        legend.append(empty);
        insight.replaceChildren();
        const icon = document.createElement("span");
        icon.className = "home-insight-icon";
        icon.textContent = "✦";
        const message = document.createElement("p");
        message.textContent = "Setiap transaksi yang kamu catat akan membantu memperlihatkan pola pengeluaranmu.";
        insight.append(icon, message);
        return;
    }
    bar.hidden = false;
    entries.forEach(([name, amount], index) => {
        const color = palette[index % palette.length];
        const segment = document.createElement("span");
        segment.className = "home-expense-segment";
        segment.style.flexBasis = `${amount / total * 100}%`;
        segment.style.backgroundColor = color;
        segment.title = `${name}: ${rupiah.format(amount)}`;
        bar.append(segment);

        if (index < 4) {
            const item = document.createElement("div");
            item.className = "home-expense-legend-item";
            const swatch = document.createElement("span");
            swatch.className = "home-expense-swatch";
            swatch.style.backgroundColor = color;
            const copy = document.createElement("div");
            copy.className = "home-expense-legend-copy";
            const label = document.createElement("span");
            label.textContent = name;
            const value = document.createElement("strong");
            value.textContent = rupiah.format(amount);
            const percent = document.createElement("small");
            percent.textContent = `${Math.round(amount / total * 100)}% dari pengeluaran`;
            copy.append(label, value, percent);
            item.append(swatch, copy);
            legend.append(item);
        }
    });
    if (entries.length > 4) {
        const otherTotal = entries.slice(4).reduce((sum, entry) => sum + entry[1], 0);
        const item = document.createElement("div");
        item.className = "home-expense-legend-item";
        const swatch = document.createElement("span");
        swatch.className = "home-expense-swatch";
        swatch.style.backgroundColor = "#87929f";
        const copy = document.createElement("div");
        copy.className = "home-expense-legend-copy";
        const label = document.createElement("span");
        label.textContent = `${entries.length - 4} kategori lainnya`;
        const value = document.createElement("strong");
        value.textContent = rupiah.format(otherTotal);
        const percent = document.createElement("small");
        percent.textContent = `${Math.round(otherTotal / total * 100)}% dari pengeluaran`;
        copy.append(label, value, percent);
        item.append(swatch, copy);
        legend.append(item);
    }
    insight.replaceChildren();
    const icon = document.createElement("span");
    icon.className = "home-insight-icon";
    icon.textContent = "✦";
    const message = document.createElement("p");
    const biggest = entries[0];
    const pct = Math.round(biggest[1] / total * 100);
    message.append("Pengeluaran terbesar bulan ini ada di ");
    const category = document.createElement("strong");
    category.textContent = biggest[0];
    message.append(category, ` — ${rupiah.format(biggest[1])} atau ${pct}% dari total pengeluaran.`);
    insight.append(icon, message);
}

function renderHomeTransactions(transactions) {
    homeTransactionList.replaceChildren();
    const latest = transactions.slice(0, 3);

    if (latest.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-note";
        empty.textContent = "Belum ada transaksi. Yuk, catat transaksi pertamamu!";
        homeTransactionList.append(empty);
        return;
    }

    for (const transaction of latest) {
        homeTransactionList.append(createTransactionItem(transaction, true));
    }
}

function renderHistoryTransactions() {
    transactionList.replaceChildren();
    document.getElementById("history-month-label").textContent = monthLabel(historyMonth);

    const selectedMonth = monthKey(historyMonth);
    const monthTransactions = cachedTransactions.filter((transaction) =>
        transaction.transaction_date?.startsWith(selectedMonth)
    );
    const searchTerm = (document.getElementById("history-search")?.value || "").trim().toLocaleLowerCase("id-ID");
    const typeFilter = document.getElementById("history-type-filter")?.value || "all";
    const filteredTransactions = monthTransactions.filter((transaction) => {
        const categoryName = currentCategories.find((category) => category.id === transaction.category_id)?.name || "";
        const searchableText = [transaction.description, categoryName, transaction.notes]
            .filter(Boolean).join(" ").toLocaleLowerCase("id-ID");
        return (typeFilter === "all" || transaction.type === typeFilter)
            && (!searchTerm || searchableText.includes(searchTerm));
    });

    let income = 0;
    let expense = 0;
    const transactionsByDay = new Map();

    for (const transaction of monthTransactions) {
        if (transaction.type === "income") income += Number(transaction.amount);
        else expense += Number(transaction.amount);
    }
    for (const transaction of filteredTransactions) {
        const dateKey = transaction.transaction_date || "tanggal-tidak-diketahui";
        if (!transactionsByDay.has(dateKey)) transactionsByDay.set(dateKey, []);
        transactionsByDay.get(dateKey).push(transaction);
    }

    for (const [dateKey, dayTransactions] of transactionsByDay) {
        const dayGroup = document.createElement("section");
        dayGroup.className = "transaction-day-group";

        const heading = document.createElement("div");
        heading.className = "transaction-day-heading";

        const dateLabel = document.createElement("strong");
        if (dateKey !== "tanggal-tidak-diketahui") {
            const [year, month, day] = dateKey.split("-").map(Number);
            const localDate = new Date(year, month - 1, day);
            dateLabel.textContent = new Intl.DateTimeFormat("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            }).format(localDate);
        } else {
            dateLabel.textContent = "Tanggal tidak tersedia";
        }

        const dayCount = document.createElement("span");
        dayCount.textContent = `${dayTransactions.length} transaksi`;
        heading.append(dateLabel, dayCount);
        dayGroup.append(heading);

        const dayItems = document.createElement("div");
        dayItems.className = "transaction-day-items";
        for (const transaction of dayTransactions) {
            dayItems.append(createTransactionItem(transaction));
        }
        dayGroup.append(dayItems);
        transactionList.append(dayGroup);
    }

    document.getElementById("history-income").textContent = rupiah.format(income);
    document.getElementById("history-expense").textContent = rupiah.format(expense);
    document.getElementById("history-transaction-count").textContent =
        `${monthTransactions.length} transaksi`;
    const filterStatus = document.getElementById("history-filter-status");
    const hasActiveFilter = Boolean(searchTerm) || typeFilter !== "all";
    filterStatus.textContent = hasActiveFilter
        ? `Menampilkan ${filteredTransactions.length} dari ${monthTransactions.length} transaksi`
        : "";

    const nextMonth = new Date(historyMonth.getFullYear(), historyMonth.getMonth() + 1, 1);
    document.getElementById("history-next-month").disabled =
        monthKey(nextMonth) > monthKey(new Date());

    if (filteredTransactions.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-note";
        empty.textContent = monthTransactions.length === 0
            ? `Belum ada transaksi pada ${monthLabel(historyMonth)}.`
            : "Tidak ada transaksi yang cocok. Coba ubah kata kunci atau filter.";
        transactionList.append(empty);
    }
}

function renderReportBreakdown(containerId, transactions, type) {
    const container = document.getElementById(containerId);
    container.replaceChildren();

    const totalsByCategory = new Map();
    for (const transaction of transactions) {
        if (transaction.type !== type) continue;
        const category = currentCategories.find((item) => item.id === transaction.category_id);
        const name = category?.name || "Kategori dihapus";
        totalsByCategory.set(name, (totalsByCategory.get(name) || 0) + Number(transaction.amount));
    }

    const entries = [...totalsByCategory.entries()].sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((sum, entry) => sum + entry[1], 0);
    if (entries.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-note";
        empty.textContent = type === "income"
            ? "Belum ada pemasukan pada bulan ini."
            : "Belum ada pengeluaran pada bulan ini.";
        container.append(empty);
        return;
    }

    const palette = ["#6f9e7a", "#8eb6a0", "#d8a66b", "#7298bd", "#bb8caa", "#b6a76b", "#8a8dc4", "#d47e70"];
    const chart = document.createElement("div");
    chart.className = "report-chart-layout";
    const donut = document.createElement("div");
    donut.className = "report-donut";
    let cursor = 0;
    const segments = entries.map((entry, index) => {
        const start = cursor;
        cursor += total ? entry[1] / total * 100 : 0;
        return `${palette[index % palette.length]} ${start}% ${cursor}%`;
    });
    donut.style.background = `conic-gradient(${segments.join(", ")})`;
    donut.setAttribute("role", "img");
    donut.setAttribute("aria-label", `Diagram kategori dengan total ${rupiah.format(total)}`);
    const hole = document.createElement("div");
    hole.className = "report-donut-hole";
    const donutTotal = document.createElement("strong");
    donutTotal.textContent = rupiah.format(total);
    const donutCaption = document.createElement("span");
    donutCaption.textContent = type === "income" ? "Pemasukan" : "Pengeluaran";
    hole.append(donutTotal, donutCaption);
    donut.append(hole);
    chart.append(donut);

    const legend = document.createElement("div");
    legend.className = "report-legend";
    entries.forEach(([name, amount], index) => {
        const row = document.createElement("div");
        row.className = "report-legend-row";
        const label = document.createElement("span");
        label.className = "report-legend-label";
        const swatch = document.createElement("span");
        swatch.className = "report-swatch";
        swatch.style.backgroundColor = palette[index % palette.length];
        const categoryName = document.createElement("span");
        categoryName.textContent = name;
        label.append(swatch, categoryName);
        const values = document.createElement("div");
        values.className = "report-legend-values";
        const value = document.createElement("strong");
        value.textContent = rupiah.format(amount);
        const percent = document.createElement("small");
        percent.textContent = `${total ? Math.round(amount / total * 100) : 0}%`;
        values.append(value, percent);
        row.append(label, values);
        legend.append(row);
    });
    chart.append(legend);
    container.append(chart);
}

function renderReports() {
    const selectedMonth = monthKey(reportMonth);
    const previousMonthDate = new Date(reportMonth.getFullYear(), reportMonth.getMonth() - 1, 1);
    const previousMonthKey = monthKey(previousMonthDate);
    const transactions = cachedTransactions.filter((transaction) =>
        transaction.transaction_date?.startsWith(selectedMonth)
    );
    const previousTransactions = cachedTransactions.filter((transaction) =>
        transaction.transaction_date?.startsWith(previousMonthKey)
    );
    let income = 0;
    let expense = 0;
    let previousIncome = 0;
    let previousExpense = 0;
    for (const transaction of transactions) {
        if (transaction.type === "income") income += Number(transaction.amount);
        else if (transaction.type === "expense") expense += Number(transaction.amount);
    }
    for (const transaction of previousTransactions) {
        if (transaction.type === "income") previousIncome += Number(transaction.amount);
        else if (transaction.type === "expense") previousExpense += Number(transaction.amount);
    }
    const remaining = income - expense;
    const spentPercent = income > 0 ? expense / income * 100 : null;
    document.getElementById("report-month-label").textContent = monthLabel(reportMonth);
    document.getElementById("report-income").textContent = rupiah.format(income);
    document.getElementById("report-expense").textContent = rupiah.format(expense);
    document.getElementById("report-remaining").textContent = rupiah.format(remaining);
    document.getElementById("report-spent-percent").textContent =
        spentPercent === null ? "—" : `${Math.round(spentPercent)}%`;

    const renderChange = (current, previous, kind) => {
        if (previous === 0) {
            if (current === 0) return { text: "Tetap", className: "neutral" };
            return { text: "Baru", className: "neutral" };
        }
        const change = Math.round((current - previous) / previous * 100);
        const direction = change > 0 ? "+" : "";
        const className = change === 0 ? "neutral"
            : kind === "expense" ? (change > 0 ? "negative" : "positive")
            : (change > 0 ? "positive" : "negative");
        return { text: `${direction}${change}%`, className };
    };
    document.getElementById("report-comparison-period").textContent =
        `vs ${monthLabel(previousMonthDate)}`;
    document.getElementById("report-income-previous").textContent =
        `Bulan lalu: ${rupiah.format(previousIncome)}`;
    document.getElementById("report-expense-previous").textContent =
        `Bulan lalu: ${rupiah.format(previousExpense)}`;
    [["report-income-change", income, previousIncome, "income"],
        ["report-expense-change", expense, previousExpense, "expense"]].forEach(([id, current, previous, kind]) => {
        const element = document.getElementById(id);
        const result = renderChange(current, previous, kind);
        element.textContent = result.text;
        element.className = `report-change-${result.className}`;
    });

    const insight = document.getElementById("report-insight");
    if (transactions.length === 0) {
        insight.textContent = "Belum ada transaksi pada periode ini.";
    } else if (income === 0 && expense > 0) {
        insight.textContent = "Belum ada pemasukan tercatat pada bulan ini, tetapi ada pengeluaran.";
    } else if (spentPercent !== null && spentPercent > 100) {
        insight.textContent = `Pengeluaran melebihi pemasukan sebesar ${rupiah.format(expense - income)} pada bulan ini.`;
    } else if (spentPercent !== null) {
        insight.textContent = `${Math.round(spentPercent)}% pemasukan digunakan; ${rupiah.format(remaining)} adalah selisih pemasukan dan pengeluaran bulan ini.`;
    } else {
        insight.textContent = "Ada transaksi tercatat pada bulan ini.";
    }
    const nextMonth = new Date(reportMonth.getFullYear(), reportMonth.getMonth() + 1, 1);
    document.getElementById("report-next-month").disabled =
        monthKey(nextMonth) > monthKey(new Date());
    renderReportBreakdown("report-income-breakdown", transactions, "income");
    renderReportBreakdown("report-expense-breakdown", transactions, "expense");
}

async function loadTransactions() {
    const { data: transactions, error } = await supabase
        .from("transactions")
        .select("id, type, amount, description, transaction_date, transaction_time, category_id, wallet_id")
        .eq("user_id", currentUser.id)
        .order("transaction_date", { ascending: false })
        .order("transaction_time", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

    if (error) throw error;

    cachedTransactions = transactions || [];
    const now = new Date();
    const currentMonth = monthKey(now);

    let lifetimeIncome = 0;
    let lifetimeExpense = 0;
    let monthlyIncome = 0;
    let monthlyExpense = 0;
    let previousMonthIncome = 0;
    let previousMonthExpense = 0;
    let monthlyTransactionCount = 0;
    const previousMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));

    for (const transaction of cachedTransactions) {
        const amount = Number(transaction.amount);
        const isCurrentMonth = transaction.transaction_date?.startsWith(currentMonth);
        const isPreviousMonth = transaction.transaction_date?.startsWith(previousMonth);

        if (transaction.type === "income") {
            lifetimeIncome += amount;
            if (isCurrentMonth) monthlyIncome += amount;
            if (isPreviousMonth) previousMonthIncome += amount;
        } else {
            lifetimeExpense += amount;
            if (isCurrentMonth) monthlyExpense += amount;
            if (isPreviousMonth) previousMonthExpense += amount;
        }

        if (isCurrentMonth) monthlyTransactionCount += 1;
    }

    document.getElementById("monthly-title").textContent = monthLabel(now);
    document.getElementById("total-income").textContent = rupiah.format(monthlyIncome);
    document.getElementById("total-expense").textContent = rupiah.format(monthlyExpense);
    document.getElementById("total-balance").textContent =
        rupiah.format(lifetimeIncome - lifetimeExpense);
    document.getElementById("monthly-transaction-count").textContent =
        `${monthlyTransactionCount} transaksi`;

    const formatMonthChange = (current, previous) => {
        if (previous === 0) return current === 0 ? "Tetap" : "Baru";
        const change = Math.round((current - previous) / previous * 100);
        return `${change > 0 ? "+" : ""}${change}%`;
    };
    document.getElementById("home-income-change").textContent =
        formatMonthChange(monthlyIncome, previousMonthIncome);
    document.getElementById("home-expense-change").textContent =
        formatMonthChange(monthlyExpense, previousMonthExpense);

    renderHomeTransactions(cachedTransactions);
    renderHomeExpenseComposition();
    renderHistoryTransactions();
    renderWalletList();
    renderHomeWalletBalances();
    renderReports();
}

async function openUserSession(user) {
    currentUser = user;
    currentWallets = [];

    try {
        await loadWallets();
        await loadCategories();
        try {
            await loadSavingsTargets();
        } catch (targetLoadError) {
            console.error("Target tab belum bisa dimuat:", targetLoadError);
            cachedSavingsTargets = [];
            cachedTargetMovements = [];
            renderSavingsTargets();
            showMessage(
                document.getElementById("target-message"),
                "Fitur target memerlukan migrasi database terbaru. Data lain tetap bisa digunakan.",
                true
            );
        }
        await loadTransactions();
        try {
            await loadCreditAccounts();
            await loadCreditPlans();
        } catch (creditLoadError) {
            console.error("Data Cicilan & Kredit belum bisa dimuat:", creditLoadError);
            cachedCreditAccounts = [];
            cachedCreditPlans = [];
            cachedCreditInstallments = [];
            cachedCreditPayments = [];
            renderCreditAccounts();
            renderCreditPlans();
            const notice = creditSection?.querySelector(".credit-notice p");
            if (notice) notice.textContent = "Akun kredit tersedia, tetapi jadwal cicilan belum dapat dimuat. Pastikan migration Cicilan & Kredit terbaru sudah dijalankan di Supabase.";
        }
        showDashboard();
        showView("home");
    } catch (error) {
        console.error("Gagal memuat data:", error);
        showMessage(
            loginMessage,
            "Data belum bisa dimuat. Periksa tabel dan kebijakan RLS Supabase.",
            true
        );
        showLogin();
    }
}

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const submitButton = loginForm.querySelector('button[type="submit"]');

    submitButton.disabled = true;
    showMessage(loginMessage, "Sedang masuk...");

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        await openUserSession(data.user);
    } catch (error) {
        console.error("Login gagal:", error);
        showMessage(
            loginMessage,
            "Login gagal. Periksa email, password, dan koneksi Supabase.",
            true
        );
    } finally {
        submitButton.disabled = false;
    }
});

loginTabButton.addEventListener("click", () => showAuthView("login"));
signupTabButton.addEventListener("click", () => showAuthView("signup"));

document.querySelectorAll("[data-password-target]").forEach((button) => {
    button.addEventListener("click", () => {
        const input = document.getElementById(button.dataset.passwordTarget);
        const willShow = input.type === "password";
        input.type = willShow ? "text" : "password";
        button.setAttribute("aria-label", willShow ? "Sembunyikan password" : "Tampilkan password");
    });
});

signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;
    const confirmation = document.getElementById("signup-confirm-password").value;
    const submitButton = signupForm.querySelector('button[type="submit"]');

    if (password.length < 8) {
        showMessage(document.getElementById("signup-message"), "Password minimal 8 karakter.", true);
        return;
    }
    if (password !== confirmation) {
        showMessage(document.getElementById("signup-message"), "Konfirmasi password belum cocok.", true);
        return;
    }

    submitButton.disabled = true;
    showMessage(document.getElementById("signup-message"), "Membuat akun...");

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: APP_URL }
        });
        if (error) throw error;

        if (data.session && data.user) {
            await openUserSession(data.user);
        } else {
            signupForm.reset();
            showMessage(
                document.getElementById("signup-message"),
                "Akun berhasil dibuat. Periksa email untuk verifikasi, lalu masuk ke Pockito."
            );
        }
    } catch (error) {
        console.error("Pendaftaran gagal:", error);
        showMessage(
            document.getElementById("signup-message"),
            error.message?.toLowerCase().includes("already registered")
                ? "Email ini sudah terdaftar. Silakan masuk atau gunakan fitur lupa password."
                : (error.message || "Pendaftaran gagal. Periksa email dan coba lagi."),
            true
        );
    } finally {
        submitButton.disabled = false;
    }
});

document.getElementById("resend-verification").addEventListener("click", async () => {
    const email = document.getElementById("signup-email").value.trim();
    const message = document.getElementById("signup-message");

    if (!email) {
        showMessage(message, "Masukkan email akun yang belum terverifikasi terlebih dahulu.", true);
        document.getElementById("signup-email").focus();
        return;
    }

    const button = document.getElementById("resend-verification");
    button.disabled = true;
    showMessage(message, "Mengirim ulang email verifikasi...");

    try {
        const { error } = await supabase.auth.resend({
            type: "signup",
            email,
            options: { emailRedirectTo: APP_URL }
        });
        if (error) throw error;
        showMessage(message, "Permintaan verifikasi diproses. Periksa kotak masuk dan folder spam. Jika baru meminta email, tunggu beberapa menit sebelum mencoba lagi.");
    } catch (error) {
        console.error("Kirim ulang verifikasi gagal:", error);
        showMessage(
            message,
            error.message?.toLowerCase().includes("rate limit")
                ? "Email terlalu sering diminta. Tunggu beberapa menit lalu coba lagi."
                : (error.message || "Email verifikasi belum bisa dikirim. Pastikan akun sudah pernah didaftarkan dan belum terverifikasi."),
            true
        );
    } finally {
        button.disabled = false;
    }
});

document.getElementById("forgot-password").addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();
    if (!email) {
        showMessage(loginMessage, "Masukkan email terlebih dahulu, lalu tekan Lupa password.", true);
        document.getElementById("email").focus();
        return;
    }

    const button = document.getElementById("forgot-password");
    button.disabled = true;
    showMessage(loginMessage, "Mengirim tautan pemulihan...");

    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: APP_URL
        });
        if (error) throw error;
        showMessage(loginMessage, "Jika email terdaftar, tautan pemulihan akan dikirim. Periksa kotak masuk dan folder spam.");
    } catch (error) {
        console.error("Permintaan pemulihan gagal:", error);
        showMessage(loginMessage, "Tautan pemulihan belum bisa dikirim. Periksa pengaturan email Supabase.", true);
    } finally {
        button.disabled = false;
    }
});

recoveryForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const password = document.getElementById("recovery-password").value;
    const confirmation = document.getElementById("recovery-confirm-password").value;
    const message = document.getElementById("recovery-message");
    const submitButton = recoveryForm.querySelector('button[type="submit"]');

    if (password.length < 8) {
        showMessage(message, "Password minimal 8 karakter.", true);
        return;
    }
    if (password !== confirmation) {
        showMessage(message, "Konfirmasi password belum cocok.", true);
        return;
    }

    submitButton.disabled = true;
    showMessage(message, "Menyimpan password baru...");
    try {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        recoveryForm.reset();
        await supabase.auth.signOut();
        showAuthView("login");
        showMessage(loginMessage, "Password berhasil diubah. Silakan masuk dengan password baru.");
    } catch (error) {
        console.error("Gagal mengubah password:", error);
        showMessage(message, error.message || "Password belum bisa diubah. Buka kembali tautan pemulihan dari email.", true);
    } finally {
        submitButton.disabled = false;
    }
});

supabase.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") showPasswordRecovery();
});


transactionForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser) {
        showMessage(transactionMessage, "Silakan masuk kembali.", true);
        return;
    }

    const type = transactionType.value;
    const categoryId = transactionCategory.value;
    const amount = Number(
        document.getElementById("transaction-amount").value
    );
    const description = document
        .getElementById("transaction-description")
        .value.trim();
    const transactionDate = document.getElementById("transaction-date").value;
    const transactionTime = document.getElementById("transaction-time").value;
    const submitButton = transactionForm.querySelector(
        'button[type="submit"]'
    );

    if (!Number.isFinite(amount) || amount <= 0 || !transactionDate || !transactionTime || !categoryId) {
        showMessage(transactionMessage, "Periksa nominal, kategori, tanggal, dan waktu transaksi.", true);
        return;
    }

    submitButton.disabled = true;
    showMessage(transactionMessage, "Menyimpan transaksi...");

    try {
        const { error } = await supabase
            .from("transactions")
            .insert({
                user_id: currentUser.id,
                wallet_id: transactionWalletSelect.value || null,
                type,
                category_id: categoryId,
                amount,
                description: description || null,
                transaction_date: transactionDate,
                transaction_time: transactionTime
            });

        if (error) throw error;

        transactionForm.reset();
        renderCategoryOptions();
        setTransactionDateTimeToNow();
        historyMonth = new Date(`${transactionDate}T00:00:00`);
        historyMonth = new Date(historyMonth.getFullYear(), historyMonth.getMonth(), 1);
        await loadTransactions();
        await loadWallets();

        syncTransactionTypeChoice();
        closeFloatingOverlay(quickInputOverlay);
        showMessage(transactionMessage, "Transaksi berhasil disimpan!");
    } catch (error) {
        console.error("Gagal menyimpan transaksi:", error);
        showMessage(
            transactionMessage,
            "Transaksi gagal disimpan. Periksa koneksi dan kebijakan RLS.",
            true
        );
    } finally {
        submitButton.disabled = false;
    }
});

document.getElementById("logout-button").addEventListener("click", async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
        console.error("Gagal keluar:", error);
        alert("Gagal keluar. Silakan coba lagi.");
        return;
    }

    currentUser = null;
    currentWallets = [];
    currentCategories = [];
    cachedSavingsTargets = [];
    cachedTargetMovements = [];
    cachedCreditAccounts = [];
    cachedCreditPlans = [];
    cachedCreditInstallments = [];
    cachedCreditPayments = [];
    renderCreditAccounts();
    renderCreditPlans();
    renderSavingsTargets();
    renderWalletOptions();
    renderWalletList();
    loginForm.reset();
    transactionForm.reset();
    showLogin();
});

async function initializeApp() {
    showAuthView("login");
    showMessage(loginMessage, "Memeriksa sesi...");

    const { data, error } = await supabase.auth.getSession();

    if (error) {
        showMessage(loginMessage, "Gagal memeriksa sesi Supabase.", true);
        return;
    }

    if (data.session?.user) {
        await openUserSession(data.session.user);
    } else {
        showMessage(loginMessage, "");
    }
}

document.getElementById("report-prev-month").addEventListener("click", () => {
    reportMonth = new Date(reportMonth.getFullYear(), reportMonth.getMonth() - 1, 1);
    renderReports();
});

document.getElementById("report-next-month").addEventListener("click", () => {
    const nextMonth = new Date(reportMonth.getFullYear(), reportMonth.getMonth() + 1, 1);
    if (monthKey(nextMonth) <= monthKey(new Date())) {
        reportMonth = nextMonth;
        renderReports();
    }
});

document.getElementById("history-search").addEventListener("input", renderHistoryTransactions);
document.getElementById("history-type-filter").addEventListener("change", renderHistoryTransactions);

document.getElementById("history-prev-month").addEventListener("click", () => {
    historyMonth = new Date(historyMonth.getFullYear(), historyMonth.getMonth() - 1, 1);
    renderHistoryTransactions();
});

document.getElementById("history-next-month").addEventListener("click", () => {
    const nextMonth = new Date(historyMonth.getFullYear(), historyMonth.getMonth() + 1, 1);
    if (monthKey(nextMonth) <= monthKey(new Date())) {
        historyMonth = nextMonth;
        renderHistoryTransactions();
    }
});

transactionType.addEventListener("change", renderCategoryOptions);

const quickInputOverlay = document.getElementById("quick-input-overlay");
const moreMenuOverlay = document.getElementById("more-menu-overlay");
const openQuickInputButton = document.getElementById("open-quick-input");
const openMoreMenuButton = document.getElementById("open-more-menu");
const transactionTypeChoices = document.querySelectorAll("[data-transaction-type-choice]");

function closeFloatingOverlay(overlay) {
    if (!overlay) return;
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    if (overlay === moreMenuOverlay && openMoreMenuButton) {
        openMoreMenuButton.setAttribute("aria-expanded", "false");
    }
}

function openFloatingOverlay(overlay) {
    if (!overlay) return;
    closeFloatingOverlay(quickInputOverlay);
    closeFloatingOverlay(moreMenuOverlay);
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    if (overlay === moreMenuOverlay && openMoreMenuButton) {
        openMoreMenuButton.setAttribute("aria-expanded", "true");
    }
}

function syncTransactionTypeChoice() {
    const isIncome = transactionType.value === "income";
    transactionTypeChoices.forEach((button) => {
        const active = button.dataset.transactionTypeChoice === transactionType.value;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
    });
    const title = document.getElementById("transaction-entry-title");
    const description = document.getElementById("transaction-entry-description");
    const badge = document.getElementById("transaction-entry-badge");
    const submit = transactionForm.querySelector('button[type="submit"]');
    if (title) title.textContent = isIncome ? "Pendapatan baru" : "Pengeluaran baru";
    if (description) description.textContent = isIncome ? "Catat uang yang kamu terima." : "Catat uang yang kamu keluarkan.";
    if (badge) badge.textContent = isIncome ? "↗" : "↘";
    if (submit) submit.textContent = isIncome ? "Simpan pendapatan" : "Simpan pengeluaran";
}

if (openQuickInputButton) {
    openQuickInputButton.addEventListener("click", () => openFloatingOverlay(quickInputOverlay));
}
if (openMoreMenuButton) {
    openMoreMenuButton.addEventListener("click", () => {
        const isOpen = moreMenuOverlay?.classList.contains("is-open");
        if (isOpen) closeFloatingOverlay(moreMenuOverlay);
        else openFloatingOverlay(moreMenuOverlay);
    });
}

let previousViewBeforeInput = "home";

document.querySelectorAll("[data-input-type]").forEach((button) => {
    button.addEventListener("click", () => {
        const currentView = [...views].find((view) => !view.hidden);
        if (currentView && currentView.dataset.view !== "input") {
            previousViewBeforeInput = currentView.dataset.view;
        }
        transactionType.value = button.dataset.inputType;
        transactionType.dispatchEvent(new Event("change", { bubbles: true }));
        syncTransactionTypeChoice();
        closeFloatingOverlay(quickInputOverlay);
        showView("input");
        document.getElementById("transaction-amount")?.focus({ preventScroll: true });
    });
});

function closeTransactionModal() {
    showView(previousViewBeforeInput || "home");
}

const closeTransactionModalButton = document.getElementById("close-transaction-modal");
if (closeTransactionModalButton) {
    closeTransactionModalButton.addEventListener("click", closeTransactionModal);
}

const transactionModalOverlay = document.querySelector('.transaction-modal-overlay[data-view="input"]');
if (transactionModalOverlay) {
    transactionModalOverlay.addEventListener("click", (event) => {
        if (event.target === transactionModalOverlay) closeTransactionModal();
    });
}

transactionTypeChoices.forEach((button) => {
    button.addEventListener("click", () => {
        transactionType.value = button.dataset.transactionTypeChoice;
        transactionType.dispatchEvent(new Event("change", { bubbles: true }));
        syncTransactionTypeChoice();
    });
});

document.querySelectorAll("[data-close-overlay]").forEach((button) => {
    button.addEventListener("click", () => {
        const overlay = document.getElementById(button.dataset.closeOverlay);
        closeFloatingOverlay(overlay);
    });
});

[quickInputOverlay, moreMenuOverlay].forEach((overlay) => {
    if (!overlay) return;
    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) closeFloatingOverlay(overlay);
    });
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeFloatingOverlay(quickInputOverlay);
        closeFloatingOverlay(moreMenuOverlay);
        if (transactionModalOverlay && !transactionModalOverlay.hidden) closeTransactionModal();
    }
});

for (const button of viewButtons) {
    button.addEventListener("click", () => {
        showView(button.dataset.viewTarget);
        closeFloatingOverlay(moreMenuOverlay);
        closeFloatingOverlay(quickInputOverlay);
    });
}
syncTransactionTypeChoice();

/* Cicilan & Kredit: akun kredit tersimpan di Supabase.
   Pencatatan rencana cicilan/pembayaran sengaja belum diaktifkan agar saldo tidak salah hitung. */
const creditSection = document.querySelector('[data-view="credit"]');
let cachedCreditAccounts = [];
const CREDIT_TYPE_LABELS = {
    credit_card: "Kartu kredit",
    paylater: "PayLater",
    installment_loan: "Pinjaman cicilan",
    other: "Lainnya"
};
let editingCreditAccountId = null;
function beginEditCreditAccount(account) {
    const accountForm = document.getElementById("credit-account-form");
    const addToggle = document.getElementById("credit-add-toggle");
    const cancelButton = document.getElementById("credit-account-cancel");
    const note = accountForm?.querySelector(".credit-form-note");
    if (!accountForm) return;

    editingCreditAccountId = account.id;
    document.getElementById("credit-account-name").value = account.name || "";
    document.getElementById("credit-account-provider").value = account.provider || "";
    document.getElementById("credit-account-type").value = account.account_type || "other";
    document.getElementById("credit-account-limit").value = account.credit_limit ?? "";
    document.getElementById("credit-account-billing-day").value = account.billing_day ?? "";
    document.getElementById("credit-account-due-day").value = account.due_day ?? "";

    const submitButton = accountForm.querySelector('button[type="submit"]');
    if (submitButton) submitButton.textContent = "Simpan perubahan";
    if (cancelButton) cancelButton.textContent = "Batal edit";
    if (note) showMessage(note, `Mengedit akun "${account.name}".`);

    accountForm.hidden = false;
    if (addToggle) addToggle.hidden = true;
    const emptyCta = creditSection?.querySelector("[data-credit-open-form]");
    if (emptyCta) emptyCta.hidden = true;
    accountForm.scrollIntoView({ behavior: "smooth", block: "center" });
    document.getElementById("credit-account-name").focus({ preventScroll: true });
}

function renderCreditAccounts() {
    if (!creditSection) return;
    const list = document.getElementById("credit-account-list");
    const empty = creditSection.querySelector(".credit-empty-state-compact");
    const active = cachedCreditAccounts.filter((account) => account.is_active);
    list.replaceChildren();
    if (empty) empty.hidden = cachedCreditAccounts.length > 0;
    list.hidden = cachedCreditAccounts.length === 0;
    const accountCount = creditSection.querySelector(".credit-metric-grid .credit-metric-card:nth-child(3) strong");
    if (accountCount) accountCount.textContent = `${active.length} akun`;
    for (const account of cachedCreditAccounts) {
        const card = document.createElement("article");
        card.className = "credit-account-card";
        const main = document.createElement("div");
        main.className = "credit-account-card-main";
        const title = document.createElement("h3");
        title.textContent = account.name;
        const subtitle = document.createElement("p");
        subtitle.textContent = [account.provider, CREDIT_TYPE_LABELS[account.account_type] || "Lainnya"].filter(Boolean).join(" · ");
        main.append(title, subtitle);
        const meta = document.createElement("div");
        meta.className = "credit-account-card-meta";
        const limit = document.createElement("span");
        limit.textContent = account.credit_limit === null ? "Limit tidak diatur" : `Limit ${rupiah.format(Number(account.credit_limit))}`;
        const due = document.createElement("span");
        due.textContent = account.due_day ? `Jatuh tempo tgl. ${account.due_day}` : "Jatuh tempo belum diatur";
        const status = document.createElement("span");
        status.className = account.is_active ? "credit-account-status" : "credit-account-status inactive";
        status.textContent = account.is_active ? "Aktif" : "Nonaktif";
        meta.append(limit, due, status);
        const actions = document.createElement("div");
        actions.className = "credit-account-card-actions";
        const edit = document.createElement("button");
        edit.type = "button";
        edit.className = "secondary-action credit-account-edit";
        edit.textContent = "Edit akun";
        edit.addEventListener("click", () => beginEditCreditAccount(account));
        actions.append(edit);
        card.append(main, meta, actions);
        list.append(card);
    }
}
async function loadCreditAccounts() {
    const note = document.querySelector("#credit-account-form .credit-form-note");
    const { data, error } = await supabase
        .from("credit_accounts")
        .select("id, name, provider, account_type, credit_limit, billing_day, due_day, is_active, created_at")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });
    if (error) throw error;
    cachedCreditAccounts = data || [];
    renderCreditAccounts();
    populateCreditPlanForm();
    renderCreditPlans();
    if (note) {
        note.textContent = "Akun tersimpan aman. Tambahkan cicilan pada tab Cicilan; pembayaran pokok dan bunga diproses terpisah.";
        note.style.color = "";
    }
}

function creditLocalDate(date = new Date()) {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
}
function creditLocalDateTime(date = new Date()) {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
}
function creditField(labelText, control) {
    const field = document.createElement("div");
    field.className = "form-field";
    const label = document.createElement("label");
    label.textContent = labelText;
    label.htmlFor = control.id;
    field.append(label, control);
    return field;
}
function creditInput(id, type, value, min = "0", step = "1") {
    const input = document.createElement("input");
    input.id = id;
    input.type = type;
    if (type === "number") { input.min = min; input.step = step; }
    if (value !== undefined && value !== null) input.value = value;
    return input;
}
function creditSelect(id, choices, placeholder) {
    const select = document.createElement("select");
    select.id = id;
    if (placeholder) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = placeholder;
        select.append(option);
    }
    choices.forEach(({ value, label }) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        select.append(option);
    });
    return select;
}
function creditMoney(value) {
    return rupiah.format(Math.max(0, Number(value) || 0));
}
function creditRemaining(installment, key) {
    return Math.max(0, Math.round((Number(installment[key + "_due"] || 0) - Number(installment[key + "_paid"] || 0)) * 100) / 100);
}
function creditInstallmentLabel(installment) {
    if (installment.status === "paid") return "Lunas";
    if (installment.status === "cancelled") return "Dibatalkan";
    if (installment.status === "partial") return "Dibayar sebagian";
    if (installment.due_date < creditLocalDate()) return "Terlambat";
    return "Belum dibayar";
}
function renderCreditPlans() {
    const list = document.getElementById("credit-plan-list");
    const empty = document.getElementById("credit-plan-empty");
    if (!list || !empty) return;
    list.replaceChildren();
    empty.hidden = cachedCreditPlans.length > 0;
    const accountById = new Map(cachedCreditAccounts.map((account) => [account.id, account]));
    const installmentsByPlan = new Map();
    for (const item of cachedCreditInstallments) {
        if (!installmentsByPlan.has(item.credit_plan_id)) installmentsByPlan.set(item.credit_plan_id, []);
        installmentsByPlan.get(item.credit_plan_id).push(item);
    }
    let outstandingTotal = 0;
    let dueThisMonth = 0;
    const currentMonth = creditLocalDate().slice(0, 7);
    for (const plan of cachedCreditPlans) {
        const installments = installmentsByPlan.get(plan.id) || [];
        const remainingPrincipal = installments.reduce((sum, item) => sum + creditRemaining(item, "principal"), 0);
        const remainingInterest = installments.reduce((sum, item) => sum + creditRemaining(item, "interest"), 0);
        const remainingFees = installments.reduce((sum, item) => sum + creditRemaining(item, "fee"), 0);
        const remainingTotal = remainingPrincipal + remainingInterest + remainingFees;
        outstandingTotal += remainingTotal;
        dueThisMonth += installments.filter((item) => item.due_date && item.due_date.startsWith(currentMonth) && item.status !== "paid" && item.status !== "cancelled")
            .reduce((sum, item) => sum + creditRemaining(item, "principal") + creditRemaining(item, "interest") + creditRemaining(item, "fee"), 0);

        const card = document.createElement("article");
        card.className = "credit-plan-card";
        const header = document.createElement("div");
        header.className = "credit-plan-card-header";
        const titleBlock = document.createElement("div");
        const title = document.createElement("h3");
        title.textContent = plan.description;
        const account = document.createElement("p");
        account.textContent = (accountById.get(plan.credit_account_id)?.name || "Akun kredit") +
            " · " + plan.tenor_months + " bulan" +
            (Number(plan.interest_total) > 0 ? " · bunga " + creditMoney(plan.interest_total) : " · tanpa bunga");
        titleBlock.append(title, account);
        const status = document.createElement("span");
        status.className = "credit-plan-status" + (plan.status === "completed" ? " completed" : "");
        status.textContent = plan.status === "completed" ? "Lunas" : "Aktif";
        header.append(titleBlock, status);
        card.append(header);

        const summary = document.createElement("div");
        summary.className = "credit-plan-summary";
        [
            ["Sisa pokok", creditMoney(remainingPrincipal)],
            ["Sisa bunga/biaya", creditMoney(remainingInterest + remainingFees)],
            ["Total sisa", creditMoney(remainingTotal)]
        ].forEach(([labelText, value]) => {
            const box = document.createElement("div");
            const label = document.createElement("span");
            label.textContent = labelText;
            const strong = document.createElement("strong");
            strong.textContent = value;
            box.append(label, strong);
            summary.append(box);
        });
        card.append(summary);

        const scheduleDetails = document.createElement("details");
        scheduleDetails.className = "credit-schedule-details";
        const scheduleSummary = document.createElement("summary");
        scheduleSummary.textContent = "Lihat seluruh jadwal (" + installments.length + " cicilan)";
        const scheduleHeading = document.createElement("h4");
        scheduleHeading.textContent = "Jadwal pembayaran";
        const schedule = document.createElement("div");
        schedule.className = "credit-installment-list";
        installments.sort((a, b) => a.installment_number - b.installment_number).forEach((installment) => {
            const row = document.createElement("div");
            row.className = "credit-installment-row";
            const top = document.createElement("div");
            top.className = "credit-installment-row-top";
            const meta = document.createElement("div");
            const number = document.createElement("strong");
            number.textContent = "Cicilan " + installment.installment_number + "/" + plan.tenor_months;
            const due = document.createElement("small");
            due.textContent = "Jatuh tempo " + installment.due_date;
            const state = document.createElement("span");
            state.className = "credit-installment-status";
            state.textContent = creditInstallmentLabel(installment);
            meta.append(number, due, state);
            const amount = document.createElement("div");
            amount.className = "credit-installment-amount";
            const left = creditRemaining(installment, "principal") + creditRemaining(installment, "interest") + creditRemaining(installment, "fee");
            amount.textContent = creditMoney(left);
            top.append(meta, amount);
            row.append(top);

            if (installment.status !== "paid" && installment.status !== "cancelled") {
                const toggle = document.createElement("button");
                toggle.type = "button";
                toggle.className = "secondary-action credit-payment-toggle";
                toggle.textContent = "＋ Catat pembayaran";
                const form = document.createElement("form");
                form.className = "credit-payment-form";
                form.hidden = true;
                const grid = document.createElement("div");
                grid.className = "credit-form-grid";
                const prefix = "credit-pay-" + installment.id;
                const principal = creditInput(prefix + "-principal", "number", creditRemaining(installment, "principal"), "0", "0.01");
                const interest = creditInput(prefix + "-interest", "number", creditRemaining(installment, "interest"), "0", "0.01");
                const fee = creditInput(prefix + "-fee", "number", creditRemaining(installment, "fee"), "0", "0.01");
                const wallet = creditSelect(prefix + "-wallet", currentWallets.map((w) => ({ value: w.id, label: w.name })), "Pilih dompet");
                const category = creditSelect(prefix + "-category", currentCategories.filter((c) => c.type === "expense").map((c) => ({ value: c.id, label: c.name })), "Pilih kategori bunga/biaya");
                const paidAt = creditInput(prefix + "-date", "datetime-local", creditLocalDateTime(), undefined, undefined);
                principal.required = true; interest.required = true; fee.required = true;
                wallet.required = true; paidAt.required = true;
                grid.append(
                    creditField("Pokok dibayar (Rp)", principal),
                    creditField("Bunga dibayar (Rp)", interest),
                    creditField("Biaya dibayar (Rp)", fee),
                    creditField("Dompet pembayaran", wallet),
                    creditField("Kategori bunga/biaya", category),
                    creditField("Tanggal dan waktu bayar", paidAt)
                );
                const hint = document.createElement("p");
                hint.className = "credit-plan-empty-note";
                hint.textContent = "Pokok mengurangi saldo dompet melalui ledger kredit; hanya bunga/biaya yang menjadi transaksi pengeluaran.";
                const actions = document.createElement("div");
                actions.className = "credit-form-actions";
                const cancel = document.createElement("button");
                cancel.type = "button"; cancel.className = "secondary-action"; cancel.textContent = "Batal";
                const submit = document.createElement("button");
                submit.type = "submit"; submit.textContent = "Simpan pembayaran";
                const message = document.createElement("p");
                message.className = "credit-form-note";
                message.setAttribute("role", "status");
                actions.append(cancel, submit);
                form.append(grid, hint, actions, message);
                toggle.addEventListener("click", () => { form.hidden = !form.hidden; });
                cancel.addEventListener("click", () => { form.hidden = true; });
                form.addEventListener("submit", async (event) => {
                    event.preventDefault();
                    if (!currentUser) { showMessage(message, "Silakan masuk kembali.", true); return; }
                    const p = Number(principal.value);
                    const i = Number(interest.value);
                    const f = Number(fee.value);
                    const paidDate = paidAt.value;
                    if (![p, i, f].every((n) => Number.isFinite(n) && n >= 0) || p + i + f <= 0 || !wallet.value || !paidDate) {
                        showMessage(message, "Isi nominal pembayaran, dompet, serta tanggal dengan benar.", true);
                        return;
                    }
                    if (i + f > 0 && !category.value) {
                        showMessage(message, "Pilih kategori pengeluaran untuk bunga/biaya.", true);
                        return;
                    }
                    submit.disabled = true;
                    showMessage(message, "Menyimpan pembayaran secara aman...");
                    try {
                        const { error } = await supabase.rpc("record_credit_installment_payment", {
                            p_installment_id: installment.id,
                            p_wallet_id: wallet.value,
                            p_principal_amount: p,
                            p_interest_amount: i,
                            p_fee_amount: f,
                            p_paid_at: new Date(paidDate).toISOString(),
                            p_expense_category_id: i + f > 0 ? category.value : null
                        });
                        if (error) throw error;
                        await loadCreditPlans();
                        await loadTransactions();
                        await loadWallets();
                        showMessage(document.getElementById("credit-plan-message"), "Pembayaran berhasil dicatat.");
                    } catch (error) {
                        console.error("Gagal mencatat pembayaran cicilan:", error);
                        showMessage(message, error.message || "Pembayaran gagal disimpan. Pastikan migration kredit terbaru sudah dijalankan.", true);
                    } finally {
                        submit.disabled = false;
                    }
                });
                row.append(toggle, form);
            }
            schedule.append(row);
        });
        scheduleDetails.append(scheduleSummary, scheduleHeading, schedule);
        card.append(scheduleDetails);
        list.append(card);
    }

    const upcomingInstallmentList = document.getElementById("credit-upcoming-installment-list");
    const upcomingInstallmentEmpty = document.getElementById("credit-upcoming-installment-empty");
    if (upcomingInstallmentList && upcomingInstallmentEmpty) {
        upcomingInstallmentList.replaceChildren();
        const upcoming = [];
        for (const plan of cachedCreditPlans) {
            const accountName = accountById.get(plan.credit_account_id)?.name || "Akun kredit";
            for (const installment of installmentsByPlan.get(plan.id) || []) {
                const remaining = creditRemaining(installment, "principal") + creditRemaining(installment, "interest") + creditRemaining(installment, "fee");
                if (remaining <= 0 || installment.status === "paid" || installment.status === "cancelled") continue;
                upcoming.push({ plan, installment, accountName, remaining });
            }
        }
        upcoming.sort((a, b) => a.installment.due_date.localeCompare(b.installment.due_date));
        upcoming.slice(0, 3).forEach(({ plan, installment, accountName, remaining }) => {
            const row = document.createElement("article");
            row.className = "credit-installment-row credit-upcoming-installment";
            const top = document.createElement("div");
            top.className = "credit-installment-row-top";
            const meta = document.createElement("div");
            const title = document.createElement("strong");
            title.textContent = plan.description + " · " + installment.installment_number + "/" + plan.tenor_months;
            const due = document.createElement("small");
            due.textContent = accountName + " · Jatuh tempo " + installment.due_date;
            const state = document.createElement("span");
            state.className = "credit-installment-status";
            state.textContent = installment.due_date < creditLocalDate() ? "Terlambat" : creditInstallmentLabel(installment);
            meta.append(title, due, state);
            const amount = document.createElement("div");
            amount.className = "credit-installment-amount";
            amount.textContent = creditMoney(remaining);
            top.append(meta, amount);
            const action = document.createElement("button");
            action.type = "button";
            action.className = "secondary-action credit-payment-toggle";
            action.textContent = "Buka jadwal";
            action.addEventListener("click", () => {
                const planCards = [...list.querySelectorAll(".credit-plan-card")];
                const index = cachedCreditPlans.findIndex((item) => item.id === plan.id);
                const target = planCards[index]?.querySelector(".credit-schedule-details");
                if (target) {
                    target.open = true;
                    target.scrollIntoView({ behavior: "smooth", block: "nearest" });
                }
            });
            row.append(top, action);
            upcomingInstallmentList.append(row);
        });
        upcomingInstallmentEmpty.hidden = upcomingInstallmentList.childElementCount > 0;
    }

    const upcomingBillList = document.getElementById("credit-upcoming-bill-list");
    const upcomingBillEmpty = document.getElementById("credit-upcoming-bill-empty");
    if (upcomingBillList && upcomingBillEmpty) {
        upcomingBillList.replaceChildren();
        const upcoming = [];
        for (const plan of cachedCreditPlans) {
            const accountName = accountById.get(plan.credit_account_id)?.name || "Akun kredit";
            for (const installment of installmentsByPlan.get(plan.id) || []) {
                const remaining = creditRemaining(installment, "principal") + creditRemaining(installment, "interest") + creditRemaining(installment, "fee");
                if (remaining <= 0 || installment.status === "paid" || installment.status === "cancelled") continue;
                upcoming.push({ plan, installment, accountName, remaining, overdue: installment.due_date < creditLocalDate() });
            }
        }
        upcoming.sort((a, b) => a.installment.due_date.localeCompare(b.installment.due_date));
        const nearest = upcoming.slice(0, 3);
        nearest.forEach(({ plan, installment, accountName, remaining, overdue }) => {
            const row = document.createElement("article");
            row.className = "credit-installment-row";
            const top = document.createElement("div");
            top.className = "credit-installment-row-top";
            const meta = document.createElement("div");
            const title = document.createElement("strong");
            title.textContent = plan.description + " · " + installment.installment_number + "/" + plan.tenor_months;
            const detail = document.createElement("small");
            detail.textContent = accountName + " · jatuh tempo " + installment.due_date;
            const state = document.createElement("span");
            state.className = "credit-installment-status";
            state.textContent = overdue ? "Terlambat" : installment.status === "partial" ? "Dibayar sebagian" : "Belum dibayar";
            meta.append(title, detail, state);
            const amount = document.createElement("div");
            amount.className = "credit-installment-amount";
            amount.textContent = creditMoney(remaining);
            top.append(meta, amount);
            const action = document.createElement("button");
            action.type = "button";
            action.className = "secondary-action credit-payment-toggle";
            action.textContent = "Lihat cicilan";
            action.addEventListener("click", () => creditSection.querySelector('[data-credit-tab="plans"]')?.click());
            row.append(top, action);
            upcomingBillList.append(row);
        });
        upcomingBillEmpty.hidden = nearest.length > 0;
    }

    const billList = document.getElementById("credit-bill-list");
    const billEmpty = document.getElementById("credit-bill-empty");
    const billFilter = document.getElementById("credit-bill-filter")?.value || "all";
    if (billList && billEmpty) {
        billList.replaceChildren();
        const billItems = [];
        for (const plan of cachedCreditPlans) {
            const accountName = accountById.get(plan.credit_account_id)?.name || "Akun kredit";
            for (const installment of installmentsByPlan.get(plan.id) || []) {
                const remaining = creditRemaining(installment, "principal") + creditRemaining(installment, "interest") + creditRemaining(installment, "fee");
                const overdue = remaining > 0 && installment.due_date < creditLocalDate() && installment.status !== "cancelled";
                const paid = installment.status === "paid" || installment.status === "cancelled" || remaining <= 0;
                if (billFilter === "paid" && !paid) continue;
                if (billFilter === "unpaid" && paid) continue;
                if (billFilter === "overdue" && !overdue) continue;
                billItems.push({ plan, installment, accountName, remaining, overdue, paid });
            }
        }
        billItems.sort((a, b) => a.installment.due_date.localeCompare(b.installment.due_date));
        billItems.forEach(({ plan, installment, accountName, remaining, overdue, paid }) => {
            const row = document.createElement("article");
            row.className = "credit-installment-row";
            const top = document.createElement("div");
            top.className = "credit-installment-row-top";
            const meta = document.createElement("div");
            const title = document.createElement("strong");
            title.textContent = plan.description + " · " + installment.installment_number + "/" + plan.tenor_months;
            const detail = document.createElement("small");
            detail.textContent = accountName + " · jatuh tempo " + installment.due_date;
            const state = document.createElement("span");
            state.className = "credit-installment-status";
            state.textContent = paid ? "Lunas" : overdue ? "Terlambat" : installment.status === "partial" ? "Dibayar sebagian" : "Belum dibayar";
            meta.append(title, detail, state);
            const amount = document.createElement("div");
            amount.className = "credit-installment-amount";
            amount.textContent = creditMoney(remaining);
            top.append(meta, amount);
            const action = document.createElement("button");
            action.type = "button";
            action.className = "secondary-action credit-payment-toggle";
            action.textContent = "Lihat cicilan";
            action.addEventListener("click", () => creditSection.querySelector('[data-credit-tab="plans"]')?.click());
            row.append(top, action);
            billList.append(row);
        });
        billEmpty.hidden = billItems.length > 0;
    }

    const metrics = creditSection?.querySelectorAll(".credit-metric-grid .credit-metric-card strong");
    if (metrics?.length >= 3) {
        metrics[0].textContent = creditMoney(outstandingTotal);
        metrics[1].textContent = creditMoney(dueThisMonth);
        metrics[2].textContent = cachedCreditAccounts.filter((a) => a.is_active).length + " akun";
    }
    const billMetrics = creditSection?.querySelectorAll(".credit-bill-summary .credit-metric-card strong");
    if (billMetrics?.length >= 2) {
        billMetrics[0].textContent = creditMoney(outstandingTotal);
        billMetrics[1].textContent = creditMoney(cachedCreditPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0));
    }
}
async function loadCreditPlans() {
    if (!currentUser) return;
    const [plansResult, paymentsResult] = await Promise.all([
        supabase.from("credit_plans")
            .select("id, credit_account_id, transaction_id, description, principal_amount, interest_type, interest_total, fee_total, tenor_months, start_date, status, created_at")
            .eq("user_id", currentUser.id)
            .order("created_at", { ascending: false }),
        supabase.from("credit_payments")
            .select("id, credit_account_id, wallet_id, amount, principal_amount, interest_amount, fee_amount, transaction_id, paid_at")
            .eq("user_id", currentUser.id)
            .order("paid_at", { ascending: false })
    ]);
    if (plansResult.error) throw plansResult.error;
    if (paymentsResult.error) throw paymentsResult.error;
    cachedCreditPlans = plansResult.data || [];
    cachedCreditPayments = paymentsResult.data || [];
    if (cachedCreditPlans.length) {
        const { data, error } = await supabase.from("credit_installments")
            .select("id, credit_plan_id, installment_number, due_date, principal_due, interest_due, fee_due, principal_paid, interest_paid, fee_paid, status")
            .eq("user_id", currentUser.id)
            .order("due_date", { ascending: true });
        if (error) throw error;
        cachedCreditInstallments = data || [];
    } else {
        cachedCreditInstallments = [];
    }
    renderCreditPlans();
    renderWalletList();
    renderHomeWalletBalances();
}
function populateCreditPlanForm() {
    const accountSelect = document.getElementById("credit-plan-account");
    const categorySelect = document.getElementById("credit-plan-category");
    const transactionSelect = document.getElementById("credit-plan-existing-transaction");
    if (!accountSelect || !categorySelect || !transactionSelect) return;
    const selectedAccount = accountSelect.value;
    accountSelect.replaceChildren();
    const accountPlaceholder = document.createElement("option");
    accountPlaceholder.value = ""; accountPlaceholder.textContent = "Pilih akun kredit";
    accountSelect.append(accountPlaceholder);
    cachedCreditAccounts.filter((account) => account.is_active).forEach((account) => {
        const option = document.createElement("option");
        option.value = account.id; option.textContent = account.name;
        accountSelect.append(option);
    });
    if (cachedCreditAccounts.some((account) => account.id === selectedAccount && account.is_active)) accountSelect.value = selectedAccount;

    const selectedCategory = categorySelect.value;
    categorySelect.replaceChildren();
    const catPlaceholder = document.createElement("option");
    catPlaceholder.value = ""; catPlaceholder.textContent = "Pilih kategori";
    categorySelect.append(catPlaceholder);
    currentCategories.filter((category) => category.type === "expense").forEach((category) => {
        const option = document.createElement("option");
        option.value = category.id; option.textContent = category.name;
        categorySelect.append(option);
    });
    if ([...categorySelect.options].some((option) => option.value === selectedCategory)) categorySelect.value = selectedCategory;

    const selectedTransaction = transactionSelect.value;
    transactionSelect.replaceChildren();
    const transactionPlaceholder = document.createElement("option");
    transactionPlaceholder.value = ""; transactionPlaceholder.textContent = "Pilih transaksi pembelian";
    transactionSelect.append(transactionPlaceholder);
    cachedTransactions.filter((transaction) => transaction.type === "expense" && transaction.wallet_id === null).forEach((transaction) => {
        const option = document.createElement("option");
        option.value = transaction.id;
        option.textContent = transaction.transaction_date + " · " + creditMoney(transaction.amount) + " · " + (transaction.description || "Pengeluaran");
        transactionSelect.append(option);
    });
    if ([...transactionSelect.options].some((option) => option.value === selectedTransaction)) transactionSelect.value = selectedTransaction;
}
function setCreditPlanFormVisible(visible) {
    const form = document.getElementById("credit-plan-form");
    const toggle = document.getElementById("credit-plan-add-toggle");
    if (!form || !toggle) return;
    form.hidden = !visible;
    toggle.hidden = visible;
    if (visible) {
        populateCreditPlanForm();
        const today = creditLocalDate();
        const purchaseDate = document.getElementById("credit-plan-purchase-date");
        const dueDate = document.getElementById("credit-plan-first-due");
        if (!purchaseDate.value) purchaseDate.value = today;
        if (!dueDate.value) {
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            dueDate.value = creditLocalDate(nextMonth);
        }
        document.getElementById("credit-plan-description").focus();
    }
}
function updateCreditPlanPurchaseMode() {
    const mode = document.getElementById("credit-plan-purchase-mode")?.value;
    const categoryField = document.getElementById("credit-plan-category-field");
    const category = document.getElementById("credit-plan-category");
    const transactionField = document.getElementById("credit-plan-transaction-field");
    const transaction = document.getElementById("credit-plan-existing-transaction");
    if (!categoryField || !transactionField) return;
    categoryField.hidden = mode !== "create";
    category.required = mode === "create";
    transactionField.hidden = mode !== "link";
    transaction.required = mode === "link";
}
async function submitCreditPlanForm(event) {
    event.preventDefault();
    const form = document.getElementById("credit-plan-form");
    const message = document.getElementById("credit-plan-message");
    const submit = form.querySelector('button[type="submit"]');
    if (!currentUser) { showMessage(message, "Silakan masuk kembali.", true); return; }
    const accountId = document.getElementById("credit-plan-account").value;
    const description = document.getElementById("credit-plan-description").value.trim();
    const principal = Number(document.getElementById("credit-plan-principal").value);
    const tenor = Number(document.getElementById("credit-plan-tenor").value);
    const monthlyPayment = Number(document.getElementById("credit-plan-monthly-payment").value);
    const plannedTotalPayment = monthlyPayment * tenor;
    const interest = plannedTotalPayment - principal;
    const interestType = interest > 0 ? "fixed" : "none";
    const fee = 0;
    const purchaseDate = document.getElementById("credit-plan-purchase-date").value;
    const firstDue = document.getElementById("credit-plan-first-due").value;
    const paidCount = Number(document.getElementById("credit-plan-paid-count").value);
    const mode = document.getElementById("credit-plan-purchase-mode").value;
    const category = document.getElementById("credit-plan-category").value;
    const existingTransaction = document.getElementById("credit-plan-existing-transaction").value;
    if (!accountId || !description || !Number.isFinite(principal) || principal <= 0 ||
        !Number.isInteger(tenor) || tenor < 1 || tenor > 600 ||
        !Number.isFinite(monthlyPayment) || monthlyPayment <= 0 ||
        !Number.isFinite(plannedTotalPayment) || plannedTotalPayment < principal ||
        !purchaseDate || !firstDue || !Number.isInteger(paidCount) || paidCount < 0 || paidCount > tenor ||
        (mode === "create" && !category) || (mode === "link" && !existingTransaction)) {
        showMessage(message, "Pastikan cicilan per bulan × tenor minimal sama dengan harga pokok, lalu periksa tanggal dan pilihan transaksi pembelian.", true);
        return;
    }
    if (mode === "link") {
        const linked = cachedTransactions.find((item) => item.id === existingTransaction);
        if (!linked || Number(linked.amount) !== principal) {
            showMessage(message, "Pilih transaksi pengeluaran dengan nominal yang sama persis dengan harga pokok.", true);
            return;
        }
    }
    submit.disabled = true;
    showMessage(message, "Membuat jadwal cicilan...");
    try {
        const { error } = await supabase.rpc("create_credit_plan_with_schedule", {
            p_credit_account_id: accountId,
            p_description: description,
            p_principal_amount: principal,
            p_interest_type: interestType,
            p_interest_total: interest,
            p_fee_total: fee,
            p_tenor_months: tenor,
            p_first_due_date: firstDue,
            p_purchase_date: purchaseDate,
            p_purchase_record_mode: mode,
            p_purchase_category_id: mode === "create" ? category : null,
            p_existing_transaction_id: mode === "link" ? existingTransaction : null,
            p_paid_installments: paidCount
        });
        if (error) throw error;
        form.reset();
        document.getElementById("credit-plan-paid-count").value = "0";
        document.getElementById("credit-plan-purchase-mode").value = "create";
        updateCreditPlanPurchaseMode();
        await loadTransactions();
        await loadCreditPlans();
        await loadWallets();
        setCreditPlanFormVisible(false);
        showMessage(document.getElementById("credit-plan-message"), "Jadwal cicilan berhasil dibuat.");
    } catch (error) {
        console.error("Gagal membuat jadwal cicilan:", error);
        showMessage(message, error.message || "Jadwal cicilan gagal dibuat. Pastikan migration kredit terbaru sudah dijalankan.", true);
    } finally {
        submit.disabled = false;
    }
}

if (creditSection) {
    const creditTabs = creditSection.querySelectorAll("[data-credit-tab]");
    const creditPanes = creditSection.querySelectorAll("[data-credit-pane]");
    function showCreditPane(name) {
        creditPanes.forEach((pane) => { pane.hidden = pane.dataset.creditPane !== name; });
        creditTabs.forEach((tab) => {
            const active = tab.dataset.creditTab === name;
            tab.classList.toggle("active", active);
            tab.setAttribute("aria-current", active ? "page" : "false");
        });
        if (name === "detail") {
            const back = creditSection.querySelector(".credit-back-link");
            if (back) back.focus({ preventScroll: true });
        }
    }
    creditTabs.forEach((tab) => tab.addEventListener("click", () => showCreditPane(tab.dataset.creditTab)));
    creditSection.querySelectorAll("[data-credit-tab-link]").forEach((button) => {
        button.addEventListener("click", () => showCreditPane(button.dataset.creditTabLink));
    });
    const accountForm = document.getElementById("credit-account-form");
    const addToggle = document.getElementById("credit-add-toggle");
    const cancelButton = document.getElementById("credit-account-cancel");
    const submitButton = accountForm.querySelector('button[type="submit"]');
    const note = accountForm.querySelector(".credit-form-note");
    function setCreditFormVisible(visible) {
        accountForm.hidden = !visible;
        if (addToggle) addToggle.hidden = visible;
        const emptyCta = creditSection.querySelector("[data-credit-open-form]");
        if (emptyCta) emptyCta.hidden = visible || cachedCreditAccounts.length > 0;
        if (visible) document.getElementById("credit-account-name").focus();
    }
    function resetCreditAccountForm() {
        editingCreditAccountId = null;
        accountForm.reset();
        submitButton.textContent = "Simpan akun";
        if (cancelButton) cancelButton.textContent = "Batal";
    }
    if (addToggle) addToggle.addEventListener("click", () => {
        resetCreditAccountForm();
        setCreditFormVisible(true);
    });
    if (cancelButton) cancelButton.addEventListener("click", () => {
        resetCreditAccountForm();
        showMessage(note, "Perubahan dibatalkan.");
        setCreditFormVisible(false);
    });
    creditSection.querySelectorAll("[data-credit-open-form]").forEach((button) => {
        button.addEventListener("click", () => setCreditFormVisible(true));
    });
    accountForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!currentUser) { showMessage(note, "Silakan masuk kembali.", true); return; }
        const name = document.getElementById("credit-account-name").value.trim();
        const provider = document.getElementById("credit-account-provider").value.trim();
        const type = document.getElementById("credit-account-type").value;
        const limitText = document.getElementById("credit-account-limit").value.trim();
        const billingText = document.getElementById("credit-account-billing-day").value.trim();
        const dueText = document.getElementById("credit-account-due-day").value.trim();
        const creditLimit = limitText === "" ? null : Number(limitText);
        const billingDay = billingText === "" ? null : Number(billingText);
        const dueDay = dueText === "" ? null : Number(dueText);
        if (!name || (creditLimit !== null && (!Number.isFinite(creditLimit) || creditLimit < 0)) ||
            (billingDay !== null && (!Number.isInteger(billingDay) || billingDay < 1 || billingDay > 31)) ||
            (dueDay !== null && (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31))) {
            showMessage(note, "Periksa nama, limit, dan tanggal. Tanggal harus antara 1–31.", true);
            return;
        }
        if (cachedCreditAccounts.some((account) =>
            account.id !== editingCreditAccountId &&
            account.name.toLocaleLowerCase("id-ID") === name.toLocaleLowerCase("id-ID")
        )) {
            showMessage(note, "Nama akun ini sudah dipakai akun lain. Gunakan nama yang berbeda.", true);
            return;
        }
        submitButton.disabled = true;
        showMessage(note, editingCreditAccountId ? "Menyimpan perubahan akun..." : "Menyimpan akun kredit...");
        const payload = {
            name,
            provider: provider || null,
            account_type: type,
            credit_limit: creditLimit,
            billing_day: billingDay,
            due_day: dueDay
        };
        try {
            let result;
            if (editingCreditAccountId) {
                result = await supabase.from("credit_accounts")
                    .update(payload)
                    .eq("id", editingCreditAccountId)
                    .eq("user_id", currentUser.id);
            } else {
                result = await supabase.from("credit_accounts")
                    .insert({ ...payload, user_id: currentUser.id });
            }
            if (result.error) throw result.error;
            const wasEditing = Boolean(editingCreditAccountId);
            await loadCreditAccounts();
            resetCreditAccountForm();
            setCreditFormVisible(false);
            showMessage(note, wasEditing
                ? `Akun "${name}" berhasil diperbarui.`
                : `Akun "${name}" berhasil disimpan.`);
        } catch (error) {
            console.error("Gagal menyimpan akun kredit:", error);
            showMessage(note, error.message?.includes("credit_accounts")
                ? "Tabel akun kredit belum terbaca. Pastikan migration berhasil dijalankan lalu muat ulang halaman."
                : "Akun gagal disimpan. Periksa koneksi dan kebijakan RLS Supabase.", true);
        } finally {
            submitButton.disabled = false;
        }
    });
    showCreditPane("overview");
    const planForm = document.getElementById("credit-plan-form");
    const planAddToggle = document.getElementById("credit-plan-add-toggle");
    const planCancel = document.getElementById("credit-plan-cancel");
    const purchaseMode = document.getElementById("credit-plan-purchase-mode");
    const purchaseDate = document.getElementById("credit-plan-purchase-date");
    const firstDueDate = document.getElementById("credit-plan-first-due");
    const tenorInput = document.getElementById("credit-plan-tenor");
    const paidCountInput = document.getElementById("credit-plan-paid-count");
    if (planAddToggle) planAddToggle.addEventListener("click", () => {
        setCreditPlanFormVisible(true);
        updateCreditPlanPurchaseMode();
    });
    if (planCancel) planCancel.addEventListener("click", () => {
        planForm.reset();
        document.getElementById("credit-plan-paid-count").value = "0";
        document.getElementById("credit-plan-purchase-mode").value = "create";
        updateCreditPlanPurchaseMode();
        setCreditPlanFormVisible(false);
        showMessage(document.getElementById("credit-plan-message"), "");
    });
    if (planForm) planForm.addEventListener("submit", submitCreditPlanForm);
    const billFilter = document.getElementById("credit-bill-filter");
    if (billFilter) billFilter.addEventListener("change", renderCreditPlans);
    if (purchaseMode) purchaseMode.addEventListener("change", updateCreditPlanPurchaseMode);
    if (tenorInput) tenorInput.addEventListener("input", () => {
        paidCountInput.max = tenorInput.value || "600";
        if (Number(paidCountInput.value) > Number(tenorInput.value)) paidCountInput.value = tenorInput.value;
    });
    if (purchaseDate && !purchaseDate.value) purchaseDate.value = creditLocalDate();
    if (firstDueDate && !firstDueDate.value) {
        const todayDate = new Date();
        const desiredDay = todayDate.getDate();
        const nextMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 1);
        nextMonth.setDate(Math.min(desiredDay, new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate()));
        firstDueDate.value = creditLocalDate(nextMonth);
    }
    updateCreditPlanPurchaseMode();
}


const categoryFormToggle = document.getElementById("show-category-form");
const categoryFormClose = document.getElementById("category-form-close");
const categoryFormCancel = document.getElementById("category-form-cancel");

function setCategoryFormVisible(visible) {
    categoryForm.hidden = !visible;
    categoryFormToggle.hidden = visible;
    if (visible) {
        customCategoryName.focus();
    } else {
        categoryForm.reset();
        showMessage(categoryMessage, "");
    }
}

categoryFormToggle.addEventListener("click", () => setCategoryFormVisible(true));
categoryFormClose.addEventListener("click", () => setCategoryFormVisible(false));
categoryFormCancel.addEventListener("click", () => setCategoryFormVisible(false));

categoryForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser) {
        showMessage(categoryMessage, "Silakan masuk kembali.", true);
        return;
    }

    const name = customCategoryName.value.trim();
    const type = customCategoryType.value;
    const submitButton = categoryForm.querySelector('button[type="submit"]');

    if (!name) {
        showMessage(categoryMessage, "Isi nama kategori terlebih dahulu.", true);
        customCategoryName.focus();
        return;
    }

    if (currentCategories.some((category) =>
        category.type === type && category.name.toLocaleLowerCase() === name.toLocaleLowerCase()
    )) {
        showMessage(categoryMessage, "Kategori dengan nama itu sudah ada untuk jenis transaksi ini.", true);
        return;
    }

    submitButton.disabled = true;
    showMessage(categoryMessage, "Menambahkan kategori...");

    try {
        const { error } = await supabase
            .from("categories")
            .insert({
                user_id: currentUser.id,
                name,
                type
            });

        if (error) throw error;

        await loadCategories();
        customCategoryName.value = "";
        showMessage(categoryMessage, `Kategori "${name}" berhasil ditambahkan.`);
        setCategoryFormVisible(false);
    } catch (error) {
        console.error("Gagal menambahkan kategori:", error);
        showMessage(categoryMessage, "Kategori gagal ditambahkan. Coba lagi.", true);
    } finally {
        submitButton.disabled = false;
    }
});

document.getElementById("target-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!currentUser) return;
    const nameInput = document.getElementById("target-name");
    const amountInput = document.getElementById("target-amount");
    const name = nameInput.value.trim();
    const targetAmount = amountInput.value.trim() === "" ? null : Number(amountInput.value);
    if (!name || (targetAmount !== null && (!Number.isFinite(targetAmount) || targetAmount <= 0))) {
        showMessage(document.getElementById("target-message"), "Periksa nama dan nominal target.", true);
        return;
    }
    try {
        let result = await supabase.from("savings_targets").insert({
            user_id: currentUser.id, name, target_amount: targetAmount, icon: selectedNewTargetIcon
        });
        if (result.error && isMissingTargetIconColumn(result.error)) {
            result = await supabase.from("savings_targets").insert({
                user_id: currentUser.id, name, target_amount: targetAmount
            });
        }
        if (result.error) throw result.error;
        selectedNewTargetIcon = "🐷";
        const creationPicker = document.getElementById("target-create-icon-picker");
        const iconPreview = document.getElementById("target-create-icon-preview");
        const createForm = document.getElementById("target-form");
        const createToggle = document.getElementById("show-target-form");
        if (iconPreview) iconPreview.textContent = selectedNewTargetIcon;
        if (creationPicker) renderTargetIconPicker(creationPicker, selectedNewTargetIcon, (emoji) => {
            selectedNewTargetIcon = emoji;
            if (iconPreview) iconPreview.textContent = emoji;
        });
        document.querySelector(".target-icon-picker-collapsible")?.removeAttribute("open");
        createForm.reset();
        createForm.hidden = true;
        if (createToggle) createToggle.textContent = "+ Target baru";
        await loadSavingsTargets();
        showMessage(document.getElementById("target-message"), `Target "${name}" berhasil dibuat.`);
    } catch (error) {
        console.error("Gagal membuat target:", error);
        showMessage(document.getElementById("target-message"), "Target gagal dibuat. Pastikan migrasi database sudah dijalankan.", true);
    }
});

const walletAddToggle = document.getElementById("wallet-add-toggle");
const walletAddClose = document.getElementById("wallet-add-close");
const walletAddCancel = document.getElementById("wallet-add-cancel");
const walletAddIconPicker = document.getElementById("wallet-add-icon-picker");
const walletAddColorPicker = document.getElementById("wallet-add-color-picker");
const walletIconValue = document.getElementById("wallet-icon-value");
const walletColorValue = document.getElementById("wallet-color-value");

function setWalletFormVisible(visible) {
    walletForm.hidden = !visible;
    walletAddToggle.hidden = visible;
    if (visible) walletNameInput.focus();
    else walletAddToggle.focus();
}
function renderWalletAddChoices() {
    walletAddIconPicker.replaceChildren();
    Object.entries(WALLET_ICONS).forEach(([key, definition]) => {
        const button = document.createElement("button");
        button.type = "button"; button.className = "wallet-icon-choice";
        button.classList.toggle("selected", walletIconValue.value === key);
        button.setAttribute("aria-pressed", String(walletIconValue.value === key));
        button.setAttribute("aria-label", definition.label); button.title = definition.label;
        button.append(createWalletIcon(key, walletColorValue.value, "wallet-choice-icon"));
        const label = document.createElement("small"); label.textContent = definition.label; button.append(label);
        button.addEventListener("click", () => { walletIconValue.value = key; renderWalletAddChoices(); });
        walletAddIconPicker.append(button);
    });
    walletAddColorPicker.replaceChildren();
    WALLET_COLORS.forEach((color) => {
        const button = document.createElement("button");
        button.type = "button"; button.className = "wallet-color-choice";
        button.style.setProperty("--swatch-color", color.value);
        button.classList.toggle("selected", walletColorValue.value === color.value);
        button.setAttribute("aria-label", color.label); button.title = color.label;
        button.setAttribute("aria-pressed", String(walletColorValue.value === color.value));
        button.addEventListener("click", () => { walletColorValue.value = color.value; renderWalletAddChoices(); });
        walletAddColorPicker.append(button);
    });
}
renderWalletAddChoices();
walletAddToggle.addEventListener("click", () => setWalletFormVisible(true));
walletAddClose.addEventListener("click", () => setWalletFormVisible(false));
walletAddCancel.addEventListener("click", () => setWalletFormVisible(false));

walletForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!currentUser) { showMessage(walletMessage, "Silakan masuk kembali.", true); return; }
    const name = walletNameInput.value.trim();
    const submitButton = walletForm.querySelector('button[type="submit"]');
    if (!name) { showMessage(walletMessage, "Isi nama dompet terlebih dahulu.", true); walletNameInput.focus(); return; }
    if (currentWallets.some((wallet) => wallet.name.toLocaleLowerCase("id-ID") === name.toLocaleLowerCase("id-ID"))) {
        showMessage(walletMessage, "Nama dompet itu sudah ada.", true); return;
    }
    submitButton.disabled = true;
    showMessage(walletMessage, "Menyimpan dompet...");
    try {
        const { error } = await supabase.from("wallets").insert({
            user_id: currentUser.id, name, balance: 0,
            icon: walletIconValue.value, color: walletColorValue.value
        });
        if (error) throw error;
        await loadWallets();
        walletNameInput.value = ""; walletIconValue.value = "bank"; walletColorValue.value = "#DDF5E7";
        renderWalletAddChoices(); setWalletFormVisible(false);
        showMessage(walletMessage, `Dompet "${name}" berhasil ditambahkan.`);
    } catch (error) {
        console.error("Gagal menambahkan dompet:", error);
        showMessage(walletMessage, "Dompet gagal ditambahkan. Pastikan migrasi ikon dan warna sudah dijalankan, lalu coba lagi.", true);
    } finally { submitButton.disabled = false; }
});

initializeApp();
