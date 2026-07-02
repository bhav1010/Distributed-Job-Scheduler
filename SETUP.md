# Setup & Run Instructions

This document provides a step-by-step guide to running the Distributed Job Scheduler locally, testing its features, and viewing the dashboard.

## 1. Prerequisites
Ensure you have the following installed on your machine:
- **Docker** and **Docker Compose** (for running the full system easily)
- **Node.js (v18+)** and **npm** (only required if you want to run the automated test suite locally)

---

## 2. Running the System (Using Docker)

The easiest way to run the entire system (API server, Worker processes, and Database) is using Docker Compose.

1. Open your terminal and navigate to the root directory of this project.
2. Run the following command to build and start the containers:
   ```bash
   docker-compose up --build
   ```
3. You will see logs from both `api-1` and `worker-1` starting up. The database will automatically initialize with seed data (Default Project, Queue, and Retry Policies).

*Note: If you ever need to completely reset the database state, you can tear down the volumes by running: `docker-compose down -v`*

---

## 3. Viewing the Dashboard

Once the Docker containers are running, you can access the frontend Web Dashboard to interact with the system.

1. Open your web browser.
2. Navigate to: [http://localhost:3000](http://localhost:3000)
3. **What to try:**
   - Click **"Enqueue Immediate"** to see a job instantly claimed and executed by the worker.
   - Click **"Enqueue Batch"** to add multiple jobs at once and watch the worker process them concurrently.
   - Click **"Enqueue Failing"** to watch the retry policy (Exponential Backoff) in action. It will fail, wait, retry, and eventually hit the DeadLetter queue.
   - Click the **"Logs"** button on any job in the Job Explorer to see its execution history.

---

## 4. Scaling the Workers (Demonstrating Concurrency)

To see the true power of a distributed scheduler, you can spin up multiple worker nodes that all safely poll and atomically claim jobs from the same database queue.

While the system is running, open a *new* terminal window and run:
```bash
docker-compose up --scale worker=3
```
You will now see `worker-1`, `worker-2`, and `worker-3` all seamlessly executing jobs from the dashboard without any duplicate executions!

---

## 5. Running the Automated Tests

If you have Node.js installed locally, you can run the automated test suite to verify the core mechanics (atomic claiming, exponential backoff calculations, etc.).

1. Open a terminal in the root directory.
2. Install the minimal dependencies:
   ```bash
   npm install
   ```
3. Run the test suite:
   ```bash
   npm test
   ```
You should see all core mechanism tests pass successfully.
