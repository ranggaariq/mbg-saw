const fs = require('fs');
const path = require('path');

const firstNames = ['Ahmad', 'Siti', 'Budi', 'Dewi', 'Rizky', 'Anisa', 'Dimas', 'Putri', 'Muhammad', 'Nur', 'Andi', 'Rina', 'Agus', 'Sri', 'Wahyu', 'Endang', 'Iwan', 'Yuni', 'Joko', 'Lestari', 'Eko', 'Wati', 'Hendra', 'Rahma', 'Bambang', 'Tuti', 'Rudi', 'Ratna', 'Dwi', 'Indah', 'Tri', 'Sari', 'Arif', 'Fitri', 'Fajar', 'Ayu', 'Ilham', 'Dian', 'Reza', 'Maya'];
const lastNames = ['Fauzi', 'Nurhaliza', 'Santoso', 'Lestari', 'Pratama', 'Rahma', 'Aditya', 'Wulandari', 'Wijaya', 'Mulyani', 'Susilo', 'Sari', 'Hidayat', 'Kusuma', 'Saputra', 'Handayani', 'Setiawan', 'Astuti', 'Nugroho', 'Wahyuni', 'Prabowo', 'Utami', 'Kurniawan', 'Pertiwi', 'Saputro', 'Anggraini', 'Firmansyah', 'Puspitasari', 'Maulana', 'Kusumawati'];
const titles = ['Ir.', 'Dra.', 'Dr.', 'Prof.', 'Bpk.', 'Ibu', 'S.Pd.', 'M.Pd.'];

const schools = [
  'SMK 1 Ciomas',
  'SMP Informatika Bina Generasi',
  'SMA Negeri 4 Kota Bogor',
  'SMAN 4 Bogor',
  'SMP IBG'
];

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateName(isStaff) {
  const first = firstNames[getRandomInt(0, firstNames.length - 1)];
  const last = lastNames[getRandomInt(0, lastNames.length - 1)];
  const name = `${first} ${last}`;
  if (isStaff) {
    const title = titles[getRandomInt(0, titles.length - 1)];
    return `${title} ${name}`;
  }
  return name;
}

function generateEmail(name, id) {
  const clean = name.replace(/[^a-zA-Z ]/g, '').toLowerCase().trim().split(' ').slice(0, 2).join('.');
  return `${clean}.${id.toLowerCase()}@mbg-eval.id`;
}

let sql = `-- ============================================
-- SPK MBG SAW - Database Schema & Seed Data
-- ============================================

-- DROP existing tables to allow fresh schema & re-seeding without UNIQUE constraint errors
DROP TABLE IF EXISTS saw_results;
DROP TABLE IF EXISTS evaluations;
DROP TABLE IF EXISTS respondents;
DROP TABLE IF EXISTS criteria;

-- DDL: Table Definitions
CREATE TABLE IF NOT EXISTS criteria (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  weight REAL NOT NULL,
  type TEXT NOT NULL DEFAULT 'Benefit'
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
INSERT INTO criteria (id, name, weight, type) VALUES ('C1', 'Kualitas Makanan', 0.20, 'Benefit');
INSERT INTO criteria (id, name, weight, type) VALUES ('C2', 'Nilai Gizi Makanan', 0.15, 'Benefit');
INSERT INTO criteria (id, name, weight, type) VALUES ('C3', 'Kuantitas / Porsi', 0.15, 'Benefit');
INSERT INTO criteria (id, name, weight, type) VALUES ('C4', 'Ketepatan Waktu', 0.10, 'Benefit');
INSERT INTO criteria (id, name, weight, type) VALUES ('C5', 'Variasi Menu', 0.10, 'Benefit');
INSERT INTO criteria (id, name, weight, type) VALUES ('C6', 'Higienitas & Keamanan Pangan', 0.15, 'Benefit');
INSERT INTO criteria (id, name, weight, type) VALUES ('C7', 'Kemasan', 0.05, 'Benefit');
INSERT INTO criteria (id, name, weight, type) VALUES ('C8', 'Pelayanan Petugas', 0.10, 'Benefit');

`;

// Generate 500 respondents (400 Murid, 100 Staff)
const respondents = [];
for (let i = 1; i <= 500; i++) {
  const isStaff = i > 400;
  const consumerType = isStaff ? 'Staff' : 'Murid';
  const name = generateName(isStaff);
  const id = `A${i}`;
  const email = generateEmail(name, id);
  const school = schools[getRandomInt(0, schools.length - 1)];
  respondents.push({ id, name, email, school, consumerType });
}

sql += "-- DML: Respondents Seed Data (400 Murid + 100 Staff = 500 Total)\n";
respondents.forEach(r => {
  const escapedName = r.name.replace(/'/g, "''");
  sql += `INSERT INTO respondents (id, name, email, school, consumer_type) VALUES ('${r.id}', '${escapedName}', '${r.email}', '${r.school}', '${r.consumerType}');\n`;
});
sql += "\n";

sql += "-- DML: Evaluations Seed Data (Scores 1-4 for each criterion)\n";
respondents.forEach(r => {
  const scores = Array.from({ length: 8 }, () => getRandomInt(1, 4));
  sql += `INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score) VALUES ('${r.id}', ${scores.join(', ')});\n`;
});

fs.writeFileSync(path.join(__dirname, 'schema.sql'), sql);
console.log('schema.sql generated successfully with 500 respondents (with email & school) and 500 evaluations.');
