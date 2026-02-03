# Render Deployment

This repo includes `render.yaml` for one-click deployment.

## Steps

1. Create a new Render Blueprint and point it at this repository.
2. Set the required environment variables for each service.
3. Provision a persistent disk for the backend at `/data`.
4. Deploy the blueprint.

## Required Environment Variables

- Backend: `API_TOKEN`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `AGENT_URL`, `ML_URL`
- UI: `NEXT_PUBLIC_API_BASE`, `NEXT_PUBLIC_API_TOKEN`
- Agent: `BACKEND_URL`, `ML_URL`, `API_TOKEN`
- ML: `BACKEND_URL`, `API_TOKEN`, `ANOMALY_SIGMA`
