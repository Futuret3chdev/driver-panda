/** Open the installed driver app. Never target=_blank a custom scheme — Safari treats that as an invalid new page. */

export function deviceKind() {
  const ua = navigator.userAgent || '';
  if (/Android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  return 'desktop';
}

export function openPlatform(p, { store = false, onMiss } = {}) {
  if (!p) return;
  const kind = deviceKind();
  if (store) {
    const url = kind === 'android' ? p.playUrl || p.storeUrl : p.storeUrl;
    window.open(url, '_blank', 'noopener');
    return;
  }
  if (kind === 'desktop') {
    window.open(p.webUrl || p.storeUrl, '_blank', 'noopener');
    return;
  }
  if (kind === 'android' && p.androidIntent) {
    window.location.href = p.androidIntent;
    return;
  }
  const scheme = (p.schemes && p.schemes[0]) || p.openUrl;
  if (!scheme || scheme.startsWith('http')) {
    window.open(p.universalUrl || p.storeUrl, '_blank', 'noopener');
    return;
  }
  tryScheme(scheme, onMiss);
}

function tryScheme(scheme, onMiss) {
  let left = false;
  const mark = () => {
    left = true;
  };
  document.addEventListener('visibilitychange', mark);
  window.addEventListener('pagehide', mark);
  window.addEventListener('blur', mark);

  const a = document.createElement('a');
  a.href = scheme;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => {
    document.removeEventListener('visibilitychange', mark);
    window.removeEventListener('pagehide', mark);
    window.removeEventListener('blur', mark);
    if (left || document.hidden) return;
    if (typeof onMiss === 'function') onMiss();
  }, 1100);
}
