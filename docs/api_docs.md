# API Documentation

Base URL: `http://localhost:3000/api`

## Queues

### `GET /queues`
List all queues along with their parent project names.
**Response**: `[{ "id": 1, "project_id": 1, "retry_policy_id": 1, "name": "default", "priority": 1, "concurrency_limit": 5, "is_paused": 0 }]`

### `POST /queues`
Create a new queue.
**Payload**: `{ "name": "email_queue", "priority": 1, "concurrency_limit": 10 }`
**Response**: `{ "id": 2, "name": "email_queue" }`

### `PUT /queues/:id/toggle`
Pause or resume a queue. Paused queues will not have their jobs processed by workers.
**Response**: `{ "id": 1, "is_paused": 1 }`

## Jobs

### `POST /jobs`
Enqueue a new job. Supports immediate, delayed, recurring (cron), and batch jobs.
**Payload (Single)**: 
```json
{
  "queue_id": 1,
  "payload": {"email": "user@example.com"},
  "scheduled_at": "2026-07-02T16:00:00Z", 
  "cron_expression": "0 * * * *" 
}
```
**Payload (Batch)**:
```json
{
  "queue_id": 1,
  "payload": [{"email": "1@example.com"}, {"email": "2@example.com"}]
}
```
*Note: `scheduled_at` can be omitted for immediate execution. `cron_expression` makes the job reschedule itself after completion.*

### `GET /jobs`
List jobs with pagination and filtering.
**Query Params**: `?limit=50&offset=0&status=Queued`
**Response**: `[{ "id": 1, "status": "Queued", "queue_name": "default", "payload": "...", "max_retries": 3 }]`

### `GET /jobs/:id/logs`
Retrieve execution logs for a specific job.
**Response**: `[{ "id": 1, "job_id": 5, "worker_id": "uuid", "log_message": "Failed: timeout", "created_at": "..." }]`

### `PUT /jobs/:id/retry`
Manually requeue a failed or dead-letter job for execution.
**Response**: `{ "message": "Job queued for manual retry" }`

### `PUT /jobs/:id/cancel-cron`
Cancel the recurring schedule of a cron job, making it execute only one final time.
**Response**: `{ "message": "Recurring schedule cancelled" }`

## Workers

### `GET /workers`
List active workers and their last heartbeat timestamp. Dead workers are automatically pruned.

## System

### `GET /stats`
Get overall system health grouped by job status.
**Response**: `{ "Queued": 5, "Running": 1, "Completed": 100, "Failed": 2, "DeadLetter": 0 }`
