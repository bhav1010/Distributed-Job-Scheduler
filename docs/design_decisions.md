# Design Decisions

### 1. Database as a Queue (SQLite)
- **Decision**: Used SQLite as the central queue rather than a dedicated message broker (like RabbitMQ or Redis).
- **Trade-off**: While less scalable than Redis for extremely high throughput, it drastically simplifies deployment and architecture for this minimal, easily explainable implementation. It allows atomic `UPDATE ... RETURNING` (or similar lock strategies) to claim jobs reliably.
- **Benefit**: Zero external dependencies. Everything is local and easy to inspect.

### 2. Monolithic Codebase Structure
- **Decision**: Both the API server and the Worker loop are housed in the same repository, sharing the database schema.
- **Trade-off**: Tight coupling of code. However, they can be run as separate processes (e.g., `npm run api` vs `npm run worker`).
- **Benefit**: Makes it much easier to test, run, and explain to others without needing docker-compose or complex setups.

### 3. Polling Worker vs Event-Driven
- **Decision**: The worker polls the database for new jobs every few seconds.
- **Trade-off**: Introduces a small latency (poll interval) and uses slightly more DB resources compared to push-based (Pub/Sub) events.
- **Benefit**: Simplest possible mechanism to implement and reason about. Great for reliability as it naturally handles restarts without losing events.

### 4. Minimal Frontend
- **Decision**: Use a simple HTML/JS frontend interacting directly with the API.
- **Trade-off**: Less "modern" feeling than a full React SPA, but avoids the heavy `node_modules` and build step.
- **Benefit**: Extremely easy to read, modify, and explain. Fits the "minimal as possible" requirement perfectly.
