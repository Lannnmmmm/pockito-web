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
    let raw = String(value || "").replace(/[^0-9.,]/g, "");
    if (!raw || !/\d/.test(raw)) return 0;
    // Indonesian receipts commonly use 12.500 or 12,500 for twelve thousand five hundred.
    // When both separators occur, the last one is treated as decimal punctuation and stripped too,
    // since this app records whole rupiah amounts.
    raw = raw.replace(/[.,]/g, "");
    const amount = Number(raw);
    return Number.isSafeInteger(amount) && amount >= 0 ? amount : 0;
}
async function prepareReceiptImage(file) {
    const image = await new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Gambar nota tidak dapat dibuka.")); };
        img.src = url;
    });
    // Upscale small phone photos and improve text contrast before OCR.
    const scale = Math.min(3, Math.max(1.5, 2200 / Math.max(image.naturalWidth, image.naturalHeight)));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Pemrosesan gambar tidak didukung browser.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const frame = context.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = frame.data;
    for (let i = 0; i < pixels.length; i += 4) {
        const gray = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
        // Mild contrast enhancement, without hard thresholding faint thermal-printer text.
        const enhanced = Math.max(0, Math.min(255, (gray - 128) * 1.28 + 128));
        pixels[i] = pixels[i + 1] = pixels[i + 2] = enhanced;
    }
    context.putImageData(frame, 0, 0);
    return canvas;
}
function parseReceiptDate(text) {
    const patterns = [
        /\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/,
        /\b(\d{4})[./-](\d{1,2})[./-](\d{1,2})\b/
    ];
    let match = text.match(patterns[0]);
    let year, month, day;
    if (match) {
        day = Number(match[1]); month = Number(match[2]); year = Number(match[3]);
        if (year < 100) year += year >= 70 ? 1900 : 2000;
    } else {
        match = text.match(patterns[1]);
        if (!match) return "";
        year = Number(match[1]); month = Number(match[2]); day = Number(match[3]);
    }
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return "";
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function extractReceipt(text) {
    const lines = text.split(/\r?\n/)
        .map((line) => line.replace(/[|]/g, " ").replace(/\s+/g, " ").trim())
        .filter(Boolean);
    const date = parseReceiptDate(text);
    const totalStrong = /grand\s*total|total\s*(?:belanja|pembayaran|tagihan|akhir|bayar)|jumlah\s*(?:bayar|tagihan|total)|amount\s*due|net\s*total/i;
    const totalWeak = /^total\b/i;
    const summaryWords = /subtotal|sub\s*total|pajak|ppn|\btax\b|diskon|discount|kembalian|change|tunai|cash|debit|kredit|visa|mastercard|terima kasih|thank you|no\.?\s*telp|telepon|kasir|cashier|member|pelanggan|tanggal|jam\b|invoice|struk|receipt|nomor|no\s*transaksi/i;
    let store = "";
    for (const line of lines.slice(0, 8)) {
        if (line.length >= 2 && !/\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/.test(line) &&
            !/^(?:telp|no\.?\s*telp|tanggal|jam|kasir|invoice|receipt|struk|www\.)\b/i.test(line) &&
            !/^[-=*\s]+$/.test(line) && !/^(?:rp\.?\s*)?\d+[.,]?\d*$/.test(line)) {
            store = line.slice(0, 120);
            break;
        }
    }
    let total = 0;
    // Strong labels are checked first; avoid treating subtotal or item count as the grand total.
    for (const line of lines) {
        if (totalStrong.test(line) && !/subtotal|sub\s*total/i.test(line)) {
            const matches = [...line.matchAll(/(?:rp\.?\s*)?([0-9][0-9.,]*)/gi)];
            if (matches.length) {
                const candidate = parseMoney(matches[matches.length - 1][1]);
                if (candidate > 0) total = candidate;
            }
        }
    }
    if (!total) {
        for (const line of lines) {
            if (totalWeak.test(line) && !/subtotal|sub\s*total|total\s*(?:item|qty|barang)/i.test(line)) {
                const matches = [...line.matchAll(/(?:rp\.?\s*)?([0-9][0-9.,]*)/gi)];
                if (matches.length) {
                    const candidate = parseMoney(matches[matches.length - 1][1]);
                    if (candidate > 0) total = candidate;
                }
            }
        }
    }
    const items = [];
    for (const line of lines) {
        if (line.length < 3 || summaryWords.test(line) || totalStrong.test(line) || totalWeak.test(line) ||
            /\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/.test(line) ||
            /^(?:rp\.?\s*)?[0-9.,]+$/.test(line)) continue;
        // Common receipt formats: ITEM 12.500, ITEM x2 25.000, or ITEM 2 x 12.500 25.000.
        const matches = [...line.matchAll(/(?:rp\.?\s*)?([0-9][0-9.,]*)/gi)];
        if (!matches.length) continue;
        const last = matches[matches.length - 1];
        const price = parseMoney(last[1]);
        if (!price) continue;
        let name = line.slice(0, last.index).trim();
        name = name.replace(/(?:\s+[xX×]?\s*\d+\s*)$/g, "").replace(/[|:;*\-]+$/g, "").trim();
        if (name.length >= 2 && !/^\d+$/.test(name) &&
            !/^(?:rp\.?\s*)?\d+[.,]?\d*$/.test(name)) {
            items.push({ name: name.slice(0, 160), price });
        }
    }
    // Don't silently fabricate a total from item lines; the receipt may include tax/discounts.
    return { store, date, total, items, rawText: text };
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
    scanButton.disabled = true;
    reviewPanel.hidden = true;
    setScanStatus("Menyiapkan OCR...");
    try {
        if (!ocrModulePromise) ocrModulePromise = import("https://esm.sh/@paddleocr/paddleocr-js@0.4.2?bundle");
        const { PaddleOCR } = await ocrModulePromise;
        setScanStatus("Menyiapkan PaddleOCR PP-OCRv5... model OCR mungkin perlu diunduh saat pertama kali.");
        const ocr = await PaddleOCR.create({
            lang: "id",
            ocrVersion: "PP-OCRv5",
            ortOptions: {
                backend: "wasm",
                wasmPaths: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/",
                numThreads: 2,
                simd: true
            }
        });
        const preparedImage = await prepareReceiptImage(file);
        setScanStatus("Membaca teks nota dengan PaddleOCR...");
        let result;
        try {
            const [ocrResult] = await ocr.predict(preparedImage);
            result = {
                data: {
                    text: (ocrResult?.items || [])
                        .filter((item) => item && typeof item.text === "string")
                        .sort((a, b) => {
                            const ay = a.poly?.reduce((sum, p) => sum + p[1], 0) / (a.poly?.length || 1);
                            const by = b.poly?.reduce((sum, p) => sum + p[1], 0) / (b.poly?.length || 1);
                            if (Math.abs(ay - by) > 18) return ay - by;
                            const ax = a.poly?.reduce((sum, p) => sum + p[0], 0) / (a.poly?.length || 1);
                            const bx = b.poly?.reduce((sum, p) => sum + p[0], 0) / (b.poly?.length || 1);
                            return ax - bx;
                        })
                        .map((item) => item.text.trim())
                        .filter(Boolean)
                        .join("\\n")
                }
            };
        } finally {
            if (typeof ocr.dispose === "function") ocr.dispose();
        }
        const receipt = extractReceipt(result.data.text || "");
        showReceiptReview(receipt);
        const itemNote = receipt.items.length ? `${receipt.items.length} baris barang terdeteksi` : "rincian barang belum berhasil dikenali";
        const totalNote = receipt.total ? `total terdeteksi Rp${receipt.total.toLocaleString("id-ID")}` : "total perlu diisi manual";
        setScanStatus(`OCR selesai: ${itemNote}; ${totalNote}. Periksa hasilnya di bawah.`);
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
});
