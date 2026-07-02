# Minimal Distributed Job Scheduler

This is a production-inspired, minimal distributed job scheduling platform designed for simplicity and ease of explanation.

## Features Implemented
- **Central Queue Store**: Uses SQLite as the source of truth for queues and jobs, allowing atomic claims.
- **Worker Polling**: A worker script that continuously polls for jobs, executes them, and handles retries.
- **REST API**: API endpoints to manage jobs, queues, and statistics.
- **Web Dashboard**: A beautiful, premium-looking vanilla HTML/JS/CSS dashboard to monitor the queue health and dispatch jobs.
- **Resilience**: Jobs that fail are retried until `max_retries` is reached, after which they enter the `DeadLetter` state.

## Setup Instructions

1. **Install Dependencies**
   Make sure you have Node.js installed.
   ```bash
   npm install
   ```

2. **Start the API Server**
   ```bash
   node server.js
   ```
   The API and Dashboard will be available at `http://localhost:3000`.

3. **Start a Worker**
   In a separate terminal window, run:
   ```bash
   node worker.js
   ```
   *You can run multiple `node worker.js` processes simultaneously to see distributed concurrent processing!*

## Deliverables Included
- **Source Code**: Minimal Node.js, Express, better-sqlite3 codebase.
- **Dashboard**: Minimal Vanilla HTML/JS UI with modern aesthetics (`public/index.html`).
- **Architecture Diagram**: `docs/architecture.md`
- **ER Diagram**: `docs/er_diagram.md`
- **API Docs**: `docs/api_docs.md`
- **Design Decisions**: `docs/design_decisions.md`

## Why This Architecture?
To keep the code minimal, we used SQLite as the central store. A real production system processing millions of jobs a second might use Redis or Kafka, but using a relational DB is extremely common (e.g. Postgres-based queues) and perfectly demonstrates atomic locking and job state machines without complex setup. 
