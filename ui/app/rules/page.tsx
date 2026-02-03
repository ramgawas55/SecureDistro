import { fetchJson } from "../lib/api";

export default async function RulesPage() {
  const [rules, raw] = await Promise.all([fetchJson("/rules"), fetchJson("/rules/raw")]);
  return (
    <main className="grid">
      <section className="panel wide">
        <h2>Active Rules</h2>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Description</th>
              <th>Severity</th>
              <th>Enabled</th>
            </tr>
          </thead>
          <tbody>
            {rules.rules.map((rule: any) => (
              <tr key={rule.id}>
                <td>{rule.id}</td>
                <td>{rule.description}</td>
                <td>{rule.severity}</td>
                <td>{String(rule.enabled)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel wide">
        <h2>YAML</h2>
        <pre>{raw.content}</pre>
      </section>
    </main>
  );
}
