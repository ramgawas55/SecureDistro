import { fetchJson } from "../lib/api";

export default async function ServicesPage() {
  const data = await fetchJson("/services");
  return (
    <main className="grid">
      <section className="panel wide">
        <h2>Services</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Last Checked</th>
            </tr>
          </thead>
          <tbody>
            {data.services.map((service: any) => (
              <tr key={service.name}>
                <td>{service.name}</td>
                <td>{service.status}</td>
                <td>{service.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
