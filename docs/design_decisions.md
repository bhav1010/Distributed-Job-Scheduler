# Design Decisions & Major Trade-offs

### 1. Relational Database as a Queue (SQLite)
- **Decision**: Used SQLite (a relational DB) as the central queue and state store rather than a dedicated message broker (like RabbitMQ or Redis).
- **Trade-off**: While less horizontally scalable than Redis for millions of messages per second, it drastically simplifies deployment and architecture. It allows rich querying (filtering by status, pagination, joining Retry Policies and Projects) that is traditionally very difficult in pure message brokers.
- **Performance Mitigation**: To ensure the worker polling remains performant as the `jobs` table grows, composite indexes (`idx_jobs_status_scheduled`) were explicitly defined to prevent full table scans.

### 2. Multi-Tenant Schema Design
- **Decision**: Implemented an `Organizations -> Projects -> Queues` hierarchy instead of a flat queue structure.
- **Benefit**: Fully meets production-inspired requirements. By using `ON DELETE CASCADE` foreign keys, managing data lifecycle across tenants is handled securely at the database level.

### 3. Queue-Level Concurrency & Dynamic Retries
- **Decision**: Retries are not hardcoded on the job, but linked to a `retry_policy_id` on the Queue. Workers dynamically check the queue's `concurrency_limit` before pulling batches of jobs.
- **Benefit**: This allows a single queue configuration change to instantly affect how the worker pool handles failures (linear vs exponential) and throughput, without needing to update individual jobs. Workers execute their claimed jobs concurrently using non-blocking `Promise.all()`.

### 4. Polling Worker vs Event-Driven
- **Decision**: The worker polls the database for new jobs every 2 seconds rather than using WebSockets or Pub/Sub triggers.
- **Trade-off**: Introduces a maximum 2-second latency.
- **Benefit**: Simplest possible mechanism to implement and reason about. Great for reliability as it naturally handles restarts, crashes, and network blips without losing events. The worker simply resumes polling the DB.

### 5. Simulated Cron (Recurring) Jobs
- **Decision**: Instead of running a separate cron daemon (like `node-cron`), recurring jobs are handled directly by the worker. When a job with a `cron_expression` succeeds, the worker updates its status back to `Queued` and increments its `scheduled_at` timestamp.
- **Benefit**: Requires zero extra infrastructure. Ensures that a recurring job never overlaps itself (since it only reschedules *after* finishing).

### 6. Graceful Shutdown Implementation
- **Decision**: Captured `SIGTERM` and `SIGINT` signals in the worker process.
- **Benefit**: When scaling down or restarting via Docker, the worker flips a flag (`isShuttingDown = true`), stops pulling new jobs, and updates its status to `Offline`, preventing jobs from being abandoned mid-execution.
