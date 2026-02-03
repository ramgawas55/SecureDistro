import os
from collections import deque
from datetime import datetime
import requests
from flask import Flask, jsonify, request

app = Flask(__name__)

WINDOW = 30
SIGMA = float(os.environ.get("ANOMALY_SIGMA", "2.5"))

metrics_window = {
    "cpu": deque(maxlen=WINDOW),
    "memory": deque(maxlen=WINDOW),
    "failedLogins": deque(maxlen=WINDOW)
}


def analyze(metric, value):
    window = metrics_window[metric]
    window.append(value)
    if len(window) < 5:
        return {"status": "normal", "score": 0.0}
    mean = sum(window) / len(window)
    variance = sum((x - mean) ** 2 for x in window) / len(window)
    std = variance ** 0.5
    score = 0.0 if std == 0 else abs(value - mean) / std
    status = "anomaly" if score >= SIGMA else "normal"
    return {"status": status, "score": round(score, 3), "mean": round(mean, 4), "std": round(std, 4)}


def post_backend(path, payload):
    token = os.environ.get("API_TOKEN", "")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    backend_url = os.environ.get("BACKEND_URL", "http://backend:4000")
    try:
        requests.post(f"{backend_url}{path}", json=payload, headers=headers, timeout=3)
    except requests.RequestException:
        return


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


@app.post("/metrics")
def metrics():
    payload = request.get_json(silent=True) or {}
    results = {}
    for metric in ["cpu", "memory", "failedLogins"]:
        value = float(payload.get(metric, 0))
        results[metric] = analyze(metric, value)
    anomaly_metrics = [m for m, result in results.items() if result["status"] == "anomaly"]
    status = "anomaly" if anomaly_metrics else "normal"
    score = max((results[m]["score"] for m in anomaly_metrics), default=0.0)
    if status == "anomaly":
        post_backend(
            "/events",
            {
                "type": "anomaly",
                "severity": "high",
                "source": "ml",
                "summary": "Anomaly detected",
                "details": {"metrics": results},
                "timestamp": datetime.utcnow().isoformat()
            }
        )
        post_backend(
            "/anomalies",
            {
                "status": "anomaly",
                "score": score,
                "metric": ",".join(anomaly_metrics),
                "details": results,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
    return jsonify({"status": status, "score": score, "details": results})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002)
