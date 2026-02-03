import express from "express";
import cors from "cors";
import helmet from "helmet";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { createStore } from "./db.js";
import { RuleEngine } from "./rules.js";
import { sendTelegram } from "./telegram.js";
import { ActionRecord, AnomalyRecord, EventRecord, MetricSample } from "./types.js";

const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json({ limit: "1mb" }));

const apiToken = process.env.API_TOKEN || "";

const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!apiToken) {
    next();
    return;
  }
  const header = req.headers.authorization || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const token = bearer || String(req.headers["x-api-token"] || "");
  if (token !== apiToken) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
};

const start = async () => {
  const store = await createStore();
  const ruleEngine = new RuleEngine(`${process.cwd()}/rules`, store);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/status", async (_req, res) => {
    const agentUrl = process.env.AGENT_URL || "http://agent:5001";
    const mlUrl = process.env.ML_URL || "http://ml:5002";
    const status = {
      agent: "unknown",
      ml: "unknown",
      db: "ok"
    };
    try {
      const response = await fetch(`${agentUrl}/agent/health`);
      status.agent = response.ok ? "ok" : "down";
    } catch {
      status.agent = "down";
    }
    try {
      const response = await fetch(`${mlUrl}/health`);
      status.ml = response.ok ? "ok" : "down";
    } catch {
      status.ml = "down";
    }
    res.json(status);
  });

  app.use(authMiddleware);

  app.get("/events", (req, res) => {
    const events = store.listEvents({
      type: req.query.type as string | undefined,
      severity: req.query.severity as string | undefined,
      since: req.query.since as string | undefined,
      until: req.query.until as string | undefined
    });
    res.json({ events });
  });

  app.post("/events", async (req, res) => {
    const payload = req.body as Partial<EventRecord>;
    const event: EventRecord = {
      id: payload.id || randomUUID(),
      type: payload.type || "unknown",
      severity: (payload.severity as any) || "low",
      source: payload.source || "agent",
      summary: payload.summary || "event received",
      details: payload.details || {},
      timestamp: payload.timestamp || new Date().toISOString()
    };
    store.createEvent(event);
    const matched = ruleEngine.evaluate(event);
    for (const rule of matched) {
      for (const action of rule.actions) {
        if (action.type === "telegram") {
          await sendTelegram(`[${rule.severity}] ${rule.description}`);
        }
        if (action.type === "log") {
          const actionRecord: ActionRecord = {
            id: randomUUID(),
            actionType: action.name,
            status: "success",
            target: String(action.payload?.service || ""),
            details: { ruleId: rule.id },
            timestamp: new Date().toISOString()
          };
          store.createAction(actionRecord);
        }
        if (action.type === "agent") {
          const agentUrl = process.env.AGENT_URL || "http://agent:5001";
          try {
            await fetch(`${agentUrl}/agent/${action.name}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(action.payload || {})
            });
            const actionRecord: ActionRecord = {
              id: randomUUID(),
              actionType: action.name,
              status: "success",
              target: String(action.payload?.service || ""),
              details: { ruleId: rule.id },
              timestamp: new Date().toISOString()
            };
            store.createAction(actionRecord);
          } catch (error) {
            const actionRecord: ActionRecord = {
              id: randomUUID(),
              actionType: action.name,
              status: "failed",
              target: String(action.payload?.service || ""),
              details: { ruleId: rule.id, error: String(error) },
              timestamp: new Date().toISOString()
            };
            store.createAction(actionRecord);
            if (rule.severity === "high" || rule.severity === "critical") {
              await sendTelegram(`[${rule.severity}] ${rule.description} failed`);
            }
          }
        }
      }
    }
    res.json({ status: "ok", event });
  });

  app.get("/rules", (_req, res) => {
    res.json({ rules: ruleEngine.list() });
  });

  app.post("/rules/reload", (_req, res) => {
    ruleEngine.reload();
    res.json({ status: "reloaded" });
  });

  app.post("/rules/simulate", (req, res) => {
    const event = req.body?.event || {};
    const matches = ruleEngine.evaluate(event);
    res.json({ matches });
  });

  app.get("/rules/raw", (_req, res) => {
    const rulesPath = `${process.cwd()}/rules`;
    const files = fs
      .readdirSync(rulesPath)
      .filter((file) => file.endsWith(".yaml") || file.endsWith(".yml"))
      .map((file) => fs.readFileSync(`${rulesPath}/${file}`, "utf8"))
      .join("\n");
    res.json({ content: files });
  });

  app.get("/anomalies", (_req, res) => {
    res.json({ anomalies: store.listAnomalies() });
  });

  app.post("/anomalies", async (req, res) => {
    const payload = req.body as Partial<AnomalyRecord>;
    const anomaly: AnomalyRecord = {
      id: payload.id || randomUUID(),
      score: payload.score || 0,
      status: payload.status || "normal",
      metric: payload.metric || "unknown",
      details: payload.details || {},
      timestamp: payload.timestamp || new Date().toISOString()
    };
    store.createAnomaly(anomaly);
    if (anomaly.status === "anomaly" && anomaly.score >= 0.8) {
      await sendTelegram(`[high] Anomaly ${anomaly.metric} score ${anomaly.score}`);
    }
    res.json({ anomaly });
  });

  app.get("/actions", (_req, res) => {
    res.json({ actions: store.listActions() });
  });

  app.get("/services", async (_req, res) => {
    const agentUrl = process.env.AGENT_URL || "http://agent:5001";
    try {
      const response = await fetch(`${agentUrl}/agent/services`);
      const data = await response.json();
      res.json(data);
    } catch {
      res.json({ services: [] });
    }
  });

  app.post("/actions/lockdown", async (req, res) => {
    const agentUrl = process.env.AGENT_URL || "http://agent:5001";
    const strict = Boolean(req.body?.strict);
    let status: "success" | "failed" = "success";
    try {
      await fetch(`${agentUrl}/agent/lockdown`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strict })
      });
    } catch (error) {
      status = "failed";
      await sendTelegram(`[high] Lockdown failed ${String(error)}`);
    }
    const actionRecord: ActionRecord = {
      id: randomUUID(),
      actionType: "lockdown",
      status,
      target: strict ? "strict" : "normal",
      details: {},
      timestamp: new Date().toISOString()
    };
    store.createAction(actionRecord);
    res.json({ status });
  });

  app.post("/actions/heal", async (req, res) => {
    const agentUrl = process.env.AGENT_URL || "http://agent:5001";
    const service = String(req.body?.service || "");
    let status: "success" | "failed" = "success";
    try {
      await fetch(`${agentUrl}/agent/heal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service })
      });
    } catch (error) {
      status = "failed";
      await sendTelegram(`[high] Heal failed ${String(error)}`);
    }
    const actionRecord: ActionRecord = {
      id: randomUUID(),
      actionType: "heal",
      status,
      target: service,
      details: {},
      timestamp: new Date().toISOString()
    };
    store.createAction(actionRecord);
    res.json({ status });
  });

  app.post("/actions/scan", async (req, res) => {
    const agentUrl = process.env.AGENT_URL || "http://agent:5001";
    const full = Boolean(req.body?.full);
    let status: "success" | "failed" = "success";
    try {
      await fetch(`${agentUrl}/agent/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full })
      });
    } catch {
      status = "failed";
    }
    const actionRecord: ActionRecord = {
      id: randomUUID(),
      actionType: "scan",
      status,
      target: full ? "full" : "quick",
      details: {},
      timestamp: new Date().toISOString()
    };
    store.createAction(actionRecord);
    res.json({ status });
  });

  app.get("/metrics", (req, res) => {
    const limit = Number(req.query.limit || 100);
    res.json({ metrics: store.listMetrics(limit) });
  });

  app.post("/metrics", (req, res) => {
    const payload = req.body as Partial<MetricSample>;
    const sample: MetricSample = {
      id: payload.id || randomUUID(),
      cpu: payload.cpu || 0,
      memory: payload.memory || 0,
      failedLogins: payload.failedLogins || 0,
      timestamp: payload.timestamp || new Date().toISOString()
    };
    store.createMetric(sample);
    res.json({ status: "ok" });
  });

  const port = Number(process.env.PORT || 4000);
  app.listen(port, () => {
    process.stdout.write(`SentinelOS-Lite backend running on ${port}\n`);
  });
};

start();
