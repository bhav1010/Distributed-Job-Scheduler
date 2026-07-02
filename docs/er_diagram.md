# Database Entity Relationship Diagram

This diagram outlines the relational schema for the Distributed Job Scheduler, completely satisfying the requirements for Organizations, Projects, Queues, Jobs, Retry Policies, and logging.

```mermaid
%%{init: { "theme": "default", "themeVariables": { "fontSize": "36px" } } }%%
erDiagram
    organizations ||--o{ projects : ""
    organizations {
        INTEGER id PK
        TEXT name
    }

    projects ||--o{ queues : ""
    projects {
        INTEGER id PK
        INTEGER org_id FK
        TEXT name
    }

    retry_policies ||--o{ queues : ""
    retry_policies {
        INTEGER id PK
        TEXT name
        TEXT strategy "fixed | linear | exp"
        INTEGER base_delay_ms
        INTEGER max_retries
    }

    queues ||--o{ jobs : ""
    queues {
        INTEGER id PK
        INTEGER project_id FK
        INTEGER retry_policy_id FK
        TEXT name
        INTEGER priority
        INTEGER concurrency_limit
        INTEGER is_paused
    }

    jobs ||--o{ job_logs : ""
    jobs {
        INTEGER id PK
        INTEGER queue_id FK
        TEXT status "Enum: Queued -> DeadLetter"
        TEXT payload
        TEXT result
        TEXT cron_expression
        INTEGER retries_attempted
        DATETIME scheduled_at
        DATETIME created_at
        DATETIME updated_at
    }

    workers ||--o{ job_logs : ""
    workers {
        TEXT id PK
        TEXT status
        DATETIME last_heartbeat
    }

    job_logs {
        INTEGER id PK
        INTEGER job_id FK
        TEXT worker_id FK
        TEXT log_message
        DATETIME created_at
    }
```

## Indexes & Performance Considerations
- `idx_jobs_status_scheduled`: Index on `jobs(status, scheduled_at)` to heavily optimize the worker's polling query, avoiding full table scans.
- `idx_jobs_queue`: Index on `jobs(queue_id)` for faster queue statistics.
- `idx_job_logs_job_id`: Index on `job_logs(job_id)` for quick retrieval of execution logs per job.

## Cascading Behavior
- When an Organization is deleted, its Projects are deleted (`ON DELETE CASCADE`).
- When a Project is deleted, its Queues are deleted (`ON DELETE CASCADE`).
- When a Queue is deleted, its Jobs are deleted (`ON DELETE CASCADE`).
- When a Job is deleted, its execution logs are deleted (`ON DELETE CASCADE`).
