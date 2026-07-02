# Architecture Diagram

The system follows a classic decoupled client-worker architecture using a relational database as the central queue and state store. This ensures simplicity, atomic claims, and easy monitoring without requiring complex external message brokers (like Kafka or RabbitMQ) for this minimal implementation.

```mermaid
graph TD
    subgraph Frontend
        Dashboard[Web Dashboard]
    end

    subgraph Backend Services
        API[API Server (Express)]
        Worker[Worker Process(es)]
    end

    subgraph Storage
        DB[(Relational DB - SQLite)]
    end

    Dashboard -- "REST / JSON" --> API
    API -- "Read/Write Jobs & Config" --> DB
    Worker -- "Polls & Atomically Claims Jobs" --> DB
    Worker -- "Sends Heartbeats" --> DB
    Worker -- "Updates Job Status/Logs" --> DB

    classDef default fill:#f9f9f9,stroke:#333,stroke-width:2px;
    class DB fill:#e1f5fe,stroke:#01579b;
    class Worker fill:#e8f5e9,stroke:#2e7d32;
    class API fill:#fff3e0,stroke:#ef6c00;
```

### Components
1. **API Server**: Handles REST API requests from the frontend or external clients. Manages CRUD operations for projects, queues, and jobs.
2. **Database (SQLite)**: Acts as both the persistent storage and the job queue. Jobs are stored in tables and workers use transactions/atomic updates to claim jobs.
3. **Worker**: A background process that periodically polls the database for `Queued` jobs, executes them, handles retries, and updates the status to `Completed` or `Failed`.
4. **Web Dashboard**: A simple UI to monitor queue health, view jobs, and manage settings.
