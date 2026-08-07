-- Migration: Normalize evaluations table from wide (c1-c8 columns) to long (criteria_id, value)
-- Run this ONCE on existing databases that have the old evaluations table structure.
-- D1-compatible: uses individual INSERTs per criteria (no compound SELECT).

-- Step 1: Backup old evaluations data
DROP TABLE IF EXISTS evaluations_backup;
CREATE TABLE evaluations_backup AS SELECT * FROM evaluations;

-- Step 2: Create new normalized table
DROP TABLE IF EXISTS evaluations_new;
CREATE TABLE evaluations_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  respondent_id TEXT NOT NULL,
  criteria_id TEXT NOT NULL,
  value INTEGER NOT NULL CHECK(value BETWEEN 1 AND 4),
  UNIQUE(respondent_id, criteria_id),
  FOREIGN KEY (respondent_id) REFERENCES respondents(id),
  FOREIGN KEY (criteria_id) REFERENCES criteria(id)
);

-- Step 3: Migrate data from wide to long format (one INSERT per criteria)
INSERT INTO evaluations_new (respondent_id, criteria_id, value) SELECT respondent_id, 'C1', c1_score FROM evaluations;
INSERT INTO evaluations_new (respondent_id, criteria_id, value) SELECT respondent_id, 'C2', c2_score FROM evaluations;
INSERT INTO evaluations_new (respondent_id, criteria_id, value) SELECT respondent_id, 'C3', c3_score FROM evaluations;
INSERT INTO evaluations_new (respondent_id, criteria_id, value) SELECT respondent_id, 'C4', c4_score FROM evaluations;
INSERT INTO evaluations_new (respondent_id, criteria_id, value) SELECT respondent_id, 'C5', c5_score FROM evaluations;
INSERT INTO evaluations_new (respondent_id, criteria_id, value) SELECT respondent_id, 'C6', c6_score FROM evaluations;
INSERT INTO evaluations_new (respondent_id, criteria_id, value) SELECT respondent_id, 'C7', c7_score FROM evaluations;
INSERT INTO evaluations_new (respondent_id, criteria_id, value) SELECT respondent_id, 'C8', c8_score FROM evaluations;

-- Step 4: Replace old table with new one
DROP TABLE evaluations;
ALTER TABLE evaluations_new RENAME TO evaluations;

-- Verification: should show 800 rows (100 respondents x 8 criteria)
-- SELECT COUNT(*) FROM evaluations;
