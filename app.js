
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
} from "./config.js";

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

const loginSection = document.getElementById("login-section");
const dashboardSection = document.getElementById("dashboard-section");
const loginForm = document.getElementById("login-form");
const transactionForm = document.getElementById("transaction-form");
const loginMessage = document.getElementById("login-message");
const transactionMessage = document.getElementById("transaction-message");
const transactionList = document.getElementById("transaction-list");
const transactionType = document.getElementById("transaction-type");
const transactionCategory = document.getElementById("transaction-category");
const categoryForm = document.getElementById("category-form");
const customCategoryName = document.getElementById("custom-category-name");
const customCategoryType = document.getElementById("custom-category-type");
const categoryMessage = document.getElementById("category-message");
const categoryList = document.getElementById("category-list");
const viewButtons = document.querySelectorAll("[data-view-target]");
const views = document.querySelectorAll("[data-view]");

const rupiah = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
});

let currentUser = null;
let currentWallet = null;
let currentCategories = [];

function todayLocal() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

document.getElementById("transaction-date").value = todayLocal();

function showMessage(element, message, isError = false) {
    element.textContent = message;
    element.style.color = isError ? "#c0392b" : "#4e8b68";
}

function showLogin() {
    loginSection.hidden = false;
    dashboardSection.hidden = true;
}

function showDashboard() {
    loginSection.hidden = true;
    dashboardSection.hidden = false;
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

async function loadTransactions() {
    transactionList.replaceChildren();

    const { data: transactions, error } = await supabase
        .from("transactions")
        .select("id, type, amount, description, transaction_date, category_id")
        .eq("user_id", currentUser.id)
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false });

    if (error) throw error;

    let totalIncome = 0;
    let totalExpense = 0;

    for (const transaction of transactions) {
        const amount = Number(transaction.amount);

        if (transaction.type === "income") {
            totalIncome += amount;
        } else {
            totalExpense += amount;
        }

        const item = document.createElement("div");
        item.className = "transaction-item";

        const info = document.createElement("div");
        info.className = "transaction-info";

        const description = document.createElement("strong");
        description.textContent =
            transaction.description?.trim() || (
                transaction.type === "income"
                    ? "Pemasukan"
                    : "Pengeluaran"
            );

        const category = currentCategories.find((item) => item.id === transaction.category_id);
        const categoryLabel = document.createElement("small");
        categoryLabel.textContent = category ? category.name : "Tanpa kategori";

        const date = document.createElement("small");
        date.textContent = transaction.transaction_date;

        const value = document.createElement("div");
        value.className = `transaction-amount ${
            transaction.type === "income" ? "income" : "expense"
        }`;

        const sign = transaction.type === "income" ? "+" : "−";
        value.textContent = `${sign}${rupiah.format(amount)}`;

        info.append(description, categoryLabel, date);
        item.append(info, value);
        transactionList.append(item);
    }

    document.getElementById("total-income").textContent =
        rupiah.format(totalIncome);

    document.getElementById("total-expense").textContent =
        rupiah.format(totalExpense);

    document.getElementById("total-balance").textContent =
        rupiah.format(totalIncome - totalExpense);

    if (transactions.length === 0) {
        const empty = document.createElement("p");
        empty.textContent = "Belum ada transaksi. Yuk, catat transaksi pertamamu!";
        empty.style.color = "#858b81";
        transactionList.append(empty);
    }
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
    const submitButton = transactionForm.querySelector(
        'button[type="submit"]'
    );

    if (!Number.isFinite(amount) || amount <= 0 || !transactionDate || !categoryId) {
        showMessage(transactionMessage, "Periksa nominal, kategori, dan tanggal transaksi.", true);
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
                transaction_date: transactionDate
            });

        if (error) throw error;

        transactionForm.reset();
        renderCategoryOptions();
        document.getElementById("transaction-date").value = todayLocal();
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
    showLogin();
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
