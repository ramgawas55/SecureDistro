export type Severity = "low" | "medium" | "high" | "critical";

export type EventRecord = {
  id: string;
  type: string;
  severity: Severity;
  source: string;
  summary: string;
  details: Record<string, unknown>;
  timestamp: string;
};

export type ActionRecord = {
  id: string;
  actionType: string;
  status: "success" | "failed" | "pending";
  target?: string;
  details: Record<string, unknown>;
  timestamp: string;
};

export type AnomalyRecord = {
  id: string;
  score: number;
  status: "normal" | "anomaly";
  metric: string;
  details: Record<string, unknown>;
  timestamp: string;
};

export type MetricSample = {
  id: string;
  cpu: number;
  memory: number;
  failedLogins: number;
  timestamp: string;
};

export type RuleDefinition = {
  id: string;
  description: string;
  enabled: boolean;
  severity: Severity;
  match: {
    eventType?: string;
    severity?: Severity;
    processName?: string;
    ipAddress?: string;
  };
  threshold?: {
    eventType: string;
    count: number;
    windowSec: number;
  };
  actions: {
    type: "agent" | "log" | "telegram";
    name: "lockdown" | "heal";
    payload?: Record<string, unknown>;
  }[];
};
