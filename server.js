const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Simple Auth Middleware Mock
const authMiddleware = (req, res, next) => {
  // In a real app, verify JWT here
  req.user = { id: 1, username: 'admin' };
  next();
};
app.use('/api', authMiddleware);

// --- QUEUES ---
app.post('/api/queues', (req, res) => {
  const { project_id = 1, retry_policy_id = 1, name, priority = 0, concurrency_limit = 10 } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  try {
    const stmt = db.prepare('INSERT INTO queues (project_id, retry_policy_id, name, priority, concurrency_limit) VALUES (?, ?, ?, ?, ?)');
    const info = stmt.run(project_id, retry_policy_id, name, priority, concurrency_limit);
    res.status(201).json({ id: info.lastInsertRowid, name });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/queues/:id/toggle', (req, res) => {
  try {
    const queue = db.prepare('SELECT is_paused FROM queues WHERE id = ?').get(req.params.id);
    if (!queue) return res.status(404).json({ error: 'Queue not found' });
    const newState = queue.is_paused ? 0 : 1;
    db.prepare('UPDATE queues SET is_paused = ? WHERE id = ?').run(newState, req.params.id);
    res.json({ id: req.params.id, is_paused: newState });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/queues', (req, res) => {
  const queues = db.prepare('SELECT q.*, p.name as project_name FROM queues q JOIN projects p ON q.project_id = p.id').all();
  res.json(queues);
});

// --- JOBS ---
app.post('/api/jobs', (req, res) => {
  const { queue_id, payload, scheduled_at, cron_expression } = req.body;
  if (!queue_id || !payload) return res.status(400).json({ error: 'queue_id and payload are required' });
  
  try {
    const timeSql = scheduled_at ? `datetime('${scheduled_at}')` : "datetime('now')";
    
    if (Array.isArray(payload)) {
      const insert = db.prepare(`INSERT INTO jobs (queue_id, payload, scheduled_at, cron_expression) VALUES (?, ?, ${timeSql}, ?)`);
      const insertMany = db.transaction((jobs) => {
        for (const job of jobs) insert.run(queue_id, JSON.stringify(job), cron_expression);
      });
      insertMany(payload);
      return res.status(201).json({ message: `Batch enqueued ${payload.length} jobs` });
    }

    const stmt = db.prepare(`INSERT INTO jobs (queue_id, payload, scheduled_at, cron_expression) VALUES (?, ?, ${timeSql}, ?)`);
    const info = stmt.run(queue_id, JSON.stringify(payload), cron_expression);
    res.status(201).json({ id: info.lastInsertRowid, queue_id, status: 'Queued' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/jobs', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const offset = parseInt(req.query.offset) || 0;
  const status = req.query.status;
  
  let query = `
    SELECT jobs.*, queues.name as queue_name, retry_policies.max_retries 
    FROM jobs 
    JOIN queues ON jobs.queue_id = queues.id
    LEFT JOIN retry_policies ON queues.retry_policy_id = retry_policies.id
  `;
  const params = [];
  
  if (status) {
    query += ' WHERE jobs.status = ?';
    params.push(status);
  }
  
  query += ' ORDER BY jobs.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  
  const jobs = db.prepare(query).all(...params);
  res.json(jobs);
});

app.put('/api/jobs/:id/cancel-cron', (req, res) => {
  try {
    const info = db.prepare('UPDATE jobs SET cron_expression = NULL WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Job not found' });
    res.json({ message: 'Recurring schedule cancelled' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- WORKERS ---
app.get('/api/workers', (req, res) => {
  // Clean up dead workers (no heartbeat for > 15 seconds)
  db.prepare("UPDATE workers SET status = 'Offline' WHERE last_heartbeat < datetime('now', '-15 seconds') AND status = 'Active'").run();
  const workers = db.prepare('SELECT * FROM workers ORDER BY last_heartbeat DESC').all();
  res.json(workers);
});

// --- STATS ---
app.get('/api/stats', (req, res) => {
  const stats = db.prepare(`SELECT status, COUNT(*) as count FROM jobs GROUP BY status`).all();
  const formatted = { Queued: 0, Claimed: 0, Running: 0, Completed: 0, Failed: 0, DeadLetter: 0 };
  stats.forEach(s => formatted[s.status] = s.count);
  res.json(formatted);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API Server running on http://localhost:${PORT}`);
});
