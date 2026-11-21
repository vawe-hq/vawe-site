import crypto from 'node:crypto';

// The admin page has one secret, ADMIN_TOKEN. A login trades it for a signed session cookie that never
// holds the token. A POST action also carries a CSRF value derived from that cookie.

export const COOKIE = 'vawe_admin';
export const SESSION_SECONDS = 8 * 60 * 60;

const mac = (secret, text) => crypto.createHmac('sha256', secret).update(text).digest('hex');

function same(a, b) {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}

export const adminEnabled = (token) => typeof token === 'string' && token.length >= 16;

export function checkLogin(token, given) {
  return adminEnabled(token) && typeof given === 'string' && same(token, given);
}

export function issueSession(token, nowMs = Date.now()) {
  const expires = Math.floor(nowMs / 1000) + SESSION_SECONDS;
  return `${expires}.${mac(token, `session:${expires}`)}`;
}

export function sessionValid(token, cookie, nowMs = Date.now()) {
  if (!adminEnabled(token) || typeof cookie !== 'string') return false;
  const [expires, sig, ...rest] = cookie.split('.');
  if (rest.length || !/^\d{1,12}$/.test(expires ?? '') || !sig) return false;
  if (Number(expires) * 1000 < nowMs) return false;
  return same(mac(token, `session:${expires}`), sig);
}

export const csrfFor = (token, cookie) => mac(token, `csrf:${cookie}`);

export function csrfValid(token, cookie, given) {
  return sessionValid(token, cookie) && typeof given === 'string' && same(csrfFor(token, cookie), given);
}
