# SentinelOS-Lite

SentinelOS-Lite is a Linux-focused self-healing security stack that runs as a suite of services on a host or container stack. It combines an agent, rule engine, anomaly detection, REST API, web dashboard, and CLI with Telegram alerting.

## Features

- Self-healing agent with service restart and config restore
- Rule-based security automation with YAML rules
- Simple anomaly detection with explainable scoring
- REST API with SQLite storage and API token auth
- Next.js dashboard with charts and tables
- CLI for operations
- Docker and docker-compose deployment

## Repository Structure

```
agent/      Python self-healing agent
backend/    Node.js + TypeScript API and rule engine
ui/         Next.js dashboard
ml/         Python anomaly service
cli/        Node.js CLI
deploy/     Docker compose and deployment helpers
docs/       Architecture and security docs
data/       SQLite database and runtime data
```

## Local Development

Install dependencies:

```
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" install
```

Run backend and UI:

```
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run dev
```

Start agent and ML manually:

```
python agent/app.py
python ml/app.py
```

Open:

- Backend: http://localhost:4000/health
- UI: http://localhost:3000

## Docker Compose

```
docker compose -f deploy/docker-compose.yml up --build
```

## Environment Variables

- `API_TOKEN`: backend auth token
- `DATABASE_URL`: sqlite file path, defaults to `data/sentinel.db`
- `AGENT_URL`: backend -> agent URL
- `ML_URL`: backend -> ML URL
- `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`: Telegram alerting
- `NEXT_PUBLIC_API_BASE`: UI API base URL
- `NEXT_PUBLIC_API_TOKEN`: UI API token

## API Overview

- `GET /health`
- `GET /status`
- `GET /events` (filters: type, severity, since, until)
- `POST /events`
- `GET /rules`, `POST /rules/reload`, `POST /rules/simulate`, `GET /rules/raw`
- `GET /anomalies`, `POST /anomalies`
- `GET /actions`
- `POST /actions/lockdown`, `POST /actions/heal`, `POST /actions/scan`
- `GET /metrics`, `POST /metrics`
- `GET /services`

## CLI Usage

```
sentctl status
sentctl scan --full
sentctl heal backend
sentctl lockdown --strict
```

Set `SENTINEL_URL` and `SENTINEL_TOKEN`, or create `~/.sentinelos/config.json`.

## Render Deployment

## Credits

- Ram Sunil Gawas
