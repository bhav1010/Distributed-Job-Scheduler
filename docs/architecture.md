# Architecture Diagram

The system follows a fully decoupled, multi-container architecture orchestrated by Docker Compose. It utilizes a robust relational database (SQLite in this implementation) as the central queue and state store, ensuring ACID compliance and atomic job claims without requiring heavy message brokers like Kafka.

```mermaid
graph TD
    subgraph Frontend
        Dashboard[Web Dashboard v2.0]
    end

    subgraph Container 1 - API Services
        API[API Server Express.js]
    end

    subgraph Container 2 - Worker Nodes
        Worker1[Worker Process 1]
        Worker2[Worker Process N]
    end

    subgraph Persistent Volume
        DB[(Relational DB SQLite)]
    end

    Dashboard -- "REST / JSON" --> API
    API -- "CRUD Jobs, Queues, Policies" --> DB
    Worker1 -- "Polls & Atomically Claims Jobs" --> DB
    Worker2 -- "Polls & Atomically Claims Jobs" --> DB
    Worker1 -- "Concurrency Limits Check" --> DB
    Worker1 -- "Writes Job Logs & Retries" --> DB

    classDef default fill:#f9f9f9,stroke:#333,stroke-width:2px;
    class DB fill:#e1f5fe,stroke:#01579b;
    class Worker1,Worker2 fill:#e8f5e9,stroke:#2e7d32;
    class API fill:#fff3e0,stroke:#ef6c00;
```

### Components
1. **API Server**: Handles REST API requests, mocking authentication, and managing multi-tenant structures (Organizations -> Projects -> Queues -> Jobs).
2. **Database Volume (SQLite)**: Mounted into both the API and Worker containers. Stores schemas, configurations, and job payloads. Uses transaction-safe updates for claiming.
3. **Worker Pool**: Background processes (scalable via `docker-compose up --scale worker=N`) that periodically poll the database. They check queue concurrency limits, grab up to `N` jobs, execute them concurrently using `Promise.all()`, calculate backoff retries, simulate Cron schedules, and gracefully shut down on `SIGTERM`.
4. **Web Dashboard**: A dynamic HTML/JS frontend offering real-time monitoring of Workers, Job Lifecycles, and direct Queue manipulation (Pause/Resume).
