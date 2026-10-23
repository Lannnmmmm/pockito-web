// Pockito receipt OCR: image processing stays in the browser.
const fileInput = document.getElementById("receipt-file-input");
const scanButton = document.getElementById("receipt-scan-button");
const scanStatus = document.getElementById("receipt-scan-status");
const reviewPanel = document.getElementById("receipt-review");
const reviewClose = document.getElementById("receipt-review-close");
const reviewCancel = document.getElementById("receipt-review-cancel");
const addItemButton = document.getElementById("receipt-add-item");
const itemsList = document.getElementById("receipt-items-list");
const useResultButton = document.getElementById("receipt-use-result");
let lastSelectedFile = null;
let ocrModulePromise = null;

function localToday() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
function setScanStatus(message, isError = false) {
    scanStatus.textContent = message;
    scanStatus.style.color = isError ? "#c0392b" : "";
}
function parseMoney(value) {
    const digits = String(value || "").replace(/[^0-9]/g, "");
    const amount = Number(digits);
    return Number.isSafeInteger(amount) ? amount : 0;
}
function parseReceiptDate(text) {
    const match = text.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/);
    if (!match) return localToday();
    const day = Number(match[1]);
    const month = Number(match[2]);
    let year = Number(match[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return localToday();
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function extractReceipt(text) {
    const lines = text.split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
    const date = parseReceiptDate(text);
    const totalWords = /grand\s*total|total\s*(?:belanja|pembayaran|tagihan|akhir)?|jumlah\s*(?:bayar|total)|amount\s*due|net\s*total/i;
    const summaryWords = /subtotal|sub\s*total|pajak|ppn|tax|diskon|discount|kembalian|change|tunai|cash|debit|kredit|visa|mastercard|terima kasih|thank you|no\.?\s*telp|telepon|kasir|cashier|member|pelanggan|tanggal|jam\b|invoice|struk|receipt|nomor|no\s*transaksi/i;
    let store = "";
    for (const line of lines.slice(0, 6)) {
        if (line.length >= 2 && !/\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/.test(line) &&
            !/^(?:telp|no\.?\s*telp|tanggal|jam|kasir|invoice|receipt|struk)\b/i.test(line) &&
            !/^[-=*\s]+$/.test(line)) {
            store = line.slice(0, 120);
            break;
        }
    }
    let total = 0;
    for (const line of lines) {
        if (totalWords.test(line) && !/subtotal|sub\s*total/i.test(line)) {
            const matches = [...line.matchAll(/(?:rp\.?\s*)?([0-9][0-9.,]*)/gi)];
            if (matches.length) {
                const candidate = parseMoney(matches[matches.length - 1][1]);
                if (candidate > 0) total = candidate;
            }
        }
    }
    const items = [];
    for (const line of lines) {
        if (line.length < 3 || summaryWords.test(line) || totalWords.test(line) ||
            /\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/.test(line) ||
            /^(?:rp\.?\s*)?[0-9.,]+$/.test(line)) continue;
        const match = line.match(/(?:\s+|\s*[xX]\s*)(?:rp\.?\s*)?([0-9][0-9.,]*)\s*$/i);
        if (!match) continue;
        const name = line.slice(0, match.index).replace(/[|:;*]+$/g, "").trim();
        const price = parseMoney(match[1]);
        if (name.length >= 2 && price > 0 && !/^\d+$/.test(name)) {
            items.push({ name: name.slice(0, 160), price });
        }
    }
    if (!total && items.length) total = items.reduce((sum, item) => sum + item.price, 0);
    return { store, date, total, items };
}
function addReceiptItem(item = { name: "", price: 0 }) {
    const row = document.createElement("div");
    row.className = "receipt-item-row";
    const name = document.createElement("input");
    name.type = "text";
    name.maxLength = 160;
    name.placeholder = "Nama barang";
    name.setAttribute("aria-label", "Nama barang");
    name.value = item.name || "";
    const price = document.createElement("input");
    price.type = "number";
    price.min = "0";
    price.step = "1";
    price.placeholder = "Harga (Rp)";
    price.setAttribute("aria-label", "Harga barang dalam rupiah");
    price.value = item.price > 0 ? String(item.price) : "";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "receipt-item-remove";
    remove.textContent = "×";
    remove.setAttribute("aria-label", "Hapus barang");
    remove.addEventListener("click", () => row.remove());
    row.append(name, price, remove);
    itemsList.append(row);
}
function showReceiptReview(receipt) {
    document.getElementById("receipt-store").value = receipt.store || "";
    document.getElementById("receipt-date").value = receipt.date || localToday();
    document.getElementById("receipt-total").value = receipt.total > 0 ? String(receipt.total) : "";
    itemsList.replaceChildren();
    (receipt.items || []).forEach(addReceiptItem);
    if (!receipt.items?.length) addReceiptItem();
    reviewPanel.hidden = false;
    reviewPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function closeReceiptReview() {
    reviewPanel.hidden = true;
}
scanButton.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
        setScanStatus("Pilih file gambar nota (JPG, PNG, atau WEBP).", true);
        return;
    }
    if (file.size > 12 * 1024 * 1024) {
        setScanStatus("Ukuran foto terlalu besar. Pilih gambar maksimal 12 MB.", true);
        fileInput.value = "";
        return;
    }
    lastSelectedFile = file;
    scanButton.disabled = true;
    reviewPanel.hidden = true;
    setScanStatus("Menyiapkan OCR...");
    try {
        if (!ocrModulePromise) ocrModulePromise = import("https://esm.sh/tesseract.js@5");
        const Tesseract = await ocrModulePromise;
        const result = await Tesseract.recognize(file, "ind+eng", {
            logger: (progress) => {
                if (progress.status === "recognizing text" && Number.isFinite(progress.progress)) {
                    setScanStatus(`Membaca nota... ${Math.round(progress.progress * 100)}%`);
                } else if (progress.status) {
                    setScanStatus(progress.status === "loading language traineddata" ? "Mengunduh data bahasa OCR..." : "Menyiapkan mesin pembaca nota...");
                }
            }
        });
        const receipt = extractReceipt(result.data.text || "");
        showReceiptReview(receipt);
        const itemNote = receipt.items.length ? `${receipt.items.length} baris barang terbaca` : "rincian barang belum terbaca jelas";
        setScanStatus(`Scan selesai: ${itemNote}. Periksa hasilnya di bawah.`);
    } catch (error) {
        console.error("Receipt OCR failed:", error);
        setScanStatus("Scan gagal. Periksa koneksi internet lalu coba foto yang lebih terang dan lurus.", true);
    } finally {
        scanButton.disabled = false;
    }
});
addItemButton.addEventListener("click", () => addReceiptItem());
reviewClose.addEventListener("click", closeReceiptReview);
reviewCancel.addEventListener("click", closeReceiptReview);
useResultButton.addEventListener("click", () => {
    const store = document.getElementById("receipt-store").value.trim();
    const date = document.getElementById("receipt-date").value;
    const total = Number(document.getElementById("receipt-total").value);
    if (!date || !Number.isSafeInteger(total) || total <= 0) {
        setScanStatus("Isi tanggal dan total pembayaran yang valid sebelum melanjutkan.", true);
        return;
    }
    const items = [...itemsList.querySelectorAll(".receipt-item-row")].map((row) => ({
        name: row.querySelector('input[type="text"]').value.trim(),
        price: Number(row.querySelector('input[type="number"]').value) || 0
    })).filter((item) => item.name || item.price > 0);
    document.dispatchEvent(new CustomEvent("pockito:receipt-confirmed", {
        detail: { store, date, total, items }
    }));
    closeReceiptReview();
    setScanStatus("Hasil scan diterapkan ke formulir transaksi. Periksa lagi sebelum menyimpan.");
    fileInput.value = "";
    lastSelectedFile = null;
});
