import { cors, enrichTrip, readJson, roundMoney } from '../../lib/api-money.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST { trips, expenses }' });
  try {
    const body = await readJson(req);
    const trips = Array.isArray(body.trips) ? body.trips.map(enrichTrip) : [];
    const expenses = Array.isArray(body.expenses) ? body.expenses : [];
    const expenseTotal = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const gross = trips.reduce((s, t) => s + t.gross, 0);
    const miles = trips.reduce((s, t) => s + t.miles, 0);
    const minutes = trips.reduce((s, t) => s + t.minutes, 0);
    const mileageDeduction = trips.reduce((s, t) => s + t.mileageDeduction, 0);
    const byPlatform = {};
    for (const t of trips) {
      const key = t.platform || 'unknown';
      const b = byPlatform[key] || { trips: 0, gross: 0 };
      b.trips += 1;
      b.gross += t.gross;
      byPlatform[key] = b;
    }
    res.status(200).json({
      trips: trips.length,
      gross: roundMoney(gross),
      miles: roundMoney(miles),
      minutes,
      hourly: minutes > 0 ? roundMoney(gross / (minutes / 60)) : 0,
      mileageDeduction: roundMoney(mileageDeduction),
      expenses: roundMoney(expenseTotal),
      net: roundMoney(gross - mileageDeduction - expenseTotal),
      byPlatform
    });
  } catch {
    res.status(400).json({ error: 'invalid JSON' });
  }
}
