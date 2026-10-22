
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
let currentWallet = null;
let currentCategories = [];

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

async function getOrCreateWallet() {
    const { data: wallets, error } = await supabase
        .from("wallets")
        .select("id, name")
        .eq("user_id", currentUser.id)
        .limit(1);

    if (error) throw error;

    if (wallets.length > 0) {
        currentWallet = wallets[0];
        return;
    }

    const { data: wallet, error: createError } = await supabase
        .from("wallets")
        .insert({
            user_id: currentUser.id,
            name: "Dompet Utama",
            balance: 0
        })
        .select("id, name")
        .single();

    if (createError) throw createError;

    currentWallet = wallet;
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

    const value = document.createElement("div");
    value.className = `transaction-amount ${transaction.type === "income" ? "income" : "expense"}`;
    const sign = transaction.type === "income" ? "+" : "−";
    value.textContent = `${sign}${rupiah.format(Number(transaction.amount))}`;

    info.append(description, categoryLabel, date);
    item.append(info, value);
    return item;
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

async function loadTransactions() {
    const { data: transactions, error } = await supabase
        .from("transactions")
        .select("id, type, amount, description, transaction_date, transaction_time, category_id")
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
}

async function openUserSession(user) {
    currentUser = user;
    currentWallet = null;

    try {
        await getOrCreateWallet();
        await loadCategories();
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

    if (!currentUser || !currentWallet) {
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
                wallet_id: currentWallet.id,
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
    currentWallet = null;
    currentCategories = [];
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

initializeApp();
