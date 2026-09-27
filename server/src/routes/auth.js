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

const publicUser = (u) => ({
  id: u.id, name: u.name, phone: u.phone, email: u.email,
  role: u.role, loyaltyPoints: u.loyalty_points, referralCode: u.referral_code,
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

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await query(
    'INSERT INTO otp_codes (phone, code, expires_at) VALUES ($1, $2, $3)',
    [phone, code, expires]
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

  if (String(live.code) !== code) {
    await query('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1', [live.id]);
    const left = MAX_OTP_ATTEMPTS - (live.attempts + 1);
    return res.status(400).json({
      error: left > 0
        ? `That code is incorrect. ${left} attempt${left === 1 ? '' : 's'} left.`
        : 'That code is incorrect. Ask for a new one.',
    });
  }
  const row = live;
  await query('UPDATE otp_codes SET consumed = true WHERE id = $1', [row.id]);

  let user = await one('SELECT * FROM users WHERE phone = $1', [phone]);
  if (!user) {
    if (!name) {
      // First-time number: ask the client to collect a name and retry.
      return res.status(409).json({ error: 'name_required', message: 'Tell us your name to finish signing up.' });
    }
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
  const { phone, password } = req.body;
  const user = await one('SELECT * FROM users WHERE phone = $1', [String(phone || '').trim()]);
  if (!user?.password_hash || !(await bcrypt.compare(String(password || ''), user.password_hash))) {
    return res.status(401).json({ error: 'Incorrect phone number or password.' });
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.get('/me', requireAuth(), async (req, res) => {
  const user = await one('SELECT * FROM users WHERE id = $1', [req.user.sub]);
  if (!user) return res.status(404).json({ error: 'Account not found.' });
  res.json({ user: publicUser(user) });
});

export default router;
