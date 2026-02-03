const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";
const apiToken = process.env.NEXT_PUBLIC_API_TOKEN || "";

export const fetchJson = async (path: string) => {
  const headers: Record<string, string> = {};
  if (apiToken) {
    headers.Authorization = `Bearer ${apiToken}`;
  }
  const response = await fetch(`${apiBase}${path}`, { cache: "no-store", headers });
  return response.json();
};
