import { fetchJson } from "./lib/api";

export default async function OverviewPage() {
  const [status, events, anomalies] = await Promise.all([
    fetchJson("/status"),
    fetchJson("/events"),
    fetchJson("/anomalies")
  ]);

  const openAlerts = events.events.filter((event: any) => event.severity === "high" || event.severity === "critical");

  return (
    <main className="grid">
      <section className="panel">
        <h2>Health</h2>
        <div className="kv">
          <div>
            <span>Agent</span>
            <strong>{status.agent}</strong>
          </div>
          <div>
            <span>ML</span>
            <strong>{status.ml}</strong>
          </div>
          <div>
            <span>DB</span>
            <strong>{status.db}</strong>
          </div>
        </div>
      </section>
      <section className="panel">
        <h2>Open Alerts</h2>
        <div className="kv">
          <div>
            <span>High/Critical</span>
            <strong>{openAlerts.length}</strong>
          </div>
          <div>
            <span>Total Anomalies</span>
            <strong>{anomalies.anomalies.length}</strong>
          </div>
        </div>
      </section>
      <section className="panel wide">
        <h2>Recent Events</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Type</th>
              <th>Severity</th>
              <th>Summary</th>
            </tr>
          </thead>
          <tbody>
            {events.events.slice(0, 10).map((event: any) => (
              <tr key={event.id}>
                <td>{event.timestamp}</td>
                <td>{event.type}</td>
                <td>{event.severity}</td>
                <td>{event.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
