import { PLATFORMS } from './platforms.js';

const KEY = 't3x-shift.v1';
const LEGACY_KEY = 'driver-panda.v1';

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyState() {
  return {
    profile: {
      name: '',
      dailyGoal: 150,
      weeklyGoal: 800,
      onboarded: false
    },
    online: Object.fromEntries(PLATFORMS.map((p) => [p.id, { on: false, since: null }])),
    activeJob: null,
    trips: [],
    expenses: [],
    apiToken: uid('dpk')
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem(LEGACY_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    return { ...emptyState(), ...parsed, profile: { ...emptyState().profile, ...(parsed.profile || {}) } };
  } catch {
    return emptyState();
  }
}

export function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function seedDemo(state) {
  const now = new Date();
  const trips = [];
  const samples = [
    { platform: 'uber', fare: 18.42, tip: 4.0, miles: 6.2, minutes: 22 },
    { platform: 'dasher', fare: 9.75, tip: 3.5, miles: 2.8, minutes: 16 },
    { platform: 'panda', fare: 12.2, tip: 2.0, miles: 3.4, minutes: 19 },
    { platform: 'uber', fare: 24.1, tip: 6.0, miles: 11.1, minutes: 34 },
    { platform: 'dasher', fare: 14.8, tip: 5.0, miles: 4.6, minutes: 21 },
    { platform: 'panda', fare: 8.9, tip: 1.5, miles: 1.9, minutes: 12 },
    { platform: 'uber', fare: 11.3, tip: 2.0, miles: 4.1, minutes: 17 },
    { platform: 'dasher', fare: 21.6, tip: 7.25, miles: 7.8, minutes: 29 },
    { platform: 'panda', fare: 16.4, tip: 3.0, miles: 5.2, minutes: 24 }
  ];

  samples.forEach((s, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (i % 6));
    d.setHours(11 + (i * 2) % 10, (i * 7) % 60, 0, 0);
    trips.push({
      id: uid('trip'),
      ...s,
      occurredAt: d.toISOString(),
      notes: ''
    });
  });

  const expenses = [
    { id: uid('exp'), category: 'Gas', amount: 42.18, occurredAt: new Date(now.getTime() - 86400000 * 2).toISOString(), notes: 'Shell' },
    { id: uid('exp'), category: 'Car wash', amount: 12, occurredAt: new Date(now.getTime() - 86400000).toISOString(), notes: '' }
  ];

  return {
    ...state,
    profile: { ...state.profile, name: state.profile.name || 'Alex', onboarded: true },
    trips,
    expenses
  };
}

export { uid };
