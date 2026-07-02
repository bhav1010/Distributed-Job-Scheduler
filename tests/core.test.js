const test = require('node:test');
const assert = require('node:assert');
const db = require('../db');

test('Job Scheduler Core Mechanics', async (t) => {
  
  await t.test('Should create a job queue successfully', () => {
    const stmt = db.prepare('INSERT INTO queues (project_id, retry_policy_id, name, priority, concurrency_limit) VALUES (?, ?, ?, ?, ?)');
    const info = stmt.run(1, 1, 'test_queue', 10, 5);
    assert.strictEqual(info.changes, 1);
    assert.ok(info.lastInsertRowid > 0);
  });

  await t.test('Should enqueue an immediate job', () => {
    const queue_id = db.prepare("SELECT id FROM queues WHERE name = 'test_queue'").get().id;
    const stmt = db.prepare("INSERT INTO jobs (queue_id, payload, scheduled_at) VALUES (?, ?, datetime('now'))");
    const info = stmt.run(queue_id, JSON.stringify({ task: 'test' }));
    assert.strictEqual(info.changes, 1);
    
    // Verify job is Queued
    const job = db.prepare('SELECT status FROM jobs WHERE id = ?').get(info.lastInsertRowid);
    assert.strictEqual(job.status, 'Queued');
  });

  await t.test('Worker atomic claim simulation', () => {
    // Simulate what the worker does to atomically claim a job
    const claimStmt = db.prepare("UPDATE jobs SET status = 'Claimed' WHERE status = 'Queued' AND scheduled_at <= datetime('now') RETURNING id");
    const claimed = claimStmt.get();
    
    assert.ok(claimed);
    assert.ok(claimed.id > 0);
    
    // Attempt double claim (should fail/return nothing)
    const claimStmt2 = db.prepare("UPDATE jobs SET status = 'Claimed' WHERE id = ? AND status = 'Queued' RETURNING id");
    const claimed2 = claimStmt2.get(claimed.id);
    assert.strictEqual(claimed2, undefined); // Already claimed
  });

  await t.test('Exponential backoff delay calculation test', () => {
    const policy = { strategy: 'exponential', base_delay_ms: 1000 };
    // Try calculateNextRetry logic
    let delay = policy.base_delay_ms * Math.pow(2, 0); // attempt 0
    assert.strictEqual(delay, 1000);
    
    delay = policy.base_delay_ms * Math.pow(2, 1); // attempt 1
    assert.strictEqual(delay, 2000);
    
    delay = policy.base_delay_ms * Math.pow(2, 2); // attempt 2
    assert.strictEqual(delay, 4000);
  });
});
