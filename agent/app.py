import hashlib
import os
import threading
import time
from datetime import datetime
from pathlib import Path
import subprocess
import psutil
import requests
import yaml
from flask import Flask, jsonify, request

app = Flask(__name__)

CONFIG_PATH = os.environ.get("AGENT_CONFIG", "agent/config.yaml")


def load_config():
    with open(CONFIG_PATH, "r", encoding="utf-8") as file:
        return yaml.safe_load(file)


config = load_config()
state = {"lockdown": False, "services": []}


def file_hash(path):
    try:
        with open(path, "rb") as file:
            return hashlib.sha256(file.read()).hexdigest()
    except OSError:
        return ""


def backup_files(files, backup_dir):
    Path(backup_dir).mkdir(parents=True, exist_ok=True)
    baseline = {}
    for file_path in files:
        if os.path.exists(file_path):
            baseline[file_path] = file_hash(file_path)
            target = Path(backup_dir) / Path(file_path).name
            with open(file_path, "rb") as source:
                target.write_bytes(source.read())
    baseline_path = Path(backup_dir) / "baseline.json"
    baseline_path.write_text(yaml.safe_dump(baseline))
    return baseline


def load_baseline(backup_dir):
    baseline_path = Path(backup_dir) / "baseline.json"
    if baseline_path.exists():
        return yaml.safe_load(baseline_path.read_text())
    return backup_files(config.get("critical_files", []), backup_dir)


baseline = load_baseline(config.get("backup_dir", "./backup"))


def post_backend(path, payload):
    headers = {"Content-Type": "application/json"}
    token = config.get("api_token") or os.environ.get("API_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    backend_url = os.environ.get("BACKEND_URL", config.get("backend_url"))
    try:
        requests.post(f"{backend_url}{path}", json=payload, headers=headers, timeout=3)
    except requests.RequestException:
        return


def post_metrics(sample):
    post_backend("/metrics", sample)
    ml_url = os.environ.get("ML_URL", config.get("ml_url"))
    try:
        requests.post(f"{ml_url}/metrics", json=sample, timeout=3)
    except requests.RequestException:
        return


def record_event(event_type, severity, summary, details):
    post_backend(
        "/events",
        {
            "type": event_type,
            "severity": severity,
            "source": "agent",
            "summary": summary,
            "details": details,
            "timestamp": datetime.utcnow().isoformat()
        }
    )


def check_services():
    services_status = []
    for service in config.get("services", []):
        name = service.get("name", "")
        pattern = service.get("process_pattern", "")
        running = False
        for proc in psutil.process_iter(["cmdline"]):
            cmdline = " ".join(proc.info.get("cmdline") or [])
            if pattern and pattern in cmdline:
                running = True
                break
        services_status.append(
            {"name": name, "status": "up" if running else "down", "timestamp": datetime.utcnow().isoformat()}
        )
        if not running and name:
            restart_command = service.get("restart_command", "")
            if restart_command:
                result = subprocess.run(restart_command, shell=True)
                if result.returncode == 0:
                    record_event("service_recovered", "medium", f"Service {name} restarted", {"service": name})
                else:
                    record_event("service_failed", "high", f"Service {name} restart failed", {"service": name})
    state["services"] = services_status


def check_files():
    backup_dir = config.get("backup_dir", "./backup")
    for file_path, expected_hash in baseline.items():
        current = file_hash(file_path)
        if expected_hash and current != expected_hash:
            backup_file = Path(backup_dir) / Path(file_path).name
            if backup_file.exists():
                Path(file_path).write_bytes(backup_file.read_bytes())
                record_event("config_restored", "high", f"Restored {file_path}", {"file": file_path})


def collect_metrics():
    cpu = psutil.cpu_percent(interval=None) / 100.0
    memory = psutil.virtual_memory().percent / 100.0
    failed_logins = 0
    sample = {
        "cpu": round(cpu, 4),
        "memory": round(memory, 4),
        "failedLogins": failed_logins,
        "timestamp": datetime.utcnow().isoformat()
    }
    post_metrics(sample)
    thresholds = config.get("thresholds", {})
    if cpu > thresholds.get("cpu", 1.0):
        record_event("cpu_threshold", "high", "CPU threshold exceeded", {"cpu": cpu})
    if memory > thresholds.get("memory", 1.0):
        record_event("memory_threshold", "high", "Memory threshold exceeded", {"memory": memory})


def loop():
    interval = config.get("scan_interval_sec", 10)
    while True:
        check_services()
        check_files()
        collect_metrics()
        time.sleep(interval)


@app.get("/agent/health")
def health():
    return jsonify({"status": "ok", "lockdown": state["lockdown"]})


@app.post("/agent/scan")
def scan():
    check_services()
    check_files()
    collect_metrics()
    return jsonify({"status": "ok"})


@app.post("/agent/heal")
def heal():
    payload = request.get_json(silent=True) or {}
    service = payload.get("service")
    if service:
        for item in config.get("services", []):
            if item.get("name") == service and item.get("restart_command"):
                result = subprocess.run(item.get("restart_command"), shell=True)
                status = "success" if result.returncode == 0 else "failed"
                record_event("manual_heal", "medium", f"Heal {service} {status}", {"service": service})
                return jsonify({"status": status})
    return jsonify({"status": "skipped"})


@app.post("/agent/lockdown")
def lockdown():
    payload = request.get_json(silent=True) or {}
    state["lockdown"] = bool(payload.get("strict"))
    record_event("lockdown", "critical", "Lockdown updated", {"strict": state["lockdown"]})
    return jsonify({"status": "ok", "strict": state["lockdown"]})


@app.get("/agent/services")
def services():
    if not state["services"]:
        check_services()
    return jsonify({"services": state["services"]})


threading.Thread(target=loop, daemon=True).start()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", config.get("health_port", 5001)))
    app.run(host="0.0.0.0", port=port)
