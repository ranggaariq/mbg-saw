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
  respondent_id TEXT NOT NULL,
  criteria_id TEXT NOT NULL,
  value INTEGER NOT NULL CHECK(value BETWEEN 1 AND 4),
  UNIQUE(respondent_id, criteria_id),
  FOREIGN KEY (respondent_id) REFERENCES respondents(id),
  FOREIGN KEY (criteria_id) REFERENCES criteria(id)
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
