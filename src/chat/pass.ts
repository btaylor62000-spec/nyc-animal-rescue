/**
 * Short-lived, stateless proof that someone has passed Turnstile.
 *
 * Turnstile tokens are single-use, so re-verifying on every message would mean
 * a fresh challenge per message. Instead the first message is verified and the
 * server issues a signed pass for the next 45 minutes.
 *
 * Stateless on purpose: any store with enough write throughput to hold
 * sessions costs money, and the whole site has to run on nothing.
 */
const encoder = new TextEncoder();

async function key(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

function toBase64Url(bytes: ArrayBuffer): string {
  const bin = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): ArrayBuffer {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

/**
 * The pass binds to a coarse client fingerprint so it cannot simply be
 * copied between machines, and to an expiry so it cannot be kept.
 */
export async function issuePass(secret: string, clientKey: string, ttlSeconds: number): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${exp}.${clientKey}`;
  const sig = await crypto.subtle.sign('HMAC', await key(secret), encoder.encode(payload));
  return `${exp}.${toBase64Url(sig)}`;
}

export async function verifyPass(secret: string, clientKey: string, pass: string): Promise<boolean> {
  const dot = pass.indexOf('.');
  if (dot < 1) return false;
  const exp = Number(pass.slice(0, dot));
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false;

  const sig = fromBase64Url(pass.slice(dot + 1));
  const payload = `${exp}.${clientKey}`;
  try {
    return await crypto.subtle.verify('HMAC', await key(secret), sig, encoder.encode(payload));
  } catch {
    return false;
  }
}

/**
 * A coarse, non-identifying client key: a hash of the IP and user agent.
 *
 * Hashed so nothing that could identify a person is held even in memory
 * longer than the request, and truncated because we only need it to tell
 * clients apart, not to recognise them later.
 */
export async function clientKeyFor(ip: string, userAgent: string, salt: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`${salt}|${ip}|${userAgent}`));
  return toBase64Url(digest).slice(0, 22);
}
