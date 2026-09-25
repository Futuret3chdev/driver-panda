import { test } from 'node:test';
import assert from 'node:assert/strict';
import { haversineM, speedMps, createDriveMachine, addLegMeters } from '../src/drive-listen.js';

test('haversine is ~0 for the same point', () => {
  assert.equal(haversineM({ lat: -37.81, lon: 144.96 }, { lat: -37.81, lon: 144.96 }), 0);
});

test('speed uses reported coords.speed when present', () => {
  const v = speedMps(
    { t: 0, lat: 0, lon: 0, speed: null },
    { t: 1000, lat: 0, lon: 0, speed: 12 }
  );
  assert.equal(v, 12);
});

test('speed falls back to distance / time', () => {
  const a = { t: 0, lat: -37.81, lon: 144.96, speed: -1 };
  const b = { t: 10000, lat: -37.8105, lon: 144.96, speed: -1 };
  const v = speedMps(a, b);
  assert.ok(v > 3);
  assert.ok(v < 12);
});

test('drive machine fires drive after sustained speed', () => {
  const m = createDriveMachine({ driveMps: 4, driveHoldMs: 6000 });
  const t0 = 1_000_000;
  assert.equal(m.sample(5, t0), 'idle');
  assert.equal(m.sample(5, t0 + 3000), 'idle');
  assert.equal(m.sample(5, t0 + 6000), 'drive');
  assert.equal(m.sample(5, t0 + 7000), 'driving');
});

test('addLegMeters ignores a GPS jump', () => {
  const a = { t: 0, lat: -37.81, lon: 144.96 };
  const jump = { t: 2000, lat: -37.9, lon: 145.1 };
  assert.equal(addLegMeters(a, jump), 0);
  const step = { t: 2000, lat: -37.8104, lon: 144.96 };
  assert.ok(addLegMeters(a, step) > 20);
});

test('drive machine does not fire on a walk', () => {
  const m = createDriveMachine({ driveMps: 4, driveHoldMs: 6000 });
  const t0 = 1_000_000;
  assert.equal(m.sample(1.2, t0), 'idle');
  assert.equal(m.sample(1.2, t0 + 8000), 'idle');
});
