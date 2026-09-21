/** Pure helpers + geolocation watcher. Auto-start jobs when the phone is actually moving. */

export const DRIVE_MPS = 4; // ~9 mph — above a jog, typical rolling car
export const DRIVE_HOLD_MS = 6000;
export const STOP_MPS = 1.4; // walking
export const STOP_HOLD_MS = 90000;

export function haversineM(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function speedMps(prev, next) {
  if (!prev || !next) return 0;
  const reported = next.speed;
  if (typeof reported === 'number' && reported >= 0 && Number.isFinite(reported)) return reported;
  const dt = (next.t - prev.t) / 1000;
  if (dt <= 0.4) return 0;
  return haversineM(prev, next) / dt;
}

export function createDriveMachine({
  driveMps = DRIVE_MPS,
  driveHoldMs = DRIVE_HOLD_MS,
  stopMps = STOP_MPS,
  stopHoldMs = STOP_HOLD_MS
} = {}) {
  let movingSince = 0;
  let stoppedSince = 0;
  let driving = false;
  return {
    driving: () => driving,
    sample(v, now = Date.now()) {
      if (v >= driveMps) {
        stoppedSince = 0;
        if (!movingSince) movingSince = now;
        if (!driving && now - movingSince >= driveHoldMs) {
          driving = true;
          return 'drive';
        }
      } else if (v <= stopMps) {
        movingSince = 0;
        if (!stoppedSince) stoppedSince = now;
        if (driving && now - stoppedSince >= stopHoldMs) {
          driving = false;
          return 'stop';
        }
      } else {
        movingSince = 0;
        stoppedSince = 0;
      }
      return driving ? 'driving' : 'idle';
    },
    reset() {
      movingSince = 0;
      stoppedSince = 0;
      driving = false;
    }
  };
}

export function startDriveWatch({ onSample, onError, onStatus } = {}) {
  if (!navigator.geolocation) {
    onStatus?.('unsupported');
    onError?.(new Error('no geolocation'));
    return () => {};
  }
  onStatus?.('watching');
  let prev = null;
  const id = navigator.geolocation.watchPosition(
    (pos) => {
      const next = {
        t: pos.timestamp || Date.now(),
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        speed: pos.coords.speed
      };
      const v = speedMps(prev, next);
      prev = next;
      onSample?.({ v, pos: next });
    },
    (err) => {
      onStatus?.(err.code === 1 ? 'denied' : 'error');
      onError?.(err);
    },
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 }
  );
  return () => {
    navigator.geolocation.clearWatch(id);
    onStatus?.('off');
  };
}
