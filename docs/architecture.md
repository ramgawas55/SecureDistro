# Architecture

SentinelOS-Lite runs as a Linux-focused security stack composed of four services and a CLI.

## Components

- Agent (Python) monitors services, hashes critical files, and collects metrics.
- Backend (Node.js + TypeScript) stores events, rules, anomalies, actions in SQLite and evaluates rules.
- ML service (Python) computes baseline anomaly scores and posts anomalies to the backend.
- UI (Next.js) visualizes health, services, anomalies, rules, and action history.
- CLI (Node.js) automates status, scan, heal, and lockdown calls to the backend.

## Data Flow

1. Agent collects CPU/memory and service status, posts metrics and events to backend.
2. ML service ingests metrics, detects anomalies, posts anomalies and events to backend.
3. Backend stores records in SQLite and evaluates YAML rules.
4. Rule actions can call agent endpoints or trigger Telegram notifications.
5. UI and CLI read data from backend REST APIs.

## Security Controls

- API token enforcement at backend ingress.
- Agent only accepts commands from backend when token is configured.
- Telegram alerts for high severity anomalies and failed healing actions.
