const db = require('./db');
const crypto = require('crypto');

const WORKER_ID = crypto.randomUUID();
const POLL_INTERVAL = 2000;
let isShuttingDown = false;

function heartbeat() {
  if (isShuttingDown) return;
  db.prepare(`
    INSERT INTO workers (id, status, last_heartbeat) 
    VALUES (?, 'Active', CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET last_heartbeat = CURRENT_TIMESTAMP, status = 'Active'
  `).run(WORKER_ID);
}

function processJob(job) {
  return new Promise((resolve, reject) => {
    console.log(`[Worker ${WORKER_ID}] Processing job ${job.id} from queue ${job.queue_name}...`);
    setTimeout(() => {
      try {
        const payload = JSON.parse(job.payload);
        if (payload.shouldFail) {
          reject(new Error('Simulated failure during execution'));
        } else {
          resolve('Execution successful');
        }
      } catch (e) {
        resolve('Processed, but payload was not JSON');
      }
    }, Math.random() * 1000 + 500); // Simulate variable execution time
  });
}

function calculateNextRetry(policy, retriesAttempted) {
  const base = policy.base_delay_ms || 1000;
  let delay = base;
  if (policy.strategy === 'linear') {
    delay = base * (retriesAttempted + 1);
  } else if (policy.strategy === 'exponential') {
    delay = base * Math.pow(2, retriesAttempted);
  }
  return delay;
}

async function poll() {
  if (isShuttingDown) return;
  heartbeat();
  
  // Find a job (Atomicity: SQLite transaction locking handles this cleanly in single-node DB)
  // We respect is_paused and scheduled_at
  const findJob = db.prepare(`
    SELECT jobs.*, queues.name as queue_name, queues.retry_policy_id 
    FROM jobs 
    JOIN queues ON jobs.queue_id = queues.id
    WHERE jobs.status = 'Queued' 
      AND jobs.scheduled_at <= CURRENT_TIMESTAMP
      AND queues.is_paused = 0
    ORDER BY queues.priority DESC, jobs.created_at ASC 
    LIMIT 1
  `);
  
  const job = findJob.get();
  if (!job) return;

  // Claim it atomically
  const claimStmt = db.prepare("UPDATE jobs SET status = 'Claimed', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'Queued'");
  const info = claimStmt.run(job.id);
  
  if (info.changes > 0) {
    db.prepare("UPDATE jobs SET status = 'Running', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(job.id);
    
    try {
      const result = await processJob(job);
      
      // Handle Cron (recurring)
      if (job.cron_expression) {
        // Simple mock: schedule it again 1 minute from now
        db.prepare("UPDATE jobs SET status = 'Queued', result = ?, scheduled_at = datetime('now', '+1 minute'), updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(result, job.id);
      } else {
        db.prepare("UPDATE jobs SET status = 'Completed', result = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(result, job.id);
      }
      db.prepare("INSERT INTO job_logs (job_id, worker_id, log_message) VALUES (?, ?, ?)").run(job.id, WORKER_ID, `Success: ${result}`);
      
    } catch (error) {
      const policy = db.prepare('SELECT * FROM retry_policies WHERE id = ?').get(job.retry_policy_id) || { strategy: 'fixed', base_delay_ms: 1000, max_retries: 3 };
      
      const newRetries = job.retries_attempted + 1;
      let nextStatus = 'Failed';
      let scheduleSql = "datetime('now')";

      if (newRetries >= policy.max_retries) {
        nextStatus = 'DeadLetter';
      } else {
        nextStatus = 'Queued'; // Requeue for retry
        const delayMs = calculateNextRetry(policy, job.retries_attempted);
        scheduleSql = `datetime('now', '+${delayMs / 1000} seconds')`;
      }
      
      db.prepare(`
        UPDATE jobs SET status = ?, retries_attempted = ?, result = ?, scheduled_at = ${scheduleSql}, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(nextStatus, newRetries, error.message, job.id);
      
      db.prepare("INSERT INTO job_logs (job_id, worker_id, log_message) VALUES (?, ?, ?)").run(job.id, WORKER_ID, `Failed (Attempt ${newRetries}): ${error.message}`);
    }
  }
}

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log(`[Worker ${WORKER_ID}] Graceful shutdown initiated...`);
  isShuttingDown = true;
  db.prepare("UPDATE workers SET status = 'Offline' WHERE id = ?").run(WORKER_ID);
  process.exit(0);
});
process.on('SIGINT', () => process.emit('SIGTERM'));

console.log(`Starting worker ${WORKER_ID}...`);
setInterval(poll, POLL_INTERVAL);
