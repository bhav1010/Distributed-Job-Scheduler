# Entity Relationship Diagram

```mermaid
erDiagram
    Users {
        string id PK
        string username
        string password_hash
    }
    
    Projects {
        string id PK
        string name
        string user_id FK
    }
    
    Queues {
        string id PK
        string name
        string project_id FK
        int priority
        int max_retries
        boolean is_paused
    }
    
    Jobs {
        string id PK
        string queue_id FK
        string status "Queued, Running, Completed, Failed, DeadLetter"
        string payload
        string result
        int retries_attempted
        datetime scheduled_at
        datetime created_at
    }

    Workers {
        string id PK
        string status "Active, Offline"
        datetime last_heartbeat
    }

    JobLogs {
        string id PK
        string job_id FK
        string worker_id FK
        string log_message
        datetime created_at
    }

    Users ||--o{ Projects : owns
    Projects ||--o{ Queues : contains
    Queues ||--o{ Jobs : holds
    Jobs ||--o{ JobLogs : generates
    Workers ||--o{ JobLogs : writes
```

### Table Details
- **Users**: Minimal authentication table.
- **Projects & Queues**: Used for logical separation of jobs.
- **Jobs**: The core table. `status` tracks the lifecycle. `scheduled_at` handles delayed/scheduled jobs.
- **Workers**: Tracks active worker processes via heartbeats to detect zombie workers.
- **JobLogs**: Stores execution history and errors for debugging.
