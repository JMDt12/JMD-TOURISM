import jwt from 'jsonwebtoken';

const DEV_SECRET = 'dev-only-insecure-secret-change-me';
export const JWT_SECRET = process.env.JWT_SECRET || DEV_SECRET;
export const USING_DEV_SECRET = JWT_SECRET === DEV_SECRET;

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, name: user.name, phone: user.phone },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function readToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

/** Attaches req.user when a valid token is present; never rejects. */
export function optionalAuth(req, _res, next) {
  const token = readToken(req);
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch {
      // An expired or malformed token is treated as anonymous.
    }
  }
  next();
}

/** Requires a valid token, and optionally one of the given roles. */
export function requireAuth(...roles) {
  return (req, res, next) => {
    const token = readToken(req);
    if (!token) return res.status(401).json({ error: 'Sign in to continue.' });
    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }
    if (roles.length && !roles.includes(payload.role)) {
      return res.status(403).json({ error: 'You do not have access to this area.' });
    }
    req.user = payload;
    next();
  };
}
