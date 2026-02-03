import initSqlJs from "sql.js";
import path from "node:path";
import fs from "node:fs";
import { ActionRecord, AnomalyRecord, EventRecord, MetricSample } from "./types.js";

export type EventFilter = {
  type?: string;
  severity?: string;
  since?: string;
  until?: string;
};

export interface DataStore {
  init(): void;
  createEvent(event: EventRecord): void;
  listEvents(filter?: EventFilter): EventRecord[];
  createAction(action: ActionRecord): void;
  listActions(): ActionRecord[];
  createAnomaly(anomaly: AnomalyRecord): void;
  listAnomalies(): AnomalyRecord[];
  createMetric(sample: MetricSample): void;
  listMetrics(limit?: number): MetricSample[];
}

export class SqliteStore implements DataStore {
  constructor(private filePath: string, private db: initSqlJs.Database) {}

  private save() {
    const data = this.db.export();
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, Buffer.from(data));
  }

  private run(sql: string, params: (string | number)[] = []) {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    while (stmt.step()) {
      undefined;
    }
    stmt.free();
    this.save();
  }

  private all(sql: string, params: (string | number)[] = []) {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const rows: Record<string, any>[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  }

  init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        type TEXT,
        severity TEXT,
        source TEXT,
        summary TEXT,
        details TEXT,
        timestamp TEXT
      );
      CREATE TABLE IF NOT EXISTS actions (
        id TEXT PRIMARY KEY,
        action_type TEXT,
        status TEXT,
        target TEXT,
        details TEXT,
        timestamp TEXT
      );
      CREATE TABLE IF NOT EXISTS anomalies (
        id TEXT PRIMARY KEY,
        score REAL,
        status TEXT,
        metric TEXT,
        details TEXT,
        timestamp TEXT
      );
      CREATE TABLE IF NOT EXISTS metrics (
        id TEXT PRIMARY KEY,
        cpu REAL,
        memory REAL,
        failed_logins INTEGER,
        timestamp TEXT
      );
    `);
    this.save();
  }

  createEvent(event: EventRecord) {
    this.run(
      "INSERT INTO events (id, type, severity, source, summary, details, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        event.id,
        event.type,
        event.severity,
        event.source,
        event.summary,
        JSON.stringify(event.details),
        event.timestamp
      ]
    );
  }

  listEvents(filter?: EventFilter) {
    let query = "SELECT * FROM events WHERE 1=1";
    const params: string[] = [];
    if (filter?.type) {
      query += " AND type = ?";
      params.push(filter.type);
    }
    if (filter?.severity) {
      query += " AND severity = ?";
      params.push(filter.severity);
    }
    if (filter?.since) {
      query += " AND timestamp >= ?";
      params.push(filter.since);
    }
    if (filter?.until) {
      query += " AND timestamp <= ?";
      params.push(filter.until);
    }
    query += " ORDER BY timestamp DESC";
    const rows = this.all(query, params);
    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      severity: row.severity,
      source: row.source,
      summary: row.summary,
      details: JSON.parse(row.details || "{}"),
      timestamp: row.timestamp
    }));
  }

  createAction(action: ActionRecord) {
    this.run(
      "INSERT INTO actions (id, action_type, status, target, details, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
      [
        action.id,
        action.actionType,
        action.status,
        action.target || "",
        JSON.stringify(action.details),
        action.timestamp
      ]
    );
  }

  listActions() {
    const rows = this.all("SELECT * FROM actions ORDER BY timestamp DESC");
    return rows.map((row) => ({
      id: row.id,
      actionType: row.action_type,
      status: row.status,
      target: row.target || undefined,
      details: JSON.parse(row.details || "{}"),
      timestamp: row.timestamp
    }));
  }

  createAnomaly(anomaly: AnomalyRecord) {
    this.run(
      "INSERT INTO anomalies (id, score, status, metric, details, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
      [
        anomaly.id,
        anomaly.score,
        anomaly.status,
        anomaly.metric,
        JSON.stringify(anomaly.details),
        anomaly.timestamp
      ]
    );
  }

  listAnomalies() {
    const rows = this.all("SELECT * FROM anomalies ORDER BY timestamp DESC");
    return rows.map((row) => ({
      id: row.id,
      score: row.score,
      status: row.status,
      metric: row.metric,
      details: JSON.parse(row.details || "{}"),
      timestamp: row.timestamp
    }));
  }

  createMetric(sample: MetricSample) {
    this.run("INSERT INTO metrics (id, cpu, memory, failed_logins, timestamp) VALUES (?, ?, ?, ?, ?)", [
      sample.id,
      sample.cpu,
      sample.memory,
      sample.failedLogins,
      sample.timestamp
    ]);
  }

  listMetrics(limit = 100) {
    const rows = this.all("SELECT * FROM metrics ORDER BY timestamp DESC LIMIT ?", [limit]);
    return rows.map((row) => ({
      id: row.id,
      cpu: row.cpu,
      memory: row.memory,
      failedLogins: row.failed_logins,
      timestamp: row.timestamp
    }));
  }
}

export const createStore = async () => {
  const databaseUrl = process.env.DATABASE_URL || "";
  if (databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://")) {
    throw new Error("PostgreSQL adapter not configured");
  }
  const filePath = databaseUrl || path.join(process.cwd(), "data", "sentinel.db");
  const SQL = await initSqlJs({
    locateFile: (file: string) => path.join(process.cwd(), "node_modules", "sql.js", "dist", file)
  });
  let db: initSqlJs.Database;
  if (fs.existsSync(filePath)) {
    const fileBuffer = fs.readFileSync(filePath);
    db = new SQL.Database(new Uint8Array(fileBuffer));
  } else {
    db = new SQL.Database();
  }
  const store = new SqliteStore(filePath, db);
  store.init();
  return store;
};
