const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files (dashboard)
app.use(express.static(path.join(__dirname, 'public')));

// Create Queue
app.post('/api/queues', (req, res) => {
  const { name, priority = 0 } = req.body;
  try {
    const stmt = db.prepare('INSERT INTO queues (name, priority) VALUES (?, ?)');
    const info = stmt.run(name, priority);
    res.status(201).json({ id: info.lastInsertRowid, name, priority });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// List Queues
app.get('/api/queues', (req, res) => {
  const queues = db.prepare('SELECT * FROM queues').all();
  res.json(queues);
});

// Create Job
app.post('/api/jobs', (req, res) => {
  const { queue_id, payload, scheduled_at, max_retries = 3 } = req.body;
  try {
    const time = scheduled_at ? new Date(scheduled_at).toISOString() : new Date().toISOString();
    const stmt = db.prepare(
      'INSERT INTO jobs (queue_id, payload, scheduled_at, max_retries) VALUES (?, ?, ?, ?)'
    );
    const info = stmt.run(queue_id, JSON.stringify(payload), time, max_retries);
    res.status(201).json({ id: info.lastInsertRowid, queue_id, status: 'Queued' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// List Jobs
app.get('/api/jobs', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const jobs = db.prepare('SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?').all(limit);
  res.json(jobs);
});

// Get Stats
app.get('/api/stats', (req, res) => {
  const stats = db.prepare(`
    SELECT status, COUNT(*) as count 
    FROM jobs 
    GROUP BY status
  `).all();
  
  const formatted = { Queued: 0, Running: 0, Completed: 0, Failed: 0, DeadLetter: 0 };
  stats.forEach(s => formatted[s.status] = s.count);
  res.json(formatted);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`API Server running on http://localhost:\${PORT}\`);
});
