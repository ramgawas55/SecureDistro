# Rules

Rules live under `backend/rules/*.yaml`. Each rule can match event attributes and optionally enforce a threshold over a time window.

## Example

```yaml
- id: repeated_login_failures
  description: Repeated login failure spike
  enabled: true
  severity: critical
  match:
    eventType: auth_failure
  threshold:
    eventType: auth_failure
    count: 5
    windowSec: 60
  actions:
    - type: agent
      name: lockdown
      payload:
        strict: true
    - type: telegram
      name: lockdown
```

## Rule Fields

- `match.eventType`: filters events by type
- `match.severity`: filters by severity
- `match.processName`: matches on event detail `processName`
- `match.ipAddress`: matches on event detail `ipAddress`
- `threshold`: counts events in a sliding time window
- `actions`: agent calls, log actions, or telegram alerts
