/** IRS optional standard mileage rates for business use. */
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

export function enrichTrip(trip) {
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
    ...trip,
    fare,
    tip,
    miles,
    minutes,
    gross,
    mileageRate: rate,
    mileageDeduction,
    net,
    hourly
  };
}

export function summarize(trips, expenses = [], rangeStart, rangeEnd) {
  const inRange = (iso) => {
    const t = new Date(iso).getTime();
    if (rangeStart && t < rangeStart) return false;
    if (rangeEnd && t >= rangeEnd) return false;
    return true;
  };

  const list = trips.filter((t) => inRange(t.occurredAt)).map(enrichTrip);
  const exp = expenses.filter((e) => inRange(e.occurredAt));

  const byPlatform = {};
  let gross = 0;
  let miles = 0;
  let minutes = 0;
  let mileageDeduction = 0;

  for (const t of list) {
    gross += t.gross;
    miles += t.miles;
    minutes += t.minutes;
    mileageDeduction += t.mileageDeduction;
    const bucket = byPlatform[t.platform] || { trips: 0, gross: 0, miles: 0, minutes: 0, tips: 0 };
    bucket.trips += 1;
    bucket.gross += t.gross;
    bucket.miles += t.miles;
    bucket.minutes += t.minutes;
    bucket.tips += t.tip;
    byPlatform[t.platform] = bucket;
  }

  const expenseTotal = exp.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const net = roundMoney(gross - mileageDeduction - expenseTotal);

  return {
    trips: list.length,
    gross: roundMoney(gross),
    tips: roundMoney(list.reduce((s, t) => s + t.tip, 0)),
    miles: roundMoney(miles),
    minutes,
    hourly: minutes > 0 ? roundMoney(gross / (minutes / 60)) : 0,
    mileageDeduction: roundMoney(mileageDeduction),
    expenses: roundMoney(expenseTotal),
    net,
    byPlatform
  };
}
