import { fetchJson } from "../lib/api";

const buildPolyline = (values: number[], width: number, height: number) => {
  if (values.length === 0) {
    return "";
  }
  const max = Math.max(...values, 1);
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1 || 1)) * width;
      const y = height - (value / max) * height;
      return `${x},${y}`;
    })
    .join(" ");
};

export default async function AnomaliesPage() {
  const [anomalies, metrics] = await Promise.all([fetchJson("/anomalies"), fetchJson("/metrics?limit=60")]);
  const metricList = metrics.metrics.slice().reverse();
  const cpuValues = metricList.map((item: any) => item.cpu);
  const memValues = metricList.map((item: any) => item.memory);
  const cpuLine = buildPolyline(cpuValues, 520, 140);
  const memLine = buildPolyline(memValues, 520, 140);

  return (
    <main className="grid">
      <section className="panel wide">
        <h2>CPU / Memory Trends</h2>
        <div className="chart">
          <svg width="100%" height="140" viewBox="0 0 520 140">
            <polyline fill="none" stroke="#4ade80" strokeWidth="2" points={cpuLine} />
            <polyline fill="none" stroke="#60a5fa" strokeWidth="2" points={memLine} />
          </svg>
        </div>
      </section>
      <section className="panel wide">
        <h2>Anomalies</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Metric</th>
              <th>Status</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {anomalies.anomalies.map((item: any) => (
              <tr key={item.id}>
                <td>{item.timestamp}</td>
                <td>{item.metric}</td>
                <td>{item.status}</td>
                <td>{item.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
