/**
 * ============================================================================
 * SCRIPT INTEGRASI GOOGLE FORMS / GOOGLE SHEETS DENGAN SPK MBG SAW
 * ============================================================================
 * 
 * CARA PASANG DI GOOGLE SHEETS (Yang terhubung dengan Google Form):
 * 1. Buka Google Sheets hasil respon Google Form Anda.
 * 2. Klik menu: Extensions (Ekstensi) -> Apps Script.
 * 3. Hapus semua kode default dan tempelkan kode di bawah ini.
 * 4. Ubah variabel `API_URL` dengan domain Cloudflare Workers Anda (atau localhost saat development via ngrok/localtunnel).
 * 5. Klik ikon Simpan (Save).
 * 6. Klik menu Pemicu (Triggers / ikon jam di sidebar kiri) -> Add Trigger:
 *    - Choose which function to run: `onFormSubmit`
 *    - Select event source: `From spreadsheet`
 *    - Select event type: `On form submit`
 * 7. Simpan trigger dan berikan izin akses ke akun Google Anda.
 * ============================================================================
 */

// Ganti URL di bawah ini dengan URL Worker Cloudflare Anda setelah di-deploy
// Contoh: "https://mbg-saw.domain-anda.workers.dev/api/gform-webhook"
const API_URL = "https://mbg-saw.YOUR_SUBDOMAIN.workers.dev/api/gform-webhook";

/**
 * Fungsi ini dijalankan otomatis setiap kali ada submit dari Google Form
 * yang tersimpan ke Google Sheets.
 */
function onFormSubmit(e) {
  try {
    const sheet = e.range.getSheet();
    const row = e.range.getRow();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const rowData = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];

    // Buat objek dari data baris berdasarkan nama header kolom
    const formResponse = {};
    for (let i = 0; i < headers.length; i++) {
      formResponse[headers[i].toString().trim()] = rowData[i];
    }

    /**
     * SESUAIKAN NAMA KOLOM GOOGLE FORM ANDA DI SINI
     * Contoh header kolom di Google Form:
     * - "Nama Lengkap"
     * - "Alamat Email"
     * - "Asal Sekolah"
     * - "Tipe Responden (Murid/Staff)"
     * - "1. Kualitas Makanan (1-4)" dsb...
     */
    const payload = {
      name: formResponse["Nama Lengkap"] || formResponse["Nama"] || "Responden Form",
      email: formResponse["Email Address"] || formResponse["Alamat Email"] || formResponse["Email"] || "",
      school: formResponse["Asal Sekolah"] || formResponse["Sekolah"] || "",
      consumer_type: formResponse["Tipe Responden"] || formResponse["Tipe"] || "Murid",
      
      // Ambil skor 1-4 untuk tiap kriteria C1 - C8
      c1_score: parseInt(formResponse["C1 - Kualitas Makanan"] || formResponse["Kualitas Makanan"] || 3),
      c2_score: parseInt(formResponse["C2 - Nilai Gizi Makanan"] || formResponse["Nilai Gizi"] || 3),
      c3_score: parseInt(formResponse["C3 - Kuantitas / Porsi"] || formResponse["Porsi"] || 3),
      c4_score: parseInt(formResponse["C4 - Ketepatan Waktu"] || formResponse["Ketepatan Waktu"] || 3),
      c5_score: parseInt(formResponse["C5 - Variasi Menu"] || formResponse["Variasi Menu"] || 3),
      c6_score: parseInt(formResponse["C6 - Higienitas & Keamanan Pangan"] || formResponse["Higienitas"] || 3),
      c7_score: parseInt(formResponse["C7 - Kemasan"] || formResponse["Kemasan"] || 3),
      c8_score: parseInt(formResponse["C8 - Pelayanan Petugas"] || formResponse["Pelayanan"] || 3)
    };

    // Kirim HTTP POST request ke server Hono / Cloudflare Workers
    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(API_URL, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    Logger.log(`Status: ${responseCode} | Response: ${responseText}`);

    // Opsional: Tulis status pengiriman ke kolom terakhir di spreadsheet
    sheet.getRange(row, sheet.getLastColumn() + 1).setValue(`Sent (${responseCode})`);
  } catch (err) {
    Logger.log(`Error onFormSubmit: ${err.message}`);
  }
}

/**
 * Fungsi untuk tes manual di Apps Script Editor
 */
function testWebhookManual() {
  const dummyPayload = {
    name: "Budi Santoso (Test Form)",
    email: "budi.test@mbg-eval.id",
    school: "SMAN 1 Jakarta",
    consumer_type: "Murid",
    c1_score: 4,
    c2_score: 4,
    c3_score: 3,
    c4_score: 4,
    c5_score: 4,
    c6_score: 4,
    c7_score: 3,
    c8_score: 4
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(dummyPayload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(API_URL, options);
  Logger.log(response.getContentText());
}
