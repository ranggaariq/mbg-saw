-- ============================================
-- SPK MBG SAW - Database Schema & Seed Data
-- ============================================

-- DROP existing tables to allow fresh schema & re-seeding without UNIQUE constraint errors
DROP TABLE IF EXISTS saw_results;
DROP TABLE IF EXISTS evaluations;
DROP TABLE IF EXISTS respondents;
DROP TABLE IF EXISTS criteria;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS school_scopes;

-- DDL: Table Definitions
CREATE TABLE IF NOT EXISTS criteria (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  weight REAL NOT NULL,
  type TEXT NOT NULL DEFAULT 'Benefit',
  question TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS school_scopes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS respondents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  school TEXT,
  consumer_type TEXT NOT NULL CHECK(consumer_type IN ('Murid', 'Staff'))
);

CREATE TABLE IF NOT EXISTS evaluations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  respondent_id TEXT NOT NULL UNIQUE,
  c1_score INTEGER NOT NULL CHECK(c1_score BETWEEN 1 AND 4),
  c2_score INTEGER NOT NULL CHECK(c2_score BETWEEN 1 AND 4),
  c3_score INTEGER NOT NULL CHECK(c3_score BETWEEN 1 AND 4),
  c4_score INTEGER NOT NULL CHECK(c4_score BETWEEN 1 AND 4),
  c5_score INTEGER NOT NULL CHECK(c5_score BETWEEN 1 AND 4),
  c6_score INTEGER NOT NULL CHECK(c6_score BETWEEN 1 AND 4),
  c7_score INTEGER NOT NULL CHECK(c7_score BETWEEN 1 AND 4),
  c8_score INTEGER NOT NULL CHECK(c8_score BETWEEN 1 AND 4),
  FOREIGN KEY (respondent_id) REFERENCES respondents(id)
);

CREATE TABLE IF NOT EXISTS saw_results (
  respondent_id TEXT PRIMARY KEY,
  final_score REAL NOT NULL,
  satisfaction_level TEXT NOT NULL CHECK(satisfaction_level IN ('K1', 'K2', 'K3', 'K4')),
  FOREIGN KEY (respondent_id) REFERENCES respondents(id)
);

-- DML: Criteria Seed Data (Total Bobot = 1.0)
INSERT INTO criteria (id, name, weight, type, question) VALUES ('C1', 'Kualitas Makanan', 0.20, 'Benefit', 'Bagaimana penilaian Anda terhadap kualitas rasa makanan yang disajikan dalam program MBG?');
INSERT INTO criteria (id, name, weight, type, question) VALUES ('C2', 'Nilai Gizi Makanan', 0.15, 'Benefit', 'Menurut Anda, seberapa baik kandungan gizi (nutrisi) dari makanan yang diberikan?');
INSERT INTO criteria (id, name, weight, type, question) VALUES ('C3', 'Kuantitas / Porsi', 0.15, 'Benefit', 'Bagaimana penilaian Anda terhadap porsi/jumlah makanan yang diterima, apakah sudah cukup mengenyangkan?');
INSERT INTO criteria (id, name, weight, type, question) VALUES ('C4', 'Ketepatan Waktu', 0.10, 'Benefit', 'Seberapa tepat waktu penyajian atau pembagian makanan MBG dilaksanakan?');
INSERT INTO criteria (id, name, weight, type, question) VALUES ('C5', 'Variasi Menu', 0.10, 'Benefit', 'Bagaimana penilaian Anda terhadap variasi menu makanan yang disajikan (tidak monoton)?');
INSERT INTO criteria (id, name, weight, type, question) VALUES ('C6', 'Higienitas & Keamanan Pangan', 0.15, 'Benefit', 'Bagaimana penilaian Anda terhadap kebersihan dan keamanan pangan (higienitas) makanan yang disajikan?');
INSERT INTO criteria (id, name, weight, type, question) VALUES ('C7', 'Kemasan', 0.05, 'Benefit', 'Bagaimana penilaian Anda terhadap kemasan makanan yang digunakan (kebersihan, kepraktisan, dan daya tahan)?');
INSERT INTO criteria (id, name, weight, type, question) VALUES ('C8', 'Pelayanan Petugas', 0.10, 'Benefit', 'Bagaimana penilaian Anda terhadap pelayanan petugas yang membagikan makanan?');

-- DML: Settings Seed Data
INSERT INTO settings (key, value) VALUES ('evaluasi_menu_enabled', '0');

-- DML: Lingkup Sekolah Seed Data
INSERT INTO school_scopes (name) VALUES ('SMKN 1 CIOMAS'), ('SMAN 1 CIOMAS'), ('SMP IBG'), ('SDN 08'), ('SDN 05'), ('SDN 02');

-- DML: Respondents Seed Data (80 Murid + 20 Staff = 100 Total)
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A1', 'Anisa Aditya', 'anisa.aditya75@yahoo.com', 'SMAN 4 Bogor', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A2', 'Dewi Lestari', 'dewi.lestari91@yahoo.com', 'SMP Informatika Bina Generasi', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A3', 'Rina Mulyani', 'rina.mulyani33@outlook.co.id', 'SMAN 4 Bogor', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A4', 'Sri Wulandari', 'sri.wulandari41@gmail.co.id', 'SMK 1 Ciomas', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A5', 'Hendra Wijaya', 'hendra.wijaya75@outlook.co.id', 'SMAN 4 Bogor', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A6', 'Ayu Saputro', 'ayu.saputro27@gmail.co.id', 'SMAN 4 Bogor', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A7', 'Lestari Rahma', 'lestari.rahma54@yahoo.com', 'SMA Negeri 4 Kota Bogor', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A8', 'Muhammad Kusuma', 'muhammad.kusuma70@gmail.com', 'SMA Negeri 4 Kota Bogor', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A9', 'Hendra Mulyani', 'hendra.mulyani41@gmail.com', 'SMAN 4 Bogor', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A10', 'Fitri Puspitasari', 'fitri.puspitasari63@gmail.co.id', 'SMK 1 Ciomas', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A11', 'Indah Wijaya', 'indah.wijaya35@outlook.co.id', 'SMAN 4 Bogor', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A12', 'Sri Mulyani', 'sri.mulyani33@outlook.co.id', 'SMAN 4 Bogor', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A13', 'Lestari Puspitasari', 'lestari.puspitasari23@gmail.co.id', 'SMAN 4 Bogor', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A14', 'Andi Kusumawati', 'andi.kusumawati24@gmail.com', 'SMAN 4 Bogor', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A15', 'Ratna Santoso', 'ratna.santoso97@gmail.com', 'SMP IBG', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A16', 'Dwi Rahma', 'dwi.rahma76@outlook.co.id', 'SMP IBG', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A17', 'Bambang Maulana', 'bambang.maulana53@gmail.com', 'SMP Informatika Bina Generasi', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A18', 'Joko Prabowo', 'joko.prabowo81@gmail.com', 'SMAN 4 Bogor', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A19', 'Rina Astuti', 'rina.astuti16@gmail.co.id', 'SMA Negeri 4 Kota Bogor', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A20', 'Putri Wijaya', 'putri.wijaya33@yahoo.com', 'SMA Negeri 4 Kota Bogor', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A21', 'Dimas Handayani', 'dimas.handayani66@outlook.co.id', 'SMAN 4 Bogor', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A22', 'Fitri Sari', 'fitri.sari72@gmail.com', 'SMK 1 Ciomas', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A23', 'Bambang Lestari', 'bambang.lestari78@outlook.co.id', 'SMK 1 Ciomas', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A24', 'Lestari Astuti', 'lestari.astuti26@outlook.co.id', 'SMA Negeri 4 Kota Bogor', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A25', 'Joko Maulana', 'joko.maulana54@yahoo.com', 'SMAN 4 Bogor', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A26', 'Fajar Prabowo', 'fajar.prabowo37@gmail.co.id', 'SMP IBG', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A27', 'Reza Wahyuni', 'reza.wahyuni48@gmail.co.id', 'SMAN 4 Bogor', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A28', 'Yuni Nurhaliza', 'yuni.nurhaliza27@yahoo.com', 'SMP IBG', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A29', 'Fajar Lestari', 'fajar.lestari14@yahoo.com', 'SMA Negeri 4 Kota Bogor', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A30', 'Wahyu Sari', 'wahyu.sari66@outlook.co.id', 'SMP Informatika Bina Generasi', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A31', 'Rizky Kusuma', 'rizky.kusuma30@gmail.co.id', 'SMK 1 Ciomas', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A32', 'Rahma Wulandari', 'rahma.wulandari28@outlook.co.id', 'SMP IBG', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A33', 'Lestari Kusuma', 'lestari.kusuma57@gmail.co.id', 'SMK 1 Ciomas', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A34', 'Rina Saputra', 'rina.saputra54@outlook.co.id', 'SMK 1 Ciomas', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A35', 'Arif Setiawan', 'arif.setiawan17@gmail.com', 'SMP IBG', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A36', 'Nur Setiawan', 'nur.setiawan11@gmail.com', 'SMK 1 Ciomas', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A37', 'Indah Saputro', 'indah.saputro17@outlook.co.id', 'SMAN 4 Bogor', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A38', 'Putri Maulana', 'putri.maulana97@yahoo.com', 'SMK 1 Ciomas', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A39', 'Sari Saputro', 'sari.saputro64@outlook.co.id', 'SMK 1 Ciomas', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A40', 'Tri Saputra', 'tri.saputra77@outlook.co.id', 'SMK 1 Ciomas', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A41', 'Ahmad Setiawan', 'ahmad.setiawan11@gmail.co.id', 'SMP Informatika Bina Generasi', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A42', 'Fajar Pertiwi', 'fajar.pertiwi80@gmail.com', 'SMP IBG', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A43', 'Ayu Aditya', 'ayu.aditya90@outlook.co.id', 'SMAN 4 Bogor', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A44', 'Rudi Anggraini', 'rudi.anggraini35@yahoo.com', 'SMP IBG', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A45', 'Reza Saputra', 'reza.saputra43@yahoo.com', 'SMA Negeri 4 Kota Bogor', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A46', 'Dimas Lestari', 'dimas.lestari95@outlook.co.id', 'SMP Informatika Bina Generasi', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A47', 'Budi Pratama', 'budi.pratama83@yahoo.com', 'SMAN 4 Bogor', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A48', 'Anisa Nugroho', 'anisa.nugroho21@yahoo.com', 'SMAN 4 Bogor', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A49', 'Tri Astuti', 'tri.astuti58@yahoo.com', 'SMA Negeri 4 Kota Bogor', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A50', 'Ratna Wahyuni', 'ratna.wahyuni90@gmail.com', 'SMA Negeri 4 Kota Bogor', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A51', 'Agus Anggraini', 'agus.anggraini30@yahoo.com', 'SMA Negeri 4 Kota Bogor', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A52', 'Tri Lestari', 'tri.lestari89@gmail.com', 'SMA Negeri 4 Kota Bogor', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A53', 'Dewi Wulandari', 'dewi.wulandari26@gmail.com', 'SMAN 4 Bogor', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A54', 'Andi Saputro', 'andi.saputro59@yahoo.com', 'SMP IBG', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A55', 'Putri Utami', 'putri.utami38@gmail.co.id', 'SMP IBG', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A56', 'Sri Astuti', 'sri.astuti84@outlook.co.id', 'SMA Negeri 4 Kota Bogor', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A57', 'Anisa Rahma', 'anisa.rahma31@yahoo.com', 'SMP IBG', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A58', 'Agus Santoso', 'agus.santoso12@yahoo.com', 'SMP Informatika Bina Generasi', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A59', 'Hendra Utami', 'hendra.utami19@outlook.co.id', 'SMK 1 Ciomas', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A60', 'Anisa Santoso', 'anisa.santoso84@gmail.co.id', 'SMP Informatika Bina Generasi', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A61', 'Agus Firmansyah', 'agus.firmansyah60@yahoo.com', 'SMAN 4 Bogor', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A62', 'Yuni Kurniawan', 'yuni.kurniawan68@gmail.co.id', 'SMK 1 Ciomas', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A63', 'Fitri Nurhaliza', 'fitri.nurhaliza57@outlook.co.id', 'SMK 1 Ciomas', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A64', 'Dwi Wulandari', 'dwi.wulandari45@gmail.com', 'SMP Informatika Bina Generasi', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A65', 'Putri Hidayat', 'putri.hidayat97@yahoo.com', 'SMAN 4 Bogor', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A66', 'Siti Fauzi', 'siti.fauzi75@outlook.co.id', 'SMAN 4 Bogor', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A67', 'Indah Anggraini', 'indah.anggraini37@outlook.co.id', 'SMP IBG', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A68', 'Rudi Nugroho', 'rudi.nugroho47@gmail.co.id', 'SMP IBG', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A69', 'Arif Maulana', 'arif.maulana46@yahoo.com', 'SMA Negeri 4 Kota Bogor', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A70', 'Rahma Lestari', 'rahma.lestari73@gmail.co.id', 'SMAN 4 Bogor', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A71', 'Bambang Sari', 'bambang.sari26@gmail.co.id', 'SMP Informatika Bina Generasi', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A72', 'Iwan Saputro', 'iwan.saputro96@yahoo.com', 'SMP Informatika Bina Generasi', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A73', 'Lestari Setiawan', 'lestari.setiawan54@gmail.com', 'SMP IBG', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A74', 'Yuni Saputro', 'yuni.saputro51@gmail.com', 'SMP IBG', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A75', 'Tri Hidayat', 'tri.hidayat24@gmail.co.id', 'SMAN 4 Bogor', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A76', 'Muhammad Aditya', 'muhammad.aditya18@gmail.com', 'SMP IBG', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A77', 'Rahma Santoso', 'rahma.santoso30@gmail.com', 'SMK 1 Ciomas', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A78', 'Tri Wahyuni', 'tri.wahyuni36@yahoo.com', 'SMAN 4 Bogor', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A79', 'Endang Handayani', 'endang.handayani48@gmail.co.id', 'SMP Informatika Bina Generasi', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A80', 'Dian Pratama', 'dian.pratama47@yahoo.com', 'SMA Negeri 4 Kota Bogor', 'Murid');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A81', 'Bpk. Muhammad Nugroho', 'muhammad.nugroho49@gmail.co.id', 'SMP Informatika Bina Generasi', 'Staff');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A82', 'Ir. Indah Kusuma', 'indah.kusuma28@gmail.co.id', 'SMAN 4 Bogor', 'Staff');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A83', 'Ir. Muhammad Wijaya', 'muhammad.wijaya24@outlook.co.id', 'SMK 1 Ciomas', 'Staff');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A84', 'S.Pd. Muhammad Firmansyah', 'muhammad.firmansyah97@outlook.co.id', 'SMAN 4 Bogor', 'Staff');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A85', 'Prof. Arif Anggraini', 'arif.anggraini84@yahoo.com', 'SMP IBG', 'Staff');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A86', 'Bpk. Muhammad Anggraini', 'muhammad.anggraini16@gmail.com', 'SMP Informatika Bina Generasi', 'Staff');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A87', 'M.Pd. Indah Firmansyah', 'indah.firmansyah68@gmail.com', 'SMK 1 Ciomas', 'Staff');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A88', 'S.Pd. Tuti Santoso', 'tuti.santoso40@yahoo.com', 'SMP Informatika Bina Generasi', 'Staff');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A89', 'Ibu Siti Maulana', 'siti.maulana15@gmail.com', 'SMAN 4 Bogor', 'Staff');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A90', 'Ir. Eko Hidayat', 'eko.hidayat78@gmail.co.id', 'SMP Informatika Bina Generasi', 'Staff');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A91', 'Ir. Fitri Fauzi', 'fitri.fauzi33@outlook.co.id', 'SMAN 4 Bogor', 'Staff');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A92', 'Ibu Ahmad Susilo', 'ahmad.susilo91@gmail.com', 'SMAN 4 Bogor', 'Staff');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A93', 'Dra. Ilham Nurhaliza', 'ilham.nurhaliza70@gmail.com', 'SMP IBG', 'Staff');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A94', 'S.Pd. Lestari Maulana', 'lestari.maulana45@gmail.com', 'SMP Informatika Bina Generasi', 'Staff');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A95', 'Bpk. Endang Wahyuni', 'endang.wahyuni19@gmail.com', 'SMP Informatika Bina Generasi', 'Staff');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A96', 'Ir. Tri Wijaya', 'tri.wijaya98@gmail.com', 'SMP Informatika Bina Generasi', 'Staff');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A97', 'Ir. Indah Kurniawan', 'indah.kurniawan91@outlook.co.id', 'SMAN 4 Bogor', 'Staff');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A98', 'S.Pd. Siti Susilo', 'siti.susilo65@yahoo.com', 'SMP Informatika Bina Generasi', 'Staff');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A99', 'Ibu Dwi Wulandari', 'dwi.wulandari90@yahoo.com', 'SMA Negeri 4 Kota Bogor', 'Staff');
INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('A100', 'Dra. Rizky Handayani', 'rizky.handayani29@outlook.co.id', 'SMP Informatika Bina Generasi', 'Staff');

-- DML: Evaluations Seed Data (Scores 1-4 for each criterion)
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A1', 4, 1, 3, 4, 1, 4, 3, 1);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A2', 4, 3, 1, 2, 1, 1, 2, 4);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A3', 1, 1, 2, 4, 4, 4, 3, 1);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A4', 4, 4, 3, 2, 3, 1, 4, 4);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A5', 3, 3, 1, 1, 1, 2, 4, 1);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A6', 2, 1, 1, 3, 3, 4, 3, 4);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A7', 1, 2, 3, 1, 1, 2, 2, 1);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A8', 4, 1, 1, 2, 1, 2, 1, 3);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A9', 1, 1, 3, 3, 3, 2, 4, 3);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A10', 1, 4, 2, 2, 1, 1, 3, 3);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A11', 3, 4, 4, 1, 1, 1, 2, 1);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A12', 1, 4, 3, 2, 4, 4, 3, 3);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A13', 1, 3, 1, 2, 3, 1, 4, 2);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A14', 1, 1, 2, 4, 4, 4, 3, 3);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A15', 3, 3, 3, 2, 2, 1, 4, 2);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A16', 3, 3, 3, 1, 4, 4, 4, 1);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A17', 1, 4, 1, 2, 2, 3, 1, 2);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A18', 2, 1, 4, 2, 3, 2, 4, 4);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A19', 4, 2, 3, 2, 4, 1, 1, 4);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A20', 3, 1, 1, 2, 2, 3, 1, 1);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A21', 2, 2, 3, 3, 4, 2, 4, 2);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A22', 3, 3, 2, 2, 3, 1, 4, 2);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A23', 2, 3, 3, 3, 3, 3, 4, 4);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A24', 4, 1, 4, 3, 1, 2, 1, 2);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A25', 2, 1, 1, 1, 1, 3, 3, 3);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A26', 3, 2, 2, 2, 4, 4, 4, 2);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A27', 1, 3, 3, 3, 1, 3, 4, 1);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A28', 3, 4, 4, 2, 4, 2, 1, 1);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A29', 4, 3, 2, 3, 3, 4, 1, 3);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A30', 4, 3, 2, 2, 1, 1, 3, 1);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A31', 3, 2, 4, 1, 1, 2, 2, 1);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A32', 4, 1, 1, 4, 4, 1, 2, 1);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A33', 2, 2, 1, 3, 4, 3, 1, 4);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A34', 1, 1, 3, 2, 2, 3, 3, 4);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A35', 3, 4, 2, 2, 1, 2, 3, 3);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A36', 3, 2, 3, 4, 1, 1, 2, 3);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A37', 1, 2, 4, 1, 1, 1, 1, 2);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A38', 4, 4, 3, 4, 1, 4, 1, 3);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A39', 4, 2, 1, 2, 3, 2, 2, 1);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A40', 4, 3, 1, 2, 2, 3, 1, 1);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A41', 4, 3, 3, 3, 3, 2, 2, 4);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A42', 3, 3, 3, 2, 4, 1, 2, 2);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A43', 1, 4, 1, 1, 4, 2, 4, 3);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A44', 1, 1, 4, 4, 2, 1, 3, 1);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A45', 1, 1, 4, 3, 2, 3, 4, 2);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A46', 2, 3, 4, 3, 2, 2, 2, 2);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A47', 2, 4, 2, 4, 2, 3, 2, 3);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A48', 4, 2, 2, 4, 4, 1, 1, 3);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A49', 3, 3, 3, 3, 1, 4, 4, 4);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A50', 3, 4, 3, 4, 4, 2, 1, 1);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A51', 2, 4, 2, 1, 3, 2, 2, 3);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A52', 4, 3, 1, 1, 2, 3, 1, 1);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A53', 2, 1, 1, 3, 4, 1, 4, 2);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A54', 4, 2, 2, 4, 4, 3, 4, 4);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A55', 3, 3, 3, 2, 1, 1, 1, 3);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A56', 1, 4, 4, 1, 3, 4, 2, 4);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A57', 4, 4, 3, 3, 3, 2, 3, 1);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A58', 4, 4, 2, 4, 3, 3, 4, 1);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A59', 2, 4, 1, 4, 1, 3, 3, 2);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A60', 2, 4, 4, 3, 2, 3, 2, 2);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A61', 4, 1, 4, 2, 1, 1, 3, 4);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A62', 4, 2, 1, 1, 4, 3, 3, 3);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A63', 2, 2, 2, 3, 2, 1, 4, 4);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A64', 4, 2, 4, 2, 2, 3, 3, 3);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A65', 4, 4, 3, 2, 2, 4, 1, 4);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A66', 2, 2, 4, 2, 1, 3, 3, 1);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A67', 2, 1, 2, 3, 2, 4, 1, 2);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A68', 2, 2, 3, 3, 2, 3, 1, 3);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A69', 1, 4, 3, 2, 1, 2, 1, 4);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A70', 4, 1, 1, 3, 4, 1, 4, 3);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A71', 4, 3, 4, 3, 4, 2, 1, 3);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A72', 2, 4, 2, 4, 4, 4, 1, 2);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A73', 3, 2, 3, 2, 2, 1, 1, 2);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A74', 1, 2, 1, 1, 2, 3, 4, 4);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A75', 1, 1, 2, 2, 1, 3, 1, 2);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A76', 3, 4, 2, 2, 2, 2, 1, 2);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A77', 1, 3, 3, 2, 1, 3, 1, 2);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A78', 2, 3, 4, 1, 3, 1, 3, 1);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A79', 2, 1, 1, 2, 1, 2, 4, 4);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A80', 1, 3, 3, 2, 3, 3, 1, 4);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A81', 2, 4, 2, 4, 3, 2, 1, 3);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A82', 3, 4, 4, 4, 4, 4, 4, 4);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A83', 4, 1, 2, 3, 3, 4, 2, 1);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A84', 4, 3, 2, 4, 3, 4, 3, 4);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A85', 1, 1, 3, 2, 3, 2, 4, 4);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A86', 2, 2, 1, 1, 2, 2, 2, 4);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A87', 4, 4, 1, 3, 2, 3, 2, 4);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A88', 1, 2, 4, 3, 3, 4, 3, 1);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A89', 1, 3, 1, 3, 2, 2, 3, 1);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A90', 1, 2, 3, 4, 4, 2, 1, 4);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A91', 2, 2, 2, 2, 3, 1, 2, 4);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A92', 4, 3, 4, 4, 3, 4, 2, 2);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A93', 2, 2, 4, 1, 4, 1, 4, 4);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A94', 4, 3, 2, 3, 4, 2, 2, 2);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A95', 4, 1, 4, 2, 2, 2, 1, 4);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A96', 3, 2, 3, 4, 1, 4, 4, 3);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A97', 3, 4, 2, 2, 3, 4, 4, 1);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A98', 2, 3, 2, 3, 1, 3, 1, 4);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A99', 4, 3, 3, 3, 3, 2, 2, 2);
INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('A100', 3, 4, 1, 4, 3, 1, 2, 2);
