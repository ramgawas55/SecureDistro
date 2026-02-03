import { fetchJson } from "../lib/api";

export default async function ActionsPage() {
  const actions = await fetchJson("/actions");
  return (
    <main className="grid">
      <section className="panel wide">
        <h2>Action History</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Action</th>
              <th>Status</th>
              <th>Target</th>
            </tr>
          </thead>
          <tbody>
            {actions.actions.map((action: any) => (
              <tr key={action.id}>
                <td>{action.timestamp}</td>
                <td>{action.actionType}</td>
                <td>{action.status}</td>
                <td>{action.target || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
