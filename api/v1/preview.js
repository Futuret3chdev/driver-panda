import { cors, enrichTrip, readJson } from '../../lib/api-money.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST a trip payload' });
  try {
    const body = await readJson(req);
    res.status(200).json({ trip: enrichTrip(body) });
  } catch {
    res.status(400).json({ error: 'invalid JSON' });
  }
}
