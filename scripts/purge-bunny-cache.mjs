// Purge the Bunny pull zone after deploy. Storage uploads alone don't
// invalidate the CDN — pages are served with a 30-day max-age, so
// without a purge the edges keep returning whatever they cached (stale
// indexes, even cached 404s for brand-new post URLs).
//
// The pull zone is looked up by hostname rather than configured by ID,
// so this keeps working if the zone is ever recreated.
//
// Env:
//   BUNNY_API_KEY    — account API key (same one the Edge Script deploy uses)
//   PURGE_HOSTNAME   — hostname to find the pull zone by; defaults to
//                      andystevens.name

const API = 'https://api.bunny.net';
const apiKey = process.env.BUNNY_API_KEY?.trim();
const hostname = process.env.PURGE_HOSTNAME || 'andystevens.name';

if (!apiKey) {
  console.error('BUNNY_API_KEY not set');
  process.exit(1);
}

async function api(path, options = {}) {
  const res = await fetch(API + path, {
    ...options,
    headers: { AccessKey: apiKey, Accept: 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${options.method || 'GET'} ${path}: ${res.status} ${res.statusText} ${text.slice(0, 200)}`);
  }
  return res;
}

async function findZoneId() {
  const res = await api('/pullzone');
  const zones = await res.json();
  const zone = zones.find((z) =>
    (z.Hostnames || []).some((h) => h.Value === hostname)
  );
  if (!zone) {
    throw new Error(`No pull zone found with hostname ${hostname}`);
  }
  return zone.Id;
}

// A failed purge means the deploy silently keeps serving stale pages —
// exactly the failure mode this script exists to prevent — so retry a
// few times and then fail the build loudly rather than shrugging.
const ATTEMPTS = 3;
let lastError;
for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
  try {
    const zoneId = await findZoneId();
    await api(`/pullzone/${zoneId}/purgeCache`, { method: 'POST' });
    console.log(`Purged pull zone ${zoneId} (${hostname})`);
    process.exit(0);
  } catch (err) {
    lastError = err;
    console.warn(`Purge attempt ${attempt}/${ATTEMPTS} failed: ${err.message}`);
    if (attempt < ATTEMPTS) await new Promise((r) => setTimeout(r, attempt * 5000));
  }
}
console.error(`Cache purge failed after ${ATTEMPTS} attempts: ${lastError.message}`);
process.exit(1);
