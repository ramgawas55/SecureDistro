import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { RuleDefinition } from "./types.js";
import { DataStore } from "./db.js";

export class RuleEngine {
  private rules: RuleDefinition[] = [];

  constructor(private rulesDir: string, private store: DataStore) {
    this.reload();
  }

  reload() {
    if (!fs.existsSync(this.rulesDir)) {
      this.rules = [];
      return;
    }
    const files = fs.readdirSync(this.rulesDir).filter((file) => file.endsWith(".yaml") || file.endsWith(".yml"));
    const loaded = files.flatMap((file) => {
      const content = fs.readFileSync(path.join(this.rulesDir, file), "utf8");
      const parsed = yaml.load(content);
      if (!parsed) {
        return [];
      }
      return Array.isArray(parsed) ? parsed : [parsed];
    });
    this.rules = loaded.filter((rule) => rule && rule.id) as RuleDefinition[];
  }

  list() {
    return this.rules;
  }

  evaluate(event: { type: string; severity: string; details: Record<string, unknown> }) {
    const matches: RuleDefinition[] = [];
    for (const rule of this.rules) {
      if (!rule.enabled) {
        continue;
      }
      if (rule.match.eventType && rule.match.eventType !== event.type) {
        continue;
      }
      if (rule.match.severity && rule.match.severity !== event.severity) {
        continue;
      }
      if (rule.match.processName) {
        const processName = String(event.details.processName || "");
        if (!processName.includes(rule.match.processName)) {
          continue;
        }
      }
      if (rule.match.ipAddress) {
        const ipAddress = String(event.details.ipAddress || "");
        if (ipAddress !== rule.match.ipAddress) {
          continue;
        }
      }
      if (rule.threshold) {
        const since = new Date(Date.now() - rule.threshold.windowSec * 1000).toISOString();
        const events = this.store.listEvents({ type: rule.threshold.eventType, since });
        if (events.length < rule.threshold.count) {
          continue;
        }
      }
      matches.push(rule);
    }
    return matches;
  }
}
