import { createHash, randomInt } from 'node:crypto';
import express from 'express';
import bcrypt from 'bcryptjs';
import { query, one } from '../db/index.js';
import { signToken, requireAuth } from '../lib/auth.js';
import { notify } from '../lib/notify.js';

const router = express.Router();

// In development the OTP is returned in the response so the flow is testable
// without an SMS provider. Set SMS_PROVIDER + credentials to disable this.
const OTP_IN_RESPONSE = process.env.NODE_ENV !== 'production' && !process.env.SMS_PROVIDER;

const isPhone = (p) => /^[6-9]\d{9}$/.test(String(p || '').trim());

/** Five guesses is generous for a code the owner can read off their screen. */
const MAX_OTP_ATTEMPTS = 5;

/**
 * Codes are stored hashed, so a leaked table cannot be used to sign in during
 * the ten minutes a code lives. The phone is mixed in so identical codes for
 * different numbers do not share a hash.
 */
const hashCode = (phone, code) => createHash('sha256').update(`${phone}:${code}`).digest('hex');

/**
 * Password login throttling. Per number stops a targeted guess at one staff
 * account; per address stops one machine sweeping many numbers. The address
 * limit is looser because an office shares one connection.
 */
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS_PER_PHONE = 5;
const MAX_FAILS_PER_IP = 30;

/** Compared against when the number is unknown, so both paths take as long. */
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser', 10);

const MIN_PASSWORD_LENGTH = 10;

async function loginLocked(phone, ip) {
  const since = new Date(Date.now() - LOGIN_WINDOW_MS).toISOString();
  const row = await one(
    `SELECT
       (SELECT COUNT(*) FROM login_failures WHERE phone = $1 AND created_at > $3) AS by_phone,
       (SELECT COUNT(*) FROM login_failures WHERE ip = $2 AND created_at > $3) AS by_ip`,
    [phone, ip, since]
  );
  return Number(row.by_phone) >= MAX_FAILS_PER_PHONE || Number(row.by_ip) >= MAX_FAILS_PER_IP;
}

async function recordLoginFailure(phone, ip) {
  const now = Date.now();
  await query('DELETE FROM login_failures WHERE created_at < $1',
    [new Date(now - LOGIN_WINDOW_MS).toISOString()]);
  await query('INSERT INTO login_failures (phone, ip, created_at) VALUES ($1, $2, $3)',
    [phone, ip, new Date(now).toISOString()]);
}

const tooManyTries = (res) => res.status(429).json({
  error: 'Too many wrong passwords. Wait 15 minutes and try again.',
});

const publicUser = (u) => ({
  id: u.id, name: u.name, phone: u.phone, email: u.email,
  role: u.role, loyaltyPoints: u.loyalty_points, referralCode: u.referral_code,
  hasPassword: Boolean(u.password_hash),
});

const makeReferralCode = (name) =>
  `${String(name).split(' ')[0].toUpperCase().slice(0, 5)}${Math.floor(1000 + Math.random() * 9000)}`;

/** Step 1 of phone login: issue a one-time code. */
router.post('/otp/request', async (req, res) => {
  const phone = String(req.body.phone || '').trim();
  if (!isPhone(phone)) {
    return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number.' });
  }
  // Cap sends per number so this cannot be used to bomb someone's phone.
  // Only codes still outstanding count: signing in consumes one, so somebody
  // logging in repeatedly is never locked out, while an unanswered flood is.
  const outstanding = await one(
    `SELECT COUNT(*) AS n FROM otp_codes
     WHERE phone = $1 AND consumed = false AND expires_at > $2`,
    [phone, new Date().toISOString()]
  );
  if (Number(outstanding?.n ?? 0) >= 4) {
    return res.status(429).json({
      error: 'Too many codes requested for this number. Wait a few minutes and try again.',
    });
  }

  // Math.random is predictable from its past output; a login code must not be.
  const code = String(randomInt(100000, 1000000));
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await query(
    'INSERT INTO otp_codes (phone, code, expires_at) VALUES ($1, $2, $3)',
    [phone, hashCode(phone, code), expires]
  );
  await notify({
    channel: 'whatsapp', recipient: phone, template: 'broadcast',
    data: { body: `${code} is your Jai Maa Durge Tourism verification code. Valid for 10 minutes.` },
  });
  res.json({
    sent: true,
    expiresInSeconds: 600,
    ...(OTP_IN_RESPONSE ? { devCode: code } : {}),
  });
});

/** Step 2: verify the code, creating the customer account on first login. */
router.post('/otp/verify', async (req, res) => {
  const phone = String(req.body.phone || '').trim();
  const code = String(req.body.code || '').trim();
  const name = String(req.body.name || '').trim();

  // Find the live code for this number first, so a wrong guess can be
  // counted against it. Matching on the code alone would let an attacker
  // guess for ever without ever incrementing anything.
  const live = await one(
    `SELECT * FROM otp_codes
     WHERE phone = $1 AND consumed = false AND expires_at > $2
     ORDER BY id DESC LIMIT 1`,
    [phone, new Date().toISOString()]
  );
  if (!live) return res.status(400).json({ error: 'That code is incorrect or has expired.' });

  if (live.attempts >= MAX_OTP_ATTEMPTS) {
    return res.status(429).json({
      error: 'Too many wrong codes. Ask for a new one.',
    });
  }

  if (String(live.code) !== hashCode(phone, code)) {
    await query('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1', [live.id]);
    const left = MAX_OTP_ATTEMPTS - (live.attempts + 1);
    return res.status(400).json({
      error: left > 0
        ? `That code is incorrect. ${left} attempt${left === 1 ? '' : 's'} left.`
        : 'That code is incorrect. Ask for a new one.',
    });
  }
  let user = await one('SELECT * FROM users WHERE phone = $1', [phone]);
  if (!user && !name) {
    // First-time number: ask for a name and let them retry with the SAME
    // code. The code used to be spent before this point, so every new
    // customer got "That code is incorrect" on their second press.
    return res.status(409).json({ error: 'name_required', message: 'Tell us your name to finish signing up.' });
  }
  await query('UPDATE otp_codes SET consumed = true WHERE id = $1', [live.id]);

  if (!user) {
    const referrer = req.body.referralCode
      ? await one('SELECT id FROM users WHERE referral_code = $1', [String(req.body.referralCode).toUpperCase()])
      : null;
    const created = await query(
      `INSERT INTO users (name, phone, role, referral_code, referred_by, loyalty_points)
       VALUES ($1, $2, 'customer', $3, $4, $5) RETURNING *`,
      [name, phone, makeReferralCode(name), referrer?.id ?? null, referrer ? 100 : 0]
    );
    user = created[0];
    if (referrer) {
      await query('UPDATE users SET loyalty_points = loyalty_points + 200 WHERE id = $1', [referrer.id]);
    }
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

/** Password login, used by guides, drivers and HQ staff. */
router.post('/login', async (req, res) => {
  const phone = String(req.body.phone || '').trim();
  const password = String(req.body.password || '');
  const ip = req.ip || 'unknown';
  // Checked before the password, so a locked account stays locked even to a
  // correct guess; otherwise the lock would only slow the attacker down.
  if (await loginLocked(phone, ip)) return tooManyTries(res);

  const user = await one('SELECT * FROM users WHERE phone = $1', [phone]);
  const ok = await bcrypt.compare(password, user?.password_hash || DUMMY_HASH);
  if (!user?.password_hash || !ok) {
    await recordLoginFailure(phone, ip);
    return res.status(401).json({ error: 'Incorrect phone number or password.' });
  }
  await query('DELETE FROM login_failures WHERE phone = $1', [phone]);
  res.json({ token: signToken(user), user: publicUser(user) });
});

/** Change your own password. Requires the current one, and counts wrong guesses. */
router.post('/password', requireAuth(), async (req, res) => {
  const current = String(req.body.currentPassword || '');
  const next = String(req.body.newPassword || '');
  const ip = req.ip || 'unknown';

  const user = await one('SELECT * FROM users WHERE id = $1', [req.user.sub]);
  if (!user?.password_hash) {
    return res.status(400).json({ error: 'This account signs in with a one-time code, not a password.' });
  }
  if (await loginLocked(user.phone, ip)) return tooManyTries(res);
  if (!(await bcrypt.compare(current, user.password_hash))) {
    await recordLoginFailure(user.phone, ip);
    return res.status(400).json({ error: 'Your current password is incorrect.' });
  }
  if (next.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `Use at least ${MIN_PASSWORD_LENGTH} characters.` });
  }
  if (next === current) {
    return res.status(400).json({ error: 'Choose a password different from the current one.' });
  }
  if (next.toLowerCase().includes('demo1234') || next.includes(user.phone)) {
    return res.status(400).json({ error: 'That password is too easy to guess. Choose another.' });
  }

  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [await bcrypt.hash(next, 10), user.id]);
  await query('DELETE FROM login_failures WHERE phone = $1', [user.phone]);
  res.json({ ok: true });
});

router.get('/me', requireAuth(), async (req, res) => {
  const user = await one('SELECT * FROM users WHERE id = $1', [req.user.sub]);
  if (!user) return res.status(404).json({ error: 'Account not found.' });
  res.json({ user: publicUser(user) });
});

export default router;
