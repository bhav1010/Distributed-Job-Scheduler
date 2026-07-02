const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.resolve(__dirname, 'scheduler.db');

// Ensure parent dir exists (if running outside docker)
if (!fs.existsSync(path.dirname(dbPath))) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

const db = new Database(dbPath);

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS organizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      org_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY(org_id) REFERENCES organizations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS retry_policies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      strategy TEXT DEFAULT 'fixed', -- fixed, linear, exponential
      base_delay_ms INTEGER DEFAULT 1000,
      max_retries INTEGER DEFAULT 3
    );

    CREATE TABLE IF NOT EXISTS queues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      retry_policy_id INTEGER,
      name TEXT NOT NULL,
      priority INTEGER DEFAULT 0,
      concurrency_limit INTEGER DEFAULT 10,
      is_paused INTEGER DEFAULT 0,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(retry_policy_id) REFERENCES retry_policies(id)
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      queue_id INTEGER NOT NULL,
      status TEXT DEFAULT 'Queued', -- Queued, Claimed, Running, Completed, Failed, DeadLetter
      payload TEXT,
      result TEXT,
      cron_expression TEXT, -- For recurring jobs
      retries_attempted INTEGER DEFAULT 0,
      scheduled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(queue_id) REFERENCES queues(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS workers (
      id TEXT PRIMARY KEY,
      status TEXT DEFAULT 'Active',
      last_heartbeat DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS job_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      worker_id TEXT,
      log_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
    );

    -- Insert seed data if empty
    INSERT OR IGNORE INTO organizations (id, name) VALUES (1, 'Default Org');
    INSERT OR IGNORE INTO projects (id, org_id, name) VALUES (1, 1, 'Default Project');
    INSERT OR IGNORE INTO retry_policies (id, name, strategy, base_delay_ms, max_retries) VALUES (1, 'Default Policy', 'exponential', 2000, 3);
  `);
}

initDb();

module.exports = db;
