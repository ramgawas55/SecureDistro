# Security Scope

SentinelOS-Lite is a lightweight, host-focused security stack for detection and response automation.

## What It Does

- Monitors basic CPU/memory thresholds and service availability.
- Detects config drift on critical files using hashes.
- Detects anomalies in metrics with a simple statistical baseline.
- Automates responses with a rule engine and action hooks.
- Alerts via Telegram for high-severity issues.

## What It Does Not Do

- Replace endpoint detection and response (EDR).
- Prevent kernel-level rootkits or sophisticated persistence.
- Provide full SIEM-scale correlation across many hosts.
- Act as a hardened Linux distribution.

## Operational Notes

- Use API tokens in production.
- Restrict network access to backend and agent ports.
- Keep backup directory protected and access-controlled.
