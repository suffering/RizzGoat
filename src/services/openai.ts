export const API_URL = process.env.EXPO_PUBLIC_API_URL as string;

export interface PickupLineParams {
  tone: string;
  context: string;
  length?: 'short'|'medium'|'long';
}

export async function createPickupLine(token: string, params: PickupLineParams) {
  if (!API_URL) throw new Error('Missing EXPO_PUBLIC_API_URL');
  const res = await fetch(`${API_URL}/ai/pickup-line`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`AI ${res.status}`);
  return res.json();
}
