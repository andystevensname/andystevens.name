// IndieAuth client (PKCE S256, scope=create, full-page redirect).
//
// Flow:
//   1. startAuth() generates a PKCE verifier + CSRF state, stashes them in
//      sessionStorage, and full-page-redirects to the authorization endpoint.
//   2. The server bounces the user back to redirect_uri with ?code= & ?state=.
//   3. ensureToken() detects those params, calls handleCallback() to verify
//      state and exchange the code for a token, then cleans the URL.
//
// Storage:
//   - sessionStorage holds the PKCE verifier, the CSRF state token, and a
//     copy of the pre-redirect query string (so bookmarklet prefill data
//     survives the round trip). All cleared on first use after callback.
//   - localStorage holds the access token + metadata (no expiry advertised
//     by IndieKit; we store the acquisition timestamp for future use).

const AUTH_ENDPOINT = 'https://ik.andystevens.name/auth';
const TOKEN_ENDPOINT = 'https://ik.andystevens.name/auth/token';
const ME = 'https://andystevens.name';
const SCOPE = 'create';

const TOKEN_KEY = 'indieauth-token';
const VERIFIER_KEY = 'indieauth-verifier';
const STATE_KEY = 'indieauth-state';
const PENDING_PARAMS_KEY = 'indieauth-pending-params';

export interface StoredToken {
  access_token: string;
  scope: string;
  me: string;
  acquired_at: number;
}

function clientUrls(): { client_id: string; redirect_uri: string } {
  const origin = window.location.origin;
  const isLocalhost =
    origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');

  // Localhost dev: IndieKit can't fetch a localhost client_id to verify
  // it, so it errors with "fetch failed". Use the production URL as
  // client_id (publicly fetchable) but keep redirect_uri on localhost.
  // The production /post/ page declares a <link rel="redirect_uri">
  // for the localhost URL so IndieKit accepts the cross-origin pair.
  if (isLocalhost) {
    return {
      client_id: 'https://andystevens.name/post/',
      redirect_uri: `${origin}/post/`,
    };
  }

  const base = `${origin}/post/`;
  return { client_id: base, redirect_uri: base };
}

function randomBytes(n: number): Uint8Array {
  const arr = new Uint8Array(n);
  crypto.getRandomValues(arr);
  return arr;
}

function base64urlFromBytes(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256Base64Url(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64urlFromBytes(new Uint8Array(digest));
}

export function getToken(): StoredToken | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? (JSON.parse(raw) as StoredToken) : null;
  } catch {
    return null;
  }
}

export function clearToken(): void {
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
}

export async function startAuth(): Promise<void> {
  const verifier = base64urlFromBytes(randomBytes(48));
  const state = base64urlFromBytes(randomBytes(24));
  const challenge = await sha256Base64Url(verifier);

  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem(STATE_KEY, state);
  // Preserve the bookmarklet's prefill params across the auth round-trip.
  sessionStorage.setItem(PENDING_PARAMS_KEY, window.location.search);

  const { client_id, redirect_uri } = clientUrls();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id,
    redirect_uri,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    scope: SCOPE,
    me: ME,
  });

  window.location.href = `${AUTH_ENDPOINT}?${params}`;
}

async function handleCallback(code: string, returnedState: string): Promise<StoredToken> {
  const expectedState = sessionStorage.getItem(STATE_KEY);
  const verifier = sessionStorage.getItem(VERIFIER_KEY);

  if (!expectedState || !verifier) {
    throw new Error('No pending auth flow (missing state or verifier).');
  }
  if (returnedState !== expectedState) {
    throw new Error('State mismatch — aborting (possible CSRF).');
  }

  // Single-use values: clear immediately so they can't be replayed.
  sessionStorage.removeItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);

  const { client_id, redirect_uri } = clientUrls();
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id,
    redirect_uri,
    code_verifier: verifier,
  });

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Token exchange failed (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as { access_token?: string; scope?: string; me?: string };

  if (!data.access_token || !data.scope || !data.me) {
    throw new Error('Token endpoint response missing required fields.');
  }
  if (data.me !== ME) {
    throw new Error(`Token returned for unexpected identity: ${data.me}`);
  }
  if (!data.scope.split(/\s+/).includes('create')) {
    throw new Error(`Token does not include required 'create' scope (got: ${data.scope}).`);
  }

  const stored: StoredToken = {
    access_token: data.access_token,
    scope: data.scope,
    me: data.me,
    acquired_at: Date.now(),
  };
  localStorage.setItem(TOKEN_KEY, JSON.stringify(stored));
  return stored;
}

// Call once on page load. Returns the existing token, or processes a callback
// if ?code=&state= are present, or null if no auth has happened yet.
export async function ensureToken(): Promise<StoredToken | null> {
  const params = new URLSearchParams(window.location.search);
  const error = params.get('error');
  const code = params.get('code');
  const state = params.get('state');

  if (error) {
    // User denied or server rejected. Clean up any pending state.
    sessionStorage.removeItem(VERIFIER_KEY);
    sessionStorage.removeItem(STATE_KEY);
    sessionStorage.removeItem(PENDING_PARAMS_KEY);
    const description = params.get('error_description');
    throw new Error(`Authorization failed: ${error}${description ? ` — ${description}` : ''}`);
  }

  if (code && state) {
    const token = await handleCallback(code, state);

    // Restore the bookmarklet's prefill params (if any) and strip the
    // OAuth callback params so a refresh doesn't re-process them.
    const pending = sessionStorage.getItem(PENDING_PARAMS_KEY) ?? '';
    sessionStorage.removeItem(PENDING_PARAMS_KEY);
    const cleanUrl = new URL(window.location.href);
    cleanUrl.search = pending;
    window.history.replaceState({}, '', cleanUrl.toString());

    return token;
  }

  return getToken();
}
