import './styles.css';
import { LAB } from './lab.js';
import { PLATFORMS, platformById } from './platforms.js';
import { enrichTrip, summarize } from './money.js';
import { loadState, saveState, seedDemo, uid, emptyState } from './store.js';
import { openPlatform } from './open-app.js';
import { createDriveMachine, startDriveWatch, addLegMeters } from './drive-listen.js';

const root = document.getElementById('app');
let state = loadState();
const params = new URLSearchParams(location.search);
if (params.get('demo') === '1') {
  state = seedDemo(state);
  saveState(state);
}
let tab = params.get('tab') || 'home';
let sheet = params.get('sheet') === 'log' ? { type: 'log', platform: params.get('platform') || 'uber' } : null;
let toastTimer = 0;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}

function persist() {
  saveState(state);
}

function money(n) {
  return `$${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function startOfWeek(d = new Date()) {
  const x = new Date(d);
  const day = x.getDay();
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function startOfMonth(d = new Date()) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function countedTrips() {
  return state.trips.filter((trip) => trip.source !== 'sample');
}

function todaySummary() {
  return summarize(countedTrips(), state.expenses, startOfDay(), startOfDay() + 86400000);
}

function weekSummary() {
  return summarize(countedTrips(), state.expenses, startOfWeek(), startOfWeek() + 7 * 86400000);
}

function monthSummary() {
  return summarize(countedTrips(), state.expenses, startOfMonth());
}

const driveMachine = createDriveMachine();
let stopWatch = null;
let listenStatus = 'off';

function anyLive() {
  return PLATFORMS.some((p) => state.online[p.id]?.on);
}

function liveIds() {
  return PLATFORMS.filter((p) => state.online[p.id]?.on).map((p) => p.id);
}

function launchApp(p) {
  if (!p) return;
  openPlatform(p, {
    onMiss: () => showToast(`Could not open ${p.name}. Install it, then tap Open.`)
  });
}

function stopListener() {
  if (stopWatch) {
    stopWatch();
    stopWatch = null;
  }
  driveMachine.reset();
  listenStatus = 'off';
}

function ensureListener() {
  if (!anyLive() && !state.activeJob) {
    stopListener();
    return;
  }
  if (stopWatch) return;
  driveMachine.reset();
  stopWatch = startDriveWatch({
    onStatus: (s) => {
      listenStatus = s;
      render();
    },
    onError: () => {},
    onSample: ({ v, pos }) => {
      if (state.activeJob && pos) {
        const added = addLegMeters(state.activeJob.lastFix, pos);
        state.activeJob.lastFix = { t: pos.t, lat: pos.lat, lon: pos.lon };
        if (added) state.activeJob.meters = (state.activeJob.meters || 0) + added;
      }
      const ev = driveMachine.sample(v);
      if (ev === 'drive') onDrive();
      if (ev === 'stop' && state.activeJob) endJob('drive');
    }
  });
  try {
    navigator.wakeLock?.request('screen').catch(() => {});
  } catch {
    /* optional */
  }
}

function onDrive() {
  if (state.activeJob) return;
  const live = liveIds();
  const id = live.includes(state.lastLive) ? state.lastLive : live[0] || state.lastLive || 'uber';
  startJob(id, { auto: true });
}

function pauseOthers(id) {
  for (const p of PLATFORMS) {
    if (p.id !== id) state.online[p.id] = { on: false, since: null };
  }
}

function otherNames(id) {
  return PLATFORMS.filter((p) => p.id !== id)
    .map((p) => p.short)
    .join(' + ');
}

function toggleOnline(id) {
  if (state.activeJob && state.activeJob.platform !== id) {
    const hold = platformById[state.activeJob.platform]?.name || 'the other app';
    showToast(`Finish the ${hold} job first`);
    return;
  }
  const cur = state.online[id] || { on: false, since: null };
  if (cur.on) {
    state.online[id] = { on: false, since: null };
    persist();
    ensureListener();
    render();
    return;
  }
  state.lastLive = id;
  state.online[id] = { on: true, since: new Date().toISOString() };
  persist();
  ensureListener();
  render();
  launchApp(platformById[id]);
  showToast(`Live on ${platformById[id].name} — opened the app. Drive and the job starts.`);
}

function startJob(id, { auto = false } = {}) {
  if (state.activeJob && state.activeJob.platform !== id) {
    showToast(`Already on a ${platformById[state.activeJob.platform].name} job`);
    return;
  }
  pauseOthers(id);
  state.lastLive = id;
  state.online[id] = { on: true, since: state.online[id]?.since || new Date().toISOString() };
  state.activeJob = { platform: id, startedAt: new Date().toISOString(), meters: 0, lastFix: null };
  persist();
  ensureListener();
  render();
  launchApp(platformById[id]);
  showToast(
    auto
      ? `Driving — ${platformById[id].name} job started. Pause ${otherNames(id)} in those apps.`
      : `${platformById[id].name} job — go offline in ${otherNames(id)}`
  );
}

function milesFromMeters(meters) {
  return Math.round(((Number(meters) || 0) / 1609.344) * 10) / 10;
}

function endJob(source = 'ended') {
  const job = state.activeJob;
  if (!job) return;
  const minutes = Math.max(1, Math.round((Date.now() - new Date(job.startedAt).getTime()) / 60000));
  const miles = milesFromMeters(job.meters);
  const trip = {
    id: uid('trip'),
    platform: job.platform,
    fare: 0,
    tip: 0,
    miles,
    minutes,
    notes: '',
    occurredAt: new Date().toISOString(),
    startedAt: job.startedAt,
    status: 'completed',
    source,
    payPending: true
  };
  state.trips.push(trip);
  state.activeJob = null;
  persist();
  ensureListener();
  render();
  showToast('Job completed');
}

function onlineLabel(id) {
  const cur = state.online[id];
  if (!cur?.on) return 'Offline';
  const mins = Math.max(1, Math.round((Date.now() - new Date(cur.since).getTime()) / 60000));
  return mins >= 60 ? `Live ${Math.floor(mins / 60)}h ${mins % 60}m` : `Live ${mins}m`;
}

const APP = 'T3x Shift';
const ECO = 'MT ECO SYSTEM';
const DEVELOPED = 'Developed by Futuret3ch, T3x and MemeTorrent';

function creditLine() {
  return `<p class="credit"><span class="eco-mark">${ECO}</span>${DEVELOPED}</p>`;
}

function listenBanner() {
  const live = anyLive();
  if (listenStatus === 'denied') {
    return `<div class="install"><b>Location blocked</b><p class="small muted" style="margin:6px 0 0">iPhone Settings → ${APP} → Location → While Using. Jobs cannot auto-start without it.</p></div>`;
  }
  if (listenStatus === 'watching') {
    return `<div class="install"><b>Listener on</b><p class="small muted" style="margin:6px 0 0">Watching for a drive. ${live ? 'Live apps stay open.' : 'Mark an app live.'}</p></div>`;
  }
  if (live || state.activeJob) {
    return `<div class="install"><b>Drive listener idle</b><p class="small muted" style="margin:6px 0 8px">Tap to watch GPS so jobs start when you roll.</p><button class="btn" data-listen>Watch driving</button></div>`;
  }
  return '';
}

function showToast(msg) {
  clearTimeout(toastTimer);
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.style.cssText =
      'position:fixed;left:50%;bottom:calc(88px + env(safe-area-inset-bottom));transform:translateX(-50%);background:#c8f24a;color:#142000;padding:10px 14px;border-radius:16px;font-weight:700;font-size:12px;z-index:50;max-width:min(340px,92vw);text-align:center;line-height:1.3';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.display = 'block';
  toastTimer = setTimeout(() => {
    el.style.display = 'none';
  }, 1800);
}

function tabs() {
  const item = (id, label, icon) =>
    `<button type="button" class="${tab === id ? 'active' : ''}" data-tab="${id}" aria-label="${label}">${icon}<span>${label}</span></button>`;
  return `<nav class="tabs">
    ${item('home', 'Home', '⌂')}
    ${item('stats', 'Pay', '▣')}
    <button class="plus" type="button" data-open="log" aria-label="Log trip">+</button>
    ${item('apps', 'Apps', '◎')}
    ${item('more', 'More', '☰')}
  </nav>`;
}

function recentTrips(limit = 8) {
  const trips = [...countedTrips()].sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt)).slice(0, limit);
  if (!trips.length) return `<div class="empty">No completed jobs yet. Go live, drive, and the job is saved when you stop.</div>`;
  return trips
    .map((t) => {
      const p = platformById[t.platform] || { name: t.platform, short: '?' };
      const e = enrichTrip(t);
      const when = new Date(t.occurredAt);
      const time = when.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' });
      return `<button type="button" class="row" data-edit-trip="${escapeHtml(t.id)}" style="width:100%;background:transparent;color:inherit;text-align:left">
        <div class="trip-plat ${t.platform}">${escapeHtml(p.short.slice(0, 2).toUpperCase())}</div>
        <div class="grow">
          <b>${escapeHtml(p.name)}</b>
          <div class="small muted">${escapeHtml(time)} · ${e.miles} mi · ${e.minutes}m${t.payPending ? ' · fare later' : ''}</div>
        </div>
        <div style="text-align:right">
          <b>${t.payPending ? '—' : money(e.gross)}</b>
          <div class="small muted">${t.payPending ? 'completed' : 'tip ' + money(e.tip)}</div>
        </div>
      </button>`;
    })
    .join('');
}

function homeView() {
  const today = todaySummary();
  const week = weekSummary();
  const goal = Number(state.profile.dailyGoal) || 0;
  const pct = goal ? Math.min(100, Math.round((today.gross / goal) * 100)) : 0;
  return `<div class="shell">
    <div class="topbar">
      <div class="brand">
        <img src="/icons/icon-192.png" alt="T3x Shift" />
        <div>
          <h1>${APP}</h1>
          <p>${ECO}</p>
        </div>
      </div>
      <button class="pill logout-pill" data-logout type="button">Log out</button>
    </div>
    <div class="hero-money">
      <div class="label">Today across all apps</div>
      <div class="dollars">${money(today.gross)}</div>
      <div class="hero-row">
        <div class="stat"><b>${today.trips}</b><span>completed</span></div>
        <div class="stat"><b>${money(today.hourly)}</b><span>/ hour</span></div>
        <div class="stat"><b>${today.miles}</b><span>miles</span></div>
      </div>
      <div class="small muted" style="margin-top:10px">Daily goal ${money(goal)} · ${pct}%</div>
      <div class="goal"><i style="width:${pct}%"></i></div>
    </div>
    ${
      state.activeJob
        ? `<div class="job-lock">
            <b>Job in progress · ${escapeHtml(platformById[state.activeJob.platform]?.name || '')}</b>
            <p>The other two are paused here so you don’t stack. Go offline in ${escapeHtml(otherNames(state.activeJob.platform))} in those apps — T3x Shift cannot flip their switches.</p>
            <button class="btn" data-end-job>End job &amp; log it</button>
          </div>`
        : `<div class="install">
            <b>Go live, then drive</b>
            <p class="small muted" style="margin:6px 0 0">Leave this page open. Driving starts the job. Stopping saves it. The fare is optional — tap the job later if you want the amount. Uber does not send that number.</p>
          </div>`
    }
    ${listenBanner()}
    <div class="grid-3">
      ${PLATFORMS.map((p) => {
        const on = state.online[p.id]?.on;
        const busy = state.activeJob?.platform === p.id;
        const blocked = state.activeJob && state.activeJob.platform !== p.id;
        return `<div class="plat-card ${p.id}${blocked ? ' dim' : ''}">
          <div>
            <div class="name">${p.name}</div>
            <div class="kind">${busy ? 'On a job' : blocked ? 'Paused' : p.kind}</div>
          </div>
          <div class="go"><span>${busy ? 'JOB' : on ? onlineLabel(p.id) : 'Idle'}</span><span class="dot ${on || busy ? 'on' : ''}"></span></div>
          ${
            busy
              ? `<button class="card-btn" data-end-job>End job</button>`
              : on
                ? `<button class="card-btn" data-start-job="${p.id}" ${blocked ? 'disabled' : ''}>Start job</button>`
                : `<button class="card-btn" data-toggle="${p.id}" ${blocked ? 'disabled' : ''}>Go live</button>`
          }
          <button class="card-btn ghost" data-open-app="${p.id}">Open</button>
        </div>`;
      }).join('')}
    </div>
    <div class="card">
      <div class="row" style="border:0;padding:0 0 8px">
        <h2 style="margin:0">This week</h2>
        <span class="muted small">${money(week.gross)} gross</span>
      </div>
      <div class="small muted">Net after IRS mileage + expenses: <b style="color:var(--text)">${money(week.net)}</b></div>
    </div>
    <button class="card lab-jump" type="button" data-tab="lab">
      <h2>Showroom</h2>
      <p class="small muted" style="margin:0">JAX and the other live Futuret3ch apps.</p>
    </button>
    <div class="card">
      <h2>Completed jobs</h2>
      ${recentTrips(6)}
    </div>
    ${creditLine()}
  </div>${tabs()}`;
}

function weekBars() {
  const days = [...Array(7)].map((_, i) => {
    const d = new Date(startOfWeek() + i * 86400000);
    const s = summarize(countedTrips(), [], d.getTime(), d.getTime() + 86400000);
    return { label: d.toLocaleDateString(undefined, { weekday: 'narrow' }), gross: s.gross };
  });
  const max = Math.max(1, ...days.map((d) => d.gross));
  return `<div class="week">${days
    .map((d) => `<div class="col"><b style="height:${Math.max(8, (d.gross / max) * 76)}px"></b><span>${d.label}</span></div>`)
    .join('')}</div>`;
}

function statsView() {
  const range = window.__range || 'week';
  const s = range === 'today' ? todaySummary() : range === 'month' ? monthSummary() : weekSummary();
  const maxPlat = Math.max(1, ...PLATFORMS.map((p) => s.byPlatform[p.id]?.gross || 0));
  return `<div class="shell">
    <div class="topbar"><div class="brand"><div><h1>Pay</h1><p>Combined earnings</p></div></div><button class="pill logout-pill" data-logout type="button">Log out</button></div>
    <div class="seg">
      ${['today', 'week', 'month']
        .map(
          (r) =>
            `<button class="${range === r ? 'active uber' : ''}" data-range="${r}">${r[0].toUpperCase() + r.slice(1)}</button>`
        )
        .join('')}
    </div>
    <div class="hero-money">
      <div class="label">Gross</div>
      <div class="dollars">${money(s.gross)}</div>
      <div class="hero-row">
        <div class="stat"><b>${s.trips}</b><span>completed</span></div>
        <div class="stat"><b>${money(s.hourly)}</b><span>/ hour</span></div>
        <div class="stat"><b>${s.miles}</b><span>miles</span></div>
      </div>
    </div>
    <div class="card">
      <h2>By app</h2>
      <div class="bars">
        ${PLATFORMS.map((p) => {
          const g = s.byPlatform[p.id]?.gross || 0;
          const n = s.byPlatform[p.id]?.trips || 0;
          return `<div class="bar-row"><span>${p.short}</span><div class="bar ${p.id}"><i style="width:${(g / maxPlat) * 100}%"></i></div><b>${money(g)}</b></div><div class="small muted" style="margin:-4px 0 8px 80px">${n} trips</div>`;
        }).join('')}
      </div>
    </div>
    <div class="card">
      <h2>This week</h2>
      ${weekBars()}
    </div>
    <div class="card">
      <div class="row"><span>Tips</span><b>${money(s.tips)}</b></div>
      <div class="row"><span>IRS mileage (est.)</span><b>−${money(s.mileageDeduction)}</b></div>
      <div class="row"><span>Expenses</span><b>−${money(s.expenses)}</b></div>
      <div class="row"><span>Net</span><b>${money(s.net)}</b></div>
      <p class="disclaimer">Mileage uses the IRS business rate: 72.5¢/mi Jan–Jun 2026, 76¢/mi from Jul 1, 2026. Estimates only — not tax advice.</p>
    </div>
    ${creditLine()}
  </div>${tabs()}`;
}

function appsView() {
  return `<div class="shell">
    <div class="topbar"><div class="brand"><div><h1>Apps</h1><p>Go online without juggling three home screens</p></div></div><button class="pill logout-pill" data-logout type="button">Log out</button></div>
    ${PLATFORMS.map((p) => {
      const on = state.online[p.id]?.on;
      const busy = state.activeJob?.platform === p.id;
      const blocked = state.activeJob && state.activeJob.platform !== p.id;
      return `<div class="card">
        <div class="row">
          <div class="trip-plat ${p.id}">${p.short.slice(0, 2).toUpperCase()}</div>
          <div class="grow"><b>${p.name}</b><div class="small muted">${busy ? 'Job in progress' : blocked ? 'Paused — one job at a time' : p.kind}</div></div>
        </div>
        ${
          busy
            ? `<button class="btn" data-end-job style="margin:8px 0">End job &amp; log it</button>`
            : `<button class="btn" data-start-job="${p.id}" style="margin:8px 0" ${blocked ? 'disabled' : ''}>Start job</button>`
        }
        <button class="btn ghost" data-toggle="${p.id}" ${blocked ? 'disabled' : ''}>${on ? onlineLabel(p.id) : 'Mark live'}</button>
        <div class="pair" style="margin-top:8px">
          <button class="btn" data-open-app="${p.id}">Open ${p.short}</button>
          <button class="btn ghost" data-store="${p.id}">Store</button>
        </div>
      </div>`;
    }).join('')}
    <p class="disclaimer">${APP} cannot read Uber, Dasher, or Hello Panda offers — those apps don’t allow it. Mark live opens the real app. Drive with location on and the job starts. Pause the other official apps yourself so you don’t double-book.</p>
    ${creditLine()}
  </div>${tabs()}`;
}

function labCards() {
  return LAB.map(
    (app) => `<a class="lab-card" href="${escapeHtml(app.href)}" target="_blank" rel="noopener noreferrer">
      <div class="grow">
        <b>${escapeHtml(app.name)}</b>
        <div class="small muted">${escapeHtml(app.line)}</div>
        <div class="small">${escapeHtml(app.by)}</div>
      </div>
      <span class="pill">Launch</span>
    </a>`
  ).join('');
}

function labView() {
  return `<div class="shell">
    <div class="topbar">
      <div class="brand"><div><h1>Showroom</h1><p>Live apps. Nothing here is a mock.</p></div></div>
      ${state.profile.onboarded ? '<button class="pill logout-pill" data-logout type="button">Log out</button>' : '<button class="pill" data-tab="home" type="button">Back</button>'}
    </div>
    <p class="small muted">Each card opens the running app. T3x Shift is this page.</p>
    ${labCards()}
    <div class="card">
      <h2>T3x Shift</h2>
      <p class="small muted" style="margin:0">This app. Uber, Dasher, and Hello Panda on one iPhone screen.</p>
    </div>
    ${creditLine()}
  </div>${state.profile.onboarded ? tabs() : ''}`;
}

function moreView() {
  const token = state.apiToken;
  const origin = location.origin;
  return `<div class="shell">
    <div class="topbar">
      <div class="brand"><div><h1>More</h1><p>Garage, API, export</p></div></div>
      <button class="pill logout-pill" data-logout type="button">Log out</button>
    </div>
    <button class="btn danger" data-logout type="button" style="margin-bottom:12px">Log out</button>
    <div class="card">
      <h2>Profile</h2>
      <div class="field"><label>Name</label><input id="name" value="${escapeHtml(state.profile.name)}" /></div>
      <div class="pair">
        <div class="field"><label>Daily goal</label><input id="daily" type="number" inputmode="decimal" value="${state.profile.dailyGoal}" /></div>
        <div class="field"><label>Weekly goal</label><input id="weekly" type="number" inputmode="decimal" value="${state.profile.weeklyGoal}" /></div>
      </div>
      <button class="btn" data-save-profile>Save</button>
    </div>
    <div class="card">
      <h2>Expenses</h2>
      ${
        state.expenses.length
          ? [...state.expenses]
              .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt))
              .map(
                (e) => `<div class="row">
                  <div class="grow"><b>${escapeHtml(e.category)}</b><div class="small muted">${new Date(e.occurredAt).toLocaleDateString()}</div></div>
                  <b>${money(e.amount)}</b>
                </div>`
              )
              .join('')
          : `<div class="empty">No expenses yet.</div>`
      }
      <button class="btn ghost" data-open="expense" style="margin-top:8px">Add expense</button>
    </div>
    <div class="card">
      <h2>${APP} API</h2>
      <p class="small muted">Stateless HTTP API for iPhone Shortcuts, sheets, and your own scripts. History stays on this phone.</p>
      <div class="code">GET  ${origin}/api/health
GET  ${origin}/api/v1/platforms
POST ${origin}/api/v1/preview
POST ${origin}/api/v1/summary
GET  ${origin}/api/v1/openapi

Local token: ${token}</div>
      <p class="small muted" style="margin-top:8px">Preview example</p>
      <div class="code">curl -s ${origin}/api/v1/preview \\
  -H 'content-type: application/json' \\
  -d '{"platform":"panda","fare":12.5,"tip":3,"miles":4.2,"minutes":18}'</div>
    </div>
    <div class="stack">
      <button class="btn ghost" data-export="csv">Export trips CSV</button>
      <button class="btn ghost" data-export="json">Export backup JSON</button>
      <button class="btn ghost" data-demo>Load sample week</button>
      <button class="btn danger" data-reset>Clear this phone</button>
    </div>
    <div class="card">
      <h2>About</h2>
      <p class="small" style="margin:0 0 8px"><b>${ECO}</b></p>
      <p class="small muted" style="margin:0">${DEVELOPED}.</p>
    </div>
    <p class="disclaimer" style="margin-top:14px">${APP} is not affiliated with Uber, DoorDash, HungryPanda, or Hello Panda. Use official apps for offers, navigation, and payouts.</p>
    ${creditLine()}
  </div>${tabs()}`;
}

function logSheet() {
  const platform = sheet.platform || 'uber';
  return `<div class="sheet-bg" data-close-sheet>
    <div class="sheet" data-sheet>
      <div class="handle"></div>
      <h2 style="margin:0 0 12px">${sheet.tripId ? 'Job completed' : 'Log a trip'}</h2>
      <div class="seg">
        ${PLATFORMS.map(
          (p) => `<button class="${platform === p.id ? 'active ' + p.id : ''}" data-plat="${p.id}">${p.short}</button>`
        ).join('')}
      </div>
      <div class="pair">
        <div class="field"><label>Fare</label><input id="fare" type="number" inputmode="decimal" placeholder="0.00" value="${sheet.fare ? escapeHtml(sheet.fare) : ''}" /></div>
        <div class="field"><label>Tip</label><input id="tip" type="number" inputmode="decimal" placeholder="0.00" value="${sheet.tip ? escapeHtml(sheet.tip) : ''}" /></div>
      </div>
      <div class="pair">
        <div class="field"><label>Miles</label><input id="miles" type="number" inputmode="decimal" placeholder="0.0" value="${sheet.miles ? escapeHtml(sheet.miles) : ''}" /></div>
        <div class="field"><label>Minutes</label><input id="minutes" type="number" inputmode="numeric" placeholder="15" value="${sheet.minutes ? escapeHtml(sheet.minutes) : ''}" /></div>
      </div>
      <div class="field"><label>Notes</label><input id="notes" placeholder="Airport, stack, promo…" value="${escapeHtml(sheet.notes || '')}" /></div>
      <button class="btn" data-save-trip>${sheet.tripId ? 'Save fare' : 'Save trip'}</button>
    </div>
  </div>`;
}

function expenseSheet() {
  return `<div class="sheet-bg" data-close-sheet>
    <div class="sheet" data-sheet>
      <div class="handle"></div>
      <h2 style="margin:0 0 12px">Add expense</h2>
      <div class="field"><label>Category</label>
        <select id="cat">
          <option>Gas</option><option>Maintenance</option><option>Car wash</option>
          <option>Phone</option><option>Parking</option><option>Supplies</option><option>Other</option>
        </select>
      </div>
      <div class="field"><label>Amount</label><input id="amount" type="number" inputmode="decimal" placeholder="0.00" /></div>
      <div class="field"><label>Notes</label><input id="enotes" placeholder="Optional" /></div>
      <button class="btn" data-save-expense>Save expense</button>
    </div>
  </div>`;
}

function welcomeView() {
  return `<div class="welcome">
    <img class="mascot" src="/icons/icon-192.png" alt="T3x Shift" />
    <p class="eco-mark">${ECO}</p>
    <h1>${APP}</h1>
    <p class="lead">One iPhone home screen for Uber, Dasher, and Hello Panda. Track every drop and jump into the right app.</p>
    <div class="tags">
      <span class="tag uber">Uber</span>
      <span class="tag dasher">Dasher</span>
      <span class="tag panda">Hello Panda</span>
    </div>
    <div class="field"><label>What should we call you?</label><input id="wname" placeholder="Your name" value="${escapeHtml(state.profile.name)}" /></div>
    <div class="field"><label>Daily goal</label><input id="wgoal" type="number" inputmode="decimal" value="${state.profile.dailyGoal}" /></div>
    <div class="stack" style="margin-top:auto">
      <button class="btn" data-start>Start on this iPhone</button>
      <button class="btn ghost" data-demo-start>Preview with sample trips</button>
    </div>
    <div class="showroom">
      <p class="eco-mark">Showroom</p>
      <h2>Apps on the bench</h2>
      <p class="lead">Live Futuret3ch apps. Each one opens the real product.</p>
      ${labCards()}
    </div>
    <p class="credit" style="margin-top:14px">${DEVELOPED}.</p>
    <p class="disclaimer">Not affiliated with Uber, DoorDash, or HungryPanda.</p>
  </div>`;
}

function render() {
  if (!state.profile.onboarded && tab !== 'lab') {
    root.innerHTML = welcomeView();
    return;
  }
  let html = '';
  if (tab === 'lab') html = labView();
  else if (!state.profile.onboarded) html = welcomeView();
  else if (tab === 'stats') html = statsView();
  else if (tab === 'apps') html = appsView();
  else if (tab === 'more') html = moreView();
  else html = homeView();
  if (sheet?.type === 'log') html += logSheet();
  if (sheet?.type === 'expense') html += expenseSheet();
  root.innerHTML = html;
}

function download(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCsv() {
  const header = 'id,platform,occurredAt,fare,tip,miles,minutes,gross,mileageDeduction,net\n';
  const rows = state.trips
    .map((t) => {
      const e = enrichTrip(t);
      return [e.id || t.id, t.platform, t.occurredAt, e.fare, e.tip, e.miles, e.minutes, e.gross, e.mileageDeduction, e.net].join(',');
    })
    .join('\n');
  download('t3x-shift-trips.csv', header + rows, 'text/csv');
}

root.addEventListener('click', (e) => {
  const t = e.target.closest('[data-tab],[data-open],[data-open-app],[data-toggle],[data-store],[data-plat],[data-save-trip],[data-save-expense],[data-save-profile],[data-start],[data-demo],[data-demo-start],[data-export],[data-reset],[data-range],[data-close-sheet],[data-start-job],[data-end-job],[data-edit-trip],[data-logout],[data-listen]');
  if (!t) return;
  if (t.disabled || t.getAttribute('disabled') !== null) return;

  if (t.hasAttribute('data-logout')) {
    if (state.activeJob && !confirm('A job is in progress. Log out anyway?')) return;
    state.activeJob = null;
    for (const p of PLATFORMS) state.online[p.id] = { on: false, since: null };
    stopListener();
    state.profile.onboarded = false;
    persist();
    tab = 'home';
    sheet = null;
    render();
    return;
  }
  if (t.dataset.tab) {
    tab = t.dataset.tab;
    sheet = null;
    render();
    return;
  }
  if (t.dataset.range) {
    window.__range = t.dataset.range;
    render();
    return;
  }
  if (t.dataset.open === 'log') {
    sheet = { type: 'log', platform: state.activeJob?.platform || 'uber' };
    render();
    return;
  }
  if (t.dataset.open === 'expense') {
    sheet = { type: 'expense' };
    render();
    return;
  }
  if (t.hasAttribute('data-close-sheet') && e.target === t) {
    sheet = null;
    render();
    return;
  }
  if (t.dataset.plat) {
    sheet = { type: 'log', platform: t.dataset.plat };
    render();
    return;
  }
  if (t.hasAttribute('data-listen')) {
    ensureListener();
    render();
    return;
  }
  if (t.dataset.openApp) {
    launchApp(platformById[t.dataset.openApp]);
    return;
  }
  if (t.dataset.store) {
    openPlatform(platformById[t.dataset.store], { store: true });
    return;
  }
  if (t.dataset.toggle) {
    toggleOnline(t.dataset.toggle);
    return;
  }
  if (t.dataset.startJob) {
    startJob(t.dataset.startJob);
    return;
  }
  if (t.dataset.editTrip) {
    const trip = state.trips.find((item) => item.id === t.dataset.editTrip);
    if (!trip) return;
    sheet = {
      type: 'log',
      platform: trip.platform,
      minutes: trip.minutes,
      miles: trip.miles,
      tripId: trip.id,
      fare: trip.fare,
      tip: trip.tip,
      notes: trip.notes || ''
    };
    render();
    return;
  }
  if (t.hasAttribute('data-end-job')) {
    endJob();
    return;
  }
  if (t.hasAttribute('data-save-trip')) {
    const fareRaw = document.getElementById('fare').value;
    if (fareRaw === '' && !sheet.tripId) return showToast('Add a fare');
    const fare = Number(fareRaw) || 0;
    const next = {
      platform: sheet.platform,
      fare,
      tip: Number(document.getElementById('tip').value) || 0,
      miles: Number(document.getElementById('miles').value) || 0,
      minutes: Number(document.getElementById('minutes').value) || 0,
      notes: document.getElementById('notes').value.trim(),
      status: 'completed',
      payPending: fareRaw === ''
    };
    if (sheet.tripId) {
      const existing = state.trips.find((trip) => trip.id === sheet.tripId);
      if (existing) Object.assign(existing, next);
    } else {
      state.trips.push({
        id: uid('trip'),
        ...next,
        source: 'logged',
        occurredAt: new Date().toISOString()
      });
    }
    state.activeJob = null;
    persist();
    sheet = null;
    tab = 'home';
    render();
    showToast('Completed job saved');
    return;
  }
  if (t.hasAttribute('data-save-expense')) {
    const amount = Number(document.getElementById('amount').value);
    if (!amount) return showToast('Add an amount');
    state.expenses.push({
      id: uid('exp'),
      category: document.getElementById('cat').value,
      amount,
      notes: document.getElementById('enotes').value.trim(),
      occurredAt: new Date().toISOString()
    });
    persist();
    sheet = null;
    render();
    showToast('Expense saved');
    return;
  }
  if (t.hasAttribute('data-save-profile')) {
    state.profile.name = document.getElementById('name').value.trim() || state.profile.name;
    state.profile.dailyGoal = Number(document.getElementById('daily').value) || 0;
    state.profile.weeklyGoal = Number(document.getElementById('weekly').value) || 0;
    persist();
    showToast('Saved');
    return;
  }
  if (t.hasAttribute('data-start')) {
    state.profile.name = document.getElementById('wname').value.trim() || 'Driver';
    state.profile.dailyGoal = Number(document.getElementById('wgoal').value) || 150;
    state.profile.onboarded = true;
    persist();
    render();
    return;
  }
  if (t.hasAttribute('data-demo') || t.hasAttribute('data-demo-start')) {
    const name = document.getElementById('wname')?.value.trim();
    const goal = document.getElementById('wgoal')?.value;
    state = seedDemo(state);
    if (name) state.profile.name = name;
    if (goal) state.profile.dailyGoal = Number(goal) || state.profile.dailyGoal;
    persist();
    tab = 'home';
    render();
    showToast('Sample week loaded');
    return;
  }
  if (t.dataset.export === 'csv') return exportCsv();
  if (t.dataset.export === 'json') return download('t3x-shift-backup.json', JSON.stringify(state, null, 2), 'application/json');
  if (t.hasAttribute('data-reset')) {
    if (confirm('Clear all trips and expenses on this iPhone?')) {
      const profile = state.profile;
      const apiToken = state.apiToken;
      state = emptyState();
      state.profile = { ...profile, onboarded: true };
      state.apiToken = apiToken;
      persist();
      render();
    }
  }
});

render();
if (state.profile.onboarded) ensureListener();
