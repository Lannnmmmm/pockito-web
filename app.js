
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
        .select("id, name, balance, created_at")
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
    return income - expense - transfersOut + transfersIn;
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
        titleBlock.append(title);
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

        if (progress !== null) {
            const track = document.createElement("div");
            track.className = "target-progress-track";
            const bar = document.createElement("div");
            bar.className = "target-progress-bar";
            bar.style.width = `${progress}%`;
            track.append(bar);
            const percent = document.createElement("small");
            percent.className = "target-progress-label";
            percent.textContent = `${Math.round(progress)}% terkumpul`;
            card.append(track, percent);
        }

        const targetMoves = cachedTargetMovements.filter((item) => item.target_id === target.id);
        const deposited = targetMoves.filter((item) => item.movement_type === "deposit")
            .reduce((sum, item) => sum + Number(item.amount), 0);
        const spent = targetMoves.filter((item) => item.movement_type === "spend")
            .reduce((sum, item) => sum + Number(item.amount), 0);

        const stats = document.createElement("div");
        stats.className = "target-stats-grid";
        const statItems = [
            { label: "Dana dipindah", value: rupiah.format(deposited), className: "target-stat-deposited" },
            { label: "Total target", value: targetAmount === null ? "Belum diatur" : rupiah.format(targetAmount), className: "target-stat-goal" },
            { label: "Dana dipakai", value: rupiah.format(spent), className: "target-stat-spent" },
            { label: "Dana saat ini", value: rupiah.format(saved), className: "target-stat-current" }
        ];
        statItems.forEach((item) => {
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
            deposit.className = "secondary-action";
            deposit.textContent = "+ Tambah dana";
            deposit.addEventListener("click", () => moveTargetFunds(target, "deposit"));
            const returnFunds = document.createElement("button");
            returnFunds.type = "button";
            returnFunds.className = "secondary-action";
            returnFunds.textContent = "Kembalikan";
            returnFunds.disabled = saved <= 0;
            returnFunds.addEventListener("click", () => moveTargetFunds(target, "return"));
            const spend = document.createElement("button");
            spend.type = "button";
            spend.className = "secondary-action";
            spend.textContent = "Catat pemakaian";
            spend.disabled = saved <= 0;
            spend.addEventListener("click", () => moveTargetFunds(target, "spend"));
            const complete = document.createElement("button");
            complete.type = "button";
            complete.className = "secondary-action";
            complete.textContent = "Tandai selesai";
            complete.addEventListener("click", () => completeSavingsTarget(target));
            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "secondary-action target-delete-action";
            deleteButton.textContent = "Hapus target";
            deleteButton.addEventListener("click", () => deleteSavingsTarget(target));
            actions.append(deposit, returnFunds, spend, complete, deleteButton);
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
            const reopen = document.createElement("button");
            reopen.type = "button";
            reopen.className = "secondary-action";
            reopen.textContent = "↶ Batalkan selesai";
            reopen.addEventListener("click", () => reopenSavingsTarget(target));
            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "secondary-action target-delete-action";
            deleteButton.textContent = "Hapus target";
            deleteButton.addEventListener("click", () => deleteSavingsTarget(target));
            actions.append(reopen, deleteButton);
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

function walletIcon(name) {
    const normalized = name.toLocaleLowerCase("id-ID");
    if (normalized.includes("tunai") || normalized.includes("cash")) return "💵";
    if (normalized.includes("tabungan") || normalized.includes("nabung")) return "🐷";
    if (normalized.includes("seabank") || normalized.includes("sea bank")) return "🌊";
    if (normalized.includes("bri") || normalized.includes("bca") ||
        normalized.includes("bni") || normalized.includes("bsi") ||
        normalized.includes("mandiri") || normalized.includes("bank")) return "🏦";
    if (normalized.includes("ewallet") || normalized.includes("e-wallet") ||
        normalized.includes("gopay") || normalized.includes("ovo") ||
        normalized.includes("dana") || normalized.includes("shopeepay")) return "📱";
    return "👛";
}

async function renameWallet(wallet) {
    const proposedName = window.prompt("Masukkan nama baru untuk dompet ini:", wallet.name);
    if (proposedName === null) return;
    const name = proposedName.trim();
    if (!name) {
        showMessage(walletMessage, "Nama dompet tidak boleh kosong.", true);
        return;
    }
    if (currentWallets.some((item) => item.id !== wallet.id &&
        item.name.toLocaleLowerCase("id-ID") === name.toLocaleLowerCase("id-ID"))) {
        showMessage(walletMessage, "Nama dompet itu sudah ada.", true);
        return;
    }

    try {
        const { error } = await supabase.from("wallets")
            .update({ name })
            .eq("id", wallet.id)
            .eq("user_id", currentUser.id);
        if (error) throw error;
        await loadWallets();
        renderHomeTransactions(cachedTransactions);
        renderHistoryTransactions();
        renderHomeWalletBalances();
        showMessage(walletMessage, `Nama dompet berhasil diubah menjadi "${name}".`);
    } catch (error) {
        console.error("Gagal mengubah nama dompet:", error);
        showMessage(walletMessage, "Nama dompet gagal diubah. Coba lagi.", true);
    }
}

async function deleteWallet(wallet) {
    const linkedCount = cachedTransactions.filter((transaction) => transaction.wallet_id === wallet.id).length;
    const explanation = linkedCount > 0
        ? `Dompet "${wallet.name}" memiliki ${linkedCount} transaksi. Transaksi akan tetap tersimpan di riwayat, tetapi tidak lagi terhubung ke dompet ini. Hapus dompet?`
        : `Hapus dompet "${wallet.name}"?`;
    if (!window.confirm(explanation)) return;

    try {
        if (linkedCount > 0) {
            const { error: detachError } = await supabase.from("transactions")
                .update({ wallet_id: null })
                .eq("wallet_id", wallet.id)
                .eq("user_id", currentUser.id);
            if (detachError) throw detachError;
        }

        const { error } = await supabase.from("wallets")
            .delete()
            .eq("id", wallet.id)
            .eq("user_id", currentUser.id);
        if (error) throw error;

        await loadWallets();
        await loadTransactions();
        showMessage(walletMessage, `Dompet "${wallet.name}" berhasil dihapus. Riwayat transaksi tetap tersimpan.`);
    } catch (error) {
        console.error("Gagal menghapus dompet:", error);
        showMessage(walletMessage, "Dompet gagal dihapus. Riwayat transaksi tetap dipertahankan; coba lagi.", true);
        try {
            await loadWallets();
            await loadTransactions();
        } catch (refreshError) {
            console.error("Gagal memuat ulang setelah penghapusan dompet:", refreshError);
        }
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

        const icon = document.createElement("span");
        icon.className = "wallet-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = walletIcon(wallet.name);

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

        const actions = document.createElement("div");
        actions.className = "wallet-actions";

        const renameButton = document.createElement("button");
        renameButton.type = "button";
        renameButton.className = "wallet-action-button";
        renameButton.textContent = "✏️";
        renameButton.title = `Ubah nama ${wallet.name}`;
        renameButton.setAttribute("aria-label", `Ubah nama ${wallet.name}`);
        renameButton.addEventListener("click", () => renameWallet(wallet));

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "wallet-action-button wallet-delete-button";
        deleteButton.textContent = "🗑️";
        deleteButton.title = `Hapus ${wallet.name}`;
        deleteButton.setAttribute("aria-label", `Hapus ${wallet.name}`);
        deleteButton.addEventListener("click", () => deleteWallet(wallet));

        actions.append(renameButton, deleteButton);
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

    for (const type of ["expense", "income"]) {
        const group = document.createElement("section");
        group.className = "category-group";

        const heading = document.createElement("h3");
        heading.textContent = type === "expense" ? "Pengeluaran" : "Pemasukan";
        group.append(heading);

        const categories = currentCategories.filter((category) => category.type === type);
        if (categories.length === 0) {
            const empty = document.createElement("p");
            empty.className = "empty-note";
            empty.textContent = "Belum ada kategori.";
            group.append(empty);
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
            group.append(item);
        }

        categoryList.append(group);
    }
}

function showView(viewName) {
    for (const view of views) {
        view.hidden = view.dataset.view !== viewName;
    }

    for (const button of viewButtons) {
        const isActive = button.dataset.viewTarget === viewName;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-current", isActive ? "page" : "false");
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

function createTransactionItem(transaction) {
    const item = document.createElement("div");
    item.className = "transaction-item";

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
    walletLabel.textContent = wallet ? `Dompet: ${wallet.name}` : "Tanpa dompet";

    const value = document.createElement("div");
    value.className = `transaction-amount ${transaction.type === "income" ? "income" : "expense"}`;
    const sign = transaction.type === "income" ? "+" : "−";
    value.textContent = `${sign}${rupiah.format(Number(transaction.amount))}`;

    info.append(description, categoryLabel, date, walletLabel);
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
        const icon = document.createElement("span");
        icon.className = "wallet-icon home-wallet-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = walletIcon(wallet.name);
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

function renderHomeTransactions(transactions) {
    homeTransactionList.replaceChildren();
    const latest = transactions.slice(0, 5);

    if (latest.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-note";
        empty.textContent = "Belum ada transaksi. Yuk, catat transaksi pertamamu!";
        homeTransactionList.append(empty);
        return;
    }

    for (const transaction of latest) {
        homeTransactionList.append(createTransactionItem(transaction));
    }
}

function renderHistoryTransactions() {
    transactionList.replaceChildren();
    document.getElementById("history-month-label").textContent = monthLabel(historyMonth);

    const selectedMonth = monthKey(historyMonth);
    const monthTransactions = cachedTransactions.filter((transaction) =>
        transaction.transaction_date?.startsWith(selectedMonth)
    );

    let income = 0;
    let expense = 0;
    for (const transaction of monthTransactions) {
        if (transaction.type === "income") income += Number(transaction.amount);
        else expense += Number(transaction.amount);
        transactionList.append(createTransactionItem(transaction));
    }

    document.getElementById("history-income").textContent = rupiah.format(income);
    document.getElementById("history-expense").textContent = rupiah.format(expense);
    document.getElementById("history-transaction-count").textContent =
        `${monthTransactions.length} transaksi`;

    const nextMonth = new Date(historyMonth.getFullYear(), historyMonth.getMonth() + 1, 1);
    document.getElementById("history-next-month").disabled =
        monthKey(nextMonth) > monthKey(new Date());

    if (monthTransactions.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-note";
        empty.textContent = `Belum ada transaksi pada ${monthLabel(historyMonth)}.`;
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
    const transactions = cachedTransactions.filter((transaction) =>
        transaction.transaction_date?.startsWith(selectedMonth)
    );
    let income = 0;
    let expense = 0;
    for (const transaction of transactions) {
        if (transaction.type === "income") income += Number(transaction.amount);
        else if (transaction.type === "expense") expense += Number(transaction.amount);
    }
    const remaining = income - expense;
    const spentPercent = income > 0 ? expense / income * 100 : null;
    document.getElementById("report-month-label").textContent = monthLabel(reportMonth);
    document.getElementById("report-income").textContent = rupiah.format(income);
    document.getElementById("report-expense").textContent = rupiah.format(expense);
    document.getElementById("report-remaining").textContent = rupiah.format(remaining);
    document.getElementById("report-spent-percent").textContent =
        spentPercent === null ? "—" : `${Math.round(spentPercent)}%`;
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
    let monthlyTransactionCount = 0;

    for (const transaction of cachedTransactions) {
        const amount = Number(transaction.amount);
        const isCurrentMonth = transaction.transaction_date?.startsWith(currentMonth);

        if (transaction.type === "income") {
            lifetimeIncome += amount;
            if (isCurrentMonth) monthlyIncome += amount;
        } else {
            lifetimeExpense += amount;
            if (isCurrentMonth) monthlyExpense += amount;
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

    renderHomeTransactions(cachedTransactions);
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

for (const button of viewButtons) {
    button.addEventListener("click", () => showView(button.dataset.viewTarget));
}

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

walletForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser) {
        showMessage(walletMessage, "Silakan masuk kembali.", true);
        return;
    }

    const name = walletNameInput.value.trim();
    const submitButton = walletForm.querySelector('button[type="submit"]');

    if (!name) {
        showMessage(walletMessage, "Isi nama dompet terlebih dahulu.", true);
        walletNameInput.focus();
        return;
    }

    if (currentWallets.some((wallet) => wallet.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
        showMessage(walletMessage, "Nama dompet itu sudah ada.", true);
        return;
    }

    submitButton.disabled = true;
    showMessage(walletMessage, "Menyimpan dompet...");

    try {
        const { error } = await supabase
            .from("wallets")
            .insert({
                user_id: currentUser.id,
                name,
                balance: 0
            });

        if (error) throw error;

        await loadWallets();
        walletNameInput.value = "";
        showMessage(walletMessage, `Dompet "${name}" berhasil ditambahkan.`);
    } catch (error) {
        console.error("Gagal menambahkan dompet:", error);
        showMessage(walletMessage, "Dompet gagal ditambahkan. Coba lagi.", true);
    } finally {
        submitButton.disabled = false;
    }
});

initializeApp();
