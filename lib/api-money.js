export function businessMileageRate(isoDate) {
  const t = new Date(isoDate || Date.now()).getTime();
  if (Number.isNaN(t)) return 0.76;
  if (t >= Date.parse('2026-07-01T00:00:00')) return 0.76;
  if (t >= Date.parse('2026-01-01T00:00:00')) return 0.725;
  if (t >= Date.parse('2025-01-01T00:00:00')) return 0.7;
  return 0.76;
}

export function roundMoney(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function enrichTrip(trip = {}) {
  const fare = roundMoney(trip.fare);
  const tip = roundMoney(trip.tip);
  const miles = Number(trip.miles) || 0;
  const minutes = Number(trip.minutes) || 0;
  const gross = roundMoney(fare + tip);
  const rate = businessMileageRate(trip.occurredAt);
  const mileageDeduction = roundMoney(miles * rate);
  const net = roundMoney(gross - mileageDeduction);
  const hourly = minutes > 0 ? roundMoney(gross / (minutes / 60)) : 0;
  return {
    platform: trip.platform || null,
    fare,
    tip,
    miles,
    minutes,
    occurredAt: trip.occurredAt || new Date().toISOString(),
    gross,
    mileageRate: rate,
    mileageDeduction,
    net,
    hourly
  };
}

export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (c) => {
      body += c;
      if (body.length > 1_000_000) {
        reject(new Error('payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}
