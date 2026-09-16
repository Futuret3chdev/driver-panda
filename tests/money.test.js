import { test } from 'node:test';
import assert from 'node:assert/strict';
import { businessMileageRate, enrichTrip, summarize } from '../src/money.js';

test('uses 76 cents after July 1 2026', () => {
  assert.equal(businessMileageRate('2026-09-16'), 0.76);
  assert.equal(businessMileageRate('2026-06-30'), 0.725);
});

test('enriches a Hello Panda trip', () => {
  const trip = enrichTrip({
    platform: 'panda',
    fare: 12.5,
    tip: 3,
    miles: 4.2,
    minutes: 18,
    occurredAt: '2026-09-16T12:00:00Z'
  });
  assert.equal(trip.gross, 15.5);
  assert.equal(trip.mileageDeduction, 3.19);
  assert.equal(trip.hourly, 51.67);
});

test('summarizes mixed platforms', () => {
  const s = summarize(
    [
      { platform: 'uber', fare: 10, tip: 2, miles: 5, minutes: 20, occurredAt: '2026-09-16T10:00:00Z' },
      { platform: 'dasher', fare: 8, tip: 1, miles: 2, minutes: 10, occurredAt: '2026-09-16T11:00:00Z' },
      { platform: 'panda', fare: 6, tip: 0, miles: 1, minutes: 8, occurredAt: '2026-09-16T12:00:00Z' }
    ],
    [{ amount: 5, occurredAt: '2026-09-16T12:00:00Z' }]
  );
  assert.equal(s.trips, 3);
  assert.equal(s.gross, 27);
  assert.equal(s.byPlatform.panda.trips, 1);
  assert.ok(s.net < s.gross);
});
