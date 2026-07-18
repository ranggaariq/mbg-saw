### Product Requirements Document (PRD)

**Nama Produk:** Sistem Pendukung Keputusan (SPK) Kepuasan Konsumen MBG
**Tujuan:** Mengevaluasi tingkat kepuasan konsumen (Murid dan Staff) terhadap program MBG menggunakan metode _Simple Additive Weighting_ (SAW).

**Alur Kerja Utama (Berdasarkan Referensi SAW):**
Aplikasi akan mengadopsi alur kerja SPK SAW: `Input Data Responden` -> `Input Kriteria & Bobot` -> `Matriks Keputusan (SAW)` -> `Normalisasi Matriks` -> `Hasil Prioritas/Kepuasan`.

**Fitur Utama:**
1.  **Dashboard:** Menampilkan sambutan dan ringkasan data.
2.  **Manajemen Data Kriteria:** Mengelola 8 kriteria utama (C1-C8) seperti Kualitas Makanan, Nilai Gizi, Kuantitas, Ketepatan Waktu, Variasi Menu, Higienitas, Kemasan, dan Pelayanan Petugas beserta bobotnya.
3.  **Manajemen Data Responden:** Mengelola daftar 500 responden dengan klasifikasi jenis konsumen (Murid / Staff).
4.  **Pengisian Kuesioner/Evaluasi:** Form untuk menginput nilai responden terhadap setiap sub-kriteria (contoh: Sangat Baik, Baik, Cukup Baik, Tidak Baik). Nilai ini akan dikonversi menjadi angka (misal: 4, 3, 2, 1) untuk perhitungan.
5.  **Modul Perhitungan Nilai SAW:**
    *   Membentuk Matriks Keputusan berdasarkan input responden.
    *   Melakukan Normalisasi Matriks (mencari nilai MAX/MIN).
    *   Menghitung Preferensi (W) dengan mengalikan matriks normalisasi dengan bobot kriteria.
6.  **Laporan Hasil Kepuasan:** Menampilkan hasil akhir berupa tingkat kepuasan (K1: Sangat Puas, K2: Puas, K3: Tidak Puas, K4: Sangat Tidak Puas).
