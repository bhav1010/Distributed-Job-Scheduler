# Distributed Job Scheduler (v2.0)

A production-inspired, containerized distributed job scheduling platform designed for high reliability, atomic concurrent execution, and resilient retry policies. Built with Node.js, Express, SQLite, and Docker.

## Features

- **Multi-Tenant Architecture**: Supports Organizations, Projects, and Queues with dedicated schemas and cascading deletes.
- **Robust Job Lifecycle**: Full state machine moving jobs through `Queued` → `Claimed` → `Running` → `Completed`, with fallback paths to `Failed` and `DeadLetter`.
- **Concurrency Limits**: Workers respect queue-specific concurrency limits, executing parallel jobs safely using atomic SQLite transactions.
- **Dynamic Retry Strategies**: Configure fixed, linear, or exponential backoff retry policies dynamically per queue.
- **Advanced Scheduling**: Supports immediate, delayed (future timestamps), batch (bulk enqueuing), and recurring (cron) jobs.
- **Web Dashboard**: Modern HTML/CSS dashboard for live monitoring, managing queues, viewing logs, and manually retrying failed jobs.

## Documentation

The full documentation suite satisfying the intern assignment evaluation criteria is available in the `docs/` folder:
- [API Documentation](./docs/api_docs.md)
- [Architecture Overview](./docs/architecture.md)
- [Database ER Diagram](./docs/er_diagram.md)
- [Design Decisions & Trade-offs](./docs/design_decisions.md)

## Quick Start

### Prerequisites
- Docker and Docker Compose

### Running the System
To build and start the API server, database, and a single worker node, run:
```bash
docker-compose up --build
```
*Note: If you have old database state that conflicts with new schemas, use `docker-compose down -v` to reset.*

### Access the Dashboard
Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

### Scaling Workers
You can effortlessly scale the processing power by launching more concurrent worker nodes:
```bash
docker-compose up --scale worker=3
```

## Running Tests
An automated test suite validates the core mechanics (atomic claims, backoff calculation, enqueuing). To run the tests locally (requires Node.js 18+):
```bash
npm install
npm test
```
