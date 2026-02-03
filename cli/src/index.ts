import fs from "node:fs";
import path from "node:path";
import os from "node:os";

type Config = {
  url?: string;
  token?: string;
};

const loadConfig = (): Config => {
  const configPath = path.join(os.homedir(), ".sentinelos", "config.json");
  if (!fs.existsSync(configPath)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8")) as Config;
  } catch {
    return {};
  }
};

const config = loadConfig();
const apiBase = process.env.SENTINEL_URL || config.url || "http://localhost:4000";
const apiToken = process.env.SENTINEL_TOKEN || config.token || "";

const request = async (pathName: string, options?: { method?: string; body?: unknown }) => {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiToken) {
    headers.Authorization = `Bearer ${apiToken}`;
  }
  const response = await fetch(`${apiBase}${pathName}`, {
    method: options?.method || "GET",
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${text}`);
  }
  return response.json();
};

const print = (data: unknown) => {
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
};

const [command, ...args] = process.argv.slice(2);

const run = async () => {
  if (!command || command === "status") {
    const status = await request("/status");
    print(status);
    return;
  }
  if (command === "scan") {
    const full = args.includes("--full");
    const response = await request("/actions/scan", { method: "POST", body: { full } });
    print(response);
    return;
  }
  if (command === "heal") {
    const service = args[0];
    if (!service) {
      throw new Error("service is required");
    }
    const response = await request("/actions/heal", { method: "POST", body: { service } });
    print(response);
    return;
  }
  if (command === "lockdown") {
    const strict = args.includes("--strict");
    const response = await request("/actions/lockdown", { method: "POST", body: { strict } });
    print(response);
    return;
  }
  throw new Error("Unknown command");
};

run().catch((error) => {
  process.stderr.write(`${String(error)}\n`);
  process.exit(1);
});
