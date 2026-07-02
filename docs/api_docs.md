# API Documentation

Base URL: `http://localhost:3000/api`

## Queues

### `GET /queues`
List all queues.
**Response**: `[{ "id": 1, "name": "default", "is_paused": 0 }]`

### `POST /queues`
Create a new queue.
**Payload**: `{ "name": "email_queue", "priority": 1 }`
**Response**: `{ "id": 2, "name": "email_queue" }`

## Jobs

### `POST /jobs`
Enqueue a new job.
**Payload**: 
```json
{
  "queue_id": 1,
  "payload": "{\"email\": \"user@example.com\"}",
  "scheduled_at": null
}
```
*Note: `scheduled_at` can be a future timestamp for delayed jobs.*

### `GET /jobs`
List jobs (with basic filtering).
**Query Params**: `?queue_id=1&status=Queued`
**Response**: 
```json
[{
  "id": 1,
  "status": "Queued",
  "payload": "{...}"
}]
```

## Workers

### `GET /workers`
List active workers and their status.

## Dashboard

### `GET /stats`
Get overall system health and counts.
**Response**: `{ "queued": 5, "running": 1, "completed": 100, "failed": 2 }`
