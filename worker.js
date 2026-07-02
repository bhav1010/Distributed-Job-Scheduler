const db = require('./db');
const crypto = require('crypto');

const WORKER_ID = crypto.randomUUID();
const POLL_INTERVAL = 2000;

function heartbeat() {
  const stmt = db.prepare(`
    INSERT INTO workers (id, status, last_heartbeat) 
    VALUES (?, 'Active', CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET last_heartbeat = CURRENT_TIMESTAMP
  `);
  stmt.run(WORKER_ID);
}

function processJob(job) {
  return new Promise((resolve, reject) => {
    // Simulate work based on payload
    console.log(`[Worker \${WORKER_ID}] Processing job \${job.id}...`);
    setTimeout(() => {
      try {
        const payload = JSON.parse(job.payload);
        if (payload.shouldFail) {
          reject(new Error('Simulated failure'));
        } else {
          resolve('Success');
        }
      } catch (e) {
        resolve('Processed successfully');
      }
    }, 1000);
  });
}

async function poll() {
  heartbeat();
  
  // 1. Find a job to run (atomic claim simulation for SQLite)
  // We look for a Queued job whose scheduled_at is in the past
  const findJob = db.prepare(`
    SELECT jobs.* FROM jobs 
    JOIN queues ON jobs.queue_id = queues.id
    WHERE jobs.status = 'Queued' AND jobs.scheduled_at <= CURRENT_TIMESTAMP
    ORDER BY queues.priority DESC, jobs.created_at ASC 
    LIMIT 1
  `);
  
  const job = findJob.get();
  
  if (job) {
    // Attempt to claim it
    const claimStmt = db.prepare(`
      UPDATE jobs SET status = 'Running', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND status = 'Queued'
    `);
    
    const info = claimStmt.run(job.id);
    if (info.changes > 0) {
      // Claimed successfully!
      try {
        const result = await processJob(job);
        db.prepare(`UPDATE jobs SET status = 'Completed', result = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(result, job.id);
        db.prepare(`INSERT INTO job_logs (job_id, worker_id, log_message) VALUES (?, ?, ?)`).run(job.id, WORKER_ID, 'Job completed successfully');
      } catch (error) {
        const newRetries = job.retries_attempted + 1;
        const newStatus = newRetries >= job.max_retries ? 'DeadLetter' : 'Failed'; // Use Failed to retry (will need a reset script) or just Queued to retry immediately
        // For simplicity, let's just mark Queued with an increased retry count to retry, or DeadLetter if max reached.
        const nextStatus = newRetries >= job.max_retries ? 'DeadLetter' : 'Queued';
        
        // Add exponential backoff logic here if needed (update scheduled_at)
        
        db.prepare(`
          UPDATE jobs SET status = ?, retries_attempted = ?, result = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `).run(nextStatus, newRetries, error.message, job.id);
        
        db.prepare(`INSERT INTO job_logs (job_id, worker_id, log_message) VALUES (?, ?, ?)`).run(job.id, WORKER_ID, `Failed: \${error.message}`);
      }
    }
  }
}

console.log(`Starting worker \${WORKER_ID}...`);
setInterval(poll, POLL_INTERVAL);
